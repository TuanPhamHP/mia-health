import { z } from 'zod';
import { dateStr, hasAnyField } from './common';

export const programGoalEnum = z.enum(['fat_loss', 'muscle', 'health', 'rehab', 'pelvic', 'mobility', 'other']);

const programName = z.string().trim().min(1, 'Tên chương trình không được rỗng').max(100);
const phaseName = z.string().trim().min(1, 'Tên giai đoạn không được rỗng').max(100);
const phaseWeeks = z.number().int().min(1, 'Giai đoạn ít nhất 1 tuần').max(52, 'Giai đoạn tối đa 52 tuần');
const note = z.string().max(2000).nullable().optional();

export const createProgramSchema = z.object({
	name: programName,
	goal: programGoalEnum,
	description: note,
	repeat: z.boolean().optional(),
});

// `startDate`: ngày client chọn theo giờ địa phương (server không biết "hôm nay"); null = dừng theo.
export const updateProgramSchema = z
	.object({
		name: programName.optional(),
		goal: programGoalEnum.optional(),
		description: note,
		repeat: z.boolean().optional(),
		startDate: dateStr.nullable().optional(),
		sortOrder: z.number().int().min(0).optional(),
	})
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const createPhaseSchema = z.object({
	name: phaseName,
	weeks: phaseWeeks,
	note,
	// Có ⇒ chép lịch tuần của giai đoạn này (cùng chương trình) sang giai đoạn mới.
	copyFromPhaseId: z.number().int().positive().optional(),
});

export const updatePhaseSchema = z
	.object({ name: phaseName.optional(), weeks: phaseWeeks.optional(), note })
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const reorderPhasesSchema = z.object({
	phaseIds: z.array(z.number().int().positive()).min(1, 'Danh sách rỗng'),
});

export const addSlotSchema = z.object({
	weekday: z.number().int().min(1).max(7),
	routineId: z.number().int().positive(),
});
