import type { ComboStyle, ExerciseCategory, ExerciseMode, ExerciseParams, MediaKind, SingleMode } from '../types/exercises';

// ---------------------------------------------------------------------------
// Timeline của màn hình tập: trải phẳng giáo án thành chuỗi bước tuần tự.
// Pure function — player ở client chỉ việc chạy lần lượt từng bước; server dùng
// cùng hàm để ước lượng thời lượng giáo án, nên hai bên không bao giờ lệch nhau.
// ---------------------------------------------------------------------------

export type StepKind = 'prep' | 'work' | 'hold' | 'relax' | 'rest';

/** Ảnh / video hướng dẫn — chỉ để hiển thị, timeline không đọc. */
export interface PlanMedia {
	kind: MediaKind;
	url: string;
	caption: string | null;
}

/** Bài kết hợp mà một PlanItem thuộc về. */
export interface PlanCombo {
	/** Tách hai lần dùng cùng một bài kết hợp trong giáo án (= vị trí item). */
	group: number;
	name: string;
	style: ComboStyle;
	/** Luân phiên: nghỉ giữa vòng. Lần lượt: 0. */
	roundRestSec: number;
	instructions: string | null;
	media: readonly PlanMedia[];
}

export interface PlanItem {
	exerciseId: number | null;
	name: string;
	category: ExerciseCategory;
	mode: SingleMode;
	sets: number;
	reps: number;
	holdSec: number;
	relaxSec: number;
	durationSec: number;
	restSec: number;
	instructions: string | null;
	media?: readonly PlanMedia[];
	/**
	 * Có ⇒ là bài con của bài kết hợp. Luân phiên: các PlanItem liền nhau cùng `group`
	 * chạy theo vòng — `sets` = số vòng (bằng nhau trong cả nhóm), `restSec` = nghỉ trước
	 * bài kế trong vòng. Lần lượt: chạy y như bài rời.
	 */
	combo?: PlanCombo;
}

export interface Step {
	kind: StepKind;
	itemIndex: number;
	set: number; // 1-based; bài luân phiên: số thứ tự vòng
	rep: number | null; // 1-based, chỉ có ở hold/relax
	durationSec: number | null; // null = chờ người tập bấm "Xong set" (work của mode reps)
	endsSet: boolean; // hoàn thành bước này = xong một set
}

/** Ước lượng cho mode reps (không có đồng hồ): ~3 giây mỗi lần. */
export const REP_ESTIMATE_SEC = 3;

/**
 * Một set của một bài. `restSec` = nghỉ ngay sau set (0 = không nghỉ); `endsBlock` = sau
 * set này là hết bài rời / hết cả bài luân phiên.
 */
function pushSet(steps: Step[], item: PlanItem, itemIndex: number, set: number, restSec: number, endsBlock: boolean) {
	if (item.mode === 'reps') {
		steps.push({ kind: 'work', itemIndex, set, rep: null, durationSec: null, endsSet: true });
	} else if (item.mode === 'duration') {
		steps.push({ kind: 'work', itemIndex, set, rep: null, durationSec: item.durationSec, endsSet: true });
	} else {
		for (let rep = 1; rep <= item.reps; rep++) {
			const lastRep = rep === item.reps;
			// Bỏ nhịp thả lỏng sau rep cuối của set khi ngay sau đó là nghỉ hoặc hết bài —
			// tránh hai khoảng thả lỏng nối nhau. Không nghỉ thì giữ lại: kegel không có nhịp
			// thả giữa hai lần siết là sai kỹ thuật (kể cả khi chuyển thẳng sang bài con kế).
			const pushRelax = item.relaxSec > 0 && !(lastRep && (restSec > 0 || endsBlock));
			steps.push({ kind: 'hold', itemIndex, set, rep, durationSec: item.holdSec, endsSet: lastRep && !pushRelax });
			if (pushRelax) {
				steps.push({ kind: 'relax', itemIndex, set, rep, durationSec: item.relaxSec, endsSet: lastRep });
			}
		}
	}
	if (restSec > 0) {
		steps.push({ kind: 'rest', itemIndex, set, rep: null, durationSec: restSec, endsSet: false });
	}
}

function pushSingle(steps: Step[], item: PlanItem, itemIndex: number) {
	for (let set = 1; set <= item.sets; set++) {
		const lastSet = set === item.sets;
		pushSet(steps, item, itemIndex, set, lastSet ? 0 : item.restSec, lastSet);
	}
}

// Luân phiên: mỗi vòng 1 set của từng bài con. Sau bài con nghỉ theo restSec của nó (chuyển
// bài), hết vòng nghỉ roundRestSec — restSec của bài con cuối bị bỏ qua; vòng cuối không nghỉ.
function pushCircuit(steps: Step[], items: readonly PlanItem[], start: number, end: number, roundRestSec: number) {
	const rounds = items[start]!.sets;
	for (let round = 1; round <= rounds; round++) {
		const lastRound = round === rounds;
		for (let i = start; i < end; i++) {
			const lastInRound = i === end - 1;
			const restSec = lastInRound ? (lastRound ? 0 : roundRestSec) : items[i]!.restSec;
			pushSet(steps, items[i]!, i, round, restSec, lastInRound && lastRound);
		}
	}
}

