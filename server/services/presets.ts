import * as exercisesSvc from './exercises';
import * as programsSvc from './programs';
import * as routinesSvc from './routines';
import { EXERCISE_PRESETS, PROGRAM_PRESETS, ROUTINE_PRESETS } from '../database/seeds/presets';
import type { PresetRef } from '../database/seeds/presets';

// Module không có bảng riêng nên không có repository — chỉ điều phối service của
// exercises + routines + programs (mọi lần ghi vẫn đi qua repository của các module đó).

export interface SeedResult {
	exercisesCreated: number;
	routinesCreated: number;
	programsCreated: number;
}

function idIn(index: Map<string, number>, name: string): number {
	// Lô trước đã tạo mọi bài / giáo án còn thiếu ⇒ luôn có id. Thiếu ⇒ bộ mẫu trỏ sai tên (test
	// presets bắt được) — báo lỗi thay vì âm thầm tạo bài kết hợp / giáo án / lịch hụt buổi.
	const id = index.get(exercisesSvc.nameKey(name));
	if (!id) throw createError({ statusCode: 500, message: `Bộ mẫu trỏ tới mục không tồn tại: "${name}"` });
	return id;
}

// Ghi theo lô, mỗi lô một batch: tạo từng bài / item một tốn hàng trăm query, vượt trần 50
// query D1 mỗi request của gói Workers Free. Bốn lô vì lô sau cần id của lô trước: bài đơn →
// bài kết hợp (bài con) → giáo án (item) → chương trình (ô lịch).
// `today` (giờ địa phương của client) = ngày bắt đầu của chương trình mẫu "đang theo".
export async function seedPresets(today: string): Promise<SeedResult> {
	let exerciseIds = await exercisesSvc.nameIndex();
	const missing = EXERCISE_PRESETS.filter((p) => !exerciseIds.has(exercisesSvc.nameKey(p.name)));
	const withId = ({ name, ...params }: PresetRef) => ({ exerciseId: idIn(exerciseIds, name), ...params });

	const singles = missing.filter((p) => p.mode !== 'combo');
	if (singles.length > 0) {
		await exercisesSvc.addExercises(singles.map(({ components: _, ...data }) => data));
		exerciseIds = await exercisesSvc.nameIndex();
	}
	const combos = missing.filter((p) => p.mode === 'combo');
	if (combos.length > 0) {
		await exercisesSvc.addExercises(combos.map(({ components, ...data }) => ({ ...data, components: components?.map(withId) })));
		exerciseIds = await exercisesSvc.nameIndex();
	}

	let routineIds = await routinesSvc.nameIndex();
	const routines = ROUTINE_PRESETS.filter((p) => !routineIds.has(exercisesSvc.nameKey(p.name)));
	if (routines.length > 0) {
		await routinesSvc.addRoutines(routines.map(({ items, ...data }) => ({ ...data, items: items.map(withId) })));
		routineIds = await routinesSvc.nameIndex();
	}

	const programIds = await programsSvc.nameIndex();
	const programs = PROGRAM_PRESETS.filter((p) => !programIds.has(exercisesSvc.nameKey(p.name)));
	if (programs.length > 0) {
		await programsSvc.addPrograms(
			programs.map(({ follow, phases, ...data }) => ({
				...data,
				startDate: follow ? today : null,
				phases: phases.map(({ days, ...phase }) => ({
					...phase,
					slots: Object.entries(days).flatMap(([weekday, names]) =>
						names.map((name) => ({ weekday: Number(weekday), routineId: idIn(routineIds, name) })),
					),
				})),
			})),
		);
	}

	return { exercisesCreated: missing.length, routinesCreated: routines.length, programsCreated: programs.length };
}
