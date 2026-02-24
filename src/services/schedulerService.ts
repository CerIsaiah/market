import { config } from '../config.js';
import { generateWeeklyOptimizerReport } from './weeklyReportService.js';
import { logger } from '../utils/logger.js';

export function startSchedulers(): void {
  setInterval(async () => {
    const now = new Date();
    const isMonday = now.getUTCDay() === 1;
    const isTargetHour = now.getUTCHours() === config.weeklyReportHourUtc;
    const isTopOfHour = now.getUTCMinutes() === 0;
    if (isMonday && isTargetHour && isTopOfHour) {
      try {
        await generateWeeklyOptimizerReport();
      } catch (error) {
        logger.error('Weekly report scheduler failed', { error });
      }
    }
  }, 60_000);
}
