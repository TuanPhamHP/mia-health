<script setup lang="ts">
	/**
	 * Lịch tập hôm nay đầy đủ: nhóm theo chương trình, "Vì sao", lời dặn giai đoạn, đổi / bỏ qua /
	 * thêm buổi. Trang chủ chỉ hiện bản tóm tắt và dẫn vào đây.
	 */
	import type { PlanChangeInput } from '#shared/types/plan';
	import { isoWeekday, localDateIso } from '#shared/utils/date';
	import { formatDate, weekdayLabel } from '~/utils/format';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Lịch tập hôm nay';
	useHead({ title: 'Lịch tập hôm nay — Mia Health' });

	const toast = useToast();
	const { plan, error, load, change, undo } = usePlan();

	const todayIso = localDateIso();

	onMounted(async () => {
		await load(todayIso);
		if (error.value) toast.add({ title: 'Lỗi tải lịch', description: error.value, color: 'error' });
	});

	// Bỏ qua / đổi / thêm buổi — chỉ áp cho hôm nay; server trả lịch ngày mới nhất.
	const busy = ref(false);
	const CHANGE_TOASTS: Record<PlanChangeInput['kind'], string> = {
		skip: 'Đã bỏ qua buổi này hôm nay',
		swap: 'Đã đổi buổi cho hôm nay',
		add: 'Đã thêm buổi cho hôm nay',
	};

	async function onChange(input: PlanChangeInput) {
		busy.value = true;
		const res = await change(input);
		busy.value = false;
		if (!res) toast.add({ title: 'Không đổi được lịch', description: error.value ?? undefined, color: 'error' });
		else toast.add({ title: CHANGE_TOASTS[input.kind], color: 'success' });
	}

	async function onUndo(changeId: number) {
		busy.value = true;
		const res = await undo(changeId);
		busy.value = false;
		if (!res) toast.add({ title: 'Không hoàn tác được', description: error.value ?? undefined, color: 'error' });
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<p class="px-1 text-xs text-(--ui-text-muted)">{{ weekdayLabel(isoWeekday(todayIso)) }}, {{ formatDate(todayIso) }}</p>
		<div v-if="!plan" class="h-48 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		<TodayPlanCard v-else :plan="plan" :busy="busy" @change="onChange" @undo="onUndo" />
	</div>
</template>
