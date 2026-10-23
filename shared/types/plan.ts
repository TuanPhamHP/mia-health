import type { z } from 'zod';
import type { planChangeSchema } from '../schemas/plan';
import type { ProgramStatus } from '../utils/program';
import type { ProgramGoal } from './programs';
import type { ExercisePreviewDTO } from './routines';
import type { SessionDTO } from './sessions';

export type PlanChangeInput = z.infer<typeof planChangeSchema>;

export interface PlanRoutineDTO {
	id: number;
	name: string;
	/** "Vì sao buổi này" — mô tả của giáo án. */
	description: string | null;
	itemCount: number;
	estimatedSec: number;
	previews: ExercisePreviewDTO[];
}

export interface PlanEntryDTO {
	/** Buổi sẽ tập — đổi buổi ⇒ giáo án thay vào. */
	routine: PlanRoutineDTO;
	skipped: boolean;
	/** Đổi buổi: buổi gốc theo lịch. */
	replaces: { id: number; name: string } | null;
	/** Thay đổi đang áp — DELETE /api/plan/changes/:id để hoàn tác; null = đúng lịch. */
	changeId: number | null;
	/** Số buổi của giáo án này đã ghi trong ngày. */
	doneCount: number;
}

export interface PlanProgramDTO {
	id: number;
	name: string;
	goal: ProgramGoal;
	description: string | null;
	startDate: string;
	repeat: boolean;
	status: ProgramStatus;
	/** Giai đoạn đang chạy — chỉ có khi status.kind = 'active'. */
	phase: { name: string; note: string | null; weeks: number } | null;
	/** Buổi theo lịch hôm nay (đã áp bỏ qua / đổi buổi). Rỗng = hôm nay nghỉ theo lịch. */
	entries: PlanEntryDTO[];
}

export interface TodayPlanDTO {
	date: string;
	weekday: number; // ISO 1–7
	/** Chương trình đang theo (có ngày bắt đầu) — gồm cả sắp bắt đầu / đã hoàn thành. */
	programs: PlanProgramDTO[];
	/** Chương trình không theo — để gợi ý khi chưa theo cái nào. */
	idlePrograms: { id: number; name: string; goal: ProgramGoal }[];
	/** Buổi thêm riêng hôm nay, ngoài mọi chương trình. */
	extras: PlanEntryDTO[];
	sessions: SessionDTO[];
}
