import * as repo from '../repositories/routines';
import * as exercisesSvc from './exercises';
import * as mediaSvc from './media';
import { coverOf } from '../../shared/utils/media';
import { buildTimeline, estimateTimelineSec, toPlanItems } from '../../shared/utils/timeline';
import type { Routine } from '../database/schema';
import type { RoutineItemRow } from '../repositories/routines';
import type { ExerciseComponentComputed, ExerciseMediaComputed } from '../types/exercises';
import type { RoutineDetailComputed, RoutineItemComputed, RoutineSummaryComputed } from '../types/routines';

export interface CreateRoutineData {
	name: string;
	description?: string | null;
	scheduleMask?: number;
	prepSec?: number;
}

export type UpdateRoutineData = Partial<CreateRoutineData> & { sortOrder?: number; isArchived?: boolean };

export interface ItemParamsData {
	sets?: number;
	reps?: number;
	holdSec?: number;
	relaxSec?: number;
	durationSec?: number;
	restSec?: number;
}

// Bài kết hợp: item chỉ giữ số vòng / nghỉ giữa vòng (copy), danh sách bài con lấy live
// từ định nghĩa trong thư viện — sửa bài kết hợp thì mọi giáo án dùng nó đổi theo.
async function toItems(rows: RoutineItemRow[]): Promise<RoutineItemComputed[]> {
	const [components, media] = await Promise.all([
		exercisesSvc.componentsByCombo(rows.filter((r) => r.exerciseMode === 'combo').map((r) => r.exerciseId)),
		mediaSvc.mediaByExercise(rows.map((r) => r.exerciseId)),
	]);
	return rows.map((row) => toItem(row, components.get(row.exerciseId) ?? [], media.get(row.exerciseId) ?? []));
}

function toItem(
	row: RoutineItemRow,
	components: ExerciseComponentComputed[],
	media: ExerciseMediaComputed[],
): RoutineItemComputed {
	const {
		exerciseName,
		exerciseCategory,
		exerciseMode,
		exerciseComboStyle,
		exerciseInstructions,
		exerciseIsArchived,
		...item
	} = row;
	return {
		...item,
		exercise: {
			name: exerciseName,
			category: exerciseCategory,
			mode: exerciseMode,
			comboStyle: exerciseComboStyle,
			instructions: exerciseInstructions,
			isArchived: exerciseIsArchived,
			components,
			media,
		},
	};
}

function toDetail(routine: Routine, items: RoutineItemComputed[]): RoutineDetailComputed {
	const plan = items.flatMap((it, index) => toPlanItems(it, index));
	return {
		...routine,
		itemCount: items.length,
		estimatedSec: estimateTimelineSec(buildTimeline(plan, routine.prepSec), plan),
		previews: items.slice(0, 4).map((it) => ({
			name: it.exercise.name,
			category: it.exercise.category,
			isCombo: it.exercise.mode === 'combo',
			cover: coverOf(it.exercise),
		})),
		items,
	};
}

async function assertNameFree(name: string, exceptId?: number) {
	const key = exercisesSvc.nameKey(name);
	const rows = await repo.listAllNames();
	const clash = rows.find((r) => r.id !== exceptId && exercisesSvc.nameKey(r.name) === key);
	if (clash) throw createError({ statusCode: 409, message: `Đã có giáo án tên "${clash.name}"` });
}

async function requireRoutine(id: number): Promise<Routine> {
	const row = await repo.getRoutineById(id);
	if (!row) throw createError({ statusCode: 404, message: 'Giáo án không tồn tại' });
	return row;
}

export async function routineExists(id: number): Promise<boolean> {
	return (await repo.getRoutineById(id)) !== null;
}

export async function listRoutines(filter: { includeArchived?: boolean }): Promise<RoutineSummaryComputed[]> {
	const rows = await repo.listRoutines(filter);
	const items = await toItems(await repo.listItemsWithExercise(rows.map((r) => r.id)));
	const byRoutine = new Map<number, RoutineItemComputed[]>();
	for (const it of items) {
		const list = byRoutine.get(it.routineId) ?? [];
		list.push(it);
		byRoutine.set(it.routineId, list);
	}
	return rows.map((r) => {
		const { items: _items, ...summary } = toDetail(r, byRoutine.get(r.id) ?? []);
		return summary;
	});
}

