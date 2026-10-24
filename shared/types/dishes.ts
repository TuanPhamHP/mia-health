import type { z } from 'zod';
import type { createDishSchema, dishCategoryEnum, updateDishSchema } from '../schemas/dishes';
import type { Cover } from '../utils/media';
import type { NutrientKey, NutrientValues } from '../utils/nutrients';
import type { NutritionMediaDTO } from './nutrition-media';

export type DishCategory = z.infer<typeof dishCategoryEnum>;
export type CreateDishInput = z.infer<typeof createDishSchema>;
export type UpdateDishInput = z.infer<typeof updateDishSchema>;

/** preset = món mẫu (công thức ước lượng phổ biến), user = tự soạn. */
export type DishSource = 'preset' | 'user';

export interface DishDTO {
	id: number;
	name: string;
	category: DishCategory;
	description: string | null;
	servings: number;
	/** Cân cả nồi sau khi nấu (g) — null = chưa cân. */
	cookedWeightG: number | null;
	source: DishSource;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string | null;
}

/** Nguyên liệu: khối lượng cho cả công thức + thực phẩm join live (sửa thực phẩm ⇒ món đổi theo). */
export interface DishIngredientDTO {
	id: number;
	dishId: number;
	foodId: number;
	grams: number;
	position: number;
	createdAt: string;
	food: {
		name: string;
		isArchived: boolean;
		energyKcal: number;
		proteinG: number | null;
		fatG: number | null;
		carbG: number | null;
	};
}

export interface DishNutritionDTO {
	/** Tổng khối lượng nguyên liệu (phần ăn được, trước khi nấu). */
	totalGrams: number;
	total: NutrientValues;
	perServing: NutrientValues;
	/** Trên 100 g món chín — chỉ khi đã cân `cookedWeightG`. */
	per100gCooked: NutrientValues | null;
	/** Chất có nguyên liệu thiếu số liệu ⇒ giá trị là mức tối thiểu (UI hiện "≥"). */
	missing: NutrientKey[];
}

export interface DishSummaryDTO extends DishDTO {
	ingredientCount: number;
	perServing: Pick<NutrientValues, 'energyKcal' | 'proteinG' | 'fatG' | 'carbG'>;
	/** Ảnh bìa: media đầu tiên của món; chưa có thì mượn ảnh nguyên liệu nặng nhất có ảnh. */
	cover: Cover | null;
}

export interface DishDetailDTO extends DishDTO {
	ingredients: DishIngredientDTO[];
	nutrition: DishNutritionDTO;
	media: NutritionMediaDTO[];
	cover: Cover | null;
}
