import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 4321),
  openAiKey: required('OPENAI_API_KEY'),
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  googleSheetId: required('GOOGLE_SHEET_ID'),
  googleServiceAccountEmail: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  googlePrivateKey: required('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  alertMinScore: Number(process.env.ALERT_MIN_SCORE || 70),
  freshnessHalfLifeHours: Number(process.env.FRESHNESS_HALF_LIFE_HOURS || 8),
  weeklyReportHourUtc: Number(process.env.WEEKLY_REPORT_CRON_HOUR_UTC || 14)
};
