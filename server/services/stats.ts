import * as repo from '../repositories/stats';
import { addDays, startOfIsoWeek } from '../../shared/utils/date';
import { computeStreaks, fillDays, rollupWeeks } from '../../shared/utils/streak';
import type { StatsOverviewDTO } from '../../shared/types/stats';

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
