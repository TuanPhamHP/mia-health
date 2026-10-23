<script setup lang="ts">
	import { addDays, isoWeekday, localDateIso, startOfIsoWeek } from '#shared/utils/date';
	import type { PlanChangeInput } from '#shared/types/plan';
	import { WEEKDAY_SHORT_LABELS } from '#shared/utils/weekday';
	import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_TONES } from '~/utils/labels';
	import { formatDate, weekdayLabel } from '~/utils/format';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Hôm nay';
	useHead({ title: 'Hôm nay — Mia Health' });

	const toast = useToast();
	const { overview, error, loadOverview } = useStats();
	const { plan, error: planError, load: loadPlan, change, undo } = usePlan();
	const { seedPresets, error: seedError } = useExercises();

	const todayIso = localDateIso();
	const loaded = ref(false);

	async function load() {
		await Promise.all([loadOverview(todayIso), loadPlan(todayIso)]);
		const message = error.value ?? planError.value;
		if (message) toast.add({ title: 'Lỗi tải dữ liệu', description: message, color: 'error' });
		loaded.value = true;
	}
	onMounted(load);

	// Chưa có chương trình nào (kể cả chưa theo) ⇒ người dùng mới: mời thêm bộ mẫu.
	const isEmpty = computed(() => plan.value !== null && plan.value.programs.length === 0 && plan.value.idlePrograms.length === 0);
	const doneToday = computed(() => plan.value?.sessions.length ?? 0);

	// Bỏ qua / đổi / thêm buổi — chỉ áp cho hôm nay; server trả lịch ngày mới nhất.
	const planBusy = ref(false);
	const CHANGE_TOASTS: Record<PlanChangeInput['kind'], string> = {
		skip: 'Đã bỏ qua buổi này hôm nay',
		swap: 'Đã đổi buổi cho hôm nay',
		add: 'Đã thêm buổi cho hôm nay',
	};

	async function onChange(input: PlanChangeInput) {
		planBusy.value = true;
		const res = await change(input);
		planBusy.value = false;
		if (!res) toast.add({ title: 'Không đổi được lịch', description: planError.value ?? undefined, color: 'error' });
		else toast.add({ title: CHANGE_TOASTS[input.kind], color: 'success' });
	}

	async function onUndo(changeId: number) {
		planBusy.value = true;
		const res = await undo(changeId);
		planBusy.value = false;
		if (!res) toast.add({ title: 'Không hoàn tác được', description: planError.value ?? undefined, color: 'error' });
	}

	const streakText = computed(() => {
		const o = overview.value;
		if (!o) return '';
		if (o.currentStreak === 0) return 'Bắt đầu chuỗi mới hôm nay!';
		if (doneToday.value === 0) return 'Tập hôm nay để giữ chuỗi';
		return 'Giữ vững phong độ!';
	});

	// Tuần hiện tại (T2 → CN) lấy từ heatmap — heatmap luôn phủ trọn tuần này tới hôm nay.
	const weekDays = computed(() => {
		const start = startOfIsoWeek(todayIso);
		const byDate = new Map((overview.value?.heatmap ?? []).map((d) => [d.date, d]));
		return WEEKDAY_SHORT_LABELS.map((label, i) => {
			const date = addDays(start, i);
			return {
				date,
				label,
				day: Number(date.slice(8)),
				done: (byDate.get(date)?.sessions ?? 0) > 0,
				isToday: date === todayIso,
				future: date > todayIso,
			};
		});
	});

	const maxCategorySets = computed(() => Math.max(1, ...(overview.value?.byCategory.map((c) => c.setsDone) ?? [1])));

	const seeding = ref(false);
	async function seed() {
		seeding.value = true;
		const res = await seedPresets();
		seeding.value = false;
		if (!res) {
			toast.add({ title: 'Lỗi', description: seedError.value ?? undefined, color: 'error' });
			return;
		}
		toast.add({
			title: 'Đã thêm bộ mẫu',
			description: `${res.programsCreated} chương trình, ${res.routinesCreated} giáo án, ${res.exercisesCreated} bài tập`,
			color: 'success',
		});
		await load();
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<!-- Streak — con số chính DUY NHẤT của trang (hero figure) -->
		<UCard class="bg-linear-to-br from-sky-500/20 via-indigo-500/10 to-transparent">
			<p class="text-xs text-(--ui-text-muted)">
				{{ weekdayLabel(isoWeekday(todayIso)) }}, {{ formatDate(todayIso) }}
			</p>
			<div v-if="!loaded" class="mt-2 h-14 w-2/3 rounded bg-(--ui-bg-elevated) animate-pulse" />
			<div v-else-if="overview" class="mt-1 flex items-end gap-2">
				<span class="text-5xl leading-none" :class="overview.currentStreak > 0 ? '' : 'grayscale opacity-50'" aria-hidden="true">🔥</span>
				<span class="text-6xl font-bold leading-none tracking-tight text-(--ui-text-highlighted)">{{ overview.currentStreak }}</span>
				<span class="pb-1 text-sm text-(--ui-text-muted)">ngày liên tiếp</span>
			</div>
			<p v-if="overview" class="mt-2 text-sm text-(--ui-text-muted)">
				{{ streakText }}
				<span v-if="overview.longestStreak > 0" class="text-(--ui-text-dimmed)"> · Kỷ lục {{ overview.longestStreak }} ngày</span>
			</p>

			<!-- Tuần này: ngày đã tập có dấu ✓ — không để màu một mình gánh nghĩa -->
			<div v-if="overview" class="mt-4 grid grid-cols-7 gap-1" role="list" aria-label="Các ngày đã tập trong tuần">
				<div
					v-for="d in weekDays"
					:key="d.date"
					role="listitem"
					class="flex flex-col items-center gap-1"
					:aria-label="`${d.label} ${formatDate(d.date)}: ${d.done ? 'đã tập' : d.future ? 'chưa tới' : 'chưa tập'}`"
				>
					<span class="text-[10px] font-medium" :class="d.isToday ? 'text-(--ui-text-highlighted)' : 'text-(--ui-text-muted)'">
						{{ d.label }}
					</span>
					<span
						class="flex size-9 items-center justify-center rounded-full text-xs"
						:class="[
							d.done
								? 'bg-(--ui-primary) text-white'
								: d.future
									? 'border border-dashed border-(--ui-border-accented) text-(--ui-text-dimmed)'
									: 'bg-(--ui-bg-elevated) text-(--ui-text-muted)',
							d.isToday ? 'ring-2 ring-(--ui-primary) ring-offset-2 ring-offset-(--ui-bg)' : '',
						]"
					>
						<UIcon v-if="d.done" name="i-heroicons-check" class="size-4" />
						<template v-else>{{ d.day }}</template>
					</span>
				</div>
			</div>
		</UCard>

		<!-- Onboarding -->
		<UCard v-if="loaded && isEmpty">
			<div class="flex flex-col items-center gap-3 py-2 text-center">
				<span class="flex size-14 items-center justify-center rounded-2xl bg-(--ui-primary)/15">
					<UIcon name="i-heroicons-sparkles" class="size-8 text-(--ui-primary)" />
				</span>
				<p class="font-semibold text-(--ui-text-highlighted)">Chào mừng đến Mia Health</p>
				<p class="text-sm text-(--ui-text-muted)">
					Thêm bộ mẫu: chương trình "Giảm mỡ tại nhà" 8 tuần (tạ ấm, tạ tay, máy chạy bộ, 30–40 phút mỗi sáng), "Sàn chậu &amp; sinh lý nam" và hơn 60 bài tập — sửa lại theo ý bạn sau.
				</p>
				<UButton :loading="seeding" icon="i-heroicons-sparkles" @click="seed">Thêm bộ mẫu</UButton>
				<UButton variant="ghost" color="neutral" size="sm" to="/programs">Hoặc tự tạo chương trình</UButton>
			</div>
		</UCard>

		<!-- Lịch hôm nay — từ các chương trình đang theo -->
		<div v-else-if="!loaded" class="h-48 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		<TodayPlanCard v-else-if="plan" :plan="plan" :busy="planBusy" @change="onChange" @undo="onUndo" />

		<!-- Tuần này -->
		<UCard v-if="overview">
			<div class="mb-3 flex items-center gap-2 border-b border-(--ui-border) pb-3">
				<UIcon name="i-heroicons-chart-bar" class="size-4 shrink-0 text-(--ui-primary)" />
				<h3 class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">Phút tập theo tuần</h3>
			</div>
			<div class="mb-4 grid grid-cols-3 gap-2">
				<div class="rounded-xl border border-(--ui-border) px-3 py-2">
					<p class="text-[11px] text-(--ui-text-muted)">Buổi tuần này</p>
					<p class="text-xl font-semibold text-(--ui-text-highlighted)">{{ overview.thisWeek.sessions }}</p>
				</div>
				<div class="rounded-xl border border-(--ui-border) px-3 py-2">
					<p class="text-[11px] text-(--ui-text-muted)">Phút</p>
					<p class="text-xl font-semibold text-(--ui-text-highlighted)">{{ Math.round(overview.thisWeek.durationSec / 60) }}</p>
				</div>
				<div class="rounded-xl border border-(--ui-border) px-3 py-2">
					<p class="text-[11px] text-(--ui-text-muted)">Ngày có tập</p>
					<p class="text-xl font-semibold text-(--ui-text-highlighted)">{{ overview.thisWeek.activeDays }}<span class="text-sm font-normal text-(--ui-text-muted)">/7</span></p>
				</div>
			</div>
			<WeeklyBars :weeks="overview.weekly" />
		</UCard>

		<!-- Heatmap -->
		<UCard v-if="overview">
			<div class="mb-3 flex items-center gap-2 border-b border-(--ui-border) pb-3">
				<UIcon name="i-heroicons-squares-2x2" class="size-4 shrink-0 text-(--ui-primary)" />
				<h3 class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">12 tuần gần đây</h3>
				<NuxtLink to="/history" class="text-xs text-(--ui-primary)">Lịch sử</NuxtLink>
			</div>
			<ActivityHeatmap :days="overview.heatmap" :today="overview.today" />
		</UCard>

		<!-- Theo nhóm bài — một series ⇒ một màu cột; nhóm nhận diện bằng icon + tên -->
		<UCard v-if="overview && overview.byCategory.length > 0">
			<div class="mb-3 flex items-center gap-2 border-b border-(--ui-border) pb-3">
				<UIcon name="i-heroicons-rectangle-stack" class="size-4 shrink-0 text-(--ui-primary)" />
				<h3 class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">Số set theo nhóm</h3>
				<span class="text-xs text-(--ui-text-muted)">30 ngày</span>
			</div>
			<div class="space-y-2.5">
				<div v-for="c in overview.byCategory" :key="c.category" class="flex items-center gap-2.5 text-sm">
					<span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-(--tone)/15 text-(--tone)" :class="CATEGORY_TONES[c.category]">
						<UIcon :name="CATEGORY_ICONS[c.category]" class="size-4" />
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between gap-2">
							<span class="text-(--ui-text-highlighted)">{{ CATEGORY_LABELS[c.category] }}</span>
							<span class="tabular-nums text-(--ui-text-muted)">{{ c.setsDone }} set</span>
						</div>
						<div class="mt-1 h-1.5 rounded-full bg-(--ui-bg-elevated)">
							<div
								class="h-full rounded-full bg-(--ui-primary)"
								:style="{ width: `${(c.setsDone / maxCategorySets) * 100}%` }"
								:title="`${CATEGORY_LABELS[c.category]}: ${c.setsDone} set · ${c.entries} lượt bài`"
							/>
						</div>
					</div>
				</div>
			</div>
		</UCard>
	</div>
</template>
