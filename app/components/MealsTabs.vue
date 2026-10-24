<script setup lang="ts">
	/** Các mục của tab "Ăn uống": Món ăn (công thức) ← Thực phẩm (nguyên liệu có nutrition facts). */
	const route = useRoute();

	const TABS = [
		{
			label: 'Món ăn',
			to: '/dishes',
			icon: 'i-heroicons-cake',
			hint: 'Món = công thức từ thực phẩm. Dinh dưỡng tự cộng từ nguyên liệu — sửa nguyên liệu là món đổi theo.',
		},
		{
			label: 'Thực phẩm',
			to: '/foods',
			icon: 'i-heroicons-shopping-cart',
			hint: 'Kho nguyên liệu với nutrition facts trên 100 g phần ăn được (Bảng thành phần thực phẩm VN + USDA).',
		},
	];

	const active = computed(() => TABS.find((t) => route.path.startsWith(t.to)) ?? TABS[0]!);
</script>

<template>
	<div class="space-y-1.5">
		<nav class="grid grid-cols-2 gap-1 rounded-xl bg-(--ui-bg-elevated) p-1" aria-label="Ăn uống">
			<NuxtLink
				v-for="t in TABS"
				:key="t.to"
				:to="t.to"
				class="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors"
				:class="active.to === t.to ? 'bg-(--ui-bg) text-(--ui-text-highlighted) shadow-sm' : 'text-(--ui-text-muted)'"
				:aria-current="active.to === t.to ? 'page' : undefined"
			>
				<UIcon :name="t.icon" class="size-4" />
				{{ t.label }}
			</NuxtLink>
		</nav>
		<p class="px-1 text-xs text-(--ui-text-dimmed)">{{ active.hint }}</p>
	</div>
</template>
