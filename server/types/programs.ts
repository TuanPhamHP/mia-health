import type { Program, ProgramPhase, ProgramSlot } from '../database/schema';
import type {
	ProgramDTO,
	ProgramPhaseDTO,
	ProgramSlotDTO,
	SlotRoutineDTO,
} from '../../shared/types/programs';
import type { Serialized } from '../../shared/types/utils';

export type ProgramSlotComputed = Omit<ProgramSlot, 'createdAt'> & { routine: SlotRoutineDTO };
export type ProgramPhaseComputed = ProgramPhase & { slots: ProgramSlotComputed[] };
export type ProgramDetailComputed = Program & { phases: ProgramPhaseComputed[] };

type _ProgramCheck = Serialized<Program> extends ProgramDTO
	? ProgramDTO extends Serialized<Program>
		? true
		: false
	: false;
const _assertProgramDTO: _ProgramCheck = true;

type _PhaseCheck = Serialized<ProgramPhase> extends ProgramPhaseDTO
	? ProgramPhaseDTO extends Serialized<ProgramPhase>
		? true
		: false
	: false;
const _assertProgramPhaseDTO: _PhaseCheck = true;

type _SlotCheck = Serialized<ProgramSlotComputed> extends ProgramSlotDTO
	? ProgramSlotDTO extends Serialized<ProgramSlotComputed>
		? true
		: false
	: false;
const _assertProgramSlotDTO: _SlotCheck = true;
