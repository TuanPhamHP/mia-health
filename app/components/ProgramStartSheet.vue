<script setup lang="ts">
	/**
	 * Chọn ngày bắt đầu theo chương trình. Tuần 1 = tuần (T2 → CN) chứa ngày bắt đầu, nên
	 * bắt đầu giữa tuần thì tuần 1 ngắn — gợi ý "Thứ 2 tới" để có tuần 1 trọn vẹn.
	 */
	import { addDays, isoWeekday, localDateIso, startOfIsoWeek } from '#shared/utils/date';
	import { formatDate, weekdayLabel } from '~/utils/format';

	const open = defineModel<boolean>('open', { default: false });
	defineProps<{ saving: boolean }>();
	const emit = defineEmits<{ start: [startDate: string] }>();

	const today = ref(localDateIso());
	const custom = ref('');

	watch(open, (v) => {
		if (!v) return;
		today.value = localDateIso();
		custom.value = today.value;
	});

	const nextMonday = computed(() => addDays(startOfIsoWeek(today.value), 7));
	const todayIsMonday = computed(() => isoWeekday(today.value) === 1);

	function start(date: string) {
		if (date) emit('start', date);
	}
</script>

<template>
	<AppSheet v-model:open="open" title="Bắt đầu theo chương trình" subtitle="Buổi tập sẽ hiện ở màn Hôm nay theo lịch">
		<div class="space-y-2">
			<button
				type="button"
				class="flex w-full items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-3 text-left"
				:disabled="saving"
				@click="start(today)"
			>
				<UIcon name="i-heroicons-play-circle" class="size-7 shrink-0 text-(--ui-primary)" />
				<span class="min-w-0 flex-1">
					<span class="block font-medium text-(--ui-text-highlighted)">Hôm nay</span>
					<span class="block text-xs text-(--ui-text-muted)">
						{{ weekdayLabel(isoWeekday(today)) }} {{ formatDate(today) }}{{ todayIsMonday ? '' : ' — tuần 1 tính tới hết Chủ nhật này' }}
					</span>
				</span>
			</button>
			<button
				v-if="!todayIsMonday"
				type="button"
				class="flex w-full items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-3 text-left"
				:disabled="saving"
				@click="start(nextMonday)"
			>
				<UIcon name="i-heroicons-calendar-days" class="size-7 shrink-0 text-(--ui-primary)" />
				<span class="min-w-0 flex-1">
					<span class="block font-medium text-(--ui-text-highlighted)">Thứ 2 tới</span>
					<span class="block text-xs text-(--ui-text-muted)">{{ formatDate(nextMonday) }} — tuần 1 trọn vẹn</span>
				</span>
			</button>
			<div class="flex items-end gap-2 rounded-xl border border-(--ui-border) px-3 py-3">
				<UFormField label="Ngày khác" class="flex-1">
					<UInput v-model="custom" type="date" class="w-full" :ui="{ base: 'text-base' }" />
				</UFormField>
				<UButton :disabled="!custom || saving" @click="start(custom)">Chọn</UButton>
			</div>
		</div>
	</AppSheet>
</template>
