import type { z } from 'zod';
import type {
	addFoodPortionSchema,
	createFoodCategorySchema,
	createFoodSchema,
	updateFoodCategorySchema,
	updateFoodPortionSchema,
	updateFoodSchema,
} from '../schemas/foods';
import type { NutrientValues } from '../utils/nutrients';

export type CreateFoodInput = z.infer<typeof createFoodSchema>;
export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;
export type CreateFoodCategoryInput = z.infer<typeof createFoodCategorySchema>;
export type UpdateFoodCategoryInput = z.infer<typeof updateFoodCategorySchema>;
export type AddFoodPortionInput = z.infer<typeof addFoodPortionSchema>;
export type UpdateFoodPortionInput = z.infer<typeof updateFoodPortionSchema>;

/**
 *   vn_fct_2007    — Bảng thành phần thực phẩm Việt Nam 2007 (Viện Dinh dưỡng), sourceCode = mã số
 *   usda_sr_legacy — USDA FoodData Central SR Legacy, sourceCode = FDC ID
 *   user           — tự nhập
 */
export type FoodSource = 'vn_fct_2007' | 'usda_sr_legacy' | 'user';

export interface FoodCategoryDTO {
	id: number;
	parentId: number | null;
	name: string;
	position: number;
	createdAt: string;
	updatedAt: string | null;
}

/** Nút cây danh mục — `foodCount` = thực phẩm (chưa lưu trữ) gắn TRỰC TIẾP vào nút. */
export interface FoodCategoryNodeDTO extends FoodCategoryDTO {
	foodCount: number;
	children: (FoodCategoryDTO & { foodCount: number })[];
}

/** Dòng danh sách — chỉ năng lượng + 3 chất đa lượng trên 100 g. */
export interface FoodSummaryDTO {
	id: number;
	categoryId: number;
	name: string;
	source: FoodSource;
	energyKcal: number;
	proteinG: number | null;
	fatG: number | null;
	carbG: number | null;
	isArchived: boolean;
}

/** Số liệu trên 100 g PHẦN ĂN ĐƯỢC; null = nguồn không có số liệu (khác 0). */
export interface FoodDTO extends NutrientValues {
	id: number;
	categoryId: number;
	name: string;
	source: FoodSource;
	sourceCode: string | null;
	sourceName: string | null;
	/** % thải bỏ khi mua (xương, vỏ…). */
	refusePct: number | null;
	note: string | null;
	isArchived: boolean;
	createdAt: string;
	updatedAt: string | null;
}

export interface FoodPortionDTO {
	id: number;
	foodId: number;
	name: string;
	grams: number;
	position: number;
	createdAt: string;
}

export interface FoodDetailDTO extends FoodDTO {
	portions: FoodPortionDTO[];
	category: { id: number; name: string; parent: { id: number; name: string } | null };
	/** Món đang dùng thực phẩm này làm nguyên liệu (theo tên). */
	dishes: { id: number; name: string }[];
}
