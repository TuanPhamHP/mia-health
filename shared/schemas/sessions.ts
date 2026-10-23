import { z } from 'zod';
import { dateStr, hasAnyField, optQuery } from './common';
import { exerciseCategoryEnum, singleModeEnum } from './exercises';

// Entry mang sẵn name/category/mode (snapshot) — lịch sử phải đọc được kể cả khi bài
// tập đã bị xoá khỏi thư viện. exerciseId chỉ để liên kết, service kiểm tồn tại.
// Bài kết hợp được ghi thành từng bài con ⇒ mode luôn là bài đơn.
export const sessionEntryInputSchema = z.object({
	exerciseId: z.number().int().positive().nullable().optional(),
	exerciseName: z.string().trim().min(1).max(100),
	category: exerciseCategoryEnum,
	mode: singleModeEnum,
	setsPlanned: z.number().int().min(0).max(50),
	setsDone: z.number().int().min(0).max(50),
	reps: z.number().int().min(0).max(200),
	holdSec: z.number().int().min(0).max(600),
	durationSec: z.number().int().min(0).max(3600),
});

const feeling = z.number().int().min(1).max(5);

export const createSessionSchema = z.object({
	date: dateStr,
	routineId: z.number().int().positive().nullable().optional(),
	title: z.string().trim().min(1, 'Tên buổi tập không được rỗng').max(100),
	startedAt: z.iso.datetime({ offset: true }).nullable().optional(),
	durationSec: z.number().int().min(0).max(86_400),
	completed: z.boolean().optional(),
	feeling: feeling.nullable().optional(),
	note: z.string().max(2000).nullable().optional(),
	// Bài kết hợp trải thành từng bài con ⇒ số entry có thể lớn hơn nhiều so với số item giáo án.
	entries: z.array(sessionEntryInputSchema).max(200).optional(),
});

export const updateSessionSchema = z
	.object({
		date: dateStr.optional(),
		title: z.string().trim().min(1).max(100).optional(),
		durationSec: z.number().int().min(0).max(86_400).optional(),
		completed: z.boolean().optional(),
		feeling: feeling.nullable().optional(),
		note: z.string().max(2000).nullable().optional(),
	})
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const sessionQuerySchema = z.object({
	from: optQuery(dateStr),
	to: optQuery(dateStr),
	routineId: optQuery(z.coerce.number().int().positive()),
	limit: optQuery(z.coerce.number().int().min(1).max(500)),
});
