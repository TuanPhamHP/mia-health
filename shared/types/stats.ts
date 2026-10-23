import type { DailyStat, WeeklyStat } from '../utils/streak';
import type { ExerciseCategory } from './exercises';

export interface CategoryStat {
	category: ExerciseCategory;
	entries: number; // số lượt bài thuộc nhóm này
	setsDone: number;
}

export interface StatsOverviewDTO {
	today: string;
	currentStreak: number;
	longestStreak: number;
	totalSessions: number;
	totalDurationSec: number;
	thisWeek: WeeklyStat;
	/** 8 tuần gần nhất, cũ → mới; phần tử cuối = tuần hiện tại. */
	weekly: WeeklyStat[];
	/** 12 tuần trọn (bắt đầu Thứ 2) tới hôm nay, đủ mọi ngày, cũ → mới. */
	heatmap: DailyStat[];
	/** 30 ngày gần nhất, nhiều set nhất trước. */
	byCategory: CategoryStat[];
}
