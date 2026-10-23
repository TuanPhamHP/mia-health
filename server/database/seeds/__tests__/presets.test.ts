import { describe, expect, it } from 'vitest';
import { EXERCISE_PRESETS, ROUTINE_PRESETS, WEEKLY_PLAN } from '../presets';
import type { RoutinePreset } from '../presets';
import { exercises } from '../../schema';
import { createExerciseSchema } from '../../../../shared/schemas/exercises';
import { addRoutineItemSchema, createRoutineSchema } from '../../../../shared/schemas/routines';
import { buildTimeline, estimateTimelineSec, toPlanItems } from '../../../../shared/utils/timeline';
import { ALL_DAYS_MASK } from '../../../../shared/utils/weekday';
import type { ExerciseParams } from '../../../../shared/types/exercises';

// Như exercisesSvc.nameKey — seed so tên theo khoá này.
const key = (name: string) => name.trim().toLocaleLowerCase('vi');

function dbDefault(column: { default: unknown }): number {
	if (typeof column.default !== 'number') throw new Error('Default thông số trong schema phải là số');
	return column.default;
}

// Preset bỏ trống thông số ⇒ DB điền default của schema.
const DB_DEFAULTS: ExerciseParams = {
	sets: dbDefault(exercises.sets),
	reps: dbDefault(exercises.reps),
	holdSec: dbDefault(exercises.holdSec),
	relaxSec: dbDefault(exercises.relaxSec),
	durationSec: dbDefault(exercises.durationSec),
	restSec: dbDefault(exercises.restSec),
};

function merge(base: ExerciseParams, over: Partial<ExerciseParams>): ExerciseParams {
	return {
		sets: over.sets ?? base.sets,
		reps: over.reps ?? base.reps,
		holdSec: over.holdSec ?? base.holdSec,
		relaxSec: over.relaxSec ?? base.relaxSec,
		durationSec: over.durationSec ?? base.durationSec,
		restSec: over.restSec ?? base.restSec,
	};
}

const byName = new Map(EXERCISE_PRESETS.map((p) => [key(p.name), p]));

function presetOf(name: string) {
	const preset = byName.get(key(name));
	if (!preset) throw new Error(`Không có bài "${name}" trong bộ mẫu`);
	return preset;
}

// Dựng plan đúng như sau khi seed: item / bài con copy thông số từ bài, ghi đè phần preset khai.
function planOf(routine: RoutinePreset) {
	return routine.items.flatMap((ref, index) => {
		const ex = presetOf(ref.name);
		const components = (ex.components ?? []).map((c) => {
			const sub = presetOf(c.name);
			if (sub.mode === 'combo') throw new Error(`"${sub.name}" là bài kết hợp`);
			return {
				...merge(merge(DB_DEFAULTS, sub), c),
				exerciseId: 0,
				exercise: { name: sub.name, category: sub.category, mode: sub.mode, instructions: null, media: [] },
			};
		});
		return toPlanItems(
			{
				...merge(merge(DB_DEFAULTS, ex), ref),
				exerciseId: 0,
				exercise: {
					name: ex.name,
					category: ex.category,
					mode: ex.mode,
					comboStyle: ex.comboStyle ?? 'circuit',
					instructions: null,
					media: [],
					components,
				},
			},
			index,
		);
	});
}

function estimateMin(routine: RoutinePreset): number {
	const plan = planOf(routine);
	return estimateTimelineSec(buildTimeline(plan, routine.prepSec), plan) / 60;
}

describe('bộ mẫu — bài tập', () => {
	it('tên không trùng (không phân biệt hoa thường)', () => {
		expect(byName.size).toBe(EXERCISE_PRESETS.length);
	});

	it('thông số hợp lệ theo zod của POST /api/exercises', () => {
		for (const { components, ...p } of EXERCISE_PRESETS) {
			const input = { ...p, components: components?.map(({ name: _, ...params }, i) => ({ ...params, exerciseId: i + 1 })) };
			expect(createExerciseSchema.safeParse(input).error, p.name).toBeUndefined();
		}
	});

	it('bài kết hợp chỉ gồm bài đơn có trong bộ mẫu', () => {
		for (const p of EXERCISE_PRESETS.filter((e) => e.mode === 'combo')) {
			for (const c of p.components ?? []) {
				expect(presetOf(c.name).mode, `${p.name} → ${c.name}`).not.toBe('combo');
			}
		}
	});
});

describe('bộ mẫu — giáo án', () => {
	it('tên không trùng (không phân biệt hoa thường)', () => {
		expect(new Set(ROUTINE_PRESETS.map((r) => key(r.name))).size).toBe(ROUTINE_PRESETS.length);
	});

	it('hợp lệ theo zod, mọi item trỏ tới bài có trong bộ mẫu', () => {
		for (const { items, ...r } of ROUTINE_PRESETS) {
			expect(createRoutineSchema.safeParse(r).error, r.name).toBeUndefined();
			for (const { name, ...params } of items) {
				presetOf(name);
				expect(addRoutineItemSchema.safeParse({ ...params, exerciseId: 1 }).error, `${r.name} → ${name}`).toBeUndefined();
			}
		}
	});

	it('giáo án tuần: mỗi ngày đúng một buổi, đủ T2 → CN', () => {
		let covered = 0;
		for (const r of WEEKLY_PLAN) {
			expect(covered & r.scheduleMask, r.name).toBe(0);
			covered |= r.scheduleMask;
		}
		expect(covered).toBe(ALL_DAYS_MASK);
		expect(WEEKLY_PLAN).toHaveLength(7);
	});

	it.each(WEEKLY_PLAN.map((r) => [r.name, r] as const))('giáo án tuần "%s" dài 30–40 phút', (_, routine) => {
		const minutes = estimateMin(routine);
		expect(minutes).toBeGreaterThanOrEqual(30);
		expect(minutes).toBeLessThanOrEqual(40);
	});
});
