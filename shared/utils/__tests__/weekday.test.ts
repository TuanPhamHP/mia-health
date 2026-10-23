import { describe, expect, it } from 'vitest';
import { ALL_DAYS_MASK, daysToMask, describeMask, isScheduledOn, maskToDays } from '../weekday';

describe('weekday mask', () => {
	it('daysToMask ↔ maskToDays', () => {
		const mask = daysToMask([1, 3, 5]);
		expect(mask).toBe(0b0010101);
		expect(maskToDays(mask)).toEqual([1, 3, 5]);
		expect(daysToMask([1, 2, 3, 4, 5, 6, 7])).toBe(ALL_DAYS_MASK);
	});

	it('isScheduledOn theo thứ ISO', () => {
		const monWedFri = daysToMask([1, 3, 5]);
		expect(isScheduledOn(monWedFri, '2026-10-19')).toBe(true); // T2
		expect(isScheduledOn(monWedFri, '2026-10-20')).toBe(false); // T3
		expect(isScheduledOn(daysToMask([7]), '2026-10-25')).toBe(true); // CN
	});

	it('describeMask', () => {
		expect(describeMask(0)).toBe('Không lên lịch');
		expect(describeMask(127)).toBe('Mỗi ngày');
		expect(describeMask(31)).toBe('Ngày thường');
		expect(describeMask(96)).toBe('Cuối tuần');
		expect(describeMask(daysToMask([1, 3, 5]))).toBe('T2, T4, T6');
	});
});
