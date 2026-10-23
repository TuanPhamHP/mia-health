<script setup lang="ts">
	/**
	 * Ô nhập thông số theo `mode` — dùng chung cho form bài tập, bài trong giáo án và bài con
	 * của bài kết hợp.
	 *   mode 'combo' — số vòng + nghỉ giữa vòng (bài kết hợp luân phiên).
	 *   inCircuit    — bài con của bài luân phiên: không có số set, nghỉ = nghỉ trước bài kế;
	 *                  `hideRest` cho bài con cuối (sau nó là nghỉ giữa vòng).
	 */
	import type { ExerciseMode, ExerciseParams } from '#shared/types/exercises';

	defineProps<{ mode: ExerciseMode; inCircuit?: boolean; hideRest?: boolean }>();
	const params = defineModel<ExerciseParams>({ required: true });
</script>

<template>
	<div class="grid grid-cols-2 gap-3">
		<template v-if="mode === 'combo'">
			<UFormField label="Số vòng">
				<UInputNumber v-model="params.sets" :min="1" :max="20" class="w-full" />
			</UFormField>
			<UFormField label="Nghỉ giữa vòng (giây)">
				<UInputNumber v-model="params.restSec" :min="0" :max="600" :step="5" class="w-full" />
			</UFormField>
		</template>
		<template v-else>
			<UFormField v-if="!inCircuit" label="Số set">
				<UInputNumber v-model="params.sets" :min="1" :max="20" class="w-full" />
			</UFormField>
			<UFormField v-if="mode !== 'duration'" :label="inCircuit ? 'Số lần' : 'Số lần mỗi set'">
				<UInputNumber v-model="params.reps" :min="1" :max="200" class="w-full" />
			</UFormField>
			<UFormField v-else :label="inCircuit ? 'Thời gian (giây)' : 'Mỗi set (giây)'">
				<UInputNumber v-model="params.durationSec" :min="1" :max="3600" :step="5" class="w-full" />
			</UFormField>
			<template v-if="mode === 'hold'">
				<UFormField label="Giữ (giây)">
					<UInputNumber v-model="params.holdSec" :min="1" :max="600" class="w-full" />
				</UFormField>
				<UFormField label="Thả (giây)">
					<UInputNumber v-model="params.relaxSec" :min="0" :max="600" class="w-full" />
				</UFormField>
			</template>
			<UFormField v-if="!hideRest" :label="inCircuit ? 'Nghỉ trước bài kế (giây)' : 'Nghỉ giữa set (giây)'" class="col-span-2">
				<UInputNumber v-model="params.restSec" :min="0" :max="600" :step="5" class="w-full" />
			</UFormField>
		</template>
	</div>
</template>
