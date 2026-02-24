# Google Sheet Template

Create one Google Sheet and add these tabs exactly.

## 1) `Keywords`

Columns:
- `keyword`
- `importance` (1-10)
- `intentTag`
- `mentionPolicy` (`always|optional|never`)
- `notes`
- `active` (`true|false`)

Example rows:
- `dating app opener`, `9`, `texting_help`, `optional`, `high intent`, `true`
- `breakup grief`, `10`, `sensitive`, `never`, `suppress promo`, `true`

## 2) `SubredditRules`

Columns:
- `subreddit`
- `selfPromoAllowed` (`true|false`)
- `riskMultiplier` (e.g. 1, 1.5, 2)
- `priorityBoost` (numeric boost)
- `notes`

## 3) `RawAlerts`

Columns:
- `receivedAtIso`
- `source`
- `subreddit`
- `author`
- `permalink`
- `title`
- `bodySnippet`
- `dedupeHash`
- `alertId`
- `fullText`

## 4) `Opportunities`

Columns:
- `opportunityId`
- `receivedAtIso`
- `permalink`
- `subreddit`
- `matchedKeywords`
- `sheetBaseScore`
- `gptScoreComposite`
- `finalScore`
- `status`
- `riskLabel`
- `mentionPolicy`
- `rationale`
- `reviewStatus`
- `reviewerOwner`

## 5) `DraftReplies`

Columns:
- `opportunityId`
- `variant` (`brandMentioned|valueOnly`)
- `replyText`
- `safetyFlag`
- `confidence`
- `createdAtIso`
- `reviewerNotes`

## 6) `Actions`

Columns:
- `actionAtIso`
- `opportunityId`
- `action` (`approved|rejected|edited`)
- `reviewer`
- `finalReply`
- `notes`
- `permalink`
- `subreddit`

## 7) `Metrics`

Columns:
- `metricDate`
- `metricName`
- `metricValue`
- `dimensionA`
- `dimensionB`
- `notes`
- `recordedAtIso`

## Optional useful formulas

- Approval rate (weekly):
  - `=COUNTIFS(Actions!C:C,"approved")/MAX(1,COUNTA(Actions!C:C)-1)`
- Hot opportunities:
  - `=COUNTIFS(Opportunities!I:I,"Hot")`
