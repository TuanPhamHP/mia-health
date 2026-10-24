<script setup lang="ts">
	import type { Meal, MenuItemDTO, MenuItemInput } from '#shared/types/meals';
	import { localDateIso } from '#shared/utils/date';
	import { formatAmount } from '~/utils/foods';
	import { MEAL_LABELS, MEAL_ORDER, amountLabel } from '~/utils/meals';

	const route = useRoute();
	const toast = useToast();
	const pageTitle = usePageTitle();
	pageTitle.value = 'Thực đơn';

	const menuId = Number(route.params.id);
	const { current: menu, loading, error, get, update, remove } = useMenus();
	const { applyMenu, error: logError } = useMealLog();
	const busy = ref(false);

	onMounted(async () => {
		await get(menuId);
		if (error.value) toast.add({ title: 'Lỗi tải thực đơn', description: error.value, color: 'error' });
	});

	useHead({ title: computed(() => `${menu.value?.name ?? 'Thực đơn'} — Mia Health`) });

	async function act(fn: () => Promise<unknown>, success?: string): Promise<boolean> {
		busy.value = true;
		const res = await fn();
		busy.value = false;
		if (res === null || res === false) {
			toast.add({ title: 'Có lỗi', description: error.value ?? undefined, color: 'error' });
			return false;
		}
		if (success) toast.add({ title: success, color: 'success' });
		return true;
	}

	function itemsOf(meal: Meal): MenuItemDTO[] {
		return menu.value?.items.filter((i) => i.meal === meal) ?? [];
	}

	const kcalOf = (meal: Meal) => itemsOf(meal).reduce((sum, i) => sum + i.energyKcal, 0);

	// PATCH thay TOÀN BỘ danh sách — dựng lại từ các dòng hiện có (theo thứ tự hiển thị).
	function asInput(i: MenuItemDTO): MenuItemInput {
		return {
			meal: i.meal,
			dishId: i.dishId ?? undefined,
			foodId: i.foodId ?? undefined,
			amount: i.amount,
			unit: i.unit,
			portionLabel: i.portionLabel,
		};
	}

	// ---- Thêm / bỏ món ----
	const pickerOpen = ref(false);
	const pickerMeal = ref<Meal>('lunch');

	function openPicker(meal: Meal) {
		pickerMeal.value = meal;
		pickerOpen.value = true;
	}

	async function onPick(input: MenuItemInput) {
		const items = [...(menu.value?.items ?? []).map(asInput), input];
		await act(() => update(menuId, { items }), 'Đã thêm');
	}

	async function removeItem(item: MenuItemDTO) {
		const items = (menu.value?.items ?? []).filter((i) => i.id !== item.id).map(asInput);
		await act(() => update(menuId, { items }));
	}

	// ---- Áp dụng / sửa / lưu trữ / xoá ----
	async function applyToday() {
		busy.value = true;
		const res = await applyMenu(localDateIso(), menuId);
		busy.value = false;
		if (!res) {
			toast.add({ title: 'Không áp dụng được', description: logError.value ?? undefined, color: 'error' });
			return;
		}
		toast.add({ title: 'Đã chép vào nhật ký hôm nay', color: 'success' });
		await navigateTo('/diary');
	}

	const formOpen = ref(false);
	async function onSave(input: { name: string; description: string | null }) {
		if (await act(() => update(menuId, input), 'Đã lưu')) formOpen.value = false;
	}

	async function toggleArchive() {
		if (!menu.value) return;
		const archived = !menu.value.isArchived;
		await act(() => update(menuId, { isArchived: archived }), archived ? 'Đã lưu trữ' : 'Đã khôi phục');
	}

	async function onDelete() {
		if (!menu.value) return;
		if (!confirm(`Xoá thực đơn "${menu.value.name}"? Nhật ký đã áp dụng vẫn giữ.`)) return;
		if (await act(() => remove(menuId), 'Đã xoá thực đơn')) await navigateTo('/menus');
	}

	const macro = (v: number | null) => (v === null ? '—' : formatAmount(v));
</script>

