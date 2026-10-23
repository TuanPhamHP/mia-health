import * as repo from '../repositories/programs';
import * as exercisesSvc from './exercises';
import * as routinesSvc from './routines';
import type { Program, ProgramGoal, Routine } from '../database/schema';
import type { ProgramDetailComputed, ProgramPhaseComputed, ProgramSlotComputed } from '../types/programs';

export interface CreateProgramData {
	name: string;
	goal: ProgramGoal;
	description?: string | null;
	repeat?: boolean;
}

export type UpdateProgramData = Partial<CreateProgramData> & { startDate?: string | null; sortOrder?: number };

export interface PhaseData {
	name: string;
	weeks: number;
	note?: string | null;
}

// Chương trình mới có sẵn một giai đoạn: tạo xong là nhặt giáo án vào lịch được ngay, và mọi
// chương trình luôn có ≥ 1 giai đoạn (programStatus mới tính được tuần).
const FIRST_PHASE: PhaseData = { name: 'Giai đoạn 1', weeks: 4 };

async function assertNameFree(name: string, exceptId?: number) {
	const key = exercisesSvc.nameKey(name);
	const clash = (await repo.listAllNames()).find((r) => r.id !== exceptId && exercisesSvc.nameKey(r.name) === key);
	if (clash) throw createError({ statusCode: 409, message: `Đã có chương trình tên "${clash.name}"` });
}

async function requireProgram(id: number): Promise<Program> {
	const row = await repo.getProgramById(id);
	if (!row) throw createError({ statusCode: 404, message: 'Chương trình không tồn tại' });
	return row;
}

async function requirePhaseOf(programId: number, phaseId: number) {
	const phase = await repo.getPhaseById(phaseId);
	if (!phase || phase.programId !== programId) {
		throw createError({ statusCode: 404, message: 'Giai đoạn không tồn tại' });
	}
	return phase;
}

// Thêm MỚI vào lịch: giáo án phải còn và chưa lưu trữ. Giáo án đã có trong lịch rồi mới lưu
// trữ thì vẫn giữ — lưu trữ không được làm hụt lịch người dùng đã soạn.
function assertSchedulable(routine: Routine | undefined): Routine {
	if (!routine) throw createError({ statusCode: 400, message: 'Giáo án không tồn tại' });
	if (routine.isArchived) {
		throw createError({ statusCode: 400, message: `Giáo án "${routine.name}" đã lưu trữ — khôi phục trước khi thêm` });
	}
	return routine;
}

// Ô lịch tham chiếu giáo án (không copy) ⇒ tóm tắt join live: sửa giáo án là lịch đổi theo.
async function toDetails(rows: Program[]): Promise<ProgramDetailComputed[]> {
	const phases = await repo.listPhases(rows.map((r) => r.id));
	const slots = await repo.listSlots(phases.map((p) => p.id));
	const routines = await routinesSvc.summariesByIds(slots.map((s) => s.routineId));

	const slotsByPhase = new Map<number, ProgramSlotComputed[]>();
	for (const slot of slots) {
		const r = routines.get(slot.routineId);
		if (!r) continue; // FK RESTRICT — chỉ xảy ra nếu dữ liệu sửa tay
		const list = slotsByPhase.get(slot.phaseId) ?? [];
		list.push({
			...slot,
			routine: {
				name: r.name,
				description: r.description,
				itemCount: r.itemCount,
				estimatedSec: r.estimatedSec,
				isArchived: r.isArchived,
				previews: r.previews,
			},
		});
		slotsByPhase.set(slot.phaseId, list);
	}
	const phasesByProgram = new Map<number, ProgramPhaseComputed[]>();
	for (const phase of phases) {
		const list = phasesByProgram.get(phase.programId) ?? [];
		list.push({ ...phase, slots: slotsByPhase.get(phase.id) ?? [] });
		phasesByProgram.set(phase.programId, list);
	}
	return rows.map((r) => ({ ...r, phases: phasesByProgram.get(r.id) ?? [] }));
}

export async function listPrograms(): Promise<ProgramDetailComputed[]> {
	return toDetails(await repo.listPrograms());
}

export async function getProgram(id: number): Promise<ProgramDetailComputed> {
	const [detail] = await toDetails([await requireProgram(id)]);
	return detail!;
}

export async function findProgram(id: number): Promise<Program | null> {
	return repo.getProgramById(id);
}

export async function addProgram(data: CreateProgramData): Promise<ProgramDetailComputed> {
	await assertNameFree(data.name);
	const name = data.name.trim();
	await repo.createPrograms([
		{
			data: {
				...data,
				name,
				description: data.description ?? null,
				sortOrder: (await repo.maxSortOrder()) + 1,
			},
			phases: [{ data: FIRST_PHASE, slots: [] }],
		},
	]);
	const created = (await repo.listAllNames()).find((r) => r.name === name);
	if (!created) throw new Error('Program insert failed — row not found after insert');
	return getProgram(created.id);
}

export async function editProgram(id: number, data: UpdateProgramData): Promise<ProgramDetailComputed> {
	await requireProgram(id);
	if (data.name !== undefined) await assertNameFree(data.name, id);
	await repo.updateProgram(id, data.name !== undefined ? { ...data, name: data.name.trim() } : data);
	return getProgram(id);
}