export interface PlanBlock {
	start: number;
	end: number; // không gồm
	/** Khối luân phiên; null = một bài rời (kể cả bài con của bài kết hợp "lần lượt"). */
	circuit: PlanCombo | null;
}

/**
 * Chia plan thành khối: một bài rời, hoặc trọn các bài con liền nhau của một bài luân phiên.
 * Bài con của bài "lần lượt" là khối riêng — chạy y như bài rời, có chuẩn bị trước mỗi bài.
 */
export function planBlocks(items: readonly PlanItem[]): PlanBlock[] {
	const blocks: PlanBlock[] = [];
	let start = 0;
	while (start < items.length) {
		const first = items[start]!;
		const circuit = first.combo?.style === 'circuit' ? first.combo : null;
		let end = start + 1;
		if (circuit) {
			while (end < items.length && items[end]!.combo?.group === circuit.group) end++;
		}
		blocks.push({ start, end, circuit });
		start = end;
	}
	return blocks;
}

export function buildTimeline(items: readonly PlanItem[], prepSec: number): Step[] {
	const steps: Step[] = [];
	for (const { start, end, circuit } of planBlocks(items)) {
		if (prepSec > 0) {
			steps.push({ kind: 'prep', itemIndex: start, set: 1, rep: null, durationSec: prepSec, endsSet: false });
		}
		if (circuit) pushCircuit(steps, items, start, end, circuit.roundRestSec);
		else pushSingle(steps, items[start]!, start);
	}
	return steps;
}

export function stepEstimateSec(step: Step, items: readonly PlanItem[]): number {
	return step.durationSec ?? (items[step.itemIndex]?.reps ?? 0) * REP_ESTIMATE_SEC;
}

export function estimateTimelineSec(steps: readonly Step[], items: readonly PlanItem[]): number {
	return steps.reduce((sum, s) => sum + stepEstimateSec(s, items), 0);
}

/** Số set đã hoàn thành của từng bài khi đã xong `completedSteps` bước đầu tiên. */
export function setsDoneByItem(steps: readonly Step[], completedSteps: number, itemCount: number): number[] {
	const done = new Array<number>(itemCount).fill(0);
	const upTo = Math.min(completedSteps, steps.length);
	for (let i = 0; i < upTo; i++) {
		const s = steps[i]!;
		if (s.endsSet) done[s.itemIndex] = (done[s.itemIndex] ?? 0) + 1;
	}
	return done;
}

interface PlanExercise {
	name: string;
	category: ExerciseCategory;
	instructions: string | null;
	media: readonly PlanMedia[];
}

/** Bài con (DTO ở client hoặc row đã join ở server). */
interface PlanComponentSource extends ExerciseParams {
	exerciseId: number;
	exercise: PlanExercise & { mode: SingleMode };
}

/**
 * Item giáo án / bài trong thư viện → PlanItem. Bài kết hợp trải thành các bài con;
 * `group` (vị trí item trong giáo án) tách hai lần dùng cùng một bài kết hợp.
 */
export function toPlanItems(
	item: ExerciseParams & {
		exerciseId: number | null;
		exercise: PlanExercise & {
			mode: ExerciseMode;
			comboStyle: ComboStyle;
			components: readonly PlanComponentSource[];
		};
	},
	group: number,
): PlanItem[] {
	const ex = item.exercise;
	if (ex.mode !== 'combo') {
		return [
			{
				exerciseId: item.exerciseId,
				name: ex.name,
				category: ex.category,
				mode: ex.mode,
				sets: item.sets,
				reps: item.reps,
				holdSec: item.holdSec,
				relaxSec: item.relaxSec,
				durationSec: item.durationSec,
				restSec: item.restSec,
				instructions: ex.instructions,
				media: ex.media,
			},
		];
	}

	const circuit = ex.comboStyle === 'circuit';
	const combo: PlanCombo = {
		group,
		name: ex.name,
		style: ex.comboStyle,
		roundRestSec: circuit ? item.restSec : 0,
		instructions: ex.instructions,
		media: ex.media,
	};
	return ex.components.map((c) => ({
		exerciseId: c.exerciseId,
		name: c.exercise.name,
		category: c.exercise.category,
		mode: c.exercise.mode,
		// Luân phiên: số vòng nằm ở item (giáo án có thể chỉnh riêng) và áp cho mọi bài con.
		sets: circuit ? item.sets : c.sets,
		reps: c.reps,
		holdSec: c.holdSec,
		relaxSec: c.relaxSec,
		durationSec: c.durationSec,
		restSec: c.restSec,
		instructions: c.exercise.instructions,
		media: c.exercise.media,
		combo,
	}));
}
