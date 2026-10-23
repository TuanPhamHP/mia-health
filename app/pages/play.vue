<script setup lang="ts">
	/**
	 * Màn hình tập — toàn màn hình, không dùng layout (không bottom nav để khỏi chạm nhầm).
	 *   /play?routine=<id>   chạy cả giáo án
	 *   /play?exercise=<id>  tập thử một bài lẻ
	 * Hết bài ⇒ tự lưu buổi tập; dừng sớm ⇒ hỏi lưu phần đã tập hay bỏ.
	 */
	import type { PlanItem, PlanMedia, Step } from '#shared/utils/timeline';
	import { planBlocks, toPlanItems } from '#shared/utils/timeline';
	import type { Cover } from '#shared/utils/media';
	import { coverOf } from '#shared/utils/media';
	import type { ExerciseCategory } from '#shared/types/exercises';
	import { localDateIso } from '#shared/utils/date';
	import type { SessionDTO } from '#shared/types/sessions';
	import { describeCombo, describeParams, STEP_TONES, stepLabel } from '~/utils/labels';
	import { formatClock, formatDuration } from '~/utils/format';

	definePageMeta({ layout: false });
	useHead({ title: 'Đang tập — Mia Health' });

	const route = useRoute();
	const toast = useToast();

	// ---- Nạp kế hoạch ----
	const title = ref('');
	const routineId = ref<number | null>(null);
	const items = ref<PlanItem[]>([]);
	const prepSec = ref(5);
	const loadError = ref<string | null>(null);
	const loaded = ref(false);

	const routinesApi = useRoutines();
	const exercisesApi = useExercises();
	const sessionsApi = useSessions();

	onMounted(async () => {
		const rid = Number(route.query.routine);
		const eid = Number(route.query.exercise);
		if (rid) {
			const r = await routinesApi.get(rid);
			if (r) {
				title.value = r.name;
				routineId.value = r.id;
				prepSec.value = r.prepSec;
				items.value = r.items.flatMap((it, i) => toPlanItems(it, i));
			} else loadError.value = routinesApi.error.value;
		} else if (eid) {
			const e = await exercisesApi.get(eid);
			if (e) {
				title.value = e.name;
				items.value = toPlanItems({ ...e, exerciseId: e.id, exercise: e }, 0);
			} else loadError.value = exercisesApi.error.value;
		} else {
			loadError.value = 'Thiếu giáo án hoặc bài tập để tập';
		}
		if (!loadError.value && items.value.length === 0) loadError.value = 'Giáo án chưa có bài nào';
		loaded.value = true;
		preloadCovers();
	});

	// Tải trước ảnh bìa mọi bài ngay khi vào màn hình tập: đi qua service worker (CacheFirst cho
	// /media) nên mạng rớt giữa buổi thì ảnh các bài phía sau vẫn có. Chỉ ảnh bìa — gallery đầy
	// đủ tải khi người dùng mở hướng dẫn.
	function preloadCovers() {
		const urls = new Set<string>();
		for (const it of items.value) {
			const cover = coverOf({ media: [...(it.media ?? []), ...(it.combo?.media ?? [])] });
			if (cover) urls.add(cover.url);
		}
		for (const url of urls) new Image().src = url;
	}

	// ---- Tín hiệu ----
	const cues = useCues();

	function cueStep(step: Step, item: PlanItem, index: number) {
		const label = stepLabel(step, item);
		const longEnough = (step.durationSec ?? 99) >= 2; // nhịp 1 giây: chỉ bíp, đọc không kịp
		const circuit = item.combo?.style === 'circuit' ? item.combo : null;
		// Luân phiên: mỗi set là một lần đổi bài ⇒ đọc tên bài ở bước đầu của set, bài đầu
		// vòng thì đọc thêm số vòng.
		const roundStart = circuit !== null && items.value[step.itemIndex - 1]?.combo?.group !== circuit.group;
		const intro = circuit && (step.rep ?? 1) === 1 ? `${roundStart ? `Vòng ${step.set}. ` : ''}${item.name}. ` : '';
		switch (step.kind) {
			case 'prep':
				cues.beep(660, 200);
				cues.say(`Chuẩn bị. ${circuit?.name ?? item.name}`);
				break;
			case 'hold':
				cues.beep(880, 160);
				cues.vibrate(150);
				if (longEnough) cues.say(intro + label);
				else if (intro) cues.say(intro);
				break;
			case 'relax':
				cues.beep(520, 160);
				cues.vibrate(60);
				if (longEnough) cues.say(label);
				break;
			case 'rest': {
				cues.beep(440, 300);
				cues.vibrate([80, 60, 80]);
				// Nghỉ để chuyển sang bài khác (luân phiên) ⇒ báo trước bài kế.
				const next = player.steps.value[index + 1];
				const nextName = next && next.itemIndex !== step.itemIndex ? items.value[next.itemIndex]?.name : undefined;
				cues.say(`Nghỉ ${step.durationSec} giây${nextName ? `. Tiếp theo: ${nextName}` : ''}`);
				break;
			}
			case 'work': {
				cues.beep(880, 300);
				cues.vibrate(200);
				const what = item.mode === 'reps' ? `${item.reps} lần` : 'Bắt đầu';
				cues.say(circuit ? intro + what : `Set ${step.set}. ${what}`);
				break;
			}
		}
	}

	const player = usePlayer(items, prepSec, {
		onStep: (step, item, index) => cueStep(step, item, index),
		onCountdown: () => cues.beep(1000, 70, 0.18),
		onFinish: (completed) => {
			void cues.keepAwake(false);
			if (completed) {
				cues.beep(660, 150);
				setTimeout(() => cues.beep(880, 150), 180);
				setTimeout(() => cues.beep(1100, 300), 360);
				cues.vibrate([100, 80, 100, 80, 200]);
				cues.say('Hoàn thành. Giỏi lắm!');
				void save(true);
			}
		},
	});

	const { status, current, currentItem, nextItem } = player;

	async function start() {
		cues.unlock();
		await cues.keepAwake(true);
		player.start();
	}

	function togglePause() {
		if (status.value === 'running') {
			player.pause();
			cues.stopSpeech();
		} else player.resume();
	}

	// ---- Danh sách bài: khối luân phiên gộp thành một dòng kèm các bài con ----
	interface PlanRow {
		start: number;
		title: string;
		detail: string;
		cover: Cover | null;
		category: ExerciseCategory;
		isCombo: boolean;
		/** Bài con của bài kết hợp "lần lượt" — ghi tên bài kết hợp cho dễ nhận ra. */
		tag: string | null;
		/** Khối luân phiên: thông số MỘT lượt của từng bài con. */
		units: { name: string; detail: string }[];
	}

	const planRows = computed<PlanRow[]>(() =>
		planBlocks(items.value).map(({ start, end, circuit }) => {
			const first = items.value[start]!;
			if (!circuit) {
				return {
					start,
					title: first.name,
					detail: describeParams(first.mode, first),
					cover: coverOf({ media: first.media ?? [] }),
					category: first.category,
					isCombo: false,
					tag: first.combo?.name ?? null,
					units: [],
				};
			}
			const units = items.value.slice(start, end);
			return {
				start,
				title: circuit.name,
				detail: describeCombo('circuit', { sets: first.sets, restSec: circuit.roundRestSec }, units.length),
				cover: coverOf({ media: circuit.media, components: units.map((u) => ({ exercise: { media: u.media ?? [] } })) }),
				category: first.category,
				isCombo: true,
				tag: null,
				// Bài cuối vòng: sau nó là nghỉ giữa vòng, restSec riêng không dùng.
				units: units.map((u, j) => ({
					name: u.name,
					detail: describeParams(u.mode, j === units.length - 1 ? { ...u, restSec: 0 } : u, true),
				})),
			};
		}),
	);

	// ---- Hiển thị bước hiện tại ----
	const label = computed(() => (current.value && currentItem.value ? stepLabel(current.value, currentItem.value) : ''));
	const isCircuit = computed(() => currentItem.value?.combo?.style === 'circuit');
	// Bước chuẩn bị của khối luân phiên: giới thiệu cả bài kết hợp thay vì bài con đầu tiên.
	const prepCircuit = computed(() => {
		const s = current.value;
		if (s?.kind !== 'prep' || !isCircuit.value) return null;
		return planRows.value.find((r) => r.start === s.itemIndex) ?? null;
	});
	// Ghi chú của bài kết hợp (nếu có) đi kèm hướng dẫn của bài đang tập.
	const instructions = computed(() => {
		const it = currentItem.value;
		return [it?.combo?.instructions, it?.instructions].filter(Boolean).join('\n\n') || null;
	});
	const tone = computed(() => (current.value ? STEP_TONES[current.value.kind] : ''));
	const isRepsWork = computed(() => current.value?.kind === 'work' && current.value.durationSec === null);
	const secondsLeft = computed(() => Math.ceil(player.remainingMs.value / 1000));
	const ringFraction = computed(() => {
		const s = current.value;
		if (!s?.durationSec) return 1;
		return Math.max(0, Math.min(1, player.remainingMs.value / (s.durationSec * 1000)));
	});
	const RING_R = 88;
	const RING_C = 2 * Math.PI * RING_R;

	// ---- Ảnh / video hướng dẫn của bài đang tập ----
	// Bước chuẩn bị của khối luân phiên giới thiệu cả bài kết hợp ⇒ media của nó lên trước.
	const guideMedia = computed<PlanMedia[]>(() => {
		const it = currentItem.value;
		if (!it) return [];
		const own = it.media ?? [];
		const combo = it.combo?.media ?? [];
		return prepCircuit.value ? [...combo, ...own] : [...own, ...combo];
	});
	const currentCover = computed(() => coverOf({ media: guideMedia.value }));
	const nextCover = computed(() => (nextItem.value ? coverOf({ media: nextItem.value.media ?? [] }) : null));

	// Xem hướng dẫn ⇒ tạm dừng đồng hồ (đang đọc / xem video thì không tập); đóng lại thì chạy
	// tiếp — chỉ khi chính sheet này đã dừng, không tự chạy một buổi người dùng đang tự dừng.
	const guideOpen = ref(false);
	let pausedByGuide = false;
	watch(guideOpen, (open) => {
		if (open && status.value === 'running') {
			player.pause();
			cues.stopSpeech();
			pausedByGuide = true;
		} else if (!open && pausedByGuide) {
			pausedByGuide = false;
			if (status.value === 'paused') player.resume();
		}
	});

	// ---- Lưu buổi tập ----
	const saved = ref<SessionDTO | null>(null);
	const saving = ref(false);
	const saveError = ref<string | null>(null);
	const finishedCompleted = ref(true);

	async function save(completed: boolean) {
		finishedCompleted.value = completed;
		const started = player.startedAt.value ?? new Date();
		const setsDone = player.setsDone.value;
		const entries = items.value
			.map((it, i) => ({
				exerciseId: it.exerciseId,
				exerciseName: it.name,
				category: it.category,
				mode: it.mode,
				setsPlanned: it.sets,
				setsDone: setsDone[i] ?? 0,
				reps: it.mode === 'duration' ? 0 : it.reps,
				holdSec: it.mode === 'hold' ? it.holdSec : 0,
				durationSec: it.mode === 'duration' ? it.durationSec : 0,
			}))
			.filter((e) => e.setsDone > 0);

		saving.value = true;
		saveError.value = null;
		const res = await sessionsApi.create({
			date: localDateIso(started),
			routineId: routineId.value,
			title: title.value,
			startedAt: started.toISOString(),
			durationSec: Math.round(player.activeMs.value / 1000),
			completed,
			entries,
		});
		saving.value = false;
		if (res) saved.value = res;
		else saveError.value = sessionsApi.error.value;
	}

	// ---- Dừng sớm ----
	const stopOpen = ref(false);
	const anySetDone = computed(() => player.setsDone.value.some((n) => n > 0));

	function askStop() {
		if (status.value === 'running') player.pause();
		stopOpen.value = true;
	}

	async function stopAndSave() {
		stopOpen.value = false;
		player.stop();
		await save(false);
	}

	async function discard() {
		stopOpen.value = false;
		player.stop();
		await leave();
	}

	function continueTraining() {
		stopOpen.value = false;
		player.resume();
	}

	// ---- Sau khi xong ----
	const feeling = ref<number | null>(null);
	const note = ref('');

	async function finishAndLeave() {
		if (saved.value && (feeling.value !== null || note.value.trim())) {
			await sessionsApi.update(saved.value.id, { feeling: feeling.value, note: note.value.trim() || null });
			if (sessionsApi.error.value) {
				toast.add({ title: 'Không lưu được ghi chú', description: sessionsApi.error.value, color: 'error' });
				return;
			}
		}
		toast.add({ title: 'Đã lưu buổi tập', color: 'success' });
		await leave();
	}

	const router = useRouter();
	async function leave() {
		const back = window.history.state?.back as string | undefined;
		if (back && !back.startsWith('/play')) router.back();
		else await navigateTo('/');
	}

	const summary = computed(() =>
		items.value.map((it, i) => ({
			name: it.name,
			done: player.setsDone.value[i] ?? 0,
			planned: it.sets,
			unit: it.combo?.style === 'circuit' ? 'vòng' : 'set',
		})),
	);

	// ---- Chặn rời trang khi đang tập ----
	const inProgress = computed(() => status.value === 'running' || status.value === 'paused');
	onBeforeRouteLeave(() => {
		if (inProgress.value && !confirm('Đang tập dở — rời trang sẽ KHÔNG lưu buổi này. Vẫn rời?')) return false;
	});
	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (inProgress.value) e.preventDefault();
	}
	onMounted(() => window.addEventListener('beforeunload', onBeforeUnload));
	onBeforeUnmount(() => {
		window.removeEventListener('beforeunload', onBeforeUnload);
		player.dispose();
		cues.dispose();
	});
