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
  const normalizedText = `${alert.title} ${alert.bodySnippet} ${alert.fullText}`.toLowerCase();

  const matchedKeywords: KeywordMatch[] = keywordRules
    .filter((rule) => normalizedText.includes(rule.keyword))
    .map((rule) => ({
      keyword: rule.keyword,
      importance: rule.importance,
      intentTag: rule.intentTag,
      mentionPolicy: rule.mentionPolicy
    }));

  const keywordScore = matchedKeywords.reduce((sum, m) => sum + m.importance, 0);
  const subredditRule = subredditRules.find((rule) => rule.subreddit === alert.subreddit) || null;
  const freshnessScore = calcFreshnessScore(alert.receivedAtIso);
  const subredditBoost = subredditRule?.priorityBoost || 0;
  const riskPenalty = subredditRule ? (subredditRule.selfPromoAllowed ? 0 : 12) * subredditRule.riskMultiplier : 0;
  const baseScore = Math.max(0, Math.min(100, Math.round(keywordScore + subredditBoost + freshnessScore * 0.2 - riskPenalty)));

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
