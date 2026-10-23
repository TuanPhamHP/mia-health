<script setup lang="ts">
	/**
	 * Bottom sheet dùng chung — cùng chữ ký `rounded-t-2xl shadow-2xl` + backdrop
	 * `bg-black/50` mà main.css nhận diện để phủ lớp kính.
	 * Slot mặc định = nội dung cuộn được; slot `footer` = hàng nút dính đáy.
	 */
	const open = defineModel<boolean>('open', { default: false });
	defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
	<Teleport to="body">
		<Transition
			enter-active-class="transition-opacity duration-200"
			enter-from-class="opacity-0"
			leave-active-class="transition-opacity duration-150"
			leave-to-class="opacity-0"
		>
			<div
				v-if="open"
				class="fixed inset-0 z-[200] flex flex-col justify-end"
				@keydown.esc="open = false"
			>
				<div class="absolute inset-0 bg-black/50" @click="open = false" />

				<div class="relative mx-auto flex w-full max-w-md flex-col rounded-t-2xl bg-(--ui-bg) shadow-2xl max-h-[92dvh]">
					<div class="flex-none flex justify-center pt-2.5 pb-1">
						<div class="h-1 w-10 rounded-full bg-(--ui-border-accented)" />
					</div>

					<div class="flex-none flex items-start gap-2 px-4 pb-3">
						<div class="min-w-0 flex-1">
							<h3 class="text-base font-semibold text-(--ui-text-highlighted)">{{ title }}</h3>
							<p v-if="subtitle" class="mt-0.5 text-sm text-(--ui-text-muted)">{{ subtitle }}</p>
						</div>
						<button
							type="button"
							class="flex size-8 shrink-0 items-center justify-center rounded-full text-(--ui-text-muted) active:bg-(--ui-bg-elevated)"
							aria-label="Đóng"
							@click="open = false"
						>
							<UIcon name="i-heroicons-x-mark" class="size-5" />
						</button>
					</div>

					<div class="flex-1 overflow-y-auto px-4 pb-2">
						<slot />
					</div>

					<div
						v-if="$slots.footer"
						class="flex-none px-4 pt-3"
						:style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }"
					>
						<slot name="footer" />
					</div>
					<div v-else class="flex-none" :style="{ height: 'calc(12px + env(safe-area-inset-bottom, 0px))' }" />
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
