import { SafetyDecision } from '../types.js';

const HARD_BLOCK_PATTERNS = [
  /\bself[-\s]?harm\b/i,
  /\bsuicide\b/i,
  /\bdomestic violence\b/i,
  /\bminor\b/i,
  /\bunderage\b/i,
  /\bgrief\b/i,
  /\bfuneral\b/i,
  /\babuse\b/i,
  /\bemergency\b/i,
  /\blegal advice\b/i,
  /\bmedical advice\b/i
];

const SOFT_BLOCK_PATTERNS = [
  /\bdepressed\b/i,
  /\bpanic attack\b/i,
  /\bcrying\b/i,
  /\bheartbroken\b/i,
  /\bbereavement\b/i
];

export function evaluateSafety(content: string, selfPromoAllowed: boolean): SafetyDecision {
  if (HARD_BLOCK_PATTERNS.some((pattern) => pattern.test(content))) {
    return {
      allowed: false,
      blockReason: 'Hard-block emotional/sensitive context',
      forceValueOnly: true,
      riskLabel: 'critical'
    };
  }

  if (SOFT_BLOCK_PATTERNS.some((pattern) => pattern.test(content))) {
    return {
      allowed: true,
      blockReason: 'Soft-block promotional tone',
      forceValueOnly: true,
      riskLabel: 'high'
    };
  }

  if (!selfPromoAllowed) {
    return {
      allowed: true,
      blockReason: 'Subreddit self-promo restricted',
      forceValueOnly: true,
      riskLabel: 'medium'
    };
  }

  return {
    allowed: true,
    blockReason: '',
    forceValueOnly: false,
    riskLabel: 'low'
  };
}
