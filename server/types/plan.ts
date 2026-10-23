import type { TodayPlanDTO } from '../../shared/types/plan';
import type { SessionComputed } from './sessions';

/** TodayPlanDTO trước khi serialize — sessions còn Date (drift check ở ./sessions.ts). */
export type TodayPlanComputed = Omit<TodayPlanDTO, 'sessions'> & { sessions: SessionComputed[] };
