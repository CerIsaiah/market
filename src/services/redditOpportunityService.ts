import { sheetsClient } from '../sheets/sheetsClient.js';
import { SHEET_NAMES } from '../sheets/sheetSchema.js';
import { BaseScoreResult, GptOpportunityScore, MentionPolicy, NormalizedAlert, OpportunityEvaluation, ReviewActionInput } from '../types.js';
import { logger } from '../utils/logger.js';
import { sha256 } from '../utils/hash.js';
import { scoreFromSheetRules } from './keywordScoringService.js';
import { scoreOpportunityWithGpt } from './openaiOpportunityService.js';
import { evaluateSafety } from './safetyPolicyService.js';
import { notifyHighPriorityOpportunity } from './notifierService.js';
import { recordMetric } from './metricsService.js';
import { config } from '../config.js';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusFromScore(score: number): 'Hot' | 'Warm' | 'Low' | 'DoNotTouch' {
  if (score >= 80) return 'Hot';
  if (score >= 60) return 'Warm';
  if (score >= 35) return 'Low';
  return 'DoNotTouch';
}

function subredditAllowed(subreddit: string): boolean {
  const rules = config.subredditAllowlist;
  if (rules.length === 0) {
    return true;
  }

  const normalized = subreddit.trim().toLowerCase();
  return rules.some((rule) => {
    if (rule.endsWith('*')) {
      const prefix = rule.slice(0, -1);
      return normalized.startsWith(prefix);
    }
    return normalized === rule;
  });
}

async function getSubredditSelfPromoAllowed(subreddit: string): Promise<boolean> {
  const rows = await sheetsClient.readRange(`${SHEET_NAMES.SubredditRules}!A:E`);
  const match = rows.slice(1).find((r) => (r[0] || '').toLowerCase() === subreddit.toLowerCase());
  if (!match) return true;
  return (match[1] || '').toLowerCase() === 'true';
}

async function alreadySeenDedupe(dedupeHash: string): Promise<boolean> {
  const rows = await sheetsClient.readRange(`${SHEET_NAMES.RawAlerts}!H:H`);
  return rows.slice(1).some((row) => row[0] === dedupeHash);
}

function compositeGptScore(gpt: GptOpportunityScore): number {
  return clampScore(
    gpt.relevance * 0.3 +
    gpt.advertisingFit * 0.25 +
    gpt.brandFit * 0.2 +
    gpt.conversationNaturalness * 0.2 -
    gpt.sensitivityRisk * 0.25
  );
}

function finalMentionPolicy(
  base: MentionPolicy,
  gpt: MentionPolicy,
  forceValueOnly: boolean
): MentionPolicy {
  if (forceValueOnly) return 'never';
  if (base === 'never' || gpt === 'never') return 'never';
  if (base === 'always' || gpt === 'always') return 'always';
  return 'optional';
}

function buildOperatorBrief(gpt: GptOpportunityScore): string {
  const focus = gpt.focusSummary.trim();
  const ideas = gpt.shortReplyIdeas
    .map((idea) => idea.trim())
    .filter((idea) => idea.length > 0)
    .slice(0, 3)
    .join(' | ');
  const why = gpt.rationale.trim();
  return `Focus: ${focus}\nSay: ${ideas}\nWhy: ${why}`;
}

function blockedGptFallback(): GptOpportunityScore {
  return {
    relevance: 0,
    advertisingFit: 0,
    brandFit: 0,
    conversationNaturalness: 0,
    sensitivityRisk: 100,
    focusSummary: 'Skip outreach: safety policy flagged this context as not suitable for marketing.',
    shortReplyIdeas: [
      'Offer empathy first.',
      'Avoid brand mention.'
    ],
    rationale: 'Opportunity blocked by safety policy',
    mentionRecommendation: 'never',
    responseDraftsBrandMentioned: [],
    responseDraftsValueOnly: []
  };
}