export async function getRoutine(id: number): Promise<RoutineDetailComputed> {
	const routine = await requireRoutine(id);
	const items = await toItems(await repo.listItemsWithExercise([id]));
	return toDetail(routine, items);
}

export async function addRoutine(data: CreateRoutineData): Promise<RoutineDetailComputed> {
	await assertNameFree(data.name);
	const sortOrder = (await repo.maxSortOrder()) + 1;
	const saved = await repo.createRoutine({
		...data,
		name: data.name.trim(),
		description: data.description ?? null,
		sortOrder,
	});
	return toDetail(saved, []);
}

export async function editRoutine(id: number, data: UpdateRoutineData): Promise<RoutineDetailComputed> {
	await requireRoutine(id);
	if (data.name !== undefined) await assertNameFree(data.name, id);
	const patch = data.name !== undefined ? { ...data, name: data.name.trim() } : data;
	await repo.updateRoutine(id, patch);
	return getRoutine(id);
}

// Item đi theo (CASCADE); buổi tập đã ghi giữ nguyên, routine_id về NULL, `title` giữ tên.
export async function deleteRoutine(id: number): Promise<RoutineDetailComputed> {
	const dto = await getRoutine(id);
	await repo.removeRoutine(id);
	return dto;
}

// --- Items ---

export async function addItem(routineId: number, data: ItemParamsData & { exerciseId: number }) {
	await requireRoutine(routineId);
	const exercise = await exercisesSvc.findExercise(data.exerciseId);
	if (!exercise) throw createError({ statusCode: 400, message: 'Bài tập không tồn tại' });
	if (exercise.isArchived) {
		throw createError({ statusCode: 400, message: `Bài tập "${exercise.name}" đã lưu trữ — khôi phục trước khi thêm` });
	}
	const position = (await repo.maxItemPosition(routineId)) + 1;
	// Thông số không gửi ⇒ copy từ bài tập. Copy (không tham chiếu) để sửa bài trong
	// thư viện không làm đổi âm thầm các giáo án đã soạn. Bài kết hợp: sets/restSec là
	// số vòng / nghỉ giữa vòng.
	await repo.createItem({
		routineId,
		exerciseId: exercise.id,
		position,
		sets: data.sets ?? exercise.sets,
		reps: data.reps ?? exercise.reps,
		holdSec: data.holdSec ?? exercise.holdSec,
		relaxSec: data.relaxSec ?? exercise.relaxSec,
		durationSec: data.durationSec ?? exercise.durationSec,
		restSec: data.restSec ?? exercise.restSec,
	});
	return getRoutine(routineId);
}

async function requireItemOf(routineId: number, itemId: number) {
	const item = await repo.getItemById(itemId);
	if (!item || item.routineId !== routineId) {
		throw createError({ statusCode: 404, message: 'Bài trong giáo án không tồn tại' });
	}
	return item;
}

export async function editItem(routineId: number, itemId: number, data: ItemParamsData) {
	await requireItemOf(routineId, itemId);
	await repo.updateItem(itemId, data);
	return getRoutine(routineId);
}

export async function removeItem(routineId: number, itemId: number) {
	await requireItemOf(routineId, itemId);
	await repo.removeItem(itemId);
	return getRoutine(routineId);
}

// Phải là hoán vị ĐÚNG của các item hiện có: thiếu một id thì item đó giữ position cũ
// và đụng hàng với item khác — thứ tự tập trở nên ngẫu nhiên.
export async function reorderItems(routineId: number, itemIds: number[]) {
	await requireRoutine(routineId);
	const current = await repo.listItemIds(routineId);
	const sameSet =
		itemIds.length === current.length &&
		new Set(itemIds).size === itemIds.length &&
		itemIds.every((id) => current.includes(id));
	if (!sameSet) {
		throw createError({ statusCode: 400, message: 'itemIds phải chứa đúng và đủ các bài hiện có của giáo án' });
	}
	await repo.reorderItems(routineId, itemIds);
	return getRoutine(routineId);
}
