import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { exercises, programPhases, programSlots, programs, routineItems, routines } from '../database/schema';
import type { NewRoutine, NewRoutineItem } from '../database/schema';

// --- Routines ---

export function listRoutines(filter: { includeArchived?: boolean }) {
	return useDB()
		.select()
		.from(routines)
		.where(filter.includeArchived ? undefined : eq(routines.isArchived, false))
		.orderBy(asc(routines.sortOrder), asc(routines.id));
}

export async function listRoutinesByIds(ids: number[]) {
	if (ids.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(ids, D1_MAX_PARAMS - 10).map((part) => db.select().from(routines).where(inArray(routines.id, part))),
	);
	return parts.flat();
}

/** Cặp (giáo án, chương trình) khác nhau — chương trình nào có lịch dùng giáo án nào. */
export function listProgramUsage() {
	return useDB()
		.selectDistinct({ routineId: programSlots.routineId, id: programs.id, name: programs.name })
		.from(programSlots)
		.innerJoin(programPhases, eq(programPhases.id, programSlots.phaseId))
		.innerJoin(programs, eq(programs.id, programPhases.programId))
		.orderBy(asc(programs.sortOrder), asc(programs.id));
}

export async function getRoutineById(id: number) {
	const rows = await useDB().select().from(routines).where(eq(routines.id, id)).limit(1);
	return rows[0] ?? null;
}

export function listAllNames() {
	return useDB().select({ id: routines.id, name: routines.name }).from(routines);
}

export async function maxSortOrder(): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${routines.sortOrder})` })
		.from(routines);
	return rows[0]?.max ?? -1;
}

export async function createRoutine(data: Omit<NewRoutine, 'id' | 'createdAt' | 'updatedAt'>) {
	const db = useDB();
	const result = await db.insert(routines).values(data).run();
	const lastRowId = getLastRowId(result);
	const [saved] = await db.select().from(routines).where(eq(routines.id, lastRowId)).limit(1);
	if (!saved) throw new Error('Routine insert failed — row not found after insert');
	return saved;
}

/**
 * Tạo nhiều giáo án kèm item trong MỘT batch (transaction ⇒ nguyên tử). Item trỏ giáo án qua
 * subquery theo tên (tên unique, service đã trim) — trong cùng batch chưa có id giáo án.
 */
export async function createRoutines(
	list: {
		data: Omit<NewRoutine, 'id' | 'createdAt' | 'updatedAt'>;
		items: Omit<NewRoutineItem, 'id' | 'routineId' | 'position' | 'createdAt' | 'updatedAt'>[];
	}[],
) {
	const db = useDB();
	// 6 cột bind/giáo án ⇒ 16 giáo án mỗi câu; item 9 cột bind (routine_id qua subquery 1 tham số) ⇒ 11.
	const routineInserts = chunk(
		list.map((r) => r.data),
		Math.floor(D1_MAX_PARAMS / 6),
	).map((part) => db.insert(routines).values(part));
	const itemRows = list.flatMap(({ data, items }) =>
		items.map((it, position) => ({
			...it,
			routineId: sql<number>`(SELECT ${routines.id} FROM ${routines} WHERE ${routines.name} = ${data.name})`,
			position,
		})),
	);
	const itemInserts = chunk(itemRows, Math.floor(D1_MAX_PARAMS / 9)).map((part) => db.insert(routineItems).values(part));
	const [first, ...rest] = [...routineInserts, ...itemInserts];
	if (first) await db.batch([first, ...rest]);
}

export async function updateRoutine(id: number, data: Partial<Omit<NewRoutine, 'id' | 'createdAt'>>) {
	await useDB()
		.update(routines)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(routines.id, id));
	return getRoutineById(id);
}

export async function removeRoutine(id: number) {
	await useDB().delete(routines).where(eq(routines.id, id));
}

// --- Items ---

const itemWithExercise = {
	id: routineItems.id,
	routineId: routineItems.routineId,
	exerciseId: routineItems.exerciseId,
	position: routineItems.position,
	sets: routineItems.sets,
	reps: routineItems.reps,
	holdSec: routineItems.holdSec,
	relaxSec: routineItems.relaxSec,
	durationSec: routineItems.durationSec,
	restSec: routineItems.restSec,
	createdAt: routineItems.createdAt,
	updatedAt: routineItems.updatedAt,
	exerciseName: exercises.name,
	exerciseCategory: exercises.category,
	exerciseMode: exercises.mode,
	exerciseComboStyle: exercises.comboStyle,
	exerciseInstructions: exercises.instructions,
	exerciseIsArchived: exercises.isArchived,
};

export type RoutineItemRow = Awaited<ReturnType<typeof listItemsWithExercise>>[number];

export async function listItemsWithExercise(routineIds: number[]) {
	if (routineIds.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(routineIds, D1_MAX_PARAMS - 10).map((ids) =>
			db
				.select(itemWithExercise)
				.from(routineItems)
				.innerJoin(exercises, eq(exercises.id, routineItems.exerciseId))
				.where(inArray(routineItems.routineId, ids))
				.orderBy(asc(routineItems.routineId), asc(routineItems.position), asc(routineItems.id)),
		),
	);
	return parts.flat();
}

export async function getItemById(itemId: number) {
	const rows = await useDB().select().from(routineItems).where(eq(routineItems.id, itemId)).limit(1);
	return rows[0] ?? null;
}

export async function listItemIds(routineId: number): Promise<number[]> {
	const rows = await useDB()
		.select({ id: routineItems.id })
		.from(routineItems)
		.where(eq(routineItems.routineId, routineId));
	return rows.map((r) => r.id);
}

export async function maxItemPosition(routineId: number): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${routineItems.position})` })
		.from(routineItems)
		.where(eq(routineItems.routineId, routineId));
	return rows[0]?.max ?? -1;
}

export async function createItem(data: Omit<NewRoutineItem, 'id' | 'createdAt' | 'updatedAt'>) {
	const db = useDB();
	const result = await db.insert(routineItems).values(data).run();
	const lastRowId = getLastRowId(result);
	const [saved] = await db.select().from(routineItems).where(eq(routineItems.id, lastRowId)).limit(1);
	if (!saved) throw new Error('Routine item insert failed — row not found after insert');
	return saved;
}

export async function updateItem(
	itemId: number,
	data: Partial<Omit<NewRoutineItem, 'id' | 'routineId' | 'exerciseId' | 'createdAt'>>,
) {
	await useDB()
		.update(routineItems)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(routineItems.id, itemId));
}

export async function removeItem(itemId: number) {
	await useDB().delete(routineItems).where(eq(routineItems.id, itemId));
}

/** Ghi lại position = thứ tự trong `itemIds`. Một batch = một transaction ở D1. */
export async function reorderItems(routineId: number, itemIds: number[]) {
	const db = useDB();
	const now = new Date();
	const statements = itemIds.map((id, position) =>
		db
			.update(routineItems)
			.set({ position, updatedAt: now })
			.where(and(eq(routineItems.id, id), eq(routineItems.routineId, routineId))),
	);
	const [first, ...rest] = statements;
	if (!first) return;
	await db.batch([first, ...rest]);
}
