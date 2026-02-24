import { MentionPolicy, NormalizedAlert } from '../types.js';

export function buildOpportunityPrompt(alert: NormalizedAlert, mentionPolicy: MentionPolicy): string {
  return `
You are evaluating a Reddit marketing opportunity for SmoothRizz.

SmoothRizz is best at helping users craft confident, respectful, playful text replies quickly.
It should only be mentioned when natural and appropriate.

Safety constraints:
- Never exploit sensitive emotional contexts.
- Avoid insensitive, manipulative, or predatory wording.
- If context is emotionally vulnerable, provide supportive value-only drafts.

Task:
1) Score this opportunity from 0-100 for each dimension:
   relevance, advertisingFit, brandFit, conversationNaturalness, sensitivityRisk
2) Give a brief rationale.
3) Return mentionRecommendation: always|optional|never.
4) Provide 3-5 short draft replies that mention SmoothRizz naturally.
5) Provide 3-5 short draft replies that provide value without mentioning SmoothRizz.

Context:
- Subreddit: r/${alert.subreddit}
- Author: ${alert.author}
- Permalink: ${alert.permalink}
- Title: ${alert.title}
- Body snippet: ${alert.bodySnippet}
- Mention policy from keyword engine: ${mentionPolicy}

Output JSON only.
`.trim();
}
