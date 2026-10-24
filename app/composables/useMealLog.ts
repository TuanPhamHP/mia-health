import { ref } from 'vue';
import type { SuggestionsDTO } from '#shared/types/body';
import type {
	AddMealEntryInput,
	DayLogDTO,
	NutritionTargetsDTO,
	UpdateMealEntryInput,
	UpdateNutritionTargetsInput,
} from '#shared/types/meals';
import { createRunner } from '~/utils/api';

// Nhật ký ăn của MỘT ngày. `date` luôn lấy từ localDateIso() / URL ở client — server không biết
// múi giờ người dùng. Mọi thao tác trả nhật ký ngày mới nhất → gán thẳng.
export function useMealLog() {
	const day = ref<DayLogDTO | null>(null);
	const suggestions = ref<SuggestionsDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function apply(p: Promise<DayLogDTO>): Promise<DayLogDTO | null> {
		const dto = await run(() => p);
		if (dto) day.value = dto;
		return dto;
	}

	const load = (date: string) => apply($fetch<DayLogDTO>('/api/meal-log', { params: { date } }));

	const add = (input: AddMealEntryInput) => apply($fetch<DayLogDTO>('/api/meal-log/entries', { method: 'POST', body: input }));

	const update = (id: number, input: UpdateMealEntryInput) =>
		apply($fetch<DayLogDTO>(`/api/meal-log/entries/${id}`, { method: 'PATCH', body: input }));

	const remove = (id: number) => apply($fetch<DayLogDTO>(`/api/meal-log/entries/${id}`, { method: 'DELETE' }));

	const applyMenu = (date: string, menuId: number) =>
		apply($fetch<DayLogDTO>('/api/meal-log/apply-menu', { method: 'POST', body: { date, menuId } }));

	/** Mục tiêu dùng chung mọi ngày — cập nhật xong gán vào nhật ký đang xem. */
	async function setTargets(input: UpdateNutritionTargetsInput): Promise<NutritionTargetsDTO | null> {
		const targets = await run(() => $fetch<NutritionTargetsDTO>('/api/nutrition-targets', { method: 'PUT', body: input }));
		if (targets && day.value) day.value = { ...day.value, targets };
		return targets;
	}

	/** Gợi ý món cho phần còn lại của ngày — gọi lại sau mỗi lần nhật ký đổi. */
	async function loadSuggestions(date: string): Promise<SuggestionsDTO | null> {
		const dto = await run(() => $fetch<SuggestionsDTO>('/api/meal-log/suggestions', { params: { date } }));
		suggestions.value = dto;
		return dto;
	}

	return { day, suggestions, loading, error, load, add, update, remove, applyMenu, setTargets, loadSuggestions };
}
