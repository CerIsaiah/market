import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export async function notifyHighPriorityOpportunity(message: string): Promise<void> {
  if (!config.slackWebhookUrl) {
    logger.info('Skipping Slack alert (no webhook configured)');
    return;
  }

  try {
    await fetch(config.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
  } catch (error) {
    logger.error('Failed to send Slack notification', { error });
  }
}
