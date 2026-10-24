<script setup lang="ts">
	/** Thêm / đổi tên nhóm. Chỉ 2 cấp: nhóm gốc (Thịt) → loại (Gà). */
	import type { CreateFoodCategoryInput, FoodCategoryDTO, FoodCategoryNodeDTO } from '#shared/types/foods';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{
		category: FoodCategoryDTO | null; // null = thêm mới
		tree: FoodCategoryNodeDTO[];
		defaultParentId?: number | null;
		saving: boolean;
	}>();
	const emit = defineEmits<{ save: [input: CreateFoodCategoryInput] }>();

	const ROOT = 0;
	const name = ref('');
	const parentId = ref<number>(ROOT);
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		name.value = props.category?.name ?? '';
		parentId.value = (props.category ? props.category.parentId : props.defaultParentId) ?? ROOT;
	});

	// Nhóm đang có loại con không chuyển vào nhóm khác được (sẽ thành 3 cấp).
	const hasChildren = computed(() => props.tree.some((t) => t.id === props.category?.id && t.children.length > 0));
	const parentItems = computed(() => [
		{ label: '— Nhóm gốc —', value: ROOT },
		...props.tree.filter((t) => t.id !== props.category?.id).map((t) => ({ label: t.name, value: t.id })),
	]);

	function submit() {
		if (!name.value.trim()) return void (formError.value = 'Nhập tên nhóm');
		emit('save', { name: name.value.trim(), parentId: parentId.value === ROOT ? null : parentId.value });
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="category ? 'Sửa nhóm' : 'Thêm nhóm'">
		<form class="space-y-4" @submit.prevent="submit">
			<UFormField label="Tên nhóm" required>
				<UInput v-model="name" placeholder="VD: Gà" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>
			<UFormField label="Thuộc nhóm" :hint="hasChildren ? 'Nhóm có loại con phải là nhóm gốc' : undefined">
				<USelect v-model="parentId" :items="parentItems" value-key="value" :disabled="hasChildren" class="w-full" />
			</UFormField>
			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">{{ category ? 'Lưu' : 'Thêm' }}</UButton>
		</template>
	</AppSheet>
</template>
