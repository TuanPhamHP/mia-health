import type { Routine, RoutineItem } from '../database/schema';
import type {
	ExercisePreviewDTO,
	RoutineDTO,
	RoutineItemDTO,
	RoutineItemExerciseDTO,
} from '../../shared/types/routines';
import type { Serialized } from '../../shared/types/utils';

export type RoutineItemComputed = RoutineItem & { exercise: RoutineItemExerciseDTO };
export type RoutineSummaryComputed = Routine & {
	itemCount: number;
	estimatedSec: number;
	previews: ExercisePreviewDTO[];
};
export type RoutineDetailComputed = RoutineSummaryComputed & { items: RoutineItemComputed[] };

type _RoutineCheck = Serialized<Routine> extends RoutineDTO
	? RoutineDTO extends Serialized<Routine>
		? true
		: false
	: false;
const _assertRoutineDTO: _RoutineCheck = true;

type _RoutineItemCheck = Serialized<RoutineItemComputed> extends RoutineItemDTO
	? RoutineItemDTO extends Serialized<RoutineItemComputed>
		? true
		: false
	: false;
const _assertRoutineItemDTO: _RoutineItemCheck = true;
