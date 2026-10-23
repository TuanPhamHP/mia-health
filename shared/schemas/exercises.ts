import { z } from 'zod';
import { boolQuery, hasAnyField, optQuery, paramFields } from './common';

export const exerciseCategoryEnum = z.enum([
	'kegel',
	'strength',
	'gymnastics',
	'stretching',
	'cardio',
	'breathing',
	'other',
]);
export const singleModeEnum = z.enum(['reps', 'hold', 'duration']);
export const exerciseModeEnum = z.enum(['reps', 'hold', 'duration', 'combo']);
export const comboStyleEnum = z.enum(['circuit', 'sequence']);

// Bài con của bài kết hợp — thông số bỏ trống ⇒ service copy từ bài trong thư viện.
// Trùng bài được phép (VD luân phiên Kegel → Plank → Kegel).
export const comboComponentInputSchema = z.object({
	exerciseId: z.number().int().positive(),
	sets: paramFields.sets.optional(),
	reps: paramFields.reps.optional(),
	holdSec: paramFields.holdSec.optional(),
	relaxSec: paramFields.relaxSec.optional(),
	durationSec: paramFields.durationSec.optional(),
	restSec: paramFields.restSec.optional(),
});

const comboComponents = z
	.array(comboComponentInputSchema)
	.min(2, 'Bài kết hợp cần ít nhất 2 bài')
	.max(20, 'Bài kết hợp tối đa 20 bài');

const exerciseBase = {
	name: z.string().trim().min(1, 'Tên bài tập không được rỗng').max(100),
	category: exerciseCategoryEnum,
	mode: exerciseModeEnum,
	comboStyle: comboStyleEnum.optional(),
	components: comboComponents.optional(),
	sets: paramFields.sets.optional(),
	reps: paramFields.reps.optional(),
	holdSec: paramFields.holdSec.optional(),
	relaxSec: paramFields.relaxSec.optional(),
	durationSec: paramFields.durationSec.optional(),
	restSec: paramFields.restSec.optional(),
	instructions: z.string().max(4000).nullable().optional(),
};

// Thông số bỏ trống → lấy default ở DB (3 set, 10 lần, giữ 5s, thả 5s, 30s, nghỉ 30s).
// Bài kết hợp: `sets` = số vòng, `restSec` = nghỉ giữa vòng (chỉ dùng khi luân phiên).
export const createExerciseSchema = z
	.object(exerciseBase)
	.refine((d) => d.mode !== 'combo' || d.components !== undefined, {
		message: 'Bài kết hợp cần danh sách bài con',
		path: ['components'],
	})
	.refine((d) => d.mode === 'combo' || d.components === undefined, {
		message: 'Chỉ bài kết hợp mới có bài con',
		path: ['components'],
	});

export const updateExerciseSchema = z
	.object({
		name: exerciseBase.name.optional(),
		category: exerciseCategoryEnum.optional(),
		mode: exerciseModeEnum.optional(),
		comboStyle: exerciseBase.comboStyle,
		// Gửi lên ⇒ thay TOÀN BỘ danh sách bài con (thứ tự = thứ tự mảng).
		components: exerciseBase.components,
		sets: exerciseBase.sets,
		reps: exerciseBase.reps,
		holdSec: exerciseBase.holdSec,
		relaxSec: exerciseBase.relaxSec,
		durationSec: exerciseBase.durationSec,
		restSec: exerciseBase.restSec,
		instructions: exerciseBase.instructions,
		isArchived: z.boolean().optional(),
	})
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const exerciseQuerySchema = z.object({
	category: optQuery(exerciseCategoryEnum),
	includeArchived: optQuery(boolQuery),
});
