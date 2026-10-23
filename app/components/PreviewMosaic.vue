<script setup lang="ts">
	/** Ô vuông ghép ảnh bìa tối đa 4 bài đầu của giáo án (1 bài = cả ô, 3 bài = bài đầu chiếm nửa trái). */
	import type { ExercisePreviewDTO } from '#shared/types/routines';

	const props = defineProps<{ previews: ExercisePreviewDTO[] }>();

	const cells = computed(() => props.previews.slice(0, 4));
	function span(i: number): string {
		const n = cells.value.length;
		if (n === 1) return 'col-span-2 row-span-2';
		if (n === 2 || (n === 3 && i === 0)) return 'row-span-2';
		return '';
	}
</script>

<template>
	<span class="grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-xl bg-(--ui-bg-elevated)">
		<ExerciseThumb
			v-for="(p, i) in cells"
			:key="i"
			:cover="p.cover"
			:category="p.category"
			:combo="p.isCombo"
			class="size-full rounded-none"
			:class="span(i)"
		/>
		<span v-if="cells.length === 0" class="col-span-2 row-span-2 flex items-center justify-center text-(--ui-text-dimmed)">
			<UIcon name="i-heroicons-clipboard-document-list" class="size-1/2" />
		</span>
	</span>
</template>
