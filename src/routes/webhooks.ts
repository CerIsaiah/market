import { Router } from 'express';
import { parseF5botInbound } from '../services/f5botParser.js';
import { processIncomingAlert } from '../services/redditOpportunityService.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/f5bot-email', async (req, res) => {
  try {
    const normalized = parseF5botInbound(req.body);
    const result = await processIncomingAlert(normalized);
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Failed processing F5Bot webhook', { error });
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }
});

export default router;
