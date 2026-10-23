import { describe, expect, it } from 'vitest';
import { EXERCISE_PRESETS, MORNING_ROUTINES, PROGRAM_PRESETS, ROUTINE_PRESETS } from '../presets';
import type { RoutinePreset } from '../presets';
import { exercises } from '../../schema';
import { createExerciseSchema } from '../../../../shared/schemas/exercises';
import { createPhaseSchema, createProgramSchema } from '../../../../shared/schemas/programs';
import { addRoutineItemSchema, createRoutineSchema } from '../../../../shared/schemas/routines';
import { buildTimeline, estimateTimelineSec, toPlanItems } from '../../../../shared/utils/timeline';
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

	it.each(MORNING_ROUTINES.map((r) => [r.name, r] as const))('giáo án buổi sáng "%s" dài 30–40 phút', (_, routine) => {
		const minutes = estimateMin(routine);
		expect(minutes).toBeGreaterThanOrEqual(30);
		expect(minutes).toBeLessThanOrEqual(40);
	});
});

describe('bộ mẫu — chương trình', () => {
	const routineByName = new Map(ROUTINE_PRESETS.map((r) => [key(r.name), r]));

	it('tên không trùng (không phân biệt hoa thường)', () => {
		expect(new Set(PROGRAM_PRESETS.map((p) => key(p.name))).size).toBe(PROGRAM_PRESETS.length);
	});

	it('hợp lệ theo zod, có giai đoạn, lịch chỉ trỏ tới giáo án có trong bộ mẫu', () => {
		for (const { phases, follow: _, ...p } of PROGRAM_PRESETS) {
			expect(createProgramSchema.safeParse(p).error, p.name).toBeUndefined();
			expect(phases.length, p.name).toBeGreaterThan(0);
			for (const { days, ...phase } of phases) {
				expect(createPhaseSchema.safeParse(phase).error, `${p.name} → ${phase.name}`).toBeUndefined();
				for (const [weekday, names] of Object.entries(days)) {
					expect(Number(weekday), `${p.name} → ${phase.name}`).toBeGreaterThanOrEqual(1);
					expect(Number(weekday), `${p.name} → ${phase.name}`).toBeLessThanOrEqual(7);
					for (const name of names) expect(routineByName.has(key(name)), `${p.name} → ${name}`).toBe(true);
				}
			}
		}
	});

	it('"Giảm mỡ tại nhà": mỗi giai đoạn đúng một buổi sáng mỗi ngày, đủ T2 → CN', () => {
		const program = PROGRAM_PRESETS.find((p) => p.goal === 'fat_loss');
		expect(program).toBeDefined();
		const morning = new Set(MORNING_ROUTINES.map((r) => key(r.name)));
		for (const phase of program!.phases) {
			for (let weekday = 1; weekday <= 7; weekday++) {
				const names = phase.days[weekday] ?? [];
				expect(names, `${phase.name} · thứ ${weekday}`).toHaveLength(1);
				expect(morning.has(key(names[0]!)), `${phase.name} · ${names[0]}`).toBe(true);
			}
		}
	});
});
