import type { z } from 'zod';
import type {
	addMealEntrySchema,
	createMenuSchema,
	entryUnitEnum,
	mealEnum,
	menuItemInputSchema,
	updateMealEntrySchema,
	updateMenuSchema,
	updateNutritionTargetsSchema,
} from '../schemas/meals';
import type { NutrientKey, NutrientValues } from '../utils/nutrients';

export type Meal = z.infer<typeof mealEnum>;
export type EntryUnit = z.infer<typeof entryUnitEnum>;
export type AddMealEntryInput = z.infer<typeof addMealEntrySchema>;
export type UpdateMealEntryInput = z.infer<typeof updateMealEntrySchema>;
export type MenuItemInput = z.infer<typeof menuItemInputSchema>;
export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type UpdateNutritionTargetsInput = z.infer<typeof updateNutritionTargetsSchema>;

export interface NutrientTotalDTO {
	values: NutrientValues;
	/** Chất có phần thiếu số liệu ⇒ giá trị là mức tối thiểu (UI hiện "≥"). */
	missing: NutrientKey[];
}

/** Một dòng đã ăn — dinh dưỡng là SNAPSHOT lúc ghi, cho đúng lượng đã ăn. */
export interface MealEntryDTO extends NutrientValues {
	id: number;
	date: string;
	meal: Meal;
	position: number;
	/** null khi món / thực phẩm đã bị xoá — tên + dinh dưỡng vẫn giữ. */
	dishId: number | null;
	foodId: number | null;
	name: string;
	amount: number;
	unit: EntryUnit;
	portionLabel: string | null;
	missing: NutrientKey[];
	createdAt: string;
	updatedAt: string | null;
}

export interface NutritionTargetsDTO {
	energyKcal: number;
	proteinG: number | null;
	fatG: number | null;
	carbG: number | null;
	fiberG: number | null;
	/** Mức TỐI ĐA. */
	sodiumMg: number | null;
	/** null = chưa đặt, đang dùng mặc định. */
	updatedAt: string | null;
}

export interface DayLogDTO {
	date: string;
	/** Theo bữa (sáng → trưa → tối → phụ), rồi position. */
	entries: MealEntryDTO[];
	totals: NutrientTotalDTO;
	byMeal: Record<Meal, { energyKcal: number; count: number }>;
	targets: NutritionTargetsDTO;
}

export interface MenuDTO {
	id: number;
	name: string;
	description: string | null;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string | null;
}

/** Món trong thực đơn — tham chiếu live, dinh dưỡng tính cho đúng lượng của dòng. */
export interface MenuItemDTO {
	id: number;
	menuId: number;
	meal: Meal;
	position: number;
	dishId: number | null;
	foodId: number | null;
	amount: number;
	unit: EntryUnit;
	portionLabel: string | null;
	createdAt: string;
	name: string;
	isArchived: boolean;
	energyKcal: number;
	proteinG: number | null;
	fatG: number | null;
	carbG: number | null;
}

export interface MenuSummaryDTO extends MenuDTO {
	itemCount: number;
	totals: Pick<NutrientValues, 'energyKcal' | 'proteinG' | 'fatG' | 'carbG'>;
}

export interface MenuDetailDTO extends MenuDTO {
	items: MenuItemDTO[];
	totals: NutrientTotalDTO;
}
