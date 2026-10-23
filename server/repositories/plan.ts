import { and, asc, eq, inArray } from 'drizzle-orm';
import { planChanges } from '../database/schema';
import type { NewPlanChange } from '../database/schema';

type ChangeRow = Omit<NewPlanChange, 'id' | 'createdAt'>;

export function listChanges(date: string) {
	return useDB().select().from(planChanges).where(eq(planChanges.date, date)).orderBy(asc(planChanges.id));
}

export async function getChangeById(id: number) {
	const rows = await useDB().select().from(planChanges).where(eq(planChanges.id, id)).limit(1);
	return rows[0] ?? null;
}

/**
 * Bỏ qua / đổi buổi: mỗi buổi theo lịch một thay đổi trong ngày — xoá thay đổi cũ của đúng
 * buổi đó rồi ghi cái mới, cùng một batch (nguyên tử).
 */
export async function replaceProgramChange(data: ChangeRow & { programId: number }) {
	const db = useDB();
	await db.batch([
		db
			.delete(planChanges)
			.where(
				and(
					eq(planChanges.date, data.date),
					eq(planChanges.programId, data.programId),
					eq(planChanges.routineId, data.routineId),
					inArray(planChanges.kind, ['skip', 'swap']),
				),
			),
		db.insert(planChanges).values(data),
	]);
}

export async function createChange(data: ChangeRow) {
	await useDB().insert(planChanges).values(data);
}

export async function removeChange(id: number) {
	await useDB().delete(planChanges).where(eq(planChanges.id, id));
}
