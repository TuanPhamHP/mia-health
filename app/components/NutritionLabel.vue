<script setup lang="ts">
	/**
	 * Nhãn "Nutrition facts" cho `grams` gam phần ăn được. Số liệu gốc trên 100 g; "—" = nguồn
	 * không có số liệu (khác 0 — không cộng bừa thành 0). %DV theo khẩu phần tham chiếu 2.000 kcal.
	 */
	import { NUTRIENTS, scaleNutrients } from '#shared/utils/nutrients';
	import type { NutrientGroup, NutrientValues } from '#shared/utils/nutrients';
	import { formatAmount } from '~/utils/foods';

	const props = defineProps<{ per100g: NutrientValues; grams: number }>();

	const values = computed(() => scaleNutrients(props.per100g, props.grams));

	const SECTIONS: { group: NutrientGroup; title: string | null }[] = [
		{ group: 'macro', title: null },
		{ group: 'mineral', title: 'Khoáng chất' },
		{ group: 'vitamin', title: 'Vitamin' },
	];

	const rows = (group: NutrientGroup) =>
		NUTRIENTS.filter((n) => n.group === group).map((n) => {
			const v = values.value[n.key];
			const dv = 'dv' in n ? n.dv : undefined;
			return {
				...n,
				sub: 'sub' in n && n.sub,
				value: v,
				dvPct: v !== null && dv !== undefined ? Math.round((v / dv) * 100) : null,
			};
		});

	// Tỉ lệ năng lượng từ đạm / béo / glucid (4 / 9 / 4) — chỉ khi đủ cả ba số liệu.
	const energySplit = computed(() => {
		const { proteinG, fatG, carbG } = props.per100g;
		if (proteinG === null || fatG === null || carbG === null) return null;
		const parts = { protein: proteinG * 4, fat: fatG * 9, carb: carbG * 4 };
		const total = parts.protein + parts.fat + parts.carb;
		if (total <= 0) return null;
		const pct = (x: number) => Math.round((x / total) * 100);
		return { protein: pct(parts.protein), fat: pct(parts.fat), carb: pct(parts.carb) };
	});
</script>

<template>
	<div class="rounded-2xl border border-(--ui-border) px-3 py-3">
		<div class="flex items-baseline justify-between gap-2 border-b-4 border-(--ui-text-highlighted) pb-2">
			<p class="text-sm font-semibold text-(--ui-text-highlighted)">Năng lượng</p>
			<p class="tabular-nums">
				<span class="text-3xl font-bold text-(--ui-text-highlighted)">{{ formatAmount(values.energyKcal) }}</span>
				<span class="ml-1 text-sm text-(--ui-text-muted)">kcal</span>
			</p>
		</div>
		<p v-if="energySplit" class="mt-1.5 text-xs text-(--ui-text-muted)">
			Năng lượng từ: đạm {{ energySplit.protein }}% · béo {{ energySplit.fat }}% · glucid {{ energySplit.carb }}%
		</p>

		<template v-for="section in SECTIONS" :key="section.group">
			<p v-if="section.title" class="mt-3 border-b border-(--ui-border) pb-1 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">
				{{ section.title }}
			</p>
			<div v-else class="mt-2 flex justify-end text-[11px] text-(--ui-text-dimmed)">%DV*</div>
			<dl>
				<div
					v-for="row in rows(section.group)"
					:key="row.key"
					class="flex items-baseline gap-2 border-b border-(--ui-border)/60 py-1 text-sm last:border-b-0"
				>
					<dt class="min-w-0 flex-1" :class="row.sub ? 'pl-4 text-(--ui-text-muted)' : 'font-medium text-(--ui-text-highlighted)'">
						{{ row.label }}
					</dt>
					<dd class="tabular-nums" :class="row.value === null ? 'text-(--ui-text-dimmed)' : 'text-(--ui-text-highlighted)'">
						<template v-if="row.value === null">—</template>
						<template v-else>{{ formatAmount(row.value) }} {{ row.unit }}</template>
					</dd>
					<dd class="w-10 shrink-0 text-right text-xs tabular-nums text-(--ui-text-muted)">
						{{ row.dvPct !== null ? `${row.dvPct}%` : '' }}
					</dd>
				</div>
			</dl>
		</template>

		<p class="mt-3 text-[11px] leading-snug text-(--ui-text-dimmed)">
			* %DV: phần trăm nhu cầu một ngày theo khẩu phần tham chiếu 2.000 kcal (FDA). "—" = bảng nguồn không có số liệu, không phải 0.
			Glucid không gồm chất xơ.
		</p>
	</div>
</template>
