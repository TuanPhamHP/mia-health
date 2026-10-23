import { isoWeekday } from './date';

// scheduleMask: bit (isoDay - 1). Bit 0 = Thứ 2 … bit 6 = Chủ nhật.
export const ALL_DAYS_MASK = 127;
export const WEEKDAYS_MASK = 31; // T2–T6
export const WEEKEND_MASK = 96; // T7 + CN

export const WEEKDAY_SHORT_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export function isScheduledOn(mask: number, dateIso: string): boolean {
	return (mask & (1 << (isoWeekday(dateIso) - 1))) !== 0;
}

/** Mask → danh sách ISO weekday (1–7), tăng dần. */
export function maskToDays(mask: number): number[] {
	const days: number[] = [];
	for (let d = 1; d <= 7; d++) {
		if (mask & (1 << (d - 1))) days.push(d);
	}
	return days;
}

export function daysToMask(days: readonly number[]): number {
	let mask = 0;
	for (const d of days) {
		if (d >= 1 && d <= 7) mask |= 1 << (d - 1);
	}
	return mask;
}

export function describeMask(mask: number): string {
	if (mask === 0) return 'Không lên lịch';
	if (mask === ALL_DAYS_MASK) return 'Mỗi ngày';
	if (mask === WEEKDAYS_MASK) return 'Ngày thường';
	if (mask === WEEKEND_MASK) return 'Cuối tuần';
	return maskToDays(mask)
		.map((d) => WEEKDAY_SHORT_LABELS[d - 1])
		.join(', ');
}
