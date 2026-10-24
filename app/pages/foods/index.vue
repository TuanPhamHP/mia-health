<script setup lang="ts">
	import type { CreateFoodInput, FoodSummaryDTO } from '#shared/types/foods';
	import { FOOD_SOURCE_SHORT, branchCount, formatAmount } from '~/utils/foods';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Ăn uống';
	useHead({ title: 'Thực phẩm — Mia Health' });

	const route = useRoute();
	const router = useRouter();
	const toast = useToast();
	const { foods, categories, loading, error, list, loadCategories, create } = useFoods();

	// Bộ lọc nằm trên URL (?cat=&q=) — quay lại từ trang chi tiết vẫn đúng chỗ đang xem.
	const selectedId = ref<number | null>(Number(route.query['cat']) || null);
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

	const selectedTop = computed(
		() => categories.value.find((t) => t.id === selectedId.value || t.children.some((c) => c.id === selectedId.value)) ?? null,
	);
	// Chưa chọn nhóm, chưa tìm ⇒ duyệt theo lưới nhóm thay vì đổ ra hơn 500 dòng.
	const browsing = computed(() => selectedId.value === null && query.value === '');

	async function reload() {
		void router.replace({
			query: { ...(selectedId.value ? { cat: String(selectedId.value) } : {}), ...(query.value ? { q: query.value } : {}) },
		});
		if (browsing.value) return;
		await list({ categoryId: selectedId.value ?? undefined, q: query.value || undefined, includeArchived: showArchived.value });
		if (error.value) toast.add({ title: 'Lỗi tải thực phẩm', description: error.value, color: 'error' });
	}

	onMounted(async () => {
		await Promise.all([loadCategories(), reload()]);
		loaded.value = true;
	});
	watch([selectedId, query, showArchived], reload);

	function select(id: number | null) {
		selectedId.value = id;
	}

	// Đang xem cả nhóm có loại con ⇒ chia mục theo loại cho dễ dò.
	const sections = computed(() => {
		const top = selectedTop.value;
		if (!top || selectedId.value !== top.id || top.children.length === 0 || query.value) {
			return [{ key: 'all', title: null as string | null, items: foods.value }];
		}
		const byCategory = new Map<number, FoodSummaryDTO[]>();
		for (const f of foods.value) byCategory.set(f.categoryId, [...(byCategory.get(f.categoryId) ?? []), f]);
		return [{ id: top.id, name: `${top.name} (chung)` }, ...top.children]
			.map((c) => ({ key: String(c.id), title: c.name as string | null, items: byCategory.get(c.id) ?? [] }))
			.filter((s) => s.items.length > 0);
	});

	const macro = (v: number | null) => (v === null ? '—' : formatAmount(v));

	// ---- Thêm thực phẩm ----
	const sheetOpen = ref(false);
	const saving = ref(false);

	async function onCreate(input: CreateFoodInput) {
		saving.value = true;
		const saved = await create(input);
		saving.value = false;
		if (!saved) {
			toast.add({ title: 'Không thêm được', description: error.value ?? undefined, color: 'error' });
			return;
		}
		sheetOpen.value = false;
		await navigateTo(`/foods/${saved.id}`);
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<MealsTabs />

		<UInput
			v-model="search"
			icon="i-heroicons-magnifying-glass"
			placeholder="Tìm thực phẩm… (gõ không dấu được)"
			class="w-full"
			:ui="{ base: 'text-base' }"
		>
			<template v-if="search" #trailing>
				<UButton color="neutral" variant="link" size="sm" icon="i-heroicons-x-circle" aria-label="Xoá tìm kiếm" @click="() => { search = '' }" />
			</template>
		</UInput>

		<div class="flex items-center gap-2">
			<UButton icon="i-heroicons-plus" @click="() => { sheetOpen = true }">Thực phẩm</UButton>
			<UButton color="neutral" variant="soft" icon="i-heroicons-folder" to="/foods/categories">Nhóm</UButton>
			<div class="flex-1" />
			<label class="flex items-center gap-2 text-xs text-(--ui-text-muted)">
				<USwitch v-model="showArchived" size="sm" />
				Lưu trữ
			</label>
		</div>

		<div v-if="categories.length > 0" class="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
			<UButton
				size="sm"
				class="shrink-0"
				:color="selectedId === null ? 'primary' : 'neutral'"
				:variant="selectedId === null ? 'solid' : 'soft'"
				@click="select(null)"
			>
				Tất cả
			</UButton>
			<UButton
				v-for="t in categories"
				:key="t.id"
				size="sm"
				class="shrink-0"
				:color="selectedTop?.id === t.id ? 'primary' : 'neutral'"
				:variant="selectedTop?.id === t.id ? 'solid' : 'soft'"
				@click="select(t.id)"
			>
				{{ t.name }}
			</UButton>
		</div>
		<div v-if="selectedTop && selectedTop.children.length > 0" class="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
			<UButton
				size="xs"
				class="shrink-0"
				color="neutral"
				:variant="selectedId === selectedTop.id ? 'solid' : 'outline'"
				@click="select(selectedTop.id)"
			>
				Tất cả {{ selectedTop.name.toLowerCase() }}
			</UButton>
			<UButton
				v-for="c in selectedTop.children"
				:key="c.id"
				size="xs"
				class="shrink-0"
				color="neutral"
				:variant="selectedId === c.id ? 'solid' : 'outline'"
				@click="select(c.id)"
			>
				{{ c.name }} · {{ c.foodCount }}
			</UButton>
		</div>

		<!-- Duyệt theo nhóm -->
		<div v-if="browsing" class="grid grid-cols-2 gap-2">
			<template v-if="!loaded">
				<div v-for="i in 8" :key="i" class="h-24 rounded-2xl bg-(--ui-bg-elevated) animate-pulse" />
			</template>
			<button
				v-for="t in categories"
				:key="t.id"
				type="button"
				class="rounded-2xl border border-(--ui-border) p-3 text-left active:scale-[0.98] transition-transform"
				@click="select(t.id)"
			>
				<p class="font-semibold text-(--ui-text-highlighted)">{{ t.name }}</p>
				<p class="text-xs text-(--ui-text-muted)">{{ branchCount(t) }} thực phẩm</p>
				<p v-if="t.children.length > 0" class="mt-1 line-clamp-2 text-[11px] text-(--ui-text-dimmed)">
					{{ t.children.map((c) => c.name).join(' · ') }}
				</p>
			</button>
		</div>

		<!-- Danh sách -->
		<template v-else>
			<template v-if="loading && foods.length === 0">
				<div v-for="i in 6" :key="i" class="h-14 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			</template>
			<p v-else-if="foods.length === 0" class="py-8 text-center text-sm text-(--ui-text-muted)">
				Không có thực phẩm nào{{ query ? ` khớp "${query}"` : '' }}.
			</p>
			<template v-else>
				<p class="text-xs text-(--ui-text-dimmed)">{{ foods.length }} thực phẩm · số liệu trên 100 g phần ăn được</p>
				<section v-for="s in sections" :key="s.key" class="space-y-1.5">
					<h2 v-if="s.title" class="pt-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">{{ s.title }}</h2>
					<NuxtLink
						v-for="f in s.items"
						:key="f.id"
						:to="`/foods/${f.id}`"
						class="flex items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-2"
						:class="f.isArchived ? 'opacity-60' : ''"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-(--ui-text-highlighted)">{{ f.name }}</p>
							<p class="text-xs text-(--ui-text-muted)">
								Đạm {{ macro(f.proteinG) }} · Béo {{ macro(f.fatG) }} · Glucid {{ macro(f.carbG) }}
								<span class="text-(--ui-text-dimmed)"> · {{ FOOD_SOURCE_SHORT[f.source] }}</span>
							</p>
						</div>
						<div class="shrink-0 text-right">
							<p class="text-sm font-semibold tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(f.energyKcal) }}</p>
							<p class="text-[10px] text-(--ui-text-dimmed)">kcal</p>
						</div>
					</NuxtLink>
				</section>
			</template>
		</template>

		<FoodFormSheet
			v-model:open="sheetOpen"
			:food="null"
			:categories="categories"
			:default-category-id="selectedId ?? undefined"
			:saving="saving"
			@save="onCreate"
		/>
	</div>
</template>
