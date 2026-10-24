<script setup lang="ts">
	/**
	 * Các mục của tab "Ăn uống": Nhật ký (đã ăn gì, so với mục tiêu) ← Thực đơn (mẫu một ngày) ←
	 * Món ăn (công thức) ← Thực phẩm (nguyên liệu có nutrition facts); Cơ thể (BMI, TDEE) ra mục tiêu.
	 */
	const route = useRoute();

	const TABS = [
		{
			label: 'Nhật ký',
			to: '/diary',
			icon: 'i-heroicons-calendar',
			hint: 'Ghi những gì đã ăn theo bữa, so với mục tiêu ngày. Dinh dưỡng chụp lúc ghi — sửa món về sau không đổi ngày cũ.',
		},
		{
			label: 'Thực đơn',
			to: '/menus',
			icon: 'i-heroicons-bookmark',
			hint: 'Thực đơn = bộ món cho một ngày, chia theo bữa. Áp vào nhật ký bằng một chạm.',
		},
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
		{
			label: 'Cơ thể',
			to: '/body',
			icon: 'i-heroicons-scale',
			hint: 'Cân nặng, BMI (ngưỡng châu Á), TDEE ⇒ mục tiêu kcal / đạm mỗi ngày cho nhật ký.',
		},
	];

	const active = computed(() => TABS.find((t) => route.path.startsWith(t.to)) ?? TABS[0]!);
</script>

<template>
	<div class="space-y-1.5">
		<nav class="grid grid-cols-5 gap-1 rounded-xl bg-(--ui-bg-elevated) p-1" aria-label="Ăn uống">
			<NuxtLink
				v-for="t in TABS"
				:key="t.to"
				:to="t.to"
				class="flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
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
