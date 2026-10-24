<script setup lang="ts">
	import type { CreateDishInput, DishCategory, DishSummaryDTO } from '#shared/types/dishes';
	import { DISH_CATEGORY_EMOJI, DISH_CATEGORY_LABELS, DISH_CATEGORY_ORDER } from '~/utils/dishes';
	import { formatAmount } from '~/utils/foods';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Ăn uống';
	useHead({ title: 'Món ăn — Mia Health' });

	const route = useRoute();
	const router = useRouter();
	const toast = useToast();
	const { dishes, loading, error, list, create } = useDishes();

	// Bộ lọc trên URL — quay lại từ trang chi tiết vẫn đúng chỗ đang xem.
	const queryCategory = route.query['cat'];
	const category = ref<DishCategory | null>(
		typeof queryCategory === 'string' && (DISH_CATEGORY_ORDER as string[]).includes(queryCategory) ? (queryCategory as DishCategory) : null,
	);
	const search = ref(typeof route.query['q'] === 'string' ? route.query['q'] : '');
	const query = ref(search.value.trim());
	const showArchived = ref(false);
	const loaded = ref(false);

	let timer: ReturnType<typeof setTimeout> | undefined;
	watch(search, (v) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			query.value = v.trim();
		}, 250);
	});

	async function reload() {
		void router.replace({ query: { ...(category.value ? { cat: category.value } : {}), ...(query.value ? { q: query.value } : {}) } });
		await list({ category: category.value ?? undefined, q: query.value || undefined, includeArchived: showArchived.value });
		if (error.value) toast.add({ title: 'Lỗi tải món ăn', description: error.value, color: 'error' });
		loaded.value = true;
	}
	onMounted(reload);
	watch([category, query, showArchived], reload);

	// Xem tất cả ⇒ chia mục theo nhóm món cho dễ dò.
	const sections = computed(() => {
		if (category.value || query.value) return [{ key: 'all', title: null as string | null, items: dishes.value }];
		return DISH_CATEGORY_ORDER.map((c) => ({
			key: c,
			title: DISH_CATEGORY_LABELS[c] as string | null,
			items: dishes.value.filter((d) => d.category === c),
		})).filter((s) => s.items.length > 0);
	});

	const macro = (v: number | null) => (v === null ? '—' : formatAmount(v));

	function servingLabel(d: DishSummaryDTO): string {
		return d.servings > 1 ? `1 phần (công thức ${d.servings} phần)` : '1 phần';
	}

	// ---- Soạn món ----
	const sheetOpen = ref(false);
	const saving = ref(false);

	async function onCreate(input: CreateDishInput) {
		saving.value = true;
		const saved = await create(input);
		saving.value = false;
		if (!saved) {
			toast.add({ title: 'Không tạo được', description: error.value ?? undefined, color: 'error' });
			return;
		}
		sheetOpen.value = false;
		await navigateTo(`/dishes/${saved.id}`);
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<MealsTabs />

		<UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Tìm món… (gõ không dấu được)" class="w-full" :ui="{ base: 'text-base' }">
			<template v-if="search" #trailing>
				<UButton color="neutral" variant="link" size="sm" icon="i-heroicons-x-circle" aria-label="Xoá tìm kiếm" @click="() => { search = '' }" />
			</template>
		</UInput>

		<div class="flex items-center gap-2">
			<UButton icon="i-heroicons-plus" @click="() => { sheetOpen = true }">Soạn món</UButton>
			<div class="flex-1" />
			<label class="flex items-center gap-2 text-xs text-(--ui-text-muted)">
				<USwitch v-model="showArchived" size="sm" />
				Lưu trữ
			</label>
		</div>

		<div class="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
			<UButton
				size="sm"
				class="shrink-0"
				:color="category === null ? 'primary' : 'neutral'"
				:variant="category === null ? 'solid' : 'soft'"
				@click="() => { category = null }"
			>
				Tất cả
			</UButton>
			<UButton
				v-for="c in DISH_CATEGORY_ORDER"
				:key="c"
				size="sm"
				class="shrink-0"
				:color="category === c ? 'primary' : 'neutral'"
				:variant="category === c ? 'solid' : 'soft'"
				@click="() => { category = c }"
			>
				{{ DISH_CATEGORY_LABELS[c] }}
			</UButton>
		</div>

		<template v-if="!loaded && loading">
			<div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>
		<UCard v-else-if="dishes.length === 0">
			<p class="py-4 text-center text-sm text-(--ui-text-muted)">
				{{ query ? `Không có món nào khớp "${query}".` : 'Chưa có món nào — bấm "Soạn món" để tạo từ kho thực phẩm.' }}
			</p>
		</UCard>

		<section v-for="s in sections" :key="s.key" class="space-y-1.5">
			<h2 v-if="s.title" class="pt-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">{{ s.title }}</h2>
			<NuxtLink
				v-for="d in s.items"
				:key="d.id"
				:to="`/dishes/${d.id}`"
				class="flex items-center gap-3 rounded-xl border border-(--ui-border) p-2 pr-3"
				:class="d.isArchived ? 'opacity-60' : ''"
			>
				<CoverThumb :cover="d.cover" :emoji="DISH_CATEGORY_EMOJI[d.category]" class="size-14" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-(--ui-text-highlighted)">{{ d.name }}</p>
					<p class="text-xs text-(--ui-text-muted)">
						Đạm {{ macro(d.perServing.proteinG) }} · Béo {{ macro(d.perServing.fatG) }} · Glucid {{ macro(d.perServing.carbG) }}
					</p>
					<p class="text-[11px] text-(--ui-text-dimmed)">
						{{ servingLabel(d) }} · {{ d.ingredientCount }} nguyên liệu{{ d.source === 'user' ? ' · tự soạn' : '' }}
					</p>
				</div>
				<div class="shrink-0 text-right">
					<p class="text-sm font-semibold tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(d.perServing.energyKcal) }}</p>
					<p class="text-[10px] text-(--ui-text-dimmed)">kcal/phần</p>
				</div>
			</NuxtLink>
		</section>

		<DishFormSheet v-model:open="sheetOpen" :dish="null" :saving="saving" @save="onCreate" />
	</div>
</template>
