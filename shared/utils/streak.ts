import { addDays, daysBetween, startOfIsoWeek } from './date';

export interface DailyStat {
	date: string;
	sessions: number;
	durationSec: number;
}

export interface WeeklyStat {
	weekStart: string; // Thứ 2
	sessions: number;
	durationSec: number;
	activeDays: number;
}

/**
 * Chuỗi ngày tập liên tiếp.
 *
 * `current` KHÔNG đứt chỉ vì hôm nay chưa tập: nếu hôm qua có tập thì chuỗi vẫn sống
 * cho tới hết ngày hôm nay. Đứt ngay từ sáng sẽ làm app báo "0 ngày" đúng lúc người
 * dùng mở app để chuẩn bị tập — phản tác dụng với mục đích giữ thói quen.
 * Ngày ở tương lai (đồng hồ lệch, nhập nhầm) bị bỏ qua.
 */
export function computeStreaks(activeDates: readonly string[], today: string): { current: number; longest: number } {
	const unique = [...new Set(activeDates)].filter((d) => d <= today).sort();
	if (unique.length === 0) return { current: 0, longest: 0 };

	let longest = 1;
	let run = 1;
	for (let i = 1; i < unique.length; i++) {
		run = daysBetween(unique[i - 1]!, unique[i]!) === 1 ? run + 1 : 1;
		if (run > longest) longest = run;
	}

	const set = new Set(unique);
	const yesterday = addDays(today, -1);
	let cursor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
	let current = 0;
	while (cursor && set.has(cursor)) {
		current++;
		cursor = addDays(cursor, -1);
	}
	return { current, longest };
}

/** Lấp đủ mọi ngày trong [from, to] — ngày không tập ra 0. */
export function fillDays(daily: readonly DailyStat[], from: string, to: string): DailyStat[] {
	const byDate = new Map(daily.map((d) => [d.date, d]));
	const out: DailyStat[] = [];
	for (let d = from; d <= to; d = addDays(d, 1)) {
		out.push(byDate.get(d) ?? { date: d, sessions: 0, durationSec: 0 });
	}
	return out;
}

/**
 * Gộp theo tuần ISO (Thứ 2 → CN), `weeks` tuần gần nhất, cũ → mới; phần tử cuối là tuần
 * hiện tại. Gộp ở TS thay vì strftime('%W') vì %W đánh số lại từ 00 mỗi đầu năm — tuần
 * vắt qua 1/1 bị chẻ làm hai.
 */
export function rollupWeeks(daily: readonly DailyStat[], today: string, weeks: number): WeeklyStat[] {
	const currentWeek = startOfIsoWeek(today);
	const out: WeeklyStat[] = [];
	const index = new Map<string, WeeklyStat>();
	for (let i = weeks - 1; i >= 0; i--) {
		const w: WeeklyStat = { weekStart: addDays(currentWeek, -7 * i), sessions: 0, durationSec: 0, activeDays: 0 };
		out.push(w);
		index.set(w.weekStart, w);
	}
	for (const d of daily) {
		const w = index.get(startOfIsoWeek(d.date));
		if (!w || d.sessions <= 0) continue;
		w.sessions += d.sessions;
		w.durationSec += d.durationSec;
		w.activeDays += 1;
	}
	return out;
}
