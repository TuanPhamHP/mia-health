<script setup lang="ts">
	import type { CreateSessionInput, SessionDTO, UpdateSessionInput } from '#shared/types/sessions';
	import { addDays, isoWeekday, localDateIso } from '#shared/utils/date';
	import { formatDate, formatDuration, formatDurationShort, weekdayLabel } from '~/utils/format';

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
