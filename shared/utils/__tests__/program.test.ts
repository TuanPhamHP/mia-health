import { describe, expect, it } from 'vitest';
import { applyDayChanges, programStatus, totalWeeks } from '../program';
import type { DayChange } from '../program';

// 2026-10-23 là Thứ 6; tuần ISO của nó bắt đầu Thứ 2 2026-10-19.
const START = '2026-10-23';
const TWO_PHASES = { startDate: START, repeat: false, phases: [{ weeks: 4 }, { weeks: 4 }] };

describe('programStatus', () => {
	it('không theo khi chưa có ngày bắt đầu', () => {
		expect(programStatus({ ...TWO_PHASES, startDate: null }, START)).toEqual({ kind: 'idle' });
	});

	it('sắp bắt đầu khi chưa tới ngày bắt đầu', () => {
		expect(programStatus(TWO_PHASES, '2026-10-22')).toEqual({ kind: 'upcoming', startDate: START });
	});

	it('tuần 1 là tuần ISO chứa ngày bắt đầu — Thứ 2 kế tiếp đã là tuần 2', () => {
		expect(programStatus(TWO_PHASES, START)).toMatchObject({ kind: 'active', week: 1, phaseIndex: 0, weekInPhase: 1 });
		expect(programStatus(TWO_PHASES, '2026-10-25')).toMatchObject({ week: 1 }); // CN cùng tuần
		expect(programStatus(TWO_PHASES, '2026-10-26')).toMatchObject({ week: 2, weekInPhase: 2 });
	});

	it('sang giai đoạn 2 ở tuần 5', () => {
		expect(programStatus(TWO_PHASES, '2026-11-16')).toEqual({
			kind: 'active',
			week: 5,
			totalWeeks: 8,
			cycle: 1,
			phaseIndex: 1,
			weekInPhase: 1,
		});
	});

	it('không lặp: qua tuần cuối là hoàn thành, kết thúc ngày CN của tuần 8', () => {
		expect(programStatus(TWO_PHASES, '2026-12-13')).toMatchObject({ kind: 'active', week: 8 });
		expect(programStatus(TWO_PHASES, '2026-12-14')).toEqual({ kind: 'finished', endDate: '2026-12-13' });
	});

	it('lặp: qua tuần cuối quay về giai đoạn 1, vòng 2', () => {
		expect(programStatus({ ...TWO_PHASES, repeat: true }, '2026-12-14')).toEqual({
			kind: 'active',
			week: 1,
			totalWeeks: 8,
			cycle: 2,
			phaseIndex: 0,
			weekInPhase: 1,
		});
	});

	it('chương trình một giai đoạn 1 tuần lặp lại = lịch tuần vô hạn', () => {
		const weekly = { startDate: START, repeat: true, phases: [{ weeks: 1 }] };
		expect(programStatus(weekly, '2027-03-01')).toMatchObject({ kind: 'active', week: 1, totalWeeks: 1, phaseIndex: 0 });
	});

	it('totalWeeks cộng tuần mọi giai đoạn', () => {
		expect(totalWeeks([{ weeks: 4 }, { weeks: 3 }])).toBe(7);
	});
});

describe('applyDayChanges', () => {
	const change = (over: Partial<DayChange>): DayChange => ({ id: 1, kind: 'skip', routineId: 1, replacementId: null, ...over });

	it('không có thay đổi ⇒ đúng lịch', () => {
		expect(applyDayChanges([1, 2], [])).toEqual([
			{ routineId: 1, skipped: false, replacesId: null, changeId: null },
			{ routineId: 2, skipped: false, replacesId: null, changeId: null },
		]);
	});

	it('bỏ qua giữ buổi gốc, đánh dấu skipped', () => {
		expect(applyDayChanges([1, 2], [change({ id: 7, routineId: 2 })])[1]).toEqual({
			routineId: 2,
			skipped: true,
			replacesId: null,
			changeId: 7,
		});
	});

	it('đổi buổi thay giáo án, nhớ buổi gốc', () => {
		expect(applyDayChanges([1], [change({ id: 3, kind: 'swap', replacementId: 9 })])).toEqual([
			{ routineId: 9, skipped: false, replacesId: 1, changeId: 3 },
		]);
	});

	it('thay đổi mới nhất cho cùng một buổi thắng', () => {
		const changes = [change({ id: 5, kind: 'swap', replacementId: 9 }), change({ id: 4, kind: 'skip' })];
		expect(applyDayChanges([1], changes)[0]).toMatchObject({ routineId: 9, changeId: 5 });
	});

	it('thay đổi trỏ tới buổi không còn trong lịch bị bỏ qua; add không xét', () => {
		const changes = [change({ routineId: 42 }), change({ id: 2, kind: 'add', routineId: 1 })];
		expect(applyDayChanges([1], changes)).toEqual([{ routineId: 1, skipped: false, replacesId: null, changeId: null }]);
	});
});
