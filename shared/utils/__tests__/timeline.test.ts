import { describe, expect, it } from 'vitest';
import { buildTimeline, estimateTimelineSec, setsDoneByItem, toPlanItems } from '../timeline';
import type { PlanCombo, PlanItem } from '../timeline';
import type { ExerciseParams } from '../../types/exercises';

function item(over: Partial<PlanItem>): PlanItem {
	return {
		exerciseId: 1,
		name: 'X',
		category: 'kegel',
		mode: 'hold',
		sets: 1,
		reps: 1,
		holdSec: 5,
		relaxSec: 5,
		durationSec: 30,
		restSec: 0,
		instructions: null,
		...over,
	};
}

const kinds = (items: PlanItem[], prep = 0) => buildTimeline(items, prep).map((s) => s.kind);

describe('buildTimeline', () => {
	it('hold: siết/thả xen kẽ, bỏ nhịp thả cuối set khi có nghỉ, bỏ nhịp thả cuối bài', () => {
		const kegel = item({ sets: 2, reps: 2, restSec: 30 });
		expect(kinds([kegel])).toEqual(['hold', 'relax', 'hold', 'rest', 'hold', 'relax', 'hold']);
	});

	it('hold không có nghỉ giữa set ⇒ GIỮ nhịp thả giữa hai set', () => {
		const kegel = item({ sets: 2, reps: 1, restSec: 0 });
		expect(kinds([kegel])).toEqual(['hold', 'relax', 'hold']);
	});

	it('relaxSec = 0 ⇒ không sinh bước thả 0 giây', () => {
		expect(kinds([item({ reps: 3, relaxSec: 0 })])).toEqual(['hold', 'hold', 'hold']);
	});

	it('prep trước mỗi bài, reps chờ người tập (durationSec null), duration đếm ngược', () => {
		const steps = buildTimeline(
			[item({ mode: 'reps', sets: 2, restSec: 10 }), item({ mode: 'duration', sets: 1, durationSec: 45 })],
			5,
		);
		expect(steps.map((s) => [s.kind, s.durationSec])).toEqual([
			['prep', 5],
			['work', null],
			['rest', 10],
			['work', null],
			['prep', 5],
			['work', 45],
		]);
	});

	it('mỗi set có đúng một bước endsSet', () => {
		const items = [item({ sets: 3, reps: 4, restSec: 20 }), item({ mode: 'duration', sets: 2, restSec: 5 })];
		const steps = buildTimeline(items, 5);
		expect(setsDoneByItem(steps, steps.length, items.length)).toEqual([3, 2]);
	});
});

describe('estimate / setsDone', () => {
	it('ước lượng: reps tính 3s/lần', () => {
		const items = [item({ mode: 'reps', sets: 2, reps: 10, restSec: 30 })];
		// 2 set × 10 lần × 3s + 1 lần nghỉ 30s
		expect(estimateTimelineSec(buildTimeline(items, 0), items)).toBe(90);
	});

	it('dừng giữa chừng ⇒ chỉ đếm set đã xong', () => {
		const items = [item({ sets: 3, reps: 2, restSec: 10 })];
		const steps = buildTimeline(items, 0);
		// hold relax hold rest | hold relax hold rest | hold relax hold
		expect(setsDoneByItem(steps, 3, 1)).toEqual([1]);
		expect(setsDoneByItem(steps, 2, 1)).toEqual([0]);
	});
});

