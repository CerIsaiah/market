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
2) Penalize off-topic communities heavily (non-texting/non-communication contexts should trend low/DoNotTouch).
3) Return focusSummary: one sentence (max 140 chars) describing exactly what the reviewer should focus on.
4) Return shortReplyIdeas: 2-4 ultra-short ideas (max 90 chars each) with practical language the reviewer can quickly adapt.
5) Give rationale in max 2 sentences, concrete and direct.
6) Return mentionRecommendation: always|optional|never.
7) Provide 3-5 short draft replies that mention SmoothRizz naturally.
8) Provide 3-5 short draft replies that provide value without mentioning SmoothRizz.

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
