import type { z } from 'zod';
import type {
	addRoutineItemSchema,
	createRoutineSchema,
	updateRoutineItemSchema,
	updateRoutineSchema,
} from '../schemas/routines';
import type {
	ComboStyle,
	ExerciseCategory,
	ExerciseComponentDTO,
	ExerciseMediaDTO,
	ExerciseMode,
	ExerciseParams,
} from './exercises';

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;
export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;
export type AddRoutineItemInput = z.infer<typeof addRoutineItemSchema>;
export type UpdateRoutineItemInput = z.infer<typeof updateRoutineItemSchema>;

export interface RoutineDTO {
	id: number;
	name: string;
	description: string | null;
	scheduleMask: number;
	prepSec: number;
	sortOrder: number;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string | null;
}

/** Xem trước một bài trong giáo án — ảnh bìa (nếu có) hoặc ô màu theo nhóm. */
export interface ExercisePreviewDTO {
	name: string;
	category: ExerciseCategory;
	isCombo: boolean;
	cover: { url: string; video: boolean } | null;
}

/** List view — kèm số bài và thời lượng ước tính (cùng hàm timeline với player). */
export interface RoutineSummaryDTO extends RoutineDTO {
	itemCount: number;
	estimatedSec: number;
	/** Tối đa 4 bài đầu — để vẽ ô ảnh xem trước. */
	previews: ExercisePreviewDTO[];
}

export interface RoutineItemExerciseDTO {
	name: string;
	category: ExerciseCategory;
	mode: ExerciseMode;
	comboStyle: ComboStyle;
	instructions: string | null;
	isArchived: boolean;
	/** Bài kết hợp: bài con join live từ định nghĩa trong thư viện (item chỉ copy số vòng / nghỉ giữa vòng). */
	components: ExerciseComponentDTO[];
	media: ExerciseMediaDTO[];
}

export interface RoutineItemDTO extends ExerciseParams {
	id: number;
	routineId: number;
	exerciseId: number;
	position: number;
	createdAt: string;
	updatedAt: string | null;
	exercise: RoutineItemExerciseDTO;
}

export interface RoutineDetailDTO extends RoutineSummaryDTO {
	items: RoutineItemDTO[];
}
