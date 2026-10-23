import * as repo from '../repositories/exercises';
import * as mediaSvc from './media';
import type { ComboStyle, Exercise, ExerciseCategory, ExerciseMode } from '../database/schema';
import type { ComponentRow } from '../repositories/exercises';
import type { ExerciseComponentComputed, ExerciseComputed, ExerciseMediaComputed } from '../types/exercises';

export interface ComponentData {
	exerciseId: number;
	sets?: number;
	reps?: number;
	holdSec?: number;
	relaxSec?: number;
	durationSec?: number;
	restSec?: number;
}

export interface CreateExerciseData {
	name: string;
	category: ExerciseCategory;
	mode: ExerciseMode;
	comboStyle?: ComboStyle;
	/** Chỉ bài kết hợp — zod bắt buộc có khi mode = 'combo'. */
	components?: ComponentData[];
	sets?: number;
	reps?: number;
	holdSec?: number;
	relaxSec?: number;
	durationSec?: number;
	restSec?: number;
	instructions?: string | null;
}

export type UpdateExerciseData = Partial<CreateExerciseData> & { isArchived?: boolean };

/** Khoá so tên: không phân biệt hoa thường kể cả chữ có dấu ("Đứng" ≡ "đứng"). */
export function nameKey(name: string): string {
	return name.trim().toLocaleLowerCase('vi');
}

async function assertNameFree(name: string, exceptId?: number) {
	const key = nameKey(name);
	const rows = await repo.listAllNames();
	const clash = rows.find((r) => r.id !== exceptId && nameKey(r.name) === key);
	if (clash) throw createError({ statusCode: 409, message: `Đã có bài tập tên "${clash.name}"` });
}

// Bài con luôn là bài đơn (resolveComponents chặn lồng) — row 'combo' chỉ có thể do dữ
// liệu sửa tay; bỏ qua thay vì đưa cho player một mode nó không chạy được.
function toComponent(row: ComponentRow, media: ExerciseMediaComputed[]): ExerciseComponentComputed | null {
	const { exerciseName, exerciseCategory, exerciseMode, exerciseInstructions, exerciseIsArchived, ...component } = row;
	if (exerciseMode === 'combo') return null;
	return {
		...component,
		exercise: {
			name: exerciseName,
			category: exerciseCategory,
			mode: exerciseMode,
			instructions: exerciseInstructions,
			isArchived: exerciseIsArchived,
			media,
		},
	};
}

/** comboId → bài con theo thứ tự. Dùng chung cho thư viện và giáo án (item là bài kết hợp). */
export async function componentsByCombo(comboIds: number[]): Promise<Map<number, ExerciseComponentComputed[]>> {
	const rows = await repo.listComponents([...new Set(comboIds)]);
	// Ảnh của bài con đi theo để màn hình tập hiện đúng ảnh bài đang tập trong vòng.
	const media = await mediaSvc.mediaByExercise(rows.map((r) => r.exerciseId));
	const byCombo = new Map<number, ExerciseComponentComputed[]>();
	for (const row of rows) {
		const component = toComponent(row, media.get(row.exerciseId) ?? []);
		if (!component) continue;
		const list = byCombo.get(component.comboId) ?? [];
		list.push(component);
		byCombo.set(component.comboId, list);
	}
	return byCombo;
}

async function toComputed(row: Exercise): Promise<ExerciseComputed> {
	const [routineCount, comboCount, components, media] = await Promise.all([
		repo.countRoutineUsageFor(row.id),
		repo.countComboUsageFor(row.id),
		row.mode === 'combo' ? componentsByCombo([row.id]).then((m) => m.get(row.id) ?? []) : [],
		mediaSvc.mediaByExercise([row.id]).then((m) => m.get(row.id) ?? []),
	]);
	return { ...row, routineCount, comboCount, components, media };
}

