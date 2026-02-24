import { config } from '../config.js';
import { sheetsClient } from '../sheets/sheetsClient.js';
import { SHEET_NAMES } from '../sheets/sheetSchema.js';
import { BaseScoreResult, KeywordMatch, KeywordRule, MentionPolicy, NormalizedAlert, SubredditRule } from '../types.js';

function toBool(value: string): boolean {
  return value.trim().toLowerCase() === 'true';
}

function toNum(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeForMatch(value).split(' ').filter(Boolean);
}

function keywordMatches(normalizedText: string, textTokens: Set<string>, keyword: string): boolean {
  const normalizedKeyword = normalizeForMatch(keyword);
  if (!normalizedKeyword) return false;

  if (normalizedText.includes(normalizedKeyword)) {
    return true;
  }

  const tokens = tokenize(normalizedKeyword);
  if (tokens.length < 2) return false;

  const tokenMatches = tokens.filter((token) => textTokens.has(token)).length;
  return tokenMatches >= Math.ceil(tokens.length * 0.8);
}

function parseKeywordRules(rows: string[][]): KeywordRule[] {
  return rows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      keyword: (row[0] || '').trim().toLowerCase(),
      importance: toNum(row[1] || '0', 0),
      intentTag: row[2] || '',
      mentionPolicy: ((row[3] || 'optional').trim().toLowerCase() as MentionPolicy),
      notes: row[4] || '',
      active: toBool(row[5] || 'true')
    }))
    .filter((rule) => rule.active && rule.keyword.length > 0);
}

function parseSubredditRules(rows: string[][]): SubredditRule[] {
  return rows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      subreddit: (row[0] || '').trim().toLowerCase(),
      selfPromoAllowed: toBool(row[1] || 'false'),
      riskMultiplier: toNum(row[2] || '1', 1),
      priorityBoost: toNum(row[3] || '0', 0),
      notes: row[4] || ''
    }));
}

function calcFreshnessScore(receivedAtIso: string): number {
  const ageMs = Date.now() - new Date(receivedAtIso).getTime();
  const ageHours = Math.max(0, ageMs / 3_600_000);
  const decay = Math.pow(0.5, ageHours / config.freshnessHalfLifeHours);
  return Math.round(decay * 100);
}

function mentionFromMatches(matches: KeywordMatch[]): MentionPolicy {
  if (matches.some((m) => m.mentionPolicy === 'never')) return 'never';
  if (matches.some((m) => m.mentionPolicy === 'always')) return 'always';
  return 'optional';
}

export async function scoreFromSheetRules(alert: NormalizedAlert): Promise<BaseScoreResult> {
  const [keywordRows, subredditRows] = await Promise.all([
    sheetsClient.readRange(`${SHEET_NAMES.Keywords}!A:F`),
    sheetsClient.readRange(`${SHEET_NAMES.SubredditRules}!A:E`)
  ]);

  const keywordRules = parseKeywordRules(keywordRows);
  const subredditRules = parseSubredditRules(subredditRows);
  const normalizedText = normalizeForMatch(`${alert.title} ${alert.bodySnippet} ${alert.fullText}`);
  const textTokens = new Set(tokenize(normalizedText));

  const matchedKeywords: KeywordMatch[] = keywordRules
    .filter((rule) => keywordMatches(normalizedText, textTokens, rule.keyword))
    .map((rule) => ({
      keyword: rule.keyword,
      importance: rule.importance,
      intentTag: rule.intentTag,
      mentionPolicy: rule.mentionPolicy
    }));

  const keywordScore = matchedKeywords.reduce((sum, m) => sum + m.importance, 0);
  const uniqueIntentTags = new Set(matchedKeywords.map((m) => m.intentTag).filter(Boolean)).size;
  const coverageBonus = Math.min(15, matchedKeywords.length * 4 + uniqueIntentTags * 2);
  const noMatchPenalty = matchedKeywords.length === 0 ? 25 : 0;
  const subredditRule = subredditRules.find((rule) => rule.subreddit === alert.subreddit) || null;
  const freshnessScore = calcFreshnessScore(alert.receivedAtIso);
  const subredditBoost = subredditRule?.priorityBoost || 0;
  const riskPenalty = subredditRule ? (subredditRule.selfPromoAllowed ? 0 : 12) * subredditRule.riskMultiplier : 0;
  const baseScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(keywordScore + coverageBonus + subredditBoost + freshnessScore * 0.15 - riskPenalty - noMatchPenalty)
    )
  );

  return {
    keywordScore,
    freshnessScore,
    subredditBoost,
    riskPenalty,
    baseScore,
    matchedKeywords,
    recommendedMentionPolicy: mentionFromMatches(matchedKeywords)
  };
}
