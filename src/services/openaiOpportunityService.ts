import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '../config.js';
import { GptOpportunityScore, MentionPolicy, NormalizedAlert } from '../types.js';
import { buildOpportunityPrompt } from './marketingPromptService.js';

const schema = z.object({
  relevance: z.number().min(0).max(100),
  advertisingFit: z.number().min(0).max(100),
  brandFit: z.number().min(0).max(100),
  conversationNaturalness: z.number().min(0).max(100),
  sensitivityRisk: z.number().min(0).max(100),
  focusSummary: z.string().min(1),
  shortReplyIdeas: z.array(z.string()).min(2).max(4),
  rationale: z.string(),
  mentionRecommendation: z.enum(['always', 'optional', 'never']),
  responseDraftsBrandMentioned: z.array(z.string()).min(1),
  responseDraftsValueOnly: z.array(z.string()).min(1)
});

const client = new OpenAI({ apiKey: config.openAiKey });

export async function scoreOpportunityWithGpt(
  alert: NormalizedAlert,
  mentionPolicy: MentionPolicy
): Promise<GptOpportunityScore> {
  const response = await client.responses.create({
    model: config.openAiModel,
    input: buildOpportunityPrompt(alert, mentionPolicy),
    text: {
      format: {
        type: 'json_schema',
        name: 'opportunity_score',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            relevance: { type: 'number', minimum: 0, maximum: 100 },
            advertisingFit: { type: 'number', minimum: 0, maximum: 100 },
            brandFit: { type: 'number', minimum: 0, maximum: 100 },
            conversationNaturalness: { type: 'number', minimum: 0, maximum: 100 },
            sensitivityRisk: { type: 'number', minimum: 0, maximum: 100 },
            focusSummary: { type: 'string' },
            shortReplyIdeas: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
            rationale: { type: 'string' },
            mentionRecommendation: { type: 'string', enum: ['always', 'optional', 'never'] },
            responseDraftsBrandMentioned: { type: 'array', items: { type: 'string' } },
            responseDraftsValueOnly: { type: 'array', items: { type: 'string' } }
          },
          required: [
            'relevance',
            'advertisingFit',
            'brandFit',
            'conversationNaturalness',
            'sensitivityRisk',
            'focusSummary',
            'shortReplyIdeas',
            'rationale',
            'mentionRecommendation',
            'responseDraftsBrandMentioned',
            'responseDraftsValueOnly'
          ]
        }
      }
    }
  });

  const text = response.output_text;
  const json = JSON.parse(text);
  return schema.parse(json);
}
