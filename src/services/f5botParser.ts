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

function extractPermalink(text: string): string {
  const match = text.match(/https?:\/\/(?:www\.)?reddit\.com\/[^\s)]+/i);
  return match?.[0]?.trim() || '';
}

function extractSubreddit(text: string): string {
  const match = text.match(/r\/([a-zA-Z0-9_]+)/);
  return match?.[1]?.toLowerCase() || 'unknown';
}

function extractAuthor(text: string): string {
  const byMatch = text.match(/(?:by|author)\s+u\/([a-zA-Z0-9_-]+)/i);
  return byMatch?.[1] || 'unknown';
}

function compactText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function parseF5botInbound(payload: unknown): NormalizedAlert {
  const parsed = inboundSchema.parse(payload);
  const text = parsed.text || '';
  const permalink = extractPermalink(text);
  const subreddit = extractSubreddit(`${parsed.subject || ''} ${text}`);
  const author = extractAuthor(text);
  const title = compactText(parsed.subject || 'F5Bot Alert');
  const bodySnippet = compactText(text).slice(0, 500);
  const dedupeInput = `${permalink}|${bodySnippet.slice(0, 180)}|${subreddit}`;
  const dedupeHash = sha256(dedupeInput);

  return {
    alertId: parsed.messageId || sha256(`${Date.now()}|${dedupeInput}`),
    source: 'f5bot_email',
    receivedAtIso: new Date().toISOString(),
    subreddit,
    author,
    permalink,
    title,
    bodySnippet,
    fullText: compactText(text),
    dedupeHash
  };
}
