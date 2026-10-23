import * as exercisesSvc from './exercises';
import * as routinesSvc from './routines';
import { EXERCISE_PRESETS, ROUTINE_PRESETS } from '../database/seeds/presets';
import type { PresetRef } from '../database/seeds/presets';

// Module không có bảng riêng nên không có repository — chỉ điều phối service của
// exercises + routines (mọi lần ghi vẫn đi qua repository của hai module đó).

export interface SeedResult {
	exercisesCreated: number;
	routinesCreated: number;
}

// Ghi theo lô, mỗi lô một batch: tạo từng bài / item một tốn hàng trăm query, vượt trần 50
// query D1 mỗi request của gói Workers Free. Ba lô vì lô sau cần id của lô trước: bài đơn →
// bài kết hợp (bài con) → giáo án (item).
export async function seedPresets(): Promise<SeedResult> {
	let exerciseIds = await exercisesSvc.nameIndex();
	const missing = EXERCISE_PRESETS.filter((p) => !exerciseIds.has(exercisesSvc.nameKey(p.name)));

	// Bài con / item luôn có id: lô trước đã tạo mọi bài còn thiếu. Thiếu ⇒ bộ mẫu trỏ sai
	// tên (test presets bắt được) — báo lỗi thay vì âm thầm tạo bài kết hợp / giáo án hụt bài.
	const idOf = ({ name, ...params }: PresetRef) => {
		const exerciseId = exerciseIds.get(exercisesSvc.nameKey(name));
		if (!exerciseId) throw createError({ statusCode: 500, message: `Bộ mẫu trỏ tới bài không tồn tại: "${name}"` });
		return { exerciseId, ...params };
	};

	const singles = missing.filter((p) => p.mode !== 'combo');
	if (singles.length > 0) {
		await exercisesSvc.addExercises(singles.map(({ components: _, ...data }) => data));
		exerciseIds = await exercisesSvc.nameIndex();
	}
	const combos = missing.filter((p) => p.mode === 'combo');
	if (combos.length > 0) {
		await exercisesSvc.addExercises(combos.map(({ components, ...data }) => ({ ...data, components: components?.map(idOf) })));
		exerciseIds = await exercisesSvc.nameIndex();
	}

	const routineIds = await routinesSvc.nameIndex();
	const routines = ROUTINE_PRESETS.filter((p) => !routineIds.has(exercisesSvc.nameKey(p.name)));
	if (routines.length > 0) {
		await routinesSvc.addRoutines(routines.map(({ items, ...data }) => ({ ...data, items: items.map(idOf) })));
	}

	return { exercisesCreated: missing.length, routinesCreated: routines.length };
}