export async function processIncomingAlert(alert: NormalizedAlert): Promise<{
  duplicate: boolean;
  skipped?: boolean;
  skipReason?: string;
  opportunityId?: string;
  evaluation?: OpportunityEvaluation;
}> {
  if (!alert.permalink) {
    logger.warn('Skipping alert without permalink', { alertId: alert.alertId });
    return { duplicate: true, skipped: true, skipReason: 'missing_permalink' };
  }

  if (!subredditAllowed(alert.subreddit)) {
    logger.info('Skipping alert outside subreddit allowlist', {
      subreddit: alert.subreddit,
      permalink: alert.permalink
    });
    return { duplicate: false, skipped: true, skipReason: 'subreddit_not_allowlisted' };
  }

  if (await alreadySeenDedupe(alert.dedupeHash)) {
    return { duplicate: true };
  }

  await sheetsClient.appendRows(SHEET_NAMES.RawAlerts, [[
    alert.receivedAtIso,
    alert.source,
    alert.subreddit,
    alert.author,
    alert.permalink,
    alert.title,
    alert.bodySnippet,
    alert.dedupeHash,
    alert.alertId,
    alert.fullText
  ]]);

  const base: BaseScoreResult = await scoreFromSheetRules(alert);
  const selfPromoAllowed = await getSubredditSelfPromoAllowed(alert.subreddit);
  const safety = evaluateSafety(`${alert.title} ${alert.bodySnippet} ${alert.fullText}`, selfPromoAllowed);
  const gpt = safety.allowed
    ? await scoreOpportunityWithGpt(alert, base.recommendedMentionPolicy)
    : blockedGptFallback();

  const gptScoreComposite = compositeGptScore(gpt);
  const riskPenalty = safety.riskLabel === 'critical' ? 60 : safety.riskLabel === 'high' ? 25 : safety.riskLabel === 'medium' ? 10 : 0;
  const finalScore = clampScore(base.baseScore * 0.45 + gptScoreComposite * 0.55 - riskPenalty);
  const status = safety.allowed ? statusFromScore(finalScore) : 'DoNotTouch';
  const mentionPolicy = finalMentionPolicy(base.recommendedMentionPolicy, gpt.mentionRecommendation, safety.forceValueOnly);
  const operatorBrief = buildOperatorBrief(gpt);
  const opportunityId = sha256(`${alert.permalink}|${alert.dedupeHash}`).slice(0, 16);

  await sheetsClient.appendRows(SHEET_NAMES.Opportunities, [[
    opportunityId,
    alert.receivedAtIso,
    alert.permalink,
    alert.subreddit,
    base.matchedKeywords.map((k) => `${k.keyword}:${k.importance}`).join(','),
    String(base.baseScore),
    String(gptScoreComposite),
    String(finalScore),
    status,
    safety.riskLabel,
    mentionPolicy,
    operatorBrief,
    'pending',
    ''
  ]]);

  const nowIso = new Date().toISOString();
  const drafts: (string | number | boolean)[][] = [];

  if (mentionPolicy !== 'never') {
    for (const reply of gpt.responseDraftsBrandMentioned.slice(0, 5)) {
      drafts.push([opportunityId, 'brandMentioned', reply, safety.riskLabel, '0.8', nowIso, '']);
    }
  }
  for (const reply of gpt.responseDraftsValueOnly.slice(0, 5)) {
    drafts.push([opportunityId, 'valueOnly', reply, safety.riskLabel, '0.8', nowIso, '']);
  }

  if (drafts.length > 0) {
    await sheetsClient.appendRows(SHEET_NAMES.DraftReplies, drafts);
  }

  await recordMetric('opportunities_processed', 1, status, alert.subreddit);
  if (!safety.allowed) {
    await recordMetric('opportunities_blocked', 1, safety.riskLabel, alert.subreddit);
  }

  if (finalScore >= config.alertMinScore && status !== 'DoNotTouch') {
    await notifyHighPriorityOpportunity(
      `Hot opportunity ${status} (${finalScore}) in r/${alert.subreddit}: ${alert.permalink}`
    );
  }

  return {
    duplicate: false,
    opportunityId,
    evaluation: {
      finalScore,
      status,
      base,
      gpt,
      safety
    }
  };
}

export async function logReviewAction(input: ReviewActionInput): Promise<void> {
  const nowIso = new Date().toISOString();
  await sheetsClient.appendRows(SHEET_NAMES.Actions, [[
    nowIso,
    input.opportunityId,
    input.action,
    input.reviewer,
    input.finalReply || '',
    input.notes || '',
    input.permalink || '',
    input.subreddit || ''
  ]]);

  await recordMetric(
    `review_${input.action}`,
    1,
    input.subreddit || '',
    '',
    input.notes || ''
  );
}
