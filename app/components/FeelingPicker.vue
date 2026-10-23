<script setup lang="ts">
	import { FEELING_OPTIONS } from '~/utils/labels';

	const model = defineModel<number | null>({ default: null });
</script>

<template>
	<div class="flex justify-between gap-1">
		<button
			v-for="o in FEELING_OPTIONS"
			:key="o.value"
			type="button"
			class="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-all"
			:class="model === o.value ? 'bg-(--ui-primary)/15 ring-1 ring-(--ui-primary) scale-105' : 'opacity-70 active:scale-95'"
			:aria-pressed="model === o.value"
			@click="model = model === o.value ? null : o.value"
		>
			<span class="text-2xl leading-none">{{ o.emoji }}</span>
			<span class="text-[10px] text-(--ui-text-muted)">{{ o.label }}</span>
		</button>
	</div>
</template>
