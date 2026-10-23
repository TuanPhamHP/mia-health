import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { programPhases, programSlots, programs } from '../database/schema';
import type { NewProgram, NewProgramPhase, NewProgramSlot } from '../database/schema';

type ProgramRow = Omit<NewProgram, 'id' | 'createdAt' | 'updatedAt'>;
type PhaseRow = Omit<NewProgramPhase, 'id' | 'programId' | 'position' | 'createdAt' | 'updatedAt'>;
type SlotRow = Omit<NewProgramSlot, 'id' | 'phaseId' | 'position' | 'createdAt'>;

// Subquery id theo tên (tên unique, service đã trim): trong cùng batch chưa có id vừa INSERT.
function programIdByName(name: string) {
	return sql<number>`(SELECT ${programs.id} FROM ${programs} WHERE ${programs.name} = ${name})`;
}

function phaseIdByPosition(programName: string, position: number) {
	return sql<number>`(SELECT ${programPhases.id} FROM ${programPhases} INNER JOIN ${programs} ON ${programs.id} = ${programPhases.programId} WHERE ${programs.name} = ${programName} AND ${programPhases.position} = ${position})`;
}

// --- Programs ---

export function listPrograms() {
	return useDB().select().from(programs).orderBy(asc(programs.sortOrder), asc(programs.id));
}

export async function getProgramById(id: number) {
	const rows = await useDB().select().from(programs).where(eq(programs.id, id)).limit(1);
	return rows[0] ?? null;
}

export function listAllNames() {
	return useDB().select({ id: programs.id, name: programs.name }).from(programs);
}

export async function maxSortOrder(): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${programs.sortOrder})` })
		.from(programs);
	return rows[0]?.max ?? -1;
}

/**
 * Tạo nhiều chương trình kèm giai đoạn + ô lịch trong MỘT batch (transaction ⇒ nguyên tử).
 * Giai đoạn trỏ chương trình qua tên, ô lịch trỏ giai đoạn qua (tên chương trình, position).
 */
export async function createPrograms(
	list: { data: ProgramRow; phases: { data: PhaseRow; slots: SlotRow[] }[] }[],
) {
	const db = useDB();
	// Bind/dòng: chương trình 6 ⇒ 16 dòng/câu; giai đoạn 5 (program_id qua subquery 1 tham số) ⇒ 20;
	// ô lịch 5 (phase_id qua subquery 2 tham số) ⇒ 20.
	const programInserts = chunk(
		list.map((p) => p.data),
		Math.floor(D1_MAX_PARAMS / 6),
	).map((part) => db.insert(programs).values(part));
	const phaseRows = list.flatMap((p) =>
		p.phases.map((ph, position) => ({ ...ph.data, programId: programIdByName(p.data.name), position })),
	);
	const phaseInserts = chunk(phaseRows, Math.floor(D1_MAX_PARAMS / 5)).map((part) =>
		db.insert(programPhases).values(part),
	);
	const slotRows = list.flatMap((p) =>
		p.phases.flatMap((ph, phasePosition) =>
			ph.slots.map((s, position) => ({ ...s, phaseId: phaseIdByPosition(p.data.name, phasePosition), position })),
		),
	);
	const slotInserts = chunk(slotRows, Math.floor(D1_MAX_PARAMS / 5)).map((part) => db.insert(programSlots).values(part));
	const [first, ...rest] = [...programInserts, ...phaseInserts, ...slotInserts];
	if (first) await db.batch([first, ...rest]);
}

export async function updateProgram(id: number, data: Partial<ProgramRow>) {
	await useDB()
		.update(programs)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(programs.id, id));
}

export async function removeProgram(id: number) {
	// Giai đoạn → ô lịch, plan_changes của chương trình đi theo nhờ ON DELETE CASCADE.
	await useDB().delete(programs).where(eq(programs.id, id));
}

// --- Phases ---

export async function listPhases(programIds: number[]) {
	if (programIds.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(programIds, D1_MAX_PARAMS - 10).map((ids) =>
			db
				.select()
				.from(programPhases)
				.where(inArray(programPhases.programId, ids))
				.orderBy(asc(programPhases.programId), asc(programPhases.position), asc(programPhases.id)),
		),
	);
	return parts.flat();
}

export async function getPhaseById(id: number) {
	const rows = await useDB().select().from(programPhases).where(eq(programPhases.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function maxPhasePosition(programId: number): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${programPhases.position})` })
		.from(programPhases)
		.where(eq(programPhases.programId, programId));
	return rows[0]?.max ?? -1;
}

/** `copySlotsFrom` có ⇒ chép lịch tuần của giai đoạn đó; chép lỗi ⇒ xoá giai đoạn vừa tạo (bù trừ). */
export async function createPhase(data: Omit<NewProgramPhase, 'id' | 'createdAt' | 'updatedAt'>, copySlotsFrom?: number) {
	const db = useDB();
	const phaseId = getLastRowId(await db.insert(programPhases).values(data).run());
	if (copySlotsFrom === undefined) return;
	try {
		await db.run(
			sql`INSERT INTO ${programSlots} (phase_id, weekday, routine_id, position) SELECT ${phaseId}, weekday, routine_id, position FROM ${programSlots} WHERE phase_id = ${copySlotsFrom}`,
		);
	} catch (err) {
		await db.delete(programPhases).where(eq(programPhases.id, phaseId));
		throw err;
	}
}

export async function updatePhase(id: number, data: Partial<PhaseRow>) {
	await useDB()
		.update(programPhases)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(programPhases.id, id));
}

export async function removePhase(id: number) {
	await useDB().delete(programPhases).where(eq(programPhases.id, id));
}

/** Ghi lại position = thứ tự trong `phaseIds`. Một batch = một transaction ở D1. */
export async function reorderPhases(programId: number, phaseIds: number[]) {
	const db = useDB();
	const now = new Date();
	const statements = phaseIds.map((id, position) =>
		db
			.update(programPhases)
			.set({ position, updatedAt: now })
			.where(and(eq(programPhases.id, id), eq(programPhases.programId, programId))),
	);
	const [first, ...rest] = statements;
	if (!first) return;
	await db.batch([first, ...rest]);
}

// --- Slots ---

const slotColumns = {
	id: programSlots.id,
	phaseId: programSlots.phaseId,
	weekday: programSlots.weekday,
	routineId: programSlots.routineId,
	position: programSlots.position,
};

export async function listSlots(phaseIds: number[]) {
	if (phaseIds.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(phaseIds, D1_MAX_PARAMS - 10).map((ids) =>
			db
				.select(slotColumns)
				.from(programSlots)
				.where(inArray(programSlots.phaseId, ids))
				.orderBy(asc(programSlots.phaseId), asc(programSlots.weekday), asc(programSlots.position), asc(programSlots.id)),
		),
	);
	return parts.flat();
}

export async function getSlotById(id: number) {
	const rows = await useDB().select(slotColumns).from(programSlots).where(eq(programSlots.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function maxSlotPosition(phaseId: number, weekday: number): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${programSlots.position})` })
		.from(programSlots)
		.where(and(eq(programSlots.phaseId, phaseId), eq(programSlots.weekday, weekday)));
	return rows[0]?.max ?? -1;
}

export async function createSlot(data: Omit<NewProgramSlot, 'id' | 'createdAt'>) {
	await useDB().insert(programSlots).values(data);
}

export async function removeSlot(id: number) {
	await useDB().delete(programSlots).where(eq(programSlots.id, id));
}
