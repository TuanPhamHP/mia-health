<script setup lang="ts">
	import type { Meal, MealEntryDTO, MenuItemInput, UpdateMealEntryInput, UpdateNutritionTargetsInput } from '#shared/types/meals';
	import { addDays, isoWeekday, localDateIso } from '#shared/utils/date';
	import { formatAmount } from '~/utils/foods';
	import { formatDate, weekdayLabel } from '~/utils/format';
	import { MEAL_LABELS, MEAL_ORDER, amountLabel, mealForNow } from '~/utils/meals';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Ăn uống';
	useHead({ title: 'Nhật ký ăn — Mia Health' });

	const route = useRoute();
	const router = useRouter();
	const toast = useToast();
	const { day, suggestions, loading, error, load, add, update, remove, applyMenu, setTargets, loadSuggestions } = useMealLog();
	const { fromDay, error: menuError } = useMenus();

	// Ngày đang xem nằm trên URL (?date=) — mặc định hôm nay theo giờ máy.
	const today = localDateIso();
	const queryDate = route.query['date'];
	const date = ref(typeof queryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : today);
	const busy = ref(false);

	async function reload() {
		void router.replace({ query: date.value === today ? {} : { date: date.value } });
		await load(date.value);
		if (error.value) toast.add({ title: 'Lỗi tải nhật ký', description: error.value, color: 'error' });
	}
	// ?add=<bữa> (nút "Ghi bữa …" ở trang chủ) ⇒ mở thẳng bảng chọn món; đọc trước khi reload() xoá query.
	const addMeal = route.query['add'];
	onMounted(async () => {
		if (typeof addMeal === 'string' && (MEAL_ORDER as string[]).includes(addMeal)) openPicker(addMeal as Meal);
		await reload();
	});
	watch(date, reload);

	// Gợi ý chỉ có nghĩa cho hôm nay (phần còn lại của ngày đang diễn ra). Tính lại mỗi khi tổng
	// hoặc mục tiêu đổi — lỗi gợi ý không đáng toast, ẩn thẻ là đủ.
	const suggestKey = computed(() => (day.value && date.value === today ? `${day.value.totals.values.energyKcal}|${day.value.targets.energyKcal}|${day.value.targets.proteinG}` : null));
	watch(suggestKey, (k) => {
		if (k === null) suggestions.value = null;
		else void loadSuggestions(today);
	});

	const dateLabel = computed(() => {
		if (date.value === today) return 'Hôm nay';
		if (date.value === addDays(today, -1)) return 'Hôm qua';
		return `${weekdayLabel(isoWeekday(date.value))}, ${formatDate(date.value)}`;
	});

	function entriesOf(meal: Meal): MealEntryDTO[] {
		return day.value?.entries.filter((e) => e.meal === meal) ?? [];
	}

	async function act(fn: () => Promise<unknown>, success?: string, err = error): Promise<boolean> {
		busy.value = true;
		const res = await fn();
		busy.value = false;
		if (res === null) {
			toast.add({ title: 'Có lỗi', description: err.value ?? undefined, color: 'error' });
			return false;
		}
		if (success) toast.add({ title: success, color: 'success' });
		return true;
	}

	// ---- Thêm ----
	const pickerOpen = ref(false);
	const pickerMeal = ref<Meal>(mealForNow());

	function openPicker(meal: Meal) {
		pickerMeal.value = meal;
		pickerOpen.value = true;
	}

	async function onPick(input: MenuItemInput) {
		await act(() => add({ ...input, date: date.value }), 'Đã thêm');
	}

	const suggestMeal = mealForNow();
	async function onAddSuggestion(dishId: number) {
		await act(() => add({ date: date.value, meal: suggestMeal, dishId, amount: 1, unit: 'serving' }), `Đã thêm vào ${MEAL_LABELS[suggestMeal].toLowerCase()}`);
	}

	// ---- Sửa / xoá ----
	const editOpen = ref(false);
	const editing = ref<MealEntryDTO | null>(null);

	function openEdit(e: MealEntryDTO) {
		editing.value = e;
		editOpen.value = true;
	}

	async function onSaveEntry(input: UpdateMealEntryInput) {
		if (editing.value && (await act(() => update(editing.value!.id, input)))) editOpen.value = false;
	}

	async function onRemoveEntry() {
		if (editing.value && (await act(() => remove(editing.value!.id), 'Đã xoá'))) editOpen.value = false;
	}

	// ---- Mục tiêu ----
	const targetsOpen = ref(false);
	async function onSaveTargets(input: UpdateNutritionTargetsInput) {
		if (await act(() => setTargets(input), 'Đã lưu mục tiêu')) targetsOpen.value = false;
	}

	// ---- Thực đơn ----
	const menuPickerOpen = ref(false);
	async function onApplyMenu(menuId: number) {
		if (await act(() => applyMenu(date.value, menuId), 'Đã áp dụng thực đơn')) menuPickerOpen.value = false;
	}

	async function saveAsMenu() {
		const name = prompt('Tên thực đơn', `Thực đơn ${formatDate(date.value)}`);
		if (!name?.trim()) return;
		const saved = await fromDay(date.value, name.trim());
		if (!saved) {
			toast.add({ title: 'Không lưu được', description: menuError.value ?? undefined, color: 'error' });
			return;
		}
		toast.add({ title: 'Đã lưu thành thực đơn', color: 'success' });
		await navigateTo(`/menus/${saved.id}`);
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<MealsTabs />

		<div class="flex items-center gap-2">
			<UButton icon="i-heroicons-chevron-left" color="neutral" variant="soft" aria-label="Ngày trước" @click="() => { date = addDays(date, -1) }" />
			<div class="min-w-0 flex-1 text-center">
				<p class="font-semibold text-(--ui-text-highlighted)">{{ dateLabel }}</p>
				<p v-if="date !== today" class="text-[11px] text-(--ui-text-dimmed)">{{ formatDate(date) }}</p>
			</div>
			<UButton
				icon="i-heroicons-chevron-right"
				color="neutral"
				variant="soft"
				aria-label="Ngày sau"
				:disabled="date >= today"
				@click="() => { date = addDays(date, 1) }"
			/>
		</div>
		<UButton v-if="date !== today" block size="xs" color="neutral" variant="ghost" @click="() => { date = today }">Về hôm nay</UButton>

		<div v-if="!day && loading" class="h-56 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		<DayTotalsCard v-else-if="day" :day="day" @edit-targets="() => { targetsOpen = true }" />

		<template v-if="day">
			<UCard v-for="meal in MEAL_ORDER" :key="meal">
				<div class="flex items-center gap-2">
					<p class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">
						{{ MEAL_LABELS[meal] }}
						<span v-if="day.byMeal[meal].count > 0" class="font-normal text-(--ui-text-muted)"> · {{ formatAmount(day.byMeal[meal].energyKcal) }} kcal</span>
					</p>
					<UButton size="xs" variant="soft" icon="i-heroicons-plus" :disabled="busy" @click="openPicker(meal)">Thêm</UButton>
				</div>
				<button
					v-for="e in entriesOf(meal)"
					:key="e.id"
					type="button"
					class="mt-2 flex w-full items-center gap-2 border-t border-(--ui-border) pt-2 text-left"
					@click="openEdit(e)"
				>
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm text-(--ui-text-highlighted)">{{ e.name }}</span>
						<span class="block text-xs text-(--ui-text-muted)">
							{{ amountLabel(e) }} · Đạm {{ e.proteinG === null ? '—' : formatAmount(e.proteinG) }} g
						</span>
					</span>
					<span class="shrink-0 text-sm tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(e.energyKcal) }} kcal</span>
				</button>
			</UCard>

			<SuggestionsCard v-if="suggestions && date === today" :suggestions="suggestions" :meal="suggestMeal" :busy="busy" @add="onAddSuggestion" />

			<div class="grid grid-cols-2 gap-2">
				<UButton block color="neutral" variant="soft" icon="i-heroicons-arrow-down-tray" :disabled="busy" @click="() => { menuPickerOpen = true }">
					Áp thực đơn
				</UButton>
				<UButton block color="neutral" variant="soft" icon="i-heroicons-bookmark" :disabled="busy || day.entries.length === 0" @click="saveAsMenu">
					Lưu thành thực đơn
				</UButton>
			</div>
		</template>

		<EntryPickerSheet v-model:open="pickerOpen" title="Thêm vào nhật ký" :default-meal="pickerMeal" :saving="busy" @pick="onPick" />
		<EntryEditSheet v-model:open="editOpen" :entry="editing" :saving="busy" @save="onSaveEntry" @remove="onRemoveEntry" />
		<NutritionTargetsSheet v-model:open="targetsOpen" :targets="day?.targets ?? null" :saving="busy" @save="onSaveTargets" />
		<MenuPickerSheet v-model:open="menuPickerOpen" :saving="busy" @pick="onApplyMenu" />
	</div>
</template>
