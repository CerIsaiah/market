# Reviewer Runbook

## Goal
Approve only opportunities that are useful, respectful, and context-appropriate.

## Daily workflow

1. Sort `Opportunities` by `finalScore` descending.
2. Open top row permalink and review thread context quickly.
3. Check `riskLabel` and `mentionPolicy`.
4. Choose a draft from `DraftReplies`:
   - Prefer `valueOnly` when risk is medium/high.
   - Use `brandMentioned` only when natural and allowed.
5. Post manually from your Reddit account.
6. Log the outcome via `POST /review/actions`.

## Rules of thumb

- Skip emotionally vulnerable contexts.
- Never force product mention.
- Avoid repetitive comments across similar threads.
- If unsure, reject and leave note for tuning.

## Rejection reasons to log

- `subreddit_rule_conflict`
- `sensitive_context`
- `low_relevance`
- `draft_quality_issue`
- `duplicate_angle`
