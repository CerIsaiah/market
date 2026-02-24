export type MentionPolicy = 'always' | 'optional' | 'never';

export interface KeywordRule {
  keyword: string;
  importance: number;
  intentTag: string;
  mentionPolicy: MentionPolicy;
  notes: string;
  active: boolean;
}

export interface SubredditRule {
  subreddit: string;
  selfPromoAllowed: boolean;
  riskMultiplier: number;
  priorityBoost: number;
  notes: string;
}

export interface NormalizedAlert {
  alertId: string;
  source: string;
  receivedAtIso: string;
  subreddit: string;
  author: string;
  permalink: string;
  title: string;
  bodySnippet: string;
  fullText: string;
  publishedAtIso?: string;
  dedupeHash: string;
}

export interface KeywordMatch {
  keyword: string;
  importance: number;
  intentTag: string;
  mentionPolicy: MentionPolicy;
}

export interface BaseScoreResult {
  keywordScore: number;
  freshnessScore: number;
  subredditBoost: number;
  riskPenalty: number;
  baseScore: number;
  matchedKeywords: KeywordMatch[];
  recommendedMentionPolicy: MentionPolicy;
}

export interface GptOpportunityScore {
  relevance: number;
  advertisingFit: number;
  brandFit: number;
  conversationNaturalness: number;
  sensitivityRisk: number;
  focusSummary: string;
  shortReplyIdeas: string[];
  rationale: string;
  mentionRecommendation: MentionPolicy;
  responseDraftsBrandMentioned: string[];
  responseDraftsValueOnly: string[];
}

export interface SafetyDecision {
  allowed: boolean;
  blockReason: string;
  forceValueOnly: boolean;
  riskLabel: 'low' | 'medium' | 'high' | 'critical';
}

export interface OpportunityEvaluation {
  finalScore: number;
  status: 'Hot' | 'Warm' | 'Low' | 'DoNotTouch';
  base: BaseScoreResult;
  gpt: GptOpportunityScore;
  safety: SafetyDecision;
}

export interface ReviewActionInput {
  opportunityId: string;
  action: 'approved' | 'rejected' | 'edited';
  reviewer: string;
  finalReply?: string;
  notes?: string;
  permalink?: string;
  subreddit?: string;
}