<template>
	<div class="py-4 space-y-3">
		<template v-if="!menu && loading">
			<div class="h-32 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			<div class="h-64 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-else-if="!menu">
			<p class="py-4 text-center text-sm text-(--ui-text-muted)">Không tìm thấy thực đơn.</p>
		</UCard>

		<template v-else>
			<UCard>
				<div class="flex items-start gap-2">
					<div class="min-w-0 flex-1">
						<h2 class="text-xl font-bold leading-tight text-(--ui-text-highlighted)">{{ menu.name }}</h2>
						<p v-if="menu.description" class="mt-1 text-sm text-(--ui-text-muted)">{{ menu.description }}</p>
					</div>
					<UButton icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="sm" aria-label="Sửa thực đơn" @click="() => { formOpen = true }" />
				</div>
				<p class="mt-2 tabular-nums">
					<span class="text-3xl font-bold text-(--ui-text-highlighted)">{{ formatAmount(menu.totals.values.energyKcal) }}</span>
					<span class="ml-1 text-sm text-(--ui-text-muted)">kcal / ngày</span>
				</p>
				<p class="text-xs text-(--ui-text-muted)">
					Đạm {{ macro(menu.totals.values.proteinG) }} g · Béo {{ macro(menu.totals.values.fatG) }} g · Glucid {{ macro(menu.totals.values.carbG) }} g
				</p>
				<p class="mt-1 text-[11px] text-(--ui-text-dimmed)">Dinh dưỡng tính theo công thức hiện tại — sửa món là thực đơn đổi theo; nhật ký đã áp thì giữ nguyên.</p>
				<UButton block class="mt-3" icon="i-heroicons-arrow-down-tray" :disabled="busy || menu.items.length === 0" @click="applyToday">
					Áp vào nhật ký hôm nay
				</UButton>
			</UCard>

			<UCard v-for="meal in MEAL_ORDER" :key="meal">
				<div class="flex items-center gap-2">
					<p class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">
						{{ MEAL_LABELS[meal] }}
						<span v-if="itemsOf(meal).length > 0" class="font-normal text-(--ui-text-muted)"> · {{ formatAmount(kcalOf(meal)) }} kcal</span>
					</p>
					<UButton size="xs" variant="soft" icon="i-heroicons-plus" :disabled="busy" @click="openPicker(meal)">Thêm</UButton>
				</div>
				<div v-for="i in itemsOf(meal)" :key="i.id" class="mt-2 flex items-center gap-2 border-t border-(--ui-border) pt-2">
					<NuxtLink :to="i.dishId ? `/dishes/${i.dishId}` : `/foods/${i.foodId}`" class="min-w-0 flex-1">
						<span class="block truncate text-sm text-(--ui-text-highlighted)">
							{{ i.name }}<span v-if="i.isArchived" class="text-(--ui-text-dimmed)"> · đã lưu trữ</span>
						</span>
						<span class="block text-xs text-(--ui-text-muted)">{{ amountLabel(i) }}</span>
					</NuxtLink>
					<span class="shrink-0 text-sm tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(i.energyKcal) }} kcal</span>
					<UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs" :disabled="busy" :aria-label="`Bỏ ${i.name}`" @click="removeItem(i)" />
				</div>
			</UCard>

			<div class="grid grid-cols-2 gap-2 pt-1">
				<UButton
					block
					color="neutral"
					variant="soft"
					:icon="menu.isArchived ? 'i-heroicons-arrow-uturn-left' : 'i-heroicons-archive-box'"
					:disabled="busy"
					@click="toggleArchive"
				>
					{{ menu.isArchived ? 'Khôi phục' : 'Lưu trữ' }}
				</UButton>
				<UButton block color="error" variant="soft" icon="i-heroicons-trash" :disabled="busy" @click="onDelete">Xoá</UButton>
			</div>

			<EntryPickerSheet v-model:open="pickerOpen" title="Thêm vào thực đơn" :default-meal="pickerMeal" :saving="busy" @pick="onPick" />
			<MenuFormSheet v-model:open="formOpen" :menu="menu" :saving="busy" @save="onSave" />
		</template>
	</div>
</template>
