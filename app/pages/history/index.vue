<script setup lang="ts">
	import type { CreateSessionInput, SessionDTO, UpdateSessionInput } from '#shared/types/sessions';
	import { addDays, isoWeekday, localDateIso } from '#shared/utils/date';
	import { formatDate, formatDuration, formatDurationShort, weekdayLabel } from '~/utils/format';
	import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_TONES } from '~/utils/labels';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Lịch sử tập';
	useHead({ title: 'Lịch sử — Mia Health' });

	const route = useRoute();
	const router = useRouter();
	const toast = useToast();

	const { sessions, loading, error, list, create, update, remove } = useSessions();
	const { overview, loadOverview } = useStats();
	const { routines, list: listRoutines } = useRoutines();
	const { exercises, list: listExercises } = useExercises();

	const today = localDateIso();
	const windowDays = ref(90);
	const loaded = ref(false);

	async function loadSessions() {
		await list({ from: addDays(today, -(windowDays.value - 1)), to: today, limit: 500 });
		if (error.value) toast.add({ title: 'Lỗi tải lịch sử', description: error.value, color: 'error' });
		loaded.value = true;
	}

	onMounted(async () => {
		await Promise.all([loadSessions(), loadOverview(today)]);
		if (route.query.new) openCreate();
	});

	const maxCategorySets = computed(() => Math.max(1, ...(overview.value?.byCategory.map((c) => c.setsDone) ?? [1])));

	async function loadMore() {
		windowDays.value += 90;
		await loadSessions();
	}

	const groups = computed(() => {
		const map = new Map<string, SessionDTO[]>();
		for (const s of sessions.value) {
			const list = map.get(s.date) ?? [];
			list.push(s);
			map.set(s.date, list);
		}
		return [...map.entries()].map(([date, items]) => ({
			date,
			items,
			totalSec: items.reduce((sum, s) => sum + s.durationSec, 0),
		}));
	});

	function dayHeading(date: string): string {
		if (date === today) return 'Hôm nay';
		if (date === addDays(today, -1)) return 'Hôm qua';
		return `${weekdayLabel(isoWeekday(date))}, ${formatDate(date)}`;
	}

	// ---- Form ----
	const formOpen = ref(false);
	const editing = ref<SessionDTO | null>(null);
	const saving = ref(false);

	function openCreate() {
		editing.value = null;
		formOpen.value = true;
		if (routines.value.length === 0) listRoutines();
		if (exercises.value.length === 0) listExercises();
	}

	// Đóng sheet thì gỡ ?new=1 để F5 không mở lại.
	watch(formOpen, (v) => {
		if (!v && route.query.new) router.replace({ query: {} });
	});

	function openEdit(s: SessionDTO) {
		editing.value = s;
		formOpen.value = true;
	}

	async function refreshStats() {
		await loadOverview(today);
	}

	async function onCreate(input: CreateSessionInput) {
		saving.value = true;
		const saved = await create(input);
		saving.value = false;
		if (!saved) {
			toast.add({ title: 'Không lưu được', description: error.value ?? undefined, color: 'error' });
			return;
		}
		toast.add({ title: 'Đã ghi buổi tập', color: 'success' });
		formOpen.value = false;
		// Buổi tạo cho ngày cũ phải nằm đúng chỗ trong danh sách → tải lại thay vì chèn đầu.
		await Promise.all([loadSessions(), refreshStats()]);
	}

	async function onUpdate(input: UpdateSessionInput) {
		if (!editing.value) return;
		saving.value = true;
		const saved = await update(editing.value.id, input);
		saving.value = false;
		if (!saved) {
			toast.add({ title: 'Không lưu được', description: error.value ?? undefined, color: 'error' });
			return;
		}
		toast.add({ title: 'Đã cập nhật', color: 'success' });
		formOpen.value = false;
		await Promise.all([loadSessions(), refreshStats()]);
	}

	async function onDelete(s: SessionDTO) {
		if (!confirm(`Xoá buổi "${s.title}" ngày ${formatDate(s.date)}?`)) return;
		const ok = await remove(s.id);
		if (!ok) {
			toast.add({ title: 'Không xoá được', description: error.value ?? undefined, color: 'error' });
			return;
		}
		toast.add({ title: 'Đã xoá buổi tập', color: 'success' });
		await refreshStats();
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<UCard>
			<div class="grid grid-cols-3 gap-2 text-center">
				<div>
					<p class="text-xl font-bold text-(--ui-text-highlighted) tabular-nums">{{ overview?.totalSessions ?? '–' }}</p>
					<p class="text-[11px] text-(--ui-text-muted)">buổi tập</p>
				</div>
				<div>
					<p class="text-xl font-bold text-(--ui-text-highlighted)">{{ overview ? formatDurationShort(overview.totalDurationSec) : '–' }}</p>
					<p class="text-[11px] text-(--ui-text-muted)">tổng thời gian</p>
				</div>
				<div>
					<p class="text-xl font-bold text-(--ui-text-highlighted) tabular-nums">{{ overview?.longestStreak ?? '–' }}</p>
					<p class="text-[11px] text-(--ui-text-muted)">chuỗi dài nhất</p>
				</div>
			</div>
			<div v-if="overview" class="mt-4">
				<ActivityHeatmap :days="overview.heatmap" :today="overview.today" />
			</div>
		</UCard>

		<!-- Tuần này + phút theo tuần -->
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

		<UButton block color="neutral" variant="soft" icon="i-heroicons-pencil-square" @click="openCreate">
			Ghi buổi tập thủ công
		</UButton>

		<template v-if="!loaded && loading">
			<div v-for="i in 4" :key="i" class="h-14 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<p v-else-if="sessions.length === 0" class="py-6 text-center text-sm text-(--ui-text-muted)">
			Chưa có buổi tập nào trong {{ windowDays }} ngày qua.
		</p>

		<section v-for="g in groups" :key="g.date" class="space-y-2">
			<h2 class="flex items-baseline justify-between pt-1 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">
				<span>{{ dayHeading(g.date) }}</span>
				<span class="font-normal normal-case">{{ formatDuration(g.totalSec) }}</span>
			</h2>
			<SessionCard v-for="s in g.items" :key="s.id" :session="s" @edit="openEdit(s)" @delete="onDelete(s)" />
		</section>

		<UButton v-if="loaded" block variant="ghost" color="neutral" :loading="loading" @click="loadMore">
			Xem cũ hơn
		</UButton>

		<SessionFormSheet
			v-model:open="formOpen"
			:session="editing"
			:routines="routines"
			:exercises="exercises"
			:saving="saving"
			@create="onCreate"
			@update="onUpdate"
		/>
	</div>
</template>
