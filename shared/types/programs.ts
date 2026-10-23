import type { z } from 'zod';
import type {
	addSlotSchema,
	createPhaseSchema,
	createProgramSchema,
	programGoalEnum,
	updatePhaseSchema,
	updateProgramSchema,
} from '../schemas/programs';
import type { ExercisePreviewDTO } from './routines';

export type ProgramGoal = z.infer<typeof programGoalEnum>;
export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;
export type UpdatePhaseInput = z.infer<typeof updatePhaseSchema>;
export type AddSlotInput = z.infer<typeof addSlotSchema>;

export interface ProgramDTO {
	id: number;
	name: string;
	goal: ProgramGoal;
	description: string | null;
	/** 'YYYY-MM-DD' giờ địa phương; null = không theo. Trạng thái tính bằng programStatus(). */
	startDate: string | null;
	repeat: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string | null;
}

export interface ProgramPhaseDTO {
	id: number;
	programId: number;
	position: number;
	name: string;
	weeks: number;
	note: string | null;
	createdAt: string;
	updatedAt: string | null;
}

/** Giáo án trong ô lịch — đủ để vẽ ô và cộng thời lượng tuần. Join live (slot tham chiếu giáo án). */
export interface SlotRoutineDTO {
	name: string;
	description: string | null;
	itemCount: number;
	estimatedSec: number;
	isArchived: boolean;
	previews: ExercisePreviewDTO[];
}

export interface ProgramSlotDTO {
	id: number;
	phaseId: number;
	weekday: number; // ISO 1 = Thứ 2 … 7 = CN
	routineId: number;
	position: number;
	routine: SlotRoutineDTO;
}

export interface ProgramPhaseDetailDTO extends ProgramPhaseDTO {
	/** Theo weekday rồi position. */
	slots: ProgramSlotDTO[];
}

export interface ProgramDetailDTO extends ProgramDTO {
	/** Theo position — luôn ≥ 1 giai đoạn. */
	phases: ProgramPhaseDetailDTO[];
}
