import type { TodayDTO } from '../../shared/types/stats';
import type { SessionComputed } from './sessions';

/** TodayDTO trước khi serialize — sessions còn Date (drift check ở ./sessions.ts). */
export type TodayComputed = Omit<TodayDTO, 'sessions'> & { sessions: SessionComputed[] };
