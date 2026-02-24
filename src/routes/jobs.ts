import { Router } from 'express';
import { generateWeeklyOptimizerReport } from '../services/weeklyReportService.js';

const router = Router();

router.post('/weekly-report', async (_req, res) => {
  const report = await generateWeeklyOptimizerReport();
  return res.status(200).json({ ok: true, report });
});

export default router;
