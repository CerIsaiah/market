import { Router } from 'express';
import { z } from 'zod';
import { logReviewAction } from '../services/redditOpportunityService.js';

const router = Router();

const actionSchema = z.object({
  opportunityId: z.string().min(1),
  action: z.enum(['approved', 'rejected', 'edited']),
  reviewer: z.string().min(1),
  finalReply: z.string().optional(),
  notes: z.string().optional(),
  permalink: z.string().optional(),
  subreddit: z.string().optional()
});

router.post('/actions', async (req, res) => {
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  await logReviewAction(parsed.data);
  return res.status(200).json({ ok: true });
});

export default router;
