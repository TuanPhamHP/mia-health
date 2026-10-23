import type { DailyStat, WeeklyStat } from '../utils/streak';
import type { ExerciseCategory } from './exercises';
import type { ExercisePreviewDTO } from './routines';
import type { SessionDTO } from './sessions';

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

export interface TodayRoutineDTO {
	id: number;
	name: string;
	itemCount: number;
	estimatedSec: number;
	scheduleMask: number;
	scheduled: boolean; // có lịch vào thứ của `date`
	doneCount: number; // số buổi của giáo án này đã ghi trong ngày
	previews: ExercisePreviewDTO[];
}

export interface TodayDTO {
	date: string;
	weekday: number; // ISO 1–7
	/** Giáo án chưa lưu trữ: có lịch hôm nay trước, rồi tới phần còn lại. */
	routines: TodayRoutineDTO[];
	sessions: SessionDTO[];
}