</script>

<template>
	<div class="flex min-h-[100dvh] flex-col">
		<!-- Thanh trên -->
		<div
			class="mx-auto flex w-full max-w-md items-center gap-2 px-3"
			:style="{ paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))' }"
		>
			<UButton
				icon="i-heroicons-x-mark"
				color="neutral"
				variant="ghost"
				aria-label="Thoát"
				@click="inProgress ? askStop() : leave()"
			/>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-semibold text-(--ui-text-highlighted)">{{ title || 'Đang tải…' }}</p>
				<p v-if="inProgress && current" class="text-xs text-(--ui-text-muted)">
					Bài {{ current.itemIndex + 1 }}/{{ items.length }} · {{ formatClock(player.activeMs.value / 1000) }}
				</p>
			</div>
		</div>
		<div v-if="inProgress" class="mx-auto mt-2 w-full max-w-md px-4">
			<UProgress :model-value="player.progressPct.value" size="xs" />
		</div>

		<main class="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6">
			<!-- Đang tải / lỗi -->
			<div v-if="!loaded" class="flex flex-1 items-center justify-center">
				<UIcon name="i-heroicons-arrow-path" class="size-8 animate-spin text-(--ui-text-muted)" />
			</div>
			<UCard v-else-if="loadError" class="mt-8">
				<p class="text-center text-sm text-(--ui-text-muted)">{{ loadError }}</p>
				<UButton block class="mt-4" color="neutral" variant="soft" to="/">Về trang chính</UButton>
			</UCard>

			<!-- Chuẩn bị bắt đầu -->
			<template v-else-if="status === 'idle'">
				<div class="mt-6 space-y-3">
					<p class="text-sm text-(--ui-text-muted)">
						{{ items.length }} bài · khoảng {{ formatDuration(player.totalEstimateSec.value) }}
					</p>
					<div
						v-for="(row, i) in planRows"
						:key="row.start"
						class="rounded-2xl border border-(--ui-border) p-2"
					>
						<div class="flex items-center gap-3">
							<ExerciseThumb :cover="row.cover" :category="row.category" :combo="row.isCombo" class="size-12" />
							<div class="min-w-0 flex-1">
								<p v-if="row.tag" class="text-[11px] font-medium text-(--ui-primary)">{{ row.tag }}</p>
								<p class="truncate text-sm font-medium text-(--ui-text-highlighted)">{{ i + 1 }}. {{ row.title }}</p>
								<p class="text-xs text-(--ui-text-muted)">{{ row.detail }}</p>
							</div>
						</div>
						<ol v-if="row.units.length" class="ml-[60px] mt-1.5 space-y-0.5 border-l-2 border-(--ui-primary)/30 pl-2.5">
							<li v-for="(u, j) in row.units" :key="j" class="text-xs">
								<span class="text-(--ui-text-highlighted)">{{ u.name }}</span>
								<span class="text-(--ui-text-muted)"> · {{ u.detail }}</span>
							</li>
						</ol>
					</div>

					<UCard>
						<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">Tín hiệu</p>
						<div class="space-y-2.5">
							<label class="flex items-center justify-between text-sm">
								<span class="flex items-center gap-2"><UIcon name="i-heroicons-speaker-wave" class="size-4" />Tiếng bíp</span>
								<USwitch v-model="cues.settings.sound" />
							</label>
							<label class="flex items-center justify-between text-sm">
								<span class="flex items-center gap-2"><UIcon name="i-heroicons-chat-bubble-left-ellipsis" class="size-4" />Đọc hướng dẫn</span>
								<USwitch v-model="cues.settings.voice" />
							</label>
							<label class="flex items-center justify-between text-sm">
								<span class="flex items-center gap-2"><UIcon name="i-heroicons-device-phone-mobile" class="size-4" />Rung (Android)</span>
								<USwitch v-model="cues.settings.vibrate" />
							</label>
						</div>
					</UCard>
				</div>
				<div class="flex-1" />
				<UButton block size="xl" class="mt-6" icon="i-heroicons-play" @click="start">Bắt đầu</UButton>
			</template>

			<!-- Đang tập -->
			<template v-else-if="inProgress && current && currentItem">
				<!-- Ảnh bài đang tập — chạm để xem hướng dẫn (tự tạm dừng) -->
				<button
					v-if="currentCover"
					type="button"
					class="relative mt-4 h-36 w-full overflow-hidden rounded-2xl bg-black/30"
					aria-label="Xem hướng dẫn"
					@click="() => { guideOpen = true }"
				>
					<img :src="currentCover.url" alt="" class="size-full object-cover" >
					<span class="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
						<UIcon :name="currentCover.video ? 'i-heroicons-play-solid' : 'i-heroicons-arrows-pointing-out'" class="size-3.5" />
						{{ currentCover.video ? 'Xem video' : 'Hướng dẫn' }}
					</span>
				</button>

				<div class="text-center" :class="currentCover ? 'mt-4' : 'mt-6'">
					<p v-if="currentItem.combo && !prepCircuit" class="text-xs font-semibold uppercase tracking-wide text-(--ui-primary)">
						{{ currentItem.combo.name }}
					</p>
					<h2 class="text-xl font-bold text-(--ui-text-highlighted)">{{ prepCircuit?.title ?? currentItem.name }}</h2>
					<p class="mt-1 text-sm text-(--ui-text-muted)">
						<template v-if="prepCircuit">{{ prepCircuit.detail }}</template>
						<template v-else-if="current.kind === 'prep'">{{ describeParams(currentItem.mode, currentItem) }}</template>
						<template v-else>
							{{ isCircuit ? 'Vòng' : 'Set' }} {{ current.set }}/{{ currentItem.sets }}
							<template v-if="current.rep"> · Lần {{ current.rep }}/{{ currentItem.reps }}</template>
						</template>
					</p>
					<p v-if="prepCircuit" class="mt-1 text-xs text-(--ui-text-dimmed)">
						{{ prepCircuit.units.map((u) => u.name).join(' → ') }}
					</p>
				</div>

				<!-- Vòng đếm -->
				<div class="relative mx-auto" :class="currentCover ? 'mt-4 size-56' : 'mt-6 size-64'">
					<svg viewBox="0 0 200 200" class="size-full -rotate-90">
						<circle cx="100" cy="100" :r="RING_R" fill="none" stroke="var(--ui-border-accented)" stroke-width="8" />
						<circle
							v-if="!isRepsWork"
							cx="100"
							cy="100"
							:r="RING_R"
							fill="none"
							stroke="currentColor"
							stroke-width="8"
							stroke-linecap="round"
							:class="tone"
							:stroke-dasharray="RING_C"
							:stroke-dashoffset="RING_C * (1 - ringFraction)"
							style="transition: stroke-dashoffset 100ms linear"
						/>
					</svg>
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="text-2xl font-bold" :class="tone">{{ label }}</span>
						<span v-if="!isRepsWork" class="timer-digits text-7xl font-bold text-(--ui-text-highlighted)">
							{{ secondsLeft }}
						</span>
						<span v-else class="timer-digits mt-1 text-4xl font-semibold text-(--ui-text-muted)">
							{{ formatClock(player.stepElapsedMs.value / 1000) }}
						</span>
					</div>
				</div>

				<UButton
					v-if="isRepsWork"
					block
					size="xl"
					class="mt-6"
					icon="i-heroicons-check"
					:disabled="status === 'paused'"
					@click="player.next()"
				>
					Xong set
				</UButton>

				<p v-if="status === 'paused'" class="mt-4 text-center text-sm font-medium text-amber-500">Đang tạm dừng</p>

				<div class="mt-4 space-y-2">
					<div
						v-if="prepCircuit || nextItem"
						class="flex items-center gap-3 rounded-2xl border border-(--ui-border) p-2"
					>
						<ExerciseThumb
							:cover="prepCircuit ? coverOf({ media: currentItem.media ?? [] }) : nextCover"
							:category="(prepCircuit ? currentItem : nextItem)!.category"
							class="size-10"
						/>
						<span class="min-w-0 flex-1">
							<span class="block text-[11px] text-(--ui-text-muted)">{{ prepCircuit ? 'Bắt đầu với' : 'Tiếp theo' }}</span>
							<span class="block truncate text-sm font-medium text-(--ui-text-highlighted)">
								{{ (prepCircuit ? currentItem : nextItem)!.name }}
							</span>
						</span>
					</div>
					<button
						v-if="instructions || guideMedia.length"
						type="button"
						class="mx-auto flex items-center gap-1 text-xs text-(--ui-primary)"
						@click="() => { guideOpen = true }"
					>
						<UIcon name="i-heroicons-book-open" class="size-3.5" />
						Xem hướng dẫn
					</button>
				</div>

				<div class="flex-1" />

				<!-- Điều khiển -->
				<div class="mt-6 flex items-center justify-center gap-6">
					<UButton icon="i-heroicons-backward" color="neutral" variant="soft" size="xl" class="rounded-full" aria-label="Bước trước" @click="player.prev()" />
					<UButton
						:icon="status === 'running' ? 'i-heroicons-pause' : 'i-heroicons-play'"
						size="xl"
						class="size-16 justify-center rounded-full"
						:aria-label="status === 'running' ? 'Tạm dừng' : 'Tiếp tục'"
						@click="togglePause"
					/>
					<UButton icon="i-heroicons-forward" color="neutral" variant="soft" size="xl" class="rounded-full" aria-label="Bỏ qua bước" @click="player.next()" />
				</div>
			</template>

			<!-- Kết thúc -->
			<template v-else-if="status === 'finished'">
				<div class="mt-8 text-center">
					<div class="text-5xl">{{ finishedCompleted ? '🎉' : '👍' }}</div>
					<h2 class="mt-3 text-2xl font-bold text-(--ui-text-highlighted)">
						{{ finishedCompleted ? 'Hoàn thành!' : 'Đã dừng' }}
					</h2>
					<p class="mt-1 text-sm text-(--ui-text-muted)">
						Thời gian tập {{ formatDuration(player.activeMs.value / 1000) }}
					</p>
				</div>

				<UCard class="mt-6">
					<div class="space-y-1.5">
						<div v-for="(s, i) in summary" :key="i" class="flex items-center justify-between gap-2 text-sm">
							<span class="truncate text-(--ui-text-highlighted)">{{ s.name }}</span>
							<span class="shrink-0 tabular-nums" :class="s.done >= s.planned ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--ui-text-muted)'">
								{{ s.done }}/{{ s.planned }} {{ s.unit }}
							</span>
						</div>
					</div>
				</UCard>

				<div v-if="saving" class="mt-4 flex items-center justify-center gap-2 text-sm text-(--ui-text-muted)">
					<UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin" />Đang lưu…
				</div>
				<div v-else-if="saveError" class="mt-4 space-y-2 text-center">
					<p class="text-sm text-red-600 dark:text-red-400">Chưa lưu được: {{ saveError }}</p>
					<UButton color="error" variant="soft" icon="i-heroicons-arrow-path" @click="save(finishedCompleted)">Thử lại</UButton>
				</div>

				<template v-if="saved">
					<UCard class="mt-4">
						<p class="mb-2 text-sm font-medium text-(--ui-text-highlighted)">Cảm thấy thế nào?</p>
						<FeelingPicker v-model="feeling" />
						<UTextarea v-model="note" class="mt-3 w-full" :rows="2" autoresize placeholder="Ghi chú (tuỳ chọn)" />
					</UCard>
				</template>

				<div class="flex-1" />
				<UButton block size="xl" class="mt-6" :disabled="saving || !saved" @click="finishAndLeave">Xong</UButton>
				<UButton v-if="!saved && !saving" block variant="ghost" color="neutral" class="mt-2" @click="leave">Thoát không lưu</UButton>
			</template>
		</main>

		<AppSheet
			v-model:open="guideOpen"
			:title="currentItem?.name ?? 'Hướng dẫn'"
			:subtitle="currentItem?.combo ? currentItem.combo.name : undefined"
		>
			<div class="space-y-3 pb-2">
				<MediaGallery v-if="guideMedia.length" :media="guideMedia" />
				<p v-if="instructions" class="whitespace-pre-line text-sm leading-relaxed text-(--ui-text)">{{ instructions }}</p>
				<p class="flex items-center gap-1.5 text-xs text-(--ui-text-muted)">
					<UIcon name="i-heroicons-pause-circle" class="size-4" />
					Đồng hồ tạm dừng trong lúc xem — đóng lại để tập tiếp.
				</p>
			</div>
		</AppSheet>

		<AppSheet v-model:open="stopOpen" title="Dừng buổi tập?">
			<div class="space-y-2 pb-2">
				<UButton v-if="anySetDone" block size="lg" icon="i-heroicons-check" @click="stopAndSave">Lưu phần đã tập</UButton>
				<UButton block size="lg" color="neutral" variant="soft" icon="i-heroicons-play" @click="continueTraining">Tập tiếp</UButton>
				<UButton block size="lg" color="error" variant="ghost" icon="i-heroicons-trash" @click="discard">Bỏ, không lưu</UButton>
			</div>
		</AppSheet>
	</div>
</template>
