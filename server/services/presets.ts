import * as exercisesSvc from './exercises';
import * as routinesSvc from './routines';
import { EXERCISE_PRESETS, ROUTINE_PRESETS } from '../database/seeds/presets';

// Module không có bảng riêng nên không có repository — chỉ điều phối service của
// exercises + routines (mọi lần ghi vẫn đi qua repository của hai module đó).

export interface SeedResult {
	exercisesCreated: number;
	routinesCreated: number;
}

export async function seedPresets(): Promise<SeedResult> {
	const exerciseIds = await exercisesSvc.nameIndex();
	let exercisesCreated = 0;
	for (const preset of EXERCISE_PRESETS) {
		const key = exercisesSvc.nameKey(preset.name);
		if (exerciseIds.has(key)) continue;
		const saved = await exercisesSvc.addExercise(preset);
		exerciseIds.set(key, saved.id);
		exercisesCreated++;
	}

	const existingRoutines = new Set(
		(await routinesSvc.listRoutines({ includeArchived: true })).map((r) => exercisesSvc.nameKey(r.name)),
	);
	let routinesCreated = 0;
	for (const preset of ROUTINE_PRESETS) {
		if (existingRoutines.has(exercisesSvc.nameKey(preset.name))) continue;
		const routine = await routinesSvc.addRoutine({
			name: preset.name,
			description: preset.description,
			scheduleMask: preset.scheduleMask,
			prepSec: preset.prepSec,
		});
		for (const name of preset.exerciseNames) {
			const exerciseId = exerciseIds.get(exercisesSvc.nameKey(name));
			if (exerciseId) await routinesSvc.addItem(routine.id, { exerciseId });
		}
		routinesCreated++;
	}

	return { exercisesCreated, routinesCreated };
}
