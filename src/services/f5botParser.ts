import { z } from 'zod';
import { NormalizedAlert } from '../types.js';
import { sha256 } from '../utils/hash.js';

const inboundSchema = z.object({
  subject: z.string().optional(),
  text: z.string().optional(),
  from: z.string().optional(),
  messageId: z.string().optional(),
  headers: z.record(z.string()).optional()
});

function compactText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripF5botFooter(text: string): string {
  const markers = [
    'Do you have comments or suggestions about F5Bot?',
    'Want to advertise your company or product on F5Bot?',
    'You are receiving this email because you signed up for alerts from F5Bot.'
  ];

  let cutoff = text.length;
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx >= 0 && idx < cutoff) cutoff = idx;
  }
  return text.slice(0, cutoff);
}

function normalizeRedditUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    if (!/reddit\.com$/i.test(parsed.hostname)) return '';

    parsed.hostname = 'www.reddit.com';
    parsed.hash = '';
    const trimmedPath = parsed.pathname.replace(/[)\].,!?:;]+$/g, '');

    // Prefer canonical post URL even when F5Bot gives a comment permalink.
    const commentPathMatch = trimmedPath.match(
      /^\/r\/([A-Za-z0-9_]+)\/comments\/([A-Za-z0-9]+)\/([^/]+)\/c\/([A-Za-z0-9]+)\/?$/i
    );
    if (commentPathMatch) {
      const [, subreddit, postId, slug] = commentPathMatch;
      return `https://www.reddit.com/r/${subreddit}/comments/${postId}/${slug}/`;
    }

    const postPathMatch = trimmedPath.match(
      /^\/r\/([A-Za-z0-9_]+)\/comments\/([A-Za-z0-9]+)(?:\/([^/]+))?\/?$/i
    );
    if (postPathMatch) {
      const [, subreddit, postId, slug] = postPathMatch;
      if (slug) return `https://www.reddit.com/r/${subreddit}/comments/${postId}/${slug}/`;
      return `https://www.reddit.com/r/${subreddit}/comments/${postId}/`;
    }

    parsed.pathname = trimmedPath;
    parsed.search = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function unwrapF5botUrl(rawUrl: string): string {
  try {
    const wrapper = new URL(rawUrl);
    const target = wrapper.searchParams.get('u') || '';
    if (!target) return '';
    const decoded = decodeURIComponent(target);
    return normalizeRedditUrl(decoded);
  } catch {
    return '';
  }
}

function extractSubredditFromPermalink(permalink: string): string {
  const match = permalink.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/i);
  return match?.[1]?.toLowerCase() || 'unknown';
}

function extractAuthor(text: string): string {
  const byMatch = text.match(/(?:by|author)\s+(?:u\/)?([a-zA-Z0-9_-]+)/i);
  return byMatch?.[1] || 'unknown';
}

type HitLink = { permalink: string; index: number };

function collectHitLinks(text: string): HitLink[] {
  const hits: HitLink[] = [];
  const seen = new Set<string>();

  const wrappedRegex = /https?:\/\/f5bot\.com\/url\?[^\s"')<>]+/gi;
  for (const match of text.matchAll(wrappedRegex)) {
    const wrapped = match[0] || '';
    const permalink = unwrapF5botUrl(wrapped);
    if (!permalink || seen.has(permalink)) continue;
    seen.add(permalink);
    hits.push({ permalink, index: match.index || 0 });
  }

  // If we found explicit F5Bot hit links, trust only those and ignore any
  // appended fallback "Permalink:" lines that may point to a subreddit root.
  if (hits.length > 0) {
    return hits;
  }

  const redditRegex = /https?:\/\/(?:www\.|old\.|np\.)?reddit\.com\/[^\s"')<>]+/gi;
  for (const match of text.matchAll(redditRegex)) {
    const permalink = normalizeRedditUrl(match[0] || '');
    if (!permalink || seen.has(permalink)) continue;
    seen.add(permalink);
    hits.push({ permalink, index: match.index || 0 });
  }

  return hits;
}

function snippetAroundHit(text: string, hitIndex: number): string {
  const start = Math.max(0, hitIndex - 220);
  const end = Math.min(text.length, hitIndex + 260);
  return compactText(text.slice(start, end)).slice(0, 500);
}

function fallbackPermalink(text: string): string {
  const subredditMatch = text.match(/\/r\/([a-zA-Z0-9_]+)\/?/i);
  if (!subredditMatch?.[1]) return '';
  return `https://www.reddit.com/r/${subredditMatch[1]}/`;
}

function buildAlert(
  payload: z.infer<typeof inboundSchema>,
  text: string,
  permalink: string,
  bodySnippet: string,
  suffix: string
): NormalizedAlert {
  const subreddit = extractSubredditFromPermalink(permalink);
  const title = compactText(payload.subject || 'F5Bot Alert');
  const dedupeInput = `${permalink}|${bodySnippet.slice(0, 180)}|${subreddit}`;

  return {
    alertId: payload.messageId ? `${payload.messageId}:${suffix}` : sha256(`${Date.now()}|${dedupeInput}|${suffix}`),
    source: 'f5bot_email',
    receivedAtIso: new Date().toISOString(),
    subreddit,
    author: extractAuthor(bodySnippet || text),
    permalink,
    title,
    bodySnippet,
    fullText: bodySnippet,
    dedupeHash: sha256(dedupeInput)
  };
}

export function parseF5botInboundBatch(payload: unknown): NormalizedAlert[] {
  const parsed = inboundSchema.parse(payload);
  const text = stripF5botFooter(parsed.text || '');
  const hits = collectHitLinks(text);

  if (hits.length > 0) {
    return hits.map((hit, idx) =>
      buildAlert(parsed, text, hit.permalink, snippetAroundHit(text, hit.index), `hit${idx + 1}`)
    );
  }

  const permalink = fallbackPermalink(text);
  if (!permalink) {
    return [];
  }

  const snippet = compactText(text).slice(0, 500);
  return [buildAlert(parsed, text, permalink, snippet, 'fallback')];
}

export function parseF5botInbound(payload: unknown): NormalizedAlert {
  const alerts = parseF5botInboundBatch(payload);
  if (alerts.length === 0) {
    const parsed = inboundSchema.parse(payload);
    const text = compactText(parsed.text || '');
    return buildAlert(parsed, text, '', text.slice(0, 500), 'empty');
  }
  return alerts[0];
}
