<script setup lang="ts">
	import { formatAmount } from '~/utils/foods';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Ăn uống';
	useHead({ title: 'Thực đơn — Mia Health' });

	const toast = useToast();
	const { menus, loading, error, list, create } = useMenus();
	const showArchived = ref(false);
	const loaded = ref(false);

	async function reload() {
		await list({ includeArchived: showArchived.value });
		if (error.value) toast.add({ title: 'Lỗi tải thực đơn', description: error.value, color: 'error' });
		loaded.value = true;
	}
	onMounted(reload);
	watch(showArchived, reload);

	const macro = (v: number | null) => (v === null ? '—' : formatAmount(v));

	const sheetOpen = ref(false);
	const saving = ref(false);

	async function onCreate(input: { name: string; description: string | null }) {
		saving.value = true;
		const saved = await create({ ...input, items: [] });
		saving.value = false;
		if (!saved) {
			toast.add({ title: 'Không tạo được', description: error.value ?? undefined, color: 'error' });
			return;
		}
		sheetOpen.value = false;
		await navigateTo(`/menus/${saved.id}`);
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<MealsTabs />

		<div class="flex items-center gap-2">
			<UButton icon="i-heroicons-plus" @click="() => { sheetOpen = true }">Tạo thực đơn</UButton>
			<div class="flex-1" />
			<label class="flex items-center gap-2 text-xs text-(--ui-text-muted)">
				<USwitch v-model="showArchived" size="sm" />
				Lưu trữ
			</label>
		</div>

		<template v-if="!loaded && loading">
			<div v-for="i in 3" :key="i" class="h-20 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>
		<UCard v-else-if="menus.length === 0">
			<p class="py-4 text-center text-sm text-(--ui-text-muted)">
				Chưa có thực đơn. Tạo mới rồi thêm món theo bữa, hoặc vào Nhật ký → "Lưu thành thực đơn" một ngày đã ăn.
			</p>
		</UCard>

		<NuxtLink
			v-for="m in menus"
			:key="m.id"
			:to="`/menus/${m.id}`"
			class="flex items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-2.5"
			:class="m.isArchived ? 'opacity-60' : ''"
		>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium text-(--ui-text-highlighted)">{{ m.name }}</p>
				<p class="text-xs text-(--ui-text-muted)">Đạm {{ macro(m.totals.proteinG) }} · Béo {{ macro(m.totals.fatG) }} · Glucid {{ macro(m.totals.carbG) }}</p>
				<p class="text-[11px] text-(--ui-text-dimmed)">{{ m.itemCount }} món{{ m.description ? ` · ${m.description}` : '' }}</p>
			</div>
			<div class="shrink-0 text-right">
				<p class="text-sm font-semibold tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(m.totals.energyKcal) }}</p>
				<p class="text-[10px] text-(--ui-text-dimmed)">kcal/ngày</p>
			</div>
		</NuxtLink>

		<MenuFormSheet v-model:open="sheetOpen" :menu="null" :saving="saving" @save="onCreate" />
	</div>
</template>
