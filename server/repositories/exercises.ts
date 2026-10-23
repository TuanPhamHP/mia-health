import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { exerciseComponents, exercises, routineItems } from '../database/schema';
import type { ExerciseCategory, NewExercise, NewExerciseComponent } from '../database/schema';

type ComponentData = Omit<NewExerciseComponent, 'id' | 'comboId' | 'position' | 'createdAt'>;

export function listExercises(filter: { category?: ExerciseCategory; includeArchived?: boolean }) {
	const conditions = [];
	if (filter.category) conditions.push(eq(exercises.category, filter.category));
	if (!filter.includeArchived) conditions.push(eq(exercises.isArchived, false));
	return useDB()
		.select()
		.from(exercises)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(asc(exercises.category), asc(exercises.name));
}

export async function getExerciseById(id: number) {
	const rows = await useDB().select().from(exercises).where(eq(exercises.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function listExercisesByIds(ids: number[]) {
	if (ids.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(ids, D1_MAX_PARAMS - 10).map((part) => db.select().from(exercises).where(inArray(exercises.id, part))),
	);
	return parts.flat();
}

// Trả cả id để service so tên không phân biệt hoa thường bằng JS: lower() của SQLite
// chỉ hạ chữ ASCII, "Đ"/"Ơ" lọt qua.
export function listAllNames() {
	return useDB().select({ id: exercises.id, name: exercises.name }).from(exercises);
}

export async function findExistingIds(ids: number[]): Promise<number[]> {
	if (ids.length === 0) return [];
	const out: number[] = [];
	for (const part of chunk(ids, D1_MAX_PARAMS - 10)) {
		const rows = await useDB().select({ id: exercises.id }).from(exercises).where(inArray(exercises.id, part));
		out.push(...rows.map((r) => r.id));
	}
	return out;
}

/** exerciseId → số giáo án (khác nhau) đang dùng bài đó. */
export async function countRoutineUsage(): Promise<Map<number, number>> {
	const rows = await useDB()
		.select({
			exerciseId: routineItems.exerciseId,
			routines: sql<number>`COUNT(DISTINCT ${routineItems.routineId})`,
		})
		.from(routineItems)
		.groupBy(routineItems.exerciseId);
	return new Map(rows.map((r) => [r.exerciseId, r.routines]));
}

export async function countRoutineUsageFor(exerciseId: number): Promise<number> {
	const rows = await useDB()
		.select({ routines: sql<number>`COUNT(DISTINCT ${routineItems.routineId})` })
		.from(routineItems)
		.where(eq(routineItems.exerciseId, exerciseId));
	return rows[0]?.routines ?? 0;
}

/** exerciseId → số bài kết hợp (khác nhau) đang dùng bài đó làm bài con. */
export async function countComboUsage(): Promise<Map<number, number>> {
	const rows = await useDB()
		.select({
			exerciseId: exerciseComponents.exerciseId,
			combos: sql<number>`COUNT(DISTINCT ${exerciseComponents.comboId})`,
		})
		.from(exerciseComponents)
		.groupBy(exerciseComponents.exerciseId);
	return new Map(rows.map((r) => [r.exerciseId, r.combos]));
}

export async function countComboUsageFor(exerciseId: number): Promise<number> {
	const rows = await useDB()
		.select({ combos: sql<number>`COUNT(DISTINCT ${exerciseComponents.comboId})` })
		.from(exerciseComponents)
		.where(eq(exerciseComponents.exerciseId, exerciseId));
	return rows[0]?.combos ?? 0;
}

// --- Bài con của bài kết hợp ---

const componentWithExercise = {
	id: exerciseComponents.id,
	comboId: exerciseComponents.comboId,
	exerciseId: exerciseComponents.exerciseId,
	position: exerciseComponents.position,
	sets: exerciseComponents.sets,
	reps: exerciseComponents.reps,
	holdSec: exerciseComponents.holdSec,
	relaxSec: exerciseComponents.relaxSec,
	durationSec: exerciseComponents.durationSec,
	restSec: exerciseComponents.restSec,
	exerciseName: exercises.name,
	exerciseCategory: exercises.category,
	exerciseMode: exercises.mode,
	exerciseInstructions: exercises.instructions,
	exerciseIsArchived: exercises.isArchived,
};

export type ComponentRow = Awaited<ReturnType<typeof listComponents>>[number];

export async function listComponents(comboIds: number[]) {
	if (comboIds.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(comboIds, D1_MAX_PARAMS - 10).map((ids) =>
			db
				.select(componentWithExercise)
				.from(exerciseComponents)
				.innerJoin(exercises, eq(exercises.id, exerciseComponents.exerciseId))
				.where(inArray(exerciseComponents.comboId, ids))
				.orderBy(asc(exerciseComponents.comboId), asc(exerciseComponents.position), asc(exerciseComponents.id)),
		),
	);
	return parts.flat();
}

// 9 cột bind/bài con (id, created_at để default) ⇒ tối đa 11 bài mỗi câu INSERT.
function insertComponents(comboId: number, components: ComponentData[]) {
	const rows = components.map((c, position) => ({ ...c, comboId, position }));
	return chunk(rows, Math.floor(D1_MAX_PARAMS / 9)).map((part) => useDB().insert(exerciseComponents).values(part));
}

export async function createExercise(
	data: Omit<NewExercise, 'id' | 'createdAt' | 'updatedAt'>,
	components: ComponentData[] = [],
) {
	const db = useDB();
	const result = await db.insert(exercises).values(data).run();
	const lastRowId = getLastRowId(result);

	// Như createSessionWithEntries: cần id cha trước, bài con ghi trong MỘT batch; batch
	// lỗi ⇒ xoá bài kết hợp vừa tạo để không để lại bài kết hợp rỗng.
	const [first, ...rest] = insertComponents(lastRowId, components);
	if (first) {
		try {
			await db.batch([first, ...rest]);
		} catch (err) {
			await db.delete(exercises).where(eq(exercises.id, lastRowId));
			throw err;
		}
	}

	const [saved] = await db.select().from(exercises).where(eq(exercises.id, lastRowId)).limit(1);
	if (!saved) throw new Error('Exercise insert failed — row not found after insert');
	return saved;
}

/** `components` có mặt ⇒ thay toàn bộ danh sách bài con, cùng batch với UPDATE (nguyên tử). */
export async function updateExercise(
	id: number,
	data: Partial<Omit<NewExercise, 'id' | 'createdAt'>>,
	components?: ComponentData[],
) {
	const db = useDB();
	const update = db
		.update(exercises)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(exercises.id, id));
	if (components === undefined) {
		await update;
	} else {
		await db.batch([
			update,
			db.delete(exerciseComponents).where(eq(exerciseComponents.comboId, id)),
			...insertComponents(id, components),
		]);
	}
	return getExerciseById(id);
}

export async function removeExercise(id: number) {
	// exercise_components của bài kết hợp đi theo nhờ ON DELETE CASCADE.
	await useDB().delete(exercises).where(eq(exercises.id, id));
}
