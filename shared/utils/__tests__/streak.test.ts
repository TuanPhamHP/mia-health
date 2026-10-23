import { describe, expect, it } from 'vitest';
import { computeStreaks, fillDays, rollupWeeks } from '../streak';
import { addDays, isoWeekday, startOfIsoWeek } from '../date';

describe('date helpers', () => {
	it('isoWeekday: Thứ 2 = 1, Chủ nhật = 7', () => {
		expect(isoWeekday('2026-10-19')).toBe(1);
		expect(isoWeekday('2026-10-25')).toBe(7);
	});

	it('startOfIsoWeek vắt qua năm mới', () => {
		expect(startOfIsoWeek('2027-01-01')).toBe('2026-12-28');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
	});
});

describe('computeStreaks', () => {
	it('rỗng ⇒ 0/0', () => {
		expect(computeStreaks([], '2026-10-23')).toEqual({ current: 0, longest: 0 });
	});

	it('hôm nay chưa tập nhưng hôm qua có ⇒ chuỗi vẫn sống', () => {
		const dates = ['2026-10-20', '2026-10-21', '2026-10-22'];
		expect(computeStreaks(dates, '2026-10-23')).toEqual({ current: 3, longest: 3 });
	});

	it('bỏ một ngày ⇒ current = 0, longest giữ nguyên', () => {
		const dates = ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'];
		expect(computeStreaks(dates, '2026-10-23')).toEqual({ current: 0, longest: 4 });
	});

	it('trùng ngày (2 buổi/ngày) chỉ đếm 1, ngày tương lai bị bỏ', () => {
		const dates = ['2026-10-22', '2026-10-22', '2026-10-23', '2026-10-25'];
		expect(computeStreaks(dates, '2026-10-23')).toEqual({ current: 2, longest: 2 });
	});
});

describe('rollupWeeks / fillDays', () => {
	const daily = [
		{ date: '2026-10-12', sessions: 1, durationSec: 600 },
		{ date: '2026-10-19', sessions: 2, durationSec: 900 },
		{ date: '2026-10-22', sessions: 1, durationSec: 300 },
	];

	it('gộp theo tuần ISO, phần tử cuối là tuần hiện tại, lấp tuần trống', () => {
		const weeks = rollupWeeks(daily, '2026-10-23', 3);
		expect(weeks).toEqual([
			{ weekStart: '2026-10-05', sessions: 0, durationSec: 0, activeDays: 0 },
			{ weekStart: '2026-10-12', sessions: 1, durationSec: 600, activeDays: 1 },
			{ weekStart: '2026-10-19', sessions: 3, durationSec: 1200, activeDays: 2 },
		]);
	});

	it('fillDays đủ mọi ngày trong khoảng', () => {
		const days = fillDays(daily, '2026-10-19', '2026-10-23');
		expect(days.map((d) => d.sessions)).toEqual([2, 0, 0, 1, 0]);
	});
});
