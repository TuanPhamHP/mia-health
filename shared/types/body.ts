import type { z } from 'zod';
import type { addBodyWeightSchema, updateBodyProfileSchema } from '../schemas/body';
import type { ActivityLevel, BmiClass, DailyTargets, Sex, WeightGoal } from '../utils/body';
import type { DishCategory } from './dishes';

export type UpdateBodyProfileInput = z.infer<typeof updateBodyProfileSchema>;
export type AddBodyWeightInput = z.infer<typeof addBodyWeightSchema>;

export interface BodyProfileDTO {
	sex: Sex;
	birthYear: number;
	heightCm: number;
	activityLevel: ActivityLevel;
	goal: WeightGoal;
	/** kg / tuần — giảm hoặc tăng theo `goal`. */
	goalRateKg: number;
	targetWeightKg: number | null;
	updatedAt: string | null;
}

export interface BodyWeightDTO {
	id: number;
	date: string;
	weightKg: number;
	createdAt: string;
	updatedAt: string | null;
}

/** Chỉ số tính từ hồ sơ + lần cân gần nhất (shared/utils/body.ts). */
export interface BodyMetricsDTO {
	age: number;
	weightKg: number;
	weightDate: string;
	bmi: number;
	/** Ngưỡng cho người châu Á (WHO WPRO 2000). */
	bmiClass: BmiClass;
	healthyMinKg: number;
	healthyMaxKg: number;
	bmr: number;
	tdee: number;
	targets: DailyTargets;
	weeksToTarget: number | null;
}

export interface BodyDTO {
	profile: BodyProfileDTO | null;
	/** Mới nhất trước, tối đa 60 lần cân. */
	weights: BodyWeightDTO[];
	/** null khi chưa có hồ sơ hoặc chưa cân lần nào. */
	metrics: BodyMetricsDTO | null;
}

export interface DishSuggestionDTO {
	dishId: number;
	name: string;
	category: DishCategory;
	energyKcal: number;
	proteinG: number | null;
	reasons: string[];
}

export interface SuggestionsDTO {
	date: string;
	/** Mục tiêu − đã ăn (âm = đã vượt). */
	remainingKcal: number;
	/** null khi chưa đặt mục tiêu đạm. */
	remainingProteinG: number | null;
	items: DishSuggestionDTO[];
}
