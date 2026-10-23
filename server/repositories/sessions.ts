import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { sessionEntries, workoutSessions } from '../database/schema';
import type { NewSessionEntry, NewWorkoutSession } from '../database/schema';

export function listSessions(filter: { from?: string; to?: string; routineId?: number; limit?: number }) {
	const conditions = [];
	if (filter.from) conditions.push(gte(workoutSessions.date, filter.from));
	if (filter.to) conditions.push(lte(workoutSessions.date, filter.to));
	if (filter.routineId) conditions.push(eq(workoutSessions.routineId, filter.routineId));
	return useDB()
		.select()
		.from(workoutSessions)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(workoutSessions.date), desc(workoutSessions.id))
		.limit(filter.limit ?? 200);
}

export async function getSessionById(id: number) {
	const rows = await useDB().select().from(workoutSessions).where(eq(workoutSessions.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function listEntries(sessionIds: number[]) {
	if (sessionIds.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(sessionIds, D1_MAX_PARAMS - 10).map((ids) =>
			db
				.select()
				.from(sessionEntries)
				.where(inArray(sessionEntries.sessionId, ids))
				.orderBy(asc(sessionEntries.sessionId), asc(sessionEntries.position), asc(sessionEntries.id)),
		),
	);
	return parts.flat();
}

// D1 không có transaction tương tác: ghi buổi tập trước (cần id), rồi ghi entries trong
// MỘT batch (batch = transaction). Batch lỗi ⇒ xoá buổi tập vừa tạo để không để lại
// buổi "rỗng" — lỗi vẫn ném lên cho caller.
export async function createSessionWithEntries(
	session: Omit<NewWorkoutSession, 'id' | 'createdAt' | 'updatedAt'>,
	entries: Omit<NewSessionEntry, 'id' | 'sessionId'>[],
) {
	const db = useDB();
	const result = await db.insert(workoutSessions).values(session).run();
	const sessionId = getLastRowId(result);

	if (entries.length > 0) {
		const rows = entries.map((e) => ({ ...e, sessionId }));
		// 11 cột/entry ⇒ tối đa 9 entry mỗi câu INSERT để nằm dưới trần 100 tham số.
		const statements = chunk(rows, Math.floor(D1_MAX_PARAMS / 11)).map((part) =>
			db.insert(sessionEntries).values(part),
		);
		const [first, ...rest] = statements;
		try {
			if (first) await db.batch([first, ...rest]);
		} catch (err) {
			await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));
			throw err;
		}
	}

	const saved = await getSessionById(sessionId);
	if (!saved) throw new Error('Session insert failed — row not found after insert');
	return saved;
}

export async function updateSession(id: number, data: Partial<Omit<NewWorkoutSession, 'id' | 'createdAt'>>) {
	await useDB()
		.update(workoutSessions)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(workoutSessions.id, id));
	return getSessionById(id);
}

export async function removeSession(id: number) {
	// session_entries đi theo nhờ ON DELETE CASCADE.
	await useDB().delete(workoutSessions).where(eq(workoutSessions.id, id));
}
