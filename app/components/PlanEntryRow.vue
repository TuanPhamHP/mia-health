<script setup lang="ts">
	/** Một buổi trong lịch hôm nay: tập ngay, hoặc mở menu đổi / bỏ qua; buổi đã bỏ qua có nút hoàn tác. */
	import type { DropdownMenuItem } from '@nuxt/ui';
	import type { PlanEntryDTO } from '#shared/types/plan';
	import { formatDuration } from '~/utils/format';

	const props = defineProps<{ entry: PlanEntryDTO; menu: DropdownMenuItem[][]; busy: boolean }>();
	const emit = defineEmits<{ undo: [changeId: number] }>();

	function undo() {
		if (props.entry.changeId !== null) emit('undo', props.entry.changeId);
	}
</script>

<template>
	<div
		class="flex items-center gap-3 rounded-2xl border p-2"
		:class="entry.skipped ? 'border-dashed border-(--ui-border-accented)' : 'border-(--ui-border)'"
	>
		<NuxtLink :to="`/routines/${entry.routine.id}`" class="relative shrink-0">
			<PreviewMosaic :previews="entry.routine.previews" class="size-12" :class="entry.doneCount > 0 || entry.skipped ? 'opacity-50' : ''" />
			<span
				v-if="entry.doneCount > 0"
				class="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-(--ui-bg)"
				aria-label="Đã tập"
			>
				<UIcon name="i-heroicons-check" class="size-3.5" />
			</span>
		</NuxtLink>

		<div class="min-w-0 flex-1">
			<p class="line-clamp-2 text-sm font-medium leading-snug" :class="entry.skipped ? 'text-(--ui-text-muted) line-through' : 'text-(--ui-text-highlighted)'">
				{{ entry.routine.name }}
			</p>
			<p class="text-xs text-(--ui-text-muted)">
				{{ entry.routine.itemCount }} bài · ~{{ formatDuration(entry.routine.estimatedSec) }}
				<template v-if="entry.doneCount > 1"> · đã tập {{ entry.doneCount }} lần</template>
				<template v-else-if="entry.doneCount === 1"> · đã tập</template>
			</p>
			<p v-if="entry.skipped" class="text-[11px] text-(--ui-text-muted)">Đã bỏ qua hôm nay</p>
			<p v-else-if="entry.replaces" class="truncate text-[11px] text-(--ui-primary)">Đổi từ “{{ entry.replaces.name }}”</p>
			<p v-else-if="entry.routine.description" class="line-clamp-2 text-[11px] text-(--ui-text-dimmed)">{{ entry.routine.description }}</p>
		</div>

		<UButton
			v-if="entry.skipped"
			size="sm"
			color="neutral"
			variant="soft"
			icon="i-heroicons-arrow-uturn-left"
			:disabled="busy"
			@click="undo"
		>
			Hoàn tác
		</UButton>
		<template v-else>
			<UButton
				:icon="entry.doneCount > 0 ? 'i-heroicons-arrow-path' : 'i-heroicons-play'"
				:variant="entry.doneCount > 0 ? 'soft' : 'solid'"
				:to="`/play?routine=${entry.routine.id}`"
			>
				{{ entry.doneCount > 0 ? 'Lại' : 'Tập' }}
			</UButton>
			<UDropdownMenu :items="menu">
				<UButton icon="i-heroicons-ellipsis-vertical" color="neutral" variant="ghost" size="sm" :disabled="busy" :aria-label="`Tuỳ chọn cho ${entry.routine.name}`" />
			</UDropdownMenu>
		</template>
	</div>
</template>