describe('bài kết hợp — luân phiên', () => {
	const circuit = (group: number, roundRestSec: number): PlanCombo => ({
		group,
		name: 'Core',
		style: 'circuit',
		roundRestSec,
		instructions: null,
		media: [],
	});

	it('mỗi vòng 1 set từng bài con: nghỉ chuyển bài theo restSec, nghỉ giữa vòng, vòng cuối không nghỉ', () => {
		const c = circuit(0, 30);
		const items = [
			item({ mode: 'reps', sets: 2, restSec: 10, combo: c }),
			item({ mode: 'duration', sets: 2, durationSec: 45, restSec: 99, combo: c }), // restSec bài cuối bị bỏ qua
		];
		const steps = buildTimeline(items, 5);
		expect(steps.map((s) => [s.kind, s.itemIndex, s.set, s.durationSec])).toEqual([
			['prep', 0, 1, 5],
			['work', 0, 1, null],
			['rest', 0, 1, 10],
			['work', 1, 1, 45],
			['rest', 1, 1, 30],
			['work', 0, 2, null],
			['rest', 0, 2, 10],
			['work', 1, 2, 45],
		]);
		expect(setsDoneByItem(steps, steps.length, items.length)).toEqual([2, 2]);
	});

	it('hold chuyển thẳng sang bài kế (không nghỉ) ⇒ GIỮ nhịp thả; hết cả bài kết hợp ⇒ bỏ', () => {
		const c = circuit(0, 20);
		const items = [item({ sets: 2, reps: 2, restSec: 0, combo: c }), item({ mode: 'reps', sets: 2, combo: c })];
		expect(kinds(items)).toEqual([
			'hold', 'relax', 'hold', 'relax', 'work', 'rest',
			'hold', 'relax', 'hold', 'relax', 'work',
		]);
		const lastHoldEnd = [item({ mode: 'reps', sets: 1, combo: c }), item({ sets: 1, reps: 2, combo: c })];
		expect(kinds(lastHoldEnd)).toEqual(['work', 'hold', 'relax', 'hold']);
	});

	it('hai lần dùng cùng bài kết hợp liền nhau ⇒ hai khối riêng, mỗi khối một bước chuẩn bị', () => {
		const items = [
			item({ mode: 'reps', sets: 1, combo: circuit(0, 0) }),
			item({ mode: 'reps', sets: 1, combo: circuit(0, 0) }),
			item({ mode: 'reps', sets: 1, combo: circuit(1, 0) }),
			item({ mode: 'reps', sets: 1, combo: circuit(1, 0) }),
		];
		expect(buildTimeline(items, 3).map((s) => [s.kind, s.itemIndex])).toEqual([
			['prep', 0], ['work', 0], ['work', 1],
			['prep', 2], ['work', 2], ['work', 3],
		]);
	});

	it('lần lượt ⇒ y như các bài rời', () => {
		const seq: PlanCombo = { group: 0, name: 'Khởi động', style: 'sequence', roundRestSec: 0, instructions: null, media: [] };
		const plain = [item({ mode: 'reps', sets: 2, restSec: 10 }), item({ sets: 2, reps: 2, restSec: 15 })];
		const combo = plain.map((p) => ({ ...p, combo: seq }));
		expect(buildTimeline(combo, 5)).toEqual(buildTimeline(plain, 5));
	});
});

describe('toPlanItems', () => {
	const component = (exerciseId: number, over: Partial<ExerciseParams> = {}) => ({
		exerciseId,
		sets: 4,
		reps: 12,
		holdSec: 5,
		relaxSec: 5,
		durationSec: 30,
		restSec: 10,
		exercise: {
			name: `Bài ${exerciseId}`,
			category: 'strength' as const,
			mode: 'reps' as const,
			instructions: null,
			media: [{ kind: 'image' as const, url: `/media/${exerciseId}.webp`, caption: null }],
		},
		...over,
	});
	const comboItem = (comboStyle: 'circuit' | 'sequence') => ({
		exerciseId: 9,
		sets: 3,
		reps: 10,
		holdSec: 5,
		relaxSec: 5,
		durationSec: 30,
		restSec: 60,
		exercise: {
			name: 'Core',
			category: 'strength' as const,
			mode: 'combo' as const,
			comboStyle,
			instructions: 'Làm liên tục',
			media: [],
			components: [component(1), component(2)],
		},
	});

	it('bài đơn ⇒ một PlanItem, không có combo', () => {
		const single = { ...comboItem('circuit'), exercise: { ...comboItem('circuit').exercise, mode: 'hold' as const } };
		const [only, ...rest] = toPlanItems(single, 0);
		expect(rest).toEqual([]);
		expect(only).toMatchObject({ exerciseId: 9, name: 'Core', mode: 'hold', sets: 3 });
		expect(only?.combo).toBeUndefined();
	});

	it('luân phiên: số vòng + nghỉ giữa vòng lấy từ item, thông số còn lại từ bài con', () => {
		const plan = toPlanItems(comboItem('circuit'), 4);
		expect(plan.map((p) => [p.exerciseId, p.sets, p.reps, p.restSec])).toEqual([
			[1, 3, 12, 10],
			[2, 3, 12, 10],
		]);
		expect(plan[0]?.combo).toEqual({
			group: 4,
			name: 'Core',
			style: 'circuit',
			roundRestSec: 60,
			instructions: 'Làm liên tục',
			media: [],
		});
		// Bài con mang ảnh của chính nó — màn hình tập hiện đúng ảnh bài đang tập trong vòng.
		expect(plan.map((p) => p.media?.[0]?.url)).toEqual(['/media/1.webp', '/media/2.webp']);
	});

	it('lần lượt: bài con giữ số set riêng', () => {
		const plan = toPlanItems(comboItem('sequence'), 0);
		expect(plan.map((p) => p.sets)).toEqual([4, 4]);
		expect(plan[0]?.combo?.roundRestSec).toBe(0);
	});
});
