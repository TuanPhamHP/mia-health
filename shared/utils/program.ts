import { addDays, daysBetween, startOfIsoWeek } from './date';

// ---------------------------------------------------------------------------
// Chương trình theo thời gian: đang tuần mấy, giai đoạn nào, đã xong chưa. Pure function —
// server dựng lịch hôm nay, client hiện trạng thái ở danh sách / chi tiết; hai bên không lệch.
// ---------------------------------------------------------------------------

export interface ProgramSchedule {
	startDate: string | null;
	repeat: boolean;
	phases: readonly { weeks: number }[];
}

export type ProgramStatus =
	/** Không theo (startDate null). */
	| { kind: 'idle' }
	/** Đã hẹn ngày bắt đầu, chưa tới. */
	| { kind: 'upcoming'; startDate: string }
	/**
	 * `week` / `totalWeeks`: tuần trong vòng hiện tại (1-based). `cycle`: vòng thứ mấy (chỉ > 1
	 * khi lặp lại). `weekInPhase`: tuần trong giai đoạn `phaseIndex` (1-based).
	 */
	| { kind: 'active'; week: number; totalWeeks: number; cycle: number; phaseIndex: number; weekInPhase: number }
	/** Hết giai đoạn cuối và không lặp — `endDate` = Chủ nhật của tuần cuối. */
	| { kind: 'finished'; endDate: string };

export function totalWeeks(phases: readonly { weeks: number }[]): number {
	return phases.reduce((sum, p) => sum + p.weeks, 0);
}

/**
 * Tuần 1 = tuần ISO (Thứ 2 → CN) chứa `startDate`, khớp lịch theo thứ và thống kê tuần. Bắt
 * đầu giữa tuần thì tuần 1 ngắn hơn — vẫn tính là một tuần, như mọi lịch tập in sẵn.
 */
export function programStatus(p: ProgramSchedule, date: string): ProgramStatus {
	if (!p.startDate) return { kind: 'idle' };
	if (date < p.startDate) return { kind: 'upcoming', startDate: p.startDate };
	const total = totalWeeks(p.phases);
	// Service luôn giữ ≥ 1 giai đoạn; không có giai đoạn thì không có gì để theo.
	if (total === 0) return { kind: 'idle' };

	const firstMonday = startOfIsoWeek(p.startDate);
	const weekIndex = Math.floor(daysBetween(firstMonday, date) / 7);
	if (weekIndex >= total && !p.repeat) return { kind: 'finished', endDate: addDays(firstMonday, total * 7 - 1) };

	let rest = weekIndex % total;
	let phaseIndex = 0;
	while (rest >= p.phases[phaseIndex]!.weeks) {
		rest -= p.phases[phaseIndex]!.weeks;
		phaseIndex++;
	}
	return {
		kind: 'active',
		week: (weekIndex % total) + 1,
		totalWeeks: total,
		cycle: Math.floor(weekIndex / total) + 1,
		phaseIndex,
		weekInPhase: rest + 1,
	};
}

// ---------------------------------------------------------------------------
// Thay đổi lịch trong một ngày (bỏ qua / đổi buổi) áp lên các buổi theo lịch của chương trình.
// ---------------------------------------------------------------------------

export interface DayChange {
	id: number;
	kind: 'skip' | 'swap' | 'add';
	routineId: number;
	replacementId: number | null;
}

export interface DayEntry {
	/** Buổi sẽ tập — swap ⇒ giáo án thay vào. */
	routineId: number;
	skipped: boolean;
	/** swap: buổi gốc theo lịch. */
	replacesId: number | null;
	/** Thay đổi đang áp (xoá = hoàn tác); null = đúng lịch. */
	changeId: number | null;
}

/**
 * Áp các thay đổi skip / swap của MỘT chương trình trong ngày lên các buổi theo lịch. Thay
 * đổi trỏ tới buổi không còn trong lịch (chương trình sửa sau đó) bị bỏ qua; nhiều thay đổi
 * cho cùng một buổi thì cái mới nhất (id lớn nhất) thắng. `add` không thuộc chương trình nào
 * nên không xét ở đây.
 */
export function applyDayChanges(plannedIds: readonly number[], changes: readonly DayChange[]): DayEntry[] {
	const latest = new Map<number, DayChange>();
	for (const c of changes) {
		if (c.kind === 'add') continue;
		const prev = latest.get(c.routineId);
		if (!prev || c.id > prev.id) latest.set(c.routineId, c);
	}
	return plannedIds.map((routineId) => {
		const c = latest.get(routineId);
		if (c?.kind === 'skip') return { routineId, skipped: true, replacesId: null, changeId: c.id };
		if (c?.kind === 'swap' && c.replacementId !== null) {
			return { routineId: c.replacementId, skipped: false, replacesId: routineId, changeId: c.id };
		}
		return { routineId, skipped: false, replacesId: null, changeId: null };
	});
}
