import { z } from 'zod';
import { boolQuery, hasAnyField, optQuery } from './common';
import { NUTRIENTS } from '../utils/nutrients';
import type { NutrientKey, NutrientUnit } from '../utils/nutrients';

const id = z.number().int().positive();

// Trần theo đơn vị trên 100 g: g ≤ 100; kcal ≤ 1.000 (mỡ nguyên chất ~900); mg/µg rộng (muối ~38.000 mg natri).
const LIMITS: Record<NutrientUnit, number> = { g: 100, kcal: 1000, mg: 100000, 'µg': 100000 };

function nutrientField(unit: NutrientUnit) {
	return z.number().min(0, 'Không được âm').max(LIMITS[unit], `Tối đa ${LIMITS[unit]} ${unit} / 100 g`);
}

type OptionalNutrient = z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
type NutrientShape = { energyKcal: z.ZodNumber } & { [K in Exclude<NutrientKey, 'energyKcal'>]: OptionalNutrient };

// Năng lượng bắt buộc; chất khác null / bỏ trống = không có số liệu (khác 0).
const nutrientShape = Object.fromEntries(
	NUTRIENTS.map((n) => [n.key, n.key === 'energyKcal' ? nutrientField(n.unit) : nutrientField(n.unit).nullable().optional()]),
) as NutrientShape;

const foodName = z.string().trim().min(1, 'Tên thực phẩm không được rỗng').max(120);
const note = z.string().max(2000).nullable().optional();
const refusePct = z.number().min(0).max(99).nullable().optional();

export const createFoodSchema = z.object({
	name: foodName,
	categoryId: id,
	note,
	refusePct,
	...nutrientShape,
});

export const updateFoodSchema = z
	.object({
		name: foodName.optional(),
		categoryId: id.optional(),
		note,
		refusePct,
		...nutrientShape,
		energyKcal: nutrientShape.energyKcal.optional(),
		isArchived: z.boolean().optional(),
	})
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const foodQuerySchema = z.object({
	// Nhóm gốc ⇒ gồm cả thực phẩm của các loại con.
	categoryId: optQuery(z.coerce.number().int().positive()),
	q: optQuery(z.string().trim().max(100)),
	includeArchived: optQuery(boolQuery),
});

const categoryName = z.string().trim().min(1, 'Tên nhóm không được rỗng').max(60);

export const createFoodCategorySchema = z.object({
	name: categoryName,
	// null / bỏ trống = nhóm gốc. Chỉ 2 cấp: cha phải là nhóm gốc.
	parentId: id.nullable().optional(),
});

export const updateFoodCategorySchema = z
	.object({ name: categoryName.optional(), parentId: id.nullable().optional(), position: z.number().int().min(0).optional() })
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

const portionName = z.string().trim().min(1, 'Tên khẩu phần không được rỗng').max(60);
const grams = z.number().positive('Khối lượng phải lớn hơn 0').max(5000, 'Tối đa 5.000 g');

export const addFoodPortionSchema = z.object({ name: portionName, grams });

export const updateFoodPortionSchema = z
	.object({ name: portionName.optional(), grams: grams.optional() })
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });
