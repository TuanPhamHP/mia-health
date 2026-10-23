import type { z } from 'zod';
import type { createSessionSchema, sessionEntryInputSchema, updateSessionSchema } from '../schemas/sessions';
import type { ExerciseCategory, SingleMode } from './exercises';

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type SessionEntryInput = z.infer<typeof sessionEntryInputSchema>;

export interface SessionEntryDTO {
	id: number;
	sessionId: number;
	exerciseId: number | null;
	exerciseName: string;
	category: ExerciseCategory;
	mode: SingleMode;
	position: number;
	setsPlanned: number;
	setsDone: number;
	reps: number;
	holdSec: number;
	durationSec: number;
}

export interface SessionDTO {
	id: number;
	date: string;
	routineId: number | null;
	title: string;
	startedAt: string | null;
	durationSec: number;
	completed: boolean;
	feeling: number | null;
	note: string | null;
	createdAt: string;
	updatedAt: string | null;
	entries: SessionEntryDTO[];
}
