import { sheetsClient } from '../sheets/sheetsClient.js';
import { SHEET_NAMES } from '../sheets/sheetSchema.js';
import { logger } from '../utils/logger.js';

function withinLastDays(isoLike: string, days: number): boolean {
  const ts = new Date(isoLike).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= days * 24 * 60 * 60 * 1000;
}

export async function generateWeeklyOptimizerReport(): Promise<{
  totalActions: number;
  approvalRate: number;
  topSubreddits: Array<{ subreddit: string; count: number }>;
}> {
  const actions = await sheetsClient.readRange(`${SHEET_NAMES.Actions}!A:H`);
  const opportunities = await sheetsClient.readRange(`${SHEET_NAMES.Opportunities}!A:N`);
  const actionRows = actions.slice(1).filter((row) => row[0] && withinLastDays(row[0], 7));
  const opportunityRows = opportunities.slice(1);

  const approvals = actionRows.filter((row) => row[2] === 'approved').length;
  const approvalRate = actionRows.length > 0 ? approvals / actionRows.length : 0;

  const oppMap = new Map(opportunityRows.map((row) => [row[0], row]));
  const subredditCounts = new Map<string, number>();
  for (const action of actionRows) {
    const opportunityId = action[1];
    const opp = oppMap.get(opportunityId);
    const subreddit = opp?.[3] || action[7] || 'unknown';
    subredditCounts.set(subreddit, (subredditCounts.get(subreddit) || 0) + 1);
  }

  const topSubreddits = [...subredditCounts.entries()]
    .map(([subreddit, count]) => ({ subreddit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const now = new Date().toISOString();
  await sheetsClient.appendRows(SHEET_NAMES.Metrics, [
    [now.slice(0, 10), 'weekly_total_actions', String(actionRows.length), '', '', 'auto weekly', now],
    [now.slice(0, 10), 'weekly_approval_rate', approvalRate.toFixed(4), '', '', 'auto weekly', now],
    ...topSubreddits.map((s) => [now.slice(0, 10), 'weekly_top_subreddit', String(s.count), s.subreddit, '', 'auto weekly', now])
  ]);

  logger.info('Weekly report generated', {
    totalActions: actionRows.length,
    approvalRate,
    topSubreddits
  });

  return {
    totalActions: actionRows.length,
    approvalRate,
    topSubreddits
  };
}