// Giai đoạn, ô lịch, thay đổi trong ngày đi theo (CASCADE). Lịch sử buổi tập không dính tới
// chương trình (buổi tập trỏ giáo án) nên giữ nguyên.
export async function deleteProgram(id: number): Promise<ProgramDetailComputed> {
	const dto = await getProgram(id);
	await repo.removeProgram(id);
	return dto;
}

// --- Giai đoạn ---

export async function addPhase(
	programId: number,
	data: PhaseData & { copyFromPhaseId?: number },
): Promise<ProgramDetailComputed> {
	await requireProgram(programId);
	const { copyFromPhaseId, ...fields } = data;
	if (copyFromPhaseId !== undefined) await requirePhaseOf(programId, copyFromPhaseId);
	await repo.createPhase(
		{
			...fields,
			name: fields.name.trim(),
			note: fields.note ?? null,
			programId,
			position: (await repo.maxPhasePosition(programId)) + 1,
		},
		copyFromPhaseId,
	);
	return getProgram(programId);
}

export async function editPhase(
	programId: number,
	phaseId: number,
	data: Partial<PhaseData>,
): Promise<ProgramDetailComputed> {
	await requirePhaseOf(programId, phaseId);
	await repo.updatePhase(phaseId, data.name !== undefined ? { ...data, name: data.name.trim() } : data);
	return getProgram(programId);
}

export async function removePhase(programId: number, phaseId: number): Promise<ProgramDetailComputed> {
	await requirePhaseOf(programId, phaseId);
	if ((await repo.listPhases([programId])).length <= 1) {
		throw createError({ statusCode: 400, message: 'Chương trình cần ít nhất một giai đoạn' });
	}
	await repo.removePhase(phaseId);
	return getProgram(programId);
}

// Phải là hoán vị ĐÚNG của các giai đoạn hiện có — như reorderItems của giáo án.
export async function reorderPhases(programId: number, phaseIds: number[]): Promise<ProgramDetailComputed> {
	await requireProgram(programId);
	const current = (await repo.listPhases([programId])).map((p) => p.id);
	const sameSet =
		phaseIds.length === current.length &&
		new Set(phaseIds).size === phaseIds.length &&
		phaseIds.every((id) => current.includes(id));
	if (!sameSet) {
		throw createError({ statusCode: 400, message: 'phaseIds phải chứa đúng và đủ các giai đoạn hiện có' });
	}
	await repo.reorderPhases(programId, phaseIds);
	return getProgram(programId);
}

// --- Ô lịch ---

export async function addSlot(
	programId: number,
	phaseId: number,
	data: { weekday: number; routineId: number },
): Promise<ProgramDetailComputed> {
	await requirePhaseOf(programId, phaseId);
	const [routine] = await routinesSvc.findRoutines([data.routineId]);
	assertSchedulable(routine);
	await repo.createSlot({ ...data, phaseId, position: (await repo.maxSlotPosition(phaseId, data.weekday)) + 1 });
	return getProgram(programId);
}

export async function removeSlot(programId: number, phaseId: number, slotId: number): Promise<ProgramDetailComputed> {
	await requirePhaseOf(programId, phaseId);
	const slot = await repo.getSlotById(slotId);
	if (!slot || slot.phaseId !== phaseId) throw createError({ statusCode: 404, message: 'Buổi trong lịch không tồn tại' });
	await repo.removeSlot(slotId);
	return getProgram(programId);
}

// --- Bộ mẫu ---

export interface CreateProgramWithPhasesData extends CreateProgramData {
	startDate: string | null;
	phases: (PhaseData & { slots: { weekday: number; routineId: number }[] })[];
}

/**
 * Tạo nhiều chương trình kèm giai đoạn + lịch trong một batch nguyên tử — cho bộ mẫu (lý do
 * như exercisesSvc.addExercises: trần 50 query D1 mỗi request của gói Workers Free).
 */
export async function addPrograms(list: CreateProgramWithPhasesData[]): Promise<void> {
	const taken = new Map((await repo.listAllNames()).map((r) => [exercisesSvc.nameKey(r.name), r.name]));
	for (const { name, phases } of list) {
		const clash = taken.get(exercisesSvc.nameKey(name));
		if (clash) throw createError({ statusCode: 409, message: `Đã có chương trình tên "${clash}"` });
		if (phases.length === 0) throw createError({ statusCode: 400, message: `Chương trình "${name}" cần ít nhất một giai đoạn` });
		taken.set(exercisesSvc.nameKey(name), name);
	}
	const routines = new Map(
		(await routinesSvc.findRoutines(list.flatMap((p) => p.phases.flatMap((ph) => ph.slots.map((s) => s.routineId))))).map(
			(r) => [r.id, r],
		),
	);
	let sortOrder = await repo.maxSortOrder();
	await repo.createPrograms(
		list.map(({ phases, ...data }) => ({
			data: { ...data, name: data.name.trim(), description: data.description ?? null, sortOrder: ++sortOrder },
			phases: phases.map(({ slots, ...phase }) => ({
				data: { ...phase, name: phase.name.trim(), note: phase.note ?? null },
				slots: slots.map((s) => ({ weekday: s.weekday, routineId: assertSchedulable(routines.get(s.routineId)).id })),
			})),
		})),
	);
}

/** Map tên (đã chuẩn hoá) → id, phục vụ seed idempotent theo tên. */
export async function nameIndex(): Promise<Map<string, number>> {
	const rows = await repo.listAllNames();
	return new Map(rows.map((r) => [exercisesSvc.nameKey(r.name), r.id]));
}