// Bài con phải tồn tại, là bài đơn (một tầng: timeline trải bài kết hợp đúng một lần,
// không đệ quy) và chưa lưu trữ — trừ bài đã có sẵn trong bài kết hợp (`keepIds`): lưu
// trữ một bài không được làm hỏng lần sửa tên bài kết hợp đang chứa nó. Thông số không
// gửi ⇒ copy từ thư viện, như item giáo án.
async function resolveComponents(inputs: ComponentData[], keepIds: ReadonlySet<number>) {
	const rows = await repo.listExercisesByIds([...new Set(inputs.map((c) => c.exerciseId))]);
	const byId = new Map(rows.map((r) => [r.id, r]));
	const missing = [...new Set(inputs.map((c) => c.exerciseId).filter((id) => !byId.has(id)))];
	if (missing.length > 0) {
		throw createError({ statusCode: 400, message: `Bài tập không tồn tại: ${missing.join(', ')}` });
	}
	return inputs.map((c) => {
		const ex = byId.get(c.exerciseId)!;
		if (ex.mode === 'combo') {
			throw createError({ statusCode: 400, message: `"${ex.name}" là bài kết hợp — không lồng được vào bài kết hợp khác` });
		}
		if (ex.isArchived && !keepIds.has(ex.id)) {
			throw createError({ statusCode: 400, message: `Bài tập "${ex.name}" đã lưu trữ — khôi phục trước khi thêm` });
		}
		return {
			exerciseId: ex.id,
			sets: c.sets ?? ex.sets,
			reps: c.reps ?? ex.reps,
			holdSec: c.holdSec ?? ex.holdSec,
			relaxSec: c.relaxSec ?? ex.relaxSec,
			durationSec: c.durationSec ?? ex.durationSec,
			restSec: c.restSec ?? ex.restSec,
		};
	});
}

export function findExercise(id: number): Promise<Exercise | null> {
	return repo.getExerciseById(id);
}

export function findExercises(ids: number[]): Promise<Exercise[]> {
	return repo.listExercisesByIds([...new Set(ids)]);
}

export async function requireExercise(id: number): Promise<Exercise> {
	const row = await repo.getExerciseById(id);
	if (!row) throw createError({ statusCode: 404, message: 'Bài tập không tồn tại' });
	return row;
}

export async function listExercises(filter: {
	category?: ExerciseCategory;
	includeArchived?: boolean;
}): Promise<ExerciseComputed[]> {
	const [rows, routineUsage, comboUsage] = await Promise.all([
		repo.listExercises(filter),
		repo.countRoutineUsage(),
		repo.countComboUsage(),
	]);
	const [components, media] = await Promise.all([
		componentsByCombo(rows.filter((r) => r.mode === 'combo').map((r) => r.id)),
		mediaSvc.mediaByExercise(rows.map((r) => r.id)),
	]);
	return rows.map((r) => ({
		...r,
		routineCount: routineUsage.get(r.id) ?? 0,
		comboCount: comboUsage.get(r.id) ?? 0,
		components: components.get(r.id) ?? [],
		media: media.get(r.id) ?? [],
	}));
}

export async function getExercise(id: number): Promise<ExerciseComputed> {
	return toComputed(await requireExercise(id));
}

export async function addExercise(data: CreateExerciseData): Promise<ExerciseComputed> {
	await assertNameFree(data.name);
	const { components, ...fields } = data;
	const resolved = data.mode === 'combo' ? await resolveComponents(components ?? [], new Set()) : [];
	const saved = await repo.createExercise(
		{ ...fields, name: data.name.trim(), instructions: data.instructions ?? null },
		resolved,
	);
	return toComputed(saved);
}

/**
 * Tạo nhiều bài trong một batch nguyên tử — cho bộ mẫu: addExercise tốn ~6 query/bài, gói
 * Workers Free chỉ cho 50 query D1 mỗi request. Cùng luật với addExercise (tên không trùng,
 * kể cả trong lô); bài con phải có sẵn trong thư viện ⇒ bài đơn mới thì tạo ở lô trước.
 */
export async function addExercises(list: CreateExerciseData[]): Promise<void> {
	const taken = new Map((await repo.listAllNames()).map((r) => [nameKey(r.name), r.name]));
	const items = [];
	for (const { components, ...fields } of list) {
		const clash = taken.get(nameKey(fields.name));
		if (clash) throw createError({ statusCode: 409, message: `Đã có bài tập tên "${clash}"` });
		taken.set(nameKey(fields.name), fields.name);
		items.push({
			data: { ...fields, name: fields.name.trim(), instructions: fields.instructions ?? null },
			components: fields.mode === 'combo' ? await resolveComponents(components ?? [], new Set()) : [],
		});
	}
	await repo.createExercises(items);
}

