import { computed, ref, shallowRef } from 'vue';
import type { Ref } from 'vue';
import { buildTimeline, setsDoneByItem, stepEstimateSec } from '#shared/utils/timeline';
import type { PlanItem, Step } from '#shared/utils/timeline';

export type PlayerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface PlayerHooks {
	/** Vào bước mới (không gọi cho các bước bị "nuốt" khi bắt kịp sau lúc app bị treo). */
	onStep?: (step: Step, item: PlanItem, index: number) => void;
	/** Còn 3, 2, 1 giây của bước có đồng hồ. */
	onCountdown?: (secondsLeft: number, step: Step) => void;
	onFinish?: (completed: boolean) => void;
}

const TICK_MS = 100;

/**
 * Bộ máy chạy timeline. Dùng `performance.now()` để đo thời gian thật trôi qua
 * thay vì tin vào nhịp setInterval: trình duyệt bóp setInterval khi tab ẩn / máy
 * khoá, nhịp kế tiếp mang theo cả khoảng trễ và vòng `while` bắt kịp đúng số bước.
 */
export function usePlayer(items: Ref<PlanItem[]>, prepSec: Ref<number>, hooks: PlayerHooks = {}) {
	const steps = computed(() => buildTimeline(items.value, prepSec.value));

	const status = ref<PlayerStatus>('idle');
	const index = ref(0);
	const remainingMs = ref(0);
	const stepElapsedMs = ref(0);
	const activeMs = ref(0); // thời gian tập thật, không tính lúc tạm dừng
	const completedSteps = ref(0);
	const startedAt = shallowRef<Date | null>(null);

	let timer: ReturnType<typeof setInterval> | null = null;
	let last = 0;
	let lastCountdown: number | null = null;

	const current = computed<Step | null>(() => steps.value[index.value] ?? null);
	const currentItem = computed<PlanItem | null>(() => (current.value ? items.value[current.value.itemIndex] ?? null : null));
	const nextItem = computed<PlanItem | null>(() => {
		const cur = current.value;
		if (!cur) return null;
		const next = steps.value.slice(index.value + 1).find((s) => s.itemIndex !== cur.itemIndex);
		return next ? items.value[next.itemIndex] ?? null : null;
	});

	const totalEstimateSec = computed(() => steps.value.reduce((sum, s) => sum + stepEstimateSec(s, items.value), 0));
	const progressPct = computed(() => {
		if (status.value === 'finished') return 100;
		const total = totalEstimateSec.value;
		if (total <= 0) return 0;
		let done = 0;
		for (let i = 0; i < index.value; i++) done += stepEstimateSec(steps.value[i]!, items.value);
		const cur = current.value;
		if (cur?.durationSec) done += cur.durationSec - remainingMs.value / 1000;
		return Math.min(100, (done / total) * 100);
	});

	const setsDone = computed(() => setsDoneByItem(steps.value, completedSteps.value, items.value.length));

	function enterStep(i: number, cue: boolean) {
		const s = steps.value[i];
		if (!s) return;
		index.value = i;
		completedSteps.value = i;
		remainingMs.value = (s.durationSec ?? 0) * 1000;
		stepElapsedMs.value = 0;
		lastCountdown = null;
		if (cue) fireStep();
	}

	function fireStep() {
		const s = current.value;
		const it = currentItem.value;
		if (s && it) hooks.onStep?.(s, it, index.value);
	}

	function finish(completed: boolean) {
		if (completed) completedSteps.value = steps.value.length;
		status.value = 'finished';
		stopTicker();
		hooks.onFinish?.(completed);
	}

	/** Sang bước kế; hết timeline thì kết thúc. Trả false nếu đã kết thúc. */
	function advance(cue: boolean): boolean {
		if (index.value + 1 >= steps.value.length) {
			finish(true);
			return false;
		}
		enterStep(index.value + 1, cue);
		return true;
	}

	function tick() {
		const now = performance.now();
		let delta = now - last;
		last = now;
		if (status.value !== 'running') return;
		activeMs.value += delta;

		const before = index.value;
		while (delta > 0 && status.value === 'running') {
			const s = current.value;
			if (!s) break;
			if (s.durationSec === null) {
				// mode reps: chờ người tập bấm "Xong set", chỉ đếm lên
				stepElapsedMs.value += delta;
				break;
			}
			if (remainingMs.value > delta) {
				remainingMs.value -= delta;
				stepElapsedMs.value += delta;
				delta = 0;
			} else {
				delta -= remainingMs.value;
				remainingMs.value = 0;
				if (!advance(false)) return;
			}
		}
		// Chỉ phát tín hiệu cho bước ĐANG đứng — bắt kịp 20 bước sau khi máy khoá mà
		// bíp 20 lần thì vô nghĩa.
		if (index.value !== before) fireStep();

		const s = current.value;
		if (s?.durationSec && s.durationSec > 3) {
			const left = Math.ceil(remainingMs.value / 1000);
			if (left <= 3 && left >= 1 && left !== lastCountdown) {
				lastCountdown = left;
				hooks.onCountdown?.(left, s);
			}
		}
	}

	function startTicker() {
		stopTicker();
		last = performance.now();
		timer = setInterval(tick, TICK_MS);
	}

	function stopTicker() {
		if (timer) clearInterval(timer);
		timer = null;
	}

	function start() {
		if (steps.value.length === 0) return;
		status.value = 'running';
		startedAt.value = new Date();
		activeMs.value = 0;
		enterStep(0, true);
		startTicker();
	}

	function pause() {
		if (status.value !== 'running') return;
		tick();
		status.value = 'paused';
		stopTicker();
	}

	function resume() {
		if (status.value !== 'paused') return;
		status.value = 'running';
		startTicker();
	}

	/** "Xong set" của mode reps, hoặc bỏ qua bước hiện tại. */
	function next() {
		if (status.value === 'idle' || status.value === 'finished') return;
		advance(true);
	}

	function prev() {
		if (status.value === 'idle' || status.value === 'finished') return;
		enterStep(Math.max(0, index.value - 1), true);
	}

	/** Dừng sớm: bước đang dở KHÔNG tính là xong. */
	function stop() {
		if (status.value === 'idle' || status.value === 'finished') return;
		completedSteps.value = index.value;
		finish(false);
	}

	return {
		steps,
		status,
		index,
		current,
		currentItem,
		nextItem,
		remainingMs,
		stepElapsedMs,
		activeMs,
		startedAt,
		progressPct,
		totalEstimateSec,
		setsDone,
		start,
		pause,
		resume,
		next,
		prev,
		stop,
		dispose: stopTicker,
	};
}
