import type { Exercise, ExerciseComponent, ExerciseMedia } from '../database/schema';
import type { ExerciseComponentDTO, ExerciseDTO, ExerciseMediaDTO } from '../../shared/types/exercises';
import type { Serialized } from '../../shared/types/utils';

/** Media — cột của exercise_media trừ created_at. */
export type ExerciseMediaComputed = Omit<ExerciseMedia, 'createdAt'>;

/** Bài con — cột của exercise_components (trừ created_at) + thông tin bài join live. */
export type ExerciseComponentComputed = Omit<ExerciseComponent, 'createdAt'> & {
	exercise: ExerciseComponentDTO['exercise'];
};

/** Row + số giáo án / bài kết hợp đang dùng + bài con + media — shape service trả ra. */
export type ExerciseComputed = Exercise & {
	routineCount: number;
	comboCount: number;
	components: ExerciseComponentComputed[];
	media: ExerciseMediaComputed[];
};

// Compile-time drift check: schema.ts ↔ DTO. Chỉ có tác dụng khi `yarn typecheck` chạy.
type _ExerciseCheck = Serialized<ExerciseComputed> extends ExerciseDTO
	? ExerciseDTO extends Serialized<ExerciseComputed>
		? true
		: false
	: false;
const _assertExerciseDTO: _ExerciseCheck = true;

type _ExerciseComponentCheck = Serialized<ExerciseComponentComputed> extends ExerciseComponentDTO
	? ExerciseComponentDTO extends Serialized<ExerciseComponentComputed>
		? true
		: false
	: false;
const _assertExerciseComponentDTO: _ExerciseComponentCheck = true;

type _ExerciseMediaCheck = Serialized<ExerciseMediaComputed> extends ExerciseMediaDTO
	? ExerciseMediaDTO extends Serialized<ExerciseMediaComputed>
		? true
		: false
	: false;
const _assertExerciseMediaDTO: _ExerciseMediaCheck = true;
