import { z } from 'zod';

// Query params từ URL luôn là string. Empty string ("") nghĩa là "không truyền" —
// validator chặt (date/enum/coerce) reject "" → 400. Wrap field optional qua helper này.
export function optQuery<T extends z.ZodTypeAny>(schema: T) {
	return z.preprocess((v) => (v === '' ? undefined : v), schema.optional());
}

export const dateStr = z.iso.date();

export const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

// Giới hạn thông số bài tập — dùng chung cho thư viện, item giáo án và log buổi tập.
export const paramFields = {
	sets: z.number().int().min(1, 'Ít nhất 1 set').max(20),
	reps: z.number().int().min(1, 'Ít nhất 1 lần').max(200),
	holdSec: z.number().int().min(1, 'Giữ ít nhất 1 giây').max(600),
	relaxSec: z.number().int().min(0).max(600),
	durationSec: z.number().int().min(1, 'Ít nhất 1 giây').max(3600),
	restSec: z.number().int().min(0).max(600),
};

export function hasAnyField(d: Record<string, unknown>): boolean {
	return Object.values(d).some((v) => v !== undefined);
}
