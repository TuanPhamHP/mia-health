import { z } from 'zod';
import { boolQuery, dateStr, hasAnyField, optQuery } from './common';

const id = z.number().int().positive();

export const mealEnum = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export const entryUnitEnum = z.enum(['serving', 'g']);

// Một món (theo phần, hoặc theo gam món chín nếu đã cân) HOẶC một thực phẩm (theo gam phần ăn được).
const entryTargetShape = {
	meal: mealEnum,
	dishId: id.optional(),
	foodId: id.optional(),
	amount: z.number().positive('Lượng phải lớn hơn 0').max(5000),
	unit: entryUnitEnum,
	// "1 bát con" — chỉ để hiển thị; `amount` đã quy ra gam / phần.
	portionLabel: z.string().trim().max(60).nullable().optional(),
};

type EntryTarget = { dishId?: number; foodId?: number; unit: 'serving' | 'g' };
const oneTarget = (x: EntryTarget) => (x.dishId === undefined) !== (x.foodId === undefined);
const foodInGrams = (x: EntryTarget) => x.foodId === undefined || x.unit === 'g';
const TARGET_MSG = { message: 'Chọn đúng một món hoặc một thực phẩm' };
const GRAMS_MSG = { message: 'Thực phẩm ghi theo gam' };

export const menuItemInputSchema = z.object(entryTargetShape).refine(oneTarget, TARGET_MSG).refine(foodInGrams, GRAMS_MSG);

// `date` BẮT BUỘC từ client (giờ địa phương) — server không tự suy ra "hôm nay".
export const addMealEntrySchema = z
	.object({ date: dateStr, ...entryTargetShape })
	.refine(oneTarget, TARGET_MSG)
	.refine(foodInGrams, GRAMS_MSG);

// Đổi lượng ⇒ dinh dưỡng snapshot nhân theo tỉ lệ (không lấy lại từ thư viện).
export const updateMealEntrySchema = z
	.object({ meal: mealEnum.optional(), amount: entryTargetShape.amount.optional(), portionLabel: entryTargetShape.portionLabel })
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const mealLogQuerySchema = z.object({ date: dateStr });

export const applyMenuSchema = z.object({ date: dateStr, menuId: id });

const menuName = z.string().trim().min(1, 'Tên thực đơn không được rỗng').max(100);
// Rỗng được: tạo thực đơn trước, thêm món dần ở trang chi tiết.
const menuItems = z.array(menuItemInputSchema).max(60, 'Thực đơn tối đa 60 món');

export const createMenuSchema = z.object({
	name: menuName,
	description: z.string().max(2000).nullable().optional(),
	items: menuItems.default([]),
});

export const updateMenuSchema = z
	.object({
		name: menuName.optional(),
		description: z.string().max(2000).nullable().optional(),
		// Gửi lên ⇒ thay TOÀN BỘ danh sách món (thứ tự = thứ tự mảng).
		items: menuItems.optional(),
		isArchived: z.boolean().optional(),
	})
	.refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const menuQuerySchema = z.object({ includeArchived: optQuery(boolQuery) });

// Lưu những gì đã ăn trong một ngày thành thực đơn tái dùng.
export const menuFromDaySchema = z.object({ date: dateStr, name: menuName });

const optionalTarget = (max: number) => z.number().min(0).max(max).nullable().optional();

export const updateNutritionTargetsSchema = z.object({
	energyKcal: z.number().min(800, 'Tối thiểu 800 kcal').max(8000),
	proteinG: optionalTarget(500),
	fatG: optionalTarget(500),
	carbG: optionalTarget(1000),
	fiberG: optionalTarget(150),
	sodiumMg: optionalTarget(10000),
});
