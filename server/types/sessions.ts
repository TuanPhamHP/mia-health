import type { SessionEntry, WorkoutSession } from '../database/schema';
import type { SessionDTO, SessionEntryDTO } from '../../shared/types/sessions';
import type { Serialized } from '../../shared/types/utils';

export type SessionComputed = WorkoutSession & { entries: SessionEntry[] };

type _SessionEntryCheck = Serialized<SessionEntry> extends SessionEntryDTO
	? SessionEntryDTO extends Serialized<SessionEntry>
		? true
		: false
	: false;
const _assertSessionEntryDTO: _SessionEntryCheck = true;

type _SessionCheck = Serialized<WorkoutSession> extends Omit<SessionDTO, 'entries'>
	? Omit<SessionDTO, 'entries'> extends Serialized<WorkoutSession>
		? true
		: false
	: false;
const _assertSessionDTO: _SessionCheck = true;
