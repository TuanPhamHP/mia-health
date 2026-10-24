import type { DishCategory } from '#shared/types/dishes'

export const DISH_CATEGORY_ORDER: DishCategory[] = ['main', 'veg', 'soup', 'noodle', 'rice', 'snack', 'drink', 'other']

export const DISH_CATEGORY_LABELS: Record<DishCategory, string> = {
  main: 'Món mặn',
  veg: 'Rau',
  soup: 'Canh',
  noodle: 'Bún, phở, miến',
  rice: 'Cơm, xôi, cháo',
  snack: 'Bánh & ăn vặt',
  drink: 'Đồ uống',
  other: 'Khác',
}

/** Ảnh dự phòng khi món chưa có ảnh (kể cả mượn từ nguyên liệu) — luôn đi kèm tên món. */
export const DISH_CATEGORY_EMOJI: Record<DishCategory, string> = {
  main: '🥘',
  veg: '🥬',
  soup: '🍲',
  noodle: '🍜',
  rice: '🍚',
  snack: '🥪',
  drink: '🥤',
  other: '🍽️',
}
