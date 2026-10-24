<script setup lang="ts">
	/** Chọn thực đơn để áp vào một ngày — chạm là áp (nối sau những gì đã ghi). */
	import { formatAmount } from '~/utils/foods';

	const open = defineModel<boolean>('open', { default: false });
	defineProps<{ saving: boolean }>();
	const emit = defineEmits<{ pick: [menuId: number] }>();

	const { menus, loading, list } = useMenus();

	watch(open, (v) => {
		if (v) void list();
	});
</script>

<template>
	<AppSheet v-model:open="open" title="Áp dụng thực đơn" subtitle="Chép các món của thực đơn vào ngày này">
		<div class="space-y-2">
			<template v-if="loading && menus.length === 0">
				<div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			</template>
			<button
				v-for="m in menus"
				:key="m.id"
				type="button"
				class="flex w-full items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
				:disabled="saving || m.itemCount === 0"
				@click="emit('pick', m.id)"
			>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium text-(--ui-text-highlighted)">{{ m.name }}</span>
					<span class="block text-xs text-(--ui-text-muted)">{{ m.itemCount }} món · {{ formatAmount(m.totals.energyKcal) }} kcal</span>
				</span>
				<UIcon name="i-heroicons-arrow-down-tray" class="size-5 shrink-0 text-(--ui-primary)" />
			</button>
			<p v-if="!loading && menus.length === 0" class="py-4 text-center text-sm text-(--ui-text-muted)">
				Chưa có thực đơn — tạo ở mục Thực đơn, hoặc lưu một ngày đã ăn thành thực đơn.
			</p>
		</div>
	</AppSheet>
</template>
