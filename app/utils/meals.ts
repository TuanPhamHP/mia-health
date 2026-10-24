import type { EntryUnit, Meal } from '#shared/types/meals'
import { formatAmount } from './foods'

export const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  dinner: 'Bữa tối',
  snack: 'Bữa phụ',
}

/** "1 phần" · "1,5 phần" · "1 bát con · 150 g" · "225 g" */
export function amountLabel(e: { amount: number; unit: EntryUnit; portionLabel: string | null }): string {
  const base = e.unit === 'serving' ? `${formatAmount(e.amount)} phần` : `${formatAmount(e.amount)} g`
  return e.portionLabel ? `${e.portionLabel} · ${base}` : base
}

/** Bữa mặc định theo giờ hiện tại — mở nhanh đúng bữa khi bấm thêm. */
export function mealForNow(d: Date = new Date()): Meal {
  const h = d.getHours()
  if (h < 10) return 'breakfast'
  if (h < 14) return 'lunch'
  if (h < 17) return 'snack'
  return 'dinner'
}
