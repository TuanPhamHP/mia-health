<script setup lang="ts">
	import type { CreateFoodCategoryInput, FoodCategoryDTO } from '#shared/types/foods';
	import { branchCount } from '~/utils/foods';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Nhóm thực phẩm';
	useHead({ title: 'Nhóm thực phẩm — Mia Health' });

	const toast = useToast();
	const { categories, loading, error, loadCategories, createCategory, updateCategory, removeCategory } = useFoods();
	const busy = ref(false);

	onMounted(async () => {
		await loadCategories();
		if (error.value) toast.add({ title: 'Lỗi tải nhóm', description: error.value, color: 'error' });
	});

	// Mọi thao tác trả cả cây mới nhất → `categories` tự cập nhật; chỉ cần báo lỗi.
	async function act(fn: () => Promise<unknown>, success?: string): Promise<boolean> {
		busy.value = true;
		const res = await fn();
		busy.value = false;
		if (res === null) {
			toast.add({ title: 'Có lỗi', description: error.value ?? undefined, color: 'error' });
			return false;
		}
		if (success) toast.add({ title: success, color: 'success' });
		return true;
	}

	const formOpen = ref(false);
	const editing = ref<FoodCategoryDTO | null>(null);
	const defaultParentId = ref<number | null>(null);

	function openForm(category: FoodCategoryDTO | null, parentId: number | null = null) {
		editing.value = category;
		defaultParentId.value = parentId;
		formOpen.value = true;
	}

	async function onSave(input: CreateFoodCategoryInput) {
		const ok = editing.value
			? await act(() => updateCategory(editing.value!.id, input), 'Đã lưu')
			: await act(() => createCategory(input), 'Đã thêm nhóm');
		if (ok) formOpen.value = false;
	}

	async function onDelete(category: FoodCategoryDTO) {
		if (!confirm(`Xoá nhóm "${category.name}"?`)) return;
		await act(() => removeCategory(category.id), 'Đã xoá nhóm');
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<p class="text-xs text-(--ui-text-dimmed)">
			Chia 2 cấp: nhóm (Thịt) → loại (Gà). Xoá nhóm phải chuyển hết thực phẩm và loại con đi trước.
		</p>
		<UButton icon="i-heroicons-plus" :disabled="busy" @click="openForm(null)">Nhóm gốc</UButton>

		<template v-if="loading && categories.length === 0">
			<div v-for="i in 4" :key="i" class="h-24 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-for="t in categories" :key="t.id">
			<div class="flex items-center gap-2">
				<div class="min-w-0 flex-1">
					<p class="font-semibold text-(--ui-text-highlighted)">{{ t.name }}</p>
					<p class="text-xs text-(--ui-text-muted)">{{ branchCount(t) }} thực phẩm</p>
				</div>
				<UButton icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="sm" :disabled="busy" :aria-label="`Sửa ${t.name}`" @click="openForm(t)" />
				<UButton icon="i-heroicons-trash" color="neutral" variant="ghost" size="sm" :disabled="busy" :aria-label="`Xoá ${t.name}`" @click="onDelete(t)" />
			</div>
			<div v-if="t.children.length > 0" class="mt-2 divide-y divide-(--ui-border) border-t border-(--ui-border)">
				<div v-for="c in t.children" :key="c.id" class="flex items-center gap-2 py-1.5 pl-3">
					<NuxtLink :to="`/foods?cat=${c.id}`" class="min-w-0 flex-1 text-sm text-(--ui-text-highlighted)">
						{{ c.name }} <span class="text-(--ui-text-muted)">· {{ c.foodCount }}</span>
					</NuxtLink>
					<UButton icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="xs" :disabled="busy" :aria-label="`Sửa ${c.name}`" @click="openForm(c)" />
					<UButton icon="i-heroicons-trash" color="neutral" variant="ghost" size="xs" :disabled="busy" :aria-label="`Xoá ${c.name}`" @click="onDelete(c)" />
				</div>
			</div>
			<UButton class="mt-2" size="xs" variant="ghost" icon="i-heroicons-plus" :disabled="busy" @click="openForm(null, t.id)">
				Thêm loại trong {{ t.name }}
			</UButton>
		</UCard>

		<FoodCategoryFormSheet
			v-model:open="formOpen"
			:category="editing"
			:tree="categories"
			:default-parent-id="defaultParentId"
			:saving="busy"
			@save="onSave"
		/>
	</div>
</template>