export async function editExercise(id: number, data: UpdateExerciseData): Promise<ExerciseComputed> {
	const current = await requireExercise(id);
	if (data.name !== undefined) await assertNameFree(data.name, id);
	// Đổi bài đơn ↔ bài kết hợp làm hỏng chỗ đang dùng nó: bài đơn đang là bài con mà thành
	// bài kết hợp ⇒ lồng hai tầng; bài kết hợp thành bài đơn ⇒ danh sách bài con mồ côi.
	const isCombo = current.mode === 'combo';
	if (data.mode !== undefined && (data.mode === 'combo') !== isCombo) {
		throw createError({ statusCode: 400, message: 'Không đổi được giữa bài đơn và bài kết hợp — hãy tạo bài mới' });
	}
	if (data.components !== undefined && !isCombo) {
		throw createError({ statusCode: 400, message: 'Chỉ bài kết hợp mới có bài con' });
	}

	const { components, ...fields } = data;
	let resolved: Awaited<ReturnType<typeof resolveComponents>> | undefined;
	if (components !== undefined) {
		const existing = (await componentsByCombo([id])).get(id) ?? [];
		resolved = await resolveComponents(components, new Set(existing.map((c) => c.exerciseId)));
	}
	const patch = fields.name !== undefined ? { ...fields, name: fields.name.trim() } : fields;
	const updated = await repo.updateExercise(id, patch, resolved);
	if (!updated) throw createError({ statusCode: 404, message: 'Bài tập không tồn tại' });
	return toComputed(updated);
}

// Đang nằm trong giáo án / bài kết hợp ⇒ 409, KHÔNG tự gỡ: âm thầm làm hụt một bài của
// giáo án hay bài kết hợp người dùng đã soạn là mất dữ liệu. Lịch sử buổi tập thì không
// chặn — entry giữ tên snapshot, FK tự về NULL.
export async function deleteExercise(id: number): Promise<ExerciseComputed> {
	const dto = await getExercise(id);
	if (dto.routineCount > 0) {
		throw createError({
			statusCode: 409,
			message: `Bài tập đang nằm trong ${dto.routineCount} giáo án — gỡ khỏi giáo án hoặc lưu trữ thay vì xoá`,
		});
	}
	if (dto.comboCount > 0) {
		throw createError({
			statusCode: 409,
			message: `Bài tập đang nằm trong ${dto.comboCount} bài kết hợp — gỡ khỏi bài kết hợp hoặc lưu trữ thay vì xoá`,
		});
	}
	// Lấy key R2 trước: CASCADE xoá row media rồi thì không còn biết object nào để dọn.
	const keys = await mediaSvc.storageKeysOf(id);
	await repo.removeExercise(id);
	await mediaSvc.deleteObjectsQuietly(keys);
	return dto;
}

// --- Ảnh / video hướng dẫn: mọi thao tác trả bài tập mới nhất, FE gán thẳng ---

export async function addMediaUpload(id: number, data: Uint8Array, caption: string | null) {
	await requireExercise(id);
	await mediaSvc.addUpload(id, data, caption);
	return getExercise(id);
}

export async function addMediaLink(id: number, data: { url: string; caption?: string | null }) {
	await requireExercise(id);
	await mediaSvc.addLink(id, data);
	return getExercise(id);
}

export async function editMedia(id: number, mediaId: number, data: { caption: string | null }) {
	await requireExercise(id);
	await mediaSvc.editMedia(id, mediaId, data);
	return getExercise(id);
}

export async function removeMedia(id: number, mediaId: number) {
	await requireExercise(id);
	await mediaSvc.removeMedia(id, mediaId);
	return getExercise(id);
}

export async function reorderMedia(id: number, mediaIds: number[]) {
	await requireExercise(id);
	await mediaSvc.reorderMedia(id, mediaIds);
	return getExercise(id);
}

/** Id nào trong danh sách không còn tồn tại — dùng để validate FK trước khi ghi. */
export async function findMissingIds(ids: number[]): Promise<number[]> {
	const unique = [...new Set(ids)];
	const existing = new Set(await repo.findExistingIds(unique));
	return unique.filter((id) => !existing.has(id));
}

/** Map tên (đã chuẩn hoá) → id, phục vụ seed idempotent theo tên. */
export async function nameIndex(): Promise<Map<string, number>> {
	const rows = await repo.listAllNames();
	return new Map(rows.map((r) => [nameKey(r.name), r.id]));
}
