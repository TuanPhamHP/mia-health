import { z } from 'zod';
import { dateStr } from './common';

const id = z.number().int().positive();

// `date` BẮT BUỘC từ client — server chạy UTC, không biết "hôm nay" của người tập.
export const planTodayQuerySchema = z.object({ date: dateStr });

// Thay đổi CHỈ cho ngày `date`; muốn đổi lâu dài thì sửa chương trình.
export const planChangeSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('skip'), date: dateStr, programId: id, routineId: id }),
	z.object({ kind: z.literal('swap'), date: dateStr, programId: id, routineId: id, replacementId: id }),
	z.object({ kind: z.literal('add'), date: dateStr, routineId: id }),
]);

// Chương trình mẫu "đang theo" bắt đầu từ ngày này (giờ địa phương của client).
export const seedPresetsSchema = z.object({ today: dateStr });
