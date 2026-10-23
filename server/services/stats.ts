import * as repo from '../repositories/stats';
import * as routinesSvc from './routines';
import * as sessionsSvc from './sessions';
import { addDays, isoWeekday, startOfIsoWeek } from '../../shared/utils/date';
import { computeStreaks, fillDays, rollupWeeks } from '../../shared/utils/streak';
import { isScheduledOn } from '../../shared/utils/weekday';
import type { StatsOverviewDTO, TodayRoutineDTO } from '../../shared/types/stats';
import type { TodayComputed } from '../types/stats';

const WEEKLY_WEEKS = 8;
const HEATMAP_WEEKS = 12;
const CATEGORY_WINDOW_DAYS = 30;

// `today` do client gửi lên (giờ địa phương) — xem localDateIso().
export async function getOverview(today: string): Promise<StatsOverviewDTO> {
	const heatmapFrom = startOfIsoWeek(addDays(today, -7 * (HEATMAP_WEEKS - 1)));
	const [daily, dates, totals, byCategory] = await Promise.all([
		repo.dailyAggregate(heatmapFrom, today),
		repo.distinctDates(),
		repo.totals(),
		repo.categoryAggregate(addDays(today, -(CATEGORY_WINDOW_DAYS - 1)), today),
	]);

	const { current, longest } = computeStreaks(dates, today);
	const weekly = rollupWeeks(daily, today, WEEKLY_WEEKS);

	return {
		today,
		currentStreak: current,
		longestStreak: longest,
		totalSessions: totals.sessions,
		totalDurationSec: totals.durationSec,
		thisWeek: weekly[weekly.length - 1]!,
		weekly,
		heatmap: fillDays(daily, heatmapFrom, today),
		byCategory,
	};
}

export async function getToday(date: string): Promise<TodayComputed> {
	const [routines, counts, sessions] = await Promise.all([
		routinesSvc.listRoutines({}),
		repo.countByRoutineOnDate(date),
		sessionsSvc.listSessions({ from: date, to: date }),
	]);

	const rows: TodayRoutineDTO[] = routines.map((r) => ({
		id: r.id,
		name: r.name,
		itemCount: r.itemCount,
		estimatedSec: r.estimatedSec,
		scheduleMask: r.scheduleMask,
		scheduled: isScheduledOn(r.scheduleMask, date),
		doneCount: counts.get(r.id) ?? 0,
		previews: r.previews,
	}));
	// sort ổn định: giữ sortOrder của người dùng trong từng nhóm.
	rows.sort((a, b) => Number(b.scheduled) - Number(a.scheduled));

	return {
		date,
		weekday: isoWeekday(date),
		routines: rows,
		sessions,
	};
}
