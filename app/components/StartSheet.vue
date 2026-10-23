<script setup lang="ts">
	/**
	 * Sheet "Bắt đầu tập" — gắn vào nút chính giữa bottom nav.
	 * Buổi trong lịch hôm nay (chương trình đang theo + buổi thêm riêng, trừ buổi đã bỏ qua)
	 * xếp trước; chạm là vào thẳng màn hình tập.
	 */
	import { localDateIso } from '#shared/utils/date';
	import { formatDuration } from '~/utils/format';

	const open = defineModel<boolean>('open', { default: false });
	const { routines, loading, list } = useRoutines();
	const { plan, load: loadPlan } = usePlan();

	watch(open, (v) => {
		if (!v) return;
		list();
		loadPlan(localDateIso());
	});

	const todayIds = computed(() => {
		const p = plan.value;
		if (!p) return new Set<number>();
		const entries = [...p.programs.flatMap((g) => g.entries), ...p.extras].filter((e) => !e.skipped);
		return new Set(entries.map((e) => e.routine.id));
	});

	const sorted = computed(() =>
		[...routines.value]
			.filter((r) => r.itemCount > 0)
			.sort((a, b) => Number(todayIds.value.has(b.id)) - Number(todayIds.value.has(a.id))),
	);

	async function go(to: string) {
		open.value = false;
		await navigateTo(to);
	}
</script>

<template>
	<AppSheet v-model:open="open" title="Bắt đầu tập">
		<div class="space-y-2">
			<template v-if="loading && routines.length === 0">
				<div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			</template>

			<button
				v-for="r in sorted"
				:key="r.id"
				type="button"
				class="flex w-full items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-3 text-left min-h-[60px] active:scale-[0.98] transition-transform"
				@click="go(`/play?routine=${r.id}`)"
			>
				<PreviewMosaic :previews="r.previews" class="size-12" />
				<span class="min-w-0 flex-1">
					<span class="block truncate font-medium text-(--ui-text-highlighted)">{{ r.name }}</span>
					<span class="block text-sm text-(--ui-text-muted)">
						{{ r.itemCount }} bài · ~{{ formatDuration(r.estimatedSec) }}
					</span>
				</span>
				<UBadge v-if="todayIds.has(r.id)" color="primary" variant="soft" size="sm">Hôm nay</UBadge>
				<UIcon name="i-heroicons-play-circle-solid" class="size-8 shrink-0 text-(--ui-primary)" />
			</button>

			<p v-if="!loading && sorted.length === 0" class="py-4 text-center text-sm text-(--ui-text-muted)">
				Chưa có giáo án nào có bài tập.
			</p>

			<div class="grid grid-cols-2 gap-2 pt-2">
				<UButton block color="neutral" variant="soft" icon="i-heroicons-book-open" @click="go('/exercises')">
					Tập bài lẻ
				</UButton>
				<UButton block color="neutral" variant="soft" icon="i-heroicons-pencil-square" @click="go('/history?new=1')">
					Ghi thủ công
				</UButton>
			</div>
		</div>
	</AppSheet>
</template>
