export const SHEET_NAMES = {
  Keywords: 'Keywords',
  SubredditRules: 'SubredditRules',
  RawAlerts: 'RawAlerts',
  Opportunities: 'Opportunities',
  DraftReplies: 'DraftReplies',
  Actions: 'Actions',
  Metrics: 'Metrics'
} as const;

export const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_NAMES.Keywords]: ['keyword', 'importance', 'intentTag', 'mentionPolicy', 'notes', 'active'],
  [SHEET_NAMES.SubredditRules]: ['subreddit', 'selfPromoAllowed', 'riskMultiplier', 'priorityBoost', 'notes'],
  [SHEET_NAMES.RawAlerts]: [
    'receivedAtIso',
    'source',
    'subreddit',
    'author',
    'permalink',
    'title',
    'bodySnippet',
    'dedupeHash',
    'alertId',
    'fullText'
  ],
  [SHEET_NAMES.Opportunities]: [
    'opportunityId',
    'receivedAtIso',
    'permalink',
    'subreddit',
    'matchedKeywords',
    'sheetBaseScore',
    'gptScoreComposite',
    'finalScore',
    'status',
    'riskLabel',
    'mentionPolicy',
    'rationale',
    'reviewStatus',
    'reviewerOwner'
  ],
  [SHEET_NAMES.DraftReplies]: [
    'opportunityId',
    'variant',
    'replyText',
    'safetyFlag',
    'confidence',
    'createdAtIso',
    'reviewerNotes'
  ],
  [SHEET_NAMES.Actions]: [
    'actionAtIso',
    'opportunityId',
    'action',
    'reviewer',
    'finalReply',
    'notes',
    'permalink',
    'subreddit'
  ],
  [SHEET_NAMES.Metrics]: [
    'metricDate',
    'metricName',
    'metricValue',
    'dimensionA',
    'dimensionB',
    'notes',
    'recordedAtIso'
  ]
};
