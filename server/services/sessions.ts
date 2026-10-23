import * as repo from '../repositories/sessions';
import * as exercisesSvc from './exercises';
import * as routinesSvc from './routines';
import type { SessionEntry, WorkoutSession } from '../database/schema';
import type { SessionEntryInput } from '../../shared/types/sessions';
import type { SessionComputed } from '../types/sessions';

export interface CreateSessionData {
	date: string;
	routineId?: number | null;
	title: string;
	startedAt?: string | null;
	durationSec: number;
	completed?: boolean;
	feeling?: number | null;
	note?: string | null;
	entries?: SessionEntryInput[];
}

export interface UpdateSessionData {
	date?: string;
	title?: string;
	durationSec?: number;
	completed?: boolean;
	feeling?: number | null;
	note?: string | null;
}

function toComputed(session: WorkoutSession, entries: SessionEntry[]): SessionComputed {
	return { ...session, entries };
}

async function attachEntries(sessions: WorkoutSession[]): Promise<SessionComputed[]> {
	const entries = await repo.listEntries(sessions.map((s) => s.id));
	const bySession = new Map<number, SessionEntry[]>();
	for (const e of entries) {
		const list = bySession.get(e.sessionId) ?? [];
		list.push(e);
		bySession.set(e.sessionId, list);
	}
	return sessions.map((s) => toComputed(s, bySession.get(s.id) ?? []));
}

export async function listSessions(filter: {
	from?: string;
	to?: string;
	routineId?: number;
	limit?: number;
}): Promise<SessionComputed[]> {
	if (filter.from && filter.to && filter.from > filter.to) {
		throw createError({ statusCode: 400, message: '`from` phải trước hoặc bằng `to`' });
	}
	return attachEntries(await repo.listSessions(filter));
}

export async function getSession(id: number): Promise<SessionComputed> {
	const session = await repo.getSessionById(id);
	if (!session) throw createError({ statusCode: 404, message: 'Buổi tập không tồn tại' });
	const [withEntries] = await attachEntries([session]);
	return withEntries!;
}

export async function addSession(data: CreateSessionData): Promise<SessionComputed> {
	const routineId = data.routineId ?? null;
	if (routineId !== null && !(await routinesSvc.routineExists(routineId))) {
		throw createError({ statusCode: 400, message: 'Giáo án không tồn tại' });
	}

	const entries = data.entries ?? [];
	const linkedIds = entries.map((e) => e.exerciseId).filter((id): id is number => id != null);
	const missing = await exercisesSvc.findMissingIds(linkedIds);
	if (missing.length > 0) {
		throw createError({ statusCode: 400, message: `Bài tập không tồn tại: ${missing.join(', ')}` });
	}

	const saved = await repo.createSessionWithEntries(
		{
			date: data.date,
			routineId,
			title: data.title.trim(),
			startedAt: data.startedAt ? new Date(data.startedAt) : null,
			durationSec: data.durationSec,
			completed: data.completed ?? true,
			feeling: data.feeling ?? null,
			note: data.note ?? null,
		},
		entries.map((e, position) => ({
			exerciseId: e.exerciseId ?? null,
			exerciseName: e.exerciseName.trim(),
			category: e.category,
			mode: e.mode,
			position,
			setsPlanned: e.setsPlanned,
			setsDone: e.setsDone,
			reps: e.reps,
			holdSec: e.holdSec,
			durationSec: e.durationSec,
		})),
	);
	return getSession(saved.id);
}

export async function editSession(id: number, data: UpdateSessionData): Promise<SessionComputed> {
	await getSession(id);
	const patch = data.title !== undefined ? { ...data, title: data.title.trim() } : data;
	await repo.updateSession(id, patch);
	return getSession(id);
}

export async function deleteSession(id: number): Promise<SessionComputed> {
	const dto = await getSession(id);
	await repo.removeSession(id);
	return dto;
}
