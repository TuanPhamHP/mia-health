<script setup lang="ts">
	/**
	 * Chọn một giáo án — dùng chung cho: nhặt giáo án vào ngày của chương trình, đổi buổi và
	 * thêm buổi ở màn Hôm nay. Chạm là chọn (một chạm, không cần nút xác nhận).
	 */
	import { foldText, formatDuration } from '~/utils/format';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ title: string; subtitle?: string; excludeIds?: readonly number[] }>();
	const emit = defineEmits<{ pick: [routineId: number] }>();

	const { routines, loading, list } = useRoutines();
	const search = ref('');

	watch(open, (v) => {
		if (!v) return;
		search.value = '';
		list();
	});

	const visible = computed(() => {
		const q = foldText(search.value.trim());
		const exclude = new Set(props.excludeIds ?? []);
		return routines.value.filter((r) => r.itemCount > 0 && !exclude.has(r.id) && (!q || foldText(r.name).includes(q)));
	});

	function pick(id: number) {
		emit('pick', id);
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="title" :subtitle="subtitle">
		<div class="space-y-2">
			<UInput
				v-model="search"
				icon="i-heroicons-magnifying-glass"
				placeholder="Tìm giáo án…"
				class="w-full"
				:ui="{ base: 'text-base' }"
			/>

			<template v-if="loading && routines.length === 0">
				<div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			</template>

			<button
				v-for="r in visible"
				:key="r.id"
				type="button"
				class="flex w-full items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
				@click="pick(r.id)"
			>
				<PreviewMosaic :previews="r.previews" class="size-11" />
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium text-(--ui-text-highlighted)">{{ r.name }}</span>
					<span class="block text-xs text-(--ui-text-muted)">{{ r.itemCount }} bài · ~{{ formatDuration(r.estimatedSec) }}</span>
					<span v-if="r.description" class="block truncate text-xs text-(--ui-text-dimmed)">{{ r.description }}</span>
				</span>
				<UIcon name="i-heroicons-plus-circle" class="size-6 shrink-0 text-(--ui-primary)" />
			</button>

			<p v-if="!loading && visible.length === 0" class="py-4 text-center text-sm text-(--ui-text-muted)">
				Không có giáo án phù hợp.
			</p>

			<UButton block color="neutral" variant="soft" icon="i-heroicons-plus" to="/routines" class="mt-2">
				Soạn giáo án mới
			</UButton>
		</div>
	</AppSheet>
</template>
