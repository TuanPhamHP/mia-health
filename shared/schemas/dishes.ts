import { z } from 'zod';
import { boolQuery, hasAnyField, optQuery } from './common';

export const dishCategoryEnum = z.enum(['main', 'veg', 'soup', 'noodle', 'rice', 'snack', 'drink', 'other']);

// Khối lượng PHẦN ĂN ĐƯỢC của nguyên liệu cho cả công thức. Trùng thực phẩm được phép.
const dishIngredientInputSchema = z.object({
	foodId: z.number().int().positive(),
	grams: z.number().positive('Khối lượng phải lớn hơn 0').max(5000, 'Tối đa 5.000 g mỗi nguyên liệu'),
});

const ingredients = z
	.array(dishIngredientInputSchema)
	.min(1, 'Món cần ít nhất 1 nguyên liệu')
	.max(40, 'Món tối đa 40 nguyên liệu');

const dishBase = {
	name: z.string().trim().min(1, 'Tên món không được rỗng').max(100),
	category: dishCategoryEnum,
	description: z.string().max(4000).nullable().optional(),
	servings: z.number().int().min(1, 'Ít nhất 1 phần').max(50),
	// Cân cả nồi sau khi nấu — có thì xem được dinh dưỡng theo gam món chín.
	cookedWeightG: z.number().positive().max(50000).nullable().optional(),
	ingredients,
};

export const createDishSchema = z.object(dishBase);

export const updateDishSchema = z
	.object({
		name: dishBase.name.optional(),
		category: dishBase.category.optional(),
		description: dishBase.description,
		servings: dishBase.servings.optional(),
		cookedWeightG: dishBase.cookedWeightG,
		// Gửi lên ⇒ thay TOÀN BỘ danh sách nguyên liệu (thứ tự = thứ tự mảng).
		ingredients: ingredients.optional(),
		isArchived: z.boolean().optional(),
	})
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const dishQuerySchema = z.object({
	category: optQuery(dishCategoryEnum),
	q: optQuery(z.string().trim().max(100)),
	includeArchived: optQuery(boolQuery),
});
