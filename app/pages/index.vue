<script setup lang="ts">
	import { addDays, isoWeekday, localDateIso, startOfIsoWeek } from '#shared/utils/date';
	import { WEEKDAY_SHORT_LABELS, describeMask } from '#shared/utils/weekday';
	import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_TONES } from '~/utils/labels';
	import { formatDate, formatDuration, weekdayLabel } from '~/utils/format';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Hôm nay';
	useHead({ title: 'Hôm nay — Mia Health' });

	const toast = useToast();
	const { overview, today, error, loadOverview, loadToday } = useStats();
	const { seedPresets, error: seedError } = useExercises();

	const todayIso = localDateIso();
	const loaded = ref(false);

	async function load() {
		await Promise.all([loadOverview(todayIso), loadToday(todayIso)]);
		if (error.value) toast.add({ title: 'Lỗi tải dữ liệu', description: error.value, color: 'error' });
		loaded.value = true;
	}
	onMounted(load);

	const scheduled = computed(() => today.value?.routines.filter((r) => r.scheduled && r.itemCount > 0) ?? []);
	const others = computed(() => today.value?.routines.filter((r) => !r.scheduled && r.itemCount > 0) ?? []);
	const hasRoutines = computed(() => (today.value?.routines.length ?? 0) > 0);
	const doneToday = computed(() => today.value?.sessions.length ?? 0);
	const scheduledDone = computed(() => scheduled.value.filter((r) => r.doneCount > 0).length);
	const allScheduledDone = computed(() => scheduled.value.length > 0 && scheduledDone.value === scheduled.value.length);

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
			description: `${res.exercisesCreated} bài tập, ${res.routinesCreated} giáo án`,
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
		<UCard v-if="loaded && !hasRoutines">
			<div class="flex flex-col items-center gap-3 py-2 text-center">
				<span class="flex size-14 items-center justify-center rounded-2xl bg-(--ui-primary)/15">
					<UIcon name="i-heroicons-sparkles" class="size-8 text-(--ui-primary)" />
				</span>
				<p class="font-semibold text-(--ui-text-highlighted)">Chào mừng đến Mia Health</p>
				<p class="text-sm text-(--ui-text-muted)">
					Thêm bộ mẫu gồm 62 bài (Kegel, tạ ấm, tạ tay, máy chạy bộ, core, giãn cơ) và 10 giáo án có lịch sẵn — trong đó có lịch tập sáng T2 → CN 30–40 phút. Sửa lại theo ý bạn sau.
				</p>
				<UButton :loading="seeding" icon="i-heroicons-sparkles" @click="seed">Thêm bộ mẫu</UButton>
				<UButton variant="ghost" color="neutral" size="sm" to="/routines">Hoặc tự tạo giáo án</UButton>
			</div>
		</UCard>

		<!-- Lịch hôm nay -->
		<UCard v-if="loaded && hasRoutines">
			<div class="mb-3 flex items-center gap-2 border-b border-(--ui-border) pb-3">
				<UIcon name="i-heroicons-calendar-days" class="size-4 shrink-0 text-(--ui-primary)" />
				<h3 class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">Lịch hôm nay</h3>
				<span v-if="scheduled.length > 0" class="text-xs text-(--ui-text-muted)">
					Xong {{ scheduledDone }}/{{ scheduled.length }}
				</span>
			</div>

			<p v-if="allScheduledDone" class="mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
				<UIcon name="i-heroicons-check-badge" class="size-5 shrink-0" />
				Đã xong mọi giáo án hôm nay. Tuyệt vời!
			</p>

			<div v-if="scheduled.length > 0" class="space-y-2">
				<div
					v-for="r in scheduled"
					:key="r.id"
					class="flex items-center gap-3 rounded-2xl border border-(--ui-border) p-2"
				>
					<NuxtLink :to="`/routines/${r.id}`" class="relative shrink-0">
						<PreviewMosaic :previews="r.previews" class="size-14" :class="r.doneCount > 0 ? 'opacity-60' : ''" />
						<span
							v-if="r.doneCount > 0"
							class="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-(--ui-bg)"
							aria-label="Đã tập"
						>
							<UIcon name="i-heroicons-check" class="size-3.5" />
						</span>
					</NuxtLink>
					<NuxtLink :to="`/routines/${r.id}`" class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-(--ui-text-highlighted)">{{ r.name }}</p>
						<p class="text-xs text-(--ui-text-muted)">
							{{ r.itemCount }} bài · ~{{ formatDuration(r.estimatedSec) }}
							<template v-if="r.doneCount > 1"> · đã tập {{ r.doneCount }} lần</template>
							<template v-else-if="r.doneCount === 1"> · đã tập</template>
						</p>
					</NuxtLink>
					<UButton
						:icon="r.doneCount > 0 ? 'i-heroicons-arrow-path' : 'i-heroicons-play'"
						:variant="r.doneCount > 0 ? 'soft' : 'solid'"
						:to="`/play?routine=${r.id}`"
					>
						{{ r.doneCount > 0 ? 'Lại' : 'Tập' }}
					</UButton>
				</div>
			</div>
			<p v-else class="text-sm text-(--ui-text-muted)">Hôm nay không có lịch — nghỉ ngơi, hoặc tập thêm một giáo án bên dưới.</p>

			<details v-if="others.length > 0" class="mt-3 border-t border-(--ui-border) pt-2" :open="scheduled.length === 0">
				<summary class="cursor-pointer text-xs text-(--ui-text-muted)">Giáo án khác ({{ others.length }})</summary>
				<div class="mt-2 space-y-2">
					<div v-for="r in others" :key="r.id" class="flex items-center gap-3">
						<PreviewMosaic :previews="r.previews" class="size-10" />
						<NuxtLink :to="`/routines/${r.id}`" class="min-w-0 flex-1">
							<p class="truncate text-sm text-(--ui-text-highlighted)">{{ r.name }}</p>
							<p class="text-[11px] text-(--ui-text-dimmed)">{{ describeMask(r.scheduleMask) }} · ~{{ formatDuration(r.estimatedSec) }}</p>
						</NuxtLink>
						<UButton icon="i-heroicons-play" variant="soft" size="sm" :to="`/play?routine=${r.id}`" :aria-label="`Tập ${r.name}`" />
					</div>
				</div>
			</details>
		</UCard>

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
