import { z } from 'zod';
import { dateStr } from './common';

// `today`/`date` BẮT BUỘC từ client — server chạy UTC, không biết "hôm nay" của người tập.
export const statsOverviewQuerySchema = z.object({ today: dateStr });
export const statsTodayQuerySchema = z.object({ date: dateStr });
