import { z } from 'zod';
import { boolQuery, hasAnyField, optQuery, paramFields } from './common';

const scheduleMask = z.number().int().min(0).max(127);
const prepSec = z.number().int().min(0).max(60);

export const createRoutineSchema = z.object({
	name: z.string().trim().min(1, 'Tên giáo án không được rỗng').max(100),
	description: z.string().max(2000).nullable().optional(),
	scheduleMask: scheduleMask.optional(),
	prepSec: prepSec.optional(),
});

export const updateRoutineSchema = z
	.object({
		name: z.string().trim().min(1).max(100).optional(),
		description: z.string().max(2000).nullable().optional(),
		scheduleMask: scheduleMask.optional(),
		prepSec: prepSec.optional(),
		sortOrder: z.number().int().min(0).optional(),
		isArchived: z.boolean().optional(),
	})
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const routineQuerySchema = z.object({
	includeArchived: optQuery(boolQuery),
});

// Thông số bỏ trống → service copy từ bài tập trong thư viện.
export const addRoutineItemSchema = z.object({
	exerciseId: z.number().int().positive(),
	sets: paramFields.sets.optional(),
	reps: paramFields.reps.optional(),
	holdSec: paramFields.holdSec.optional(),
	relaxSec: paramFields.relaxSec.optional(),
	durationSec: paramFields.durationSec.optional(),
	restSec: paramFields.restSec.optional(),
});

export const updateRoutineItemSchema = z
	.object({
		sets: paramFields.sets.optional(),
		reps: paramFields.reps.optional(),
		holdSec: paramFields.holdSec.optional(),
		relaxSec: paramFields.relaxSec.optional(),
		durationSec: paramFields.durationSec.optional(),
		restSec: paramFields.restSec.optional(),
	})
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const reorderRoutineItemsSchema = z.object({
	itemIds: z.array(z.number().int().positive()).min(1, 'Danh sách rỗng'),
});
