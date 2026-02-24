import { Router } from 'express';
import { parseF5botInboundBatch } from '../services/f5botParser.js';
import { processIncomingAlert } from '../services/redditOpportunityService.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/f5bot-email', async (req, res) => {
  try {
    const alerts = parseF5botInboundBatch(req.body);
    if (alerts.length === 0) {
      return res.status(200).json({
        received: 0,
        processed: 0,
        skipped: 0,
        duplicates: 0,
        results: []
      });
    }

    const results = [];
    let processed = 0;
    let skipped = 0;
    let duplicates = 0;

    for (const alert of alerts) {
      const result = await processIncomingAlert(alert);
      results.push({
        alertId: alert.alertId,
        subreddit: alert.subreddit,
        permalink: alert.permalink,
        ...result
      });

      if (result.duplicate) duplicates += 1;
      else if (result.skipped) skipped += 1;
      else processed += 1;
    }

    return res.status(200).json({
      received: alerts.length,
      processed,
      skipped,
      duplicates,
      results
    });
  } catch (error) {
    logger.error('Failed processing F5Bot webhook', { error });
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }
});

export default router;
