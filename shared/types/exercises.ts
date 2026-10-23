import type { z } from 'zod';
import type { comboComponentInputSchema, createExerciseSchema, updateExerciseSchema } from '../schemas/exercises';
import type { addMediaLinkSchema, reorderMediaSchema, updateMediaSchema } from '../schemas/media';

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type ComboComponentInput = z.infer<typeof comboComponentInputSchema>;
export type AddMediaLinkInput = z.infer<typeof addMediaLinkSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>;

export type ExerciseCategory = 'kegel' | 'strength' | 'gymnastics' | 'stretching' | 'cardio' | 'breathing' | 'other';
/** Bài đơn — chạy trực tiếp trên màn hình tập. */
export type SingleMode = 'reps' | 'hold' | 'duration';
/** `combo` = bài kết hợp, trải thành các bài con (luôn là bài đơn) khi tập. */
export type ExerciseMode = SingleMode | 'combo';
export type ComboStyle = 'circuit' | 'sequence';
export type MediaKind = 'image' | 'youtube';

/** Ảnh / video hướng dẫn của bài tập. */
export interface ExerciseMediaDTO {
	id: number;
	exerciseId: number;
	position: number;
	kind: MediaKind;
	/** Ảnh: '/media/…' (tải lên) hoặc link https ngoài. YouTube: link đã chuẩn hoá (shared/utils/media.ts). */
	url: string;
	/** Có ⇒ ảnh tải lên R2 — xoá media là xoá luôn file. */
	storageKey: string | null;
	caption: string | null;
}

/** Thông số một bài — `mode` quyết định trường nào có nghĩa (xem schema.ts). */
export interface ExerciseParams {
	sets: number;
	reps: number;
	holdSec: number;
	relaxSec: number;
	durationSec: number;
	restSec: number;
}

/** Bài con của bài kết hợp: thông số riêng (copy lúc thêm) + thông tin bài join live từ thư viện. */
export interface ExerciseComponentDTO extends ExerciseParams {
	id: number;
	comboId: number;
	exerciseId: number;
	position: number;
	exercise: {
		name: string;
		category: ExerciseCategory;
		mode: SingleMode;
		instructions: string | null;
		isArchived: boolean;
		media: ExerciseMediaDTO[];
	};
}

export interface ExerciseDTO extends ExerciseParams {
	id: number;
	name: string;
	category: ExerciseCategory;
	mode: ExerciseMode;
	/** Chỉ có nghĩa khi mode = 'combo'. */
	comboStyle: ComboStyle;
	instructions: string | null;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string | null;
	/** Số giáo án đang dùng bài này. > 0 ⇒ DELETE trả 409, chỉ lưu trữ được. */
	routineCount: number;
	/** Số bài kết hợp đang dùng bài này làm bài con. > 0 ⇒ DELETE trả 409. */
	comboCount: number;
	/** Bài con theo thứ tự — rỗng nếu không phải bài kết hợp. */
	components: ExerciseComponentDTO[];
	/** Ảnh / video hướng dẫn theo thứ tự. */
	media: ExerciseMediaDTO[];
}
