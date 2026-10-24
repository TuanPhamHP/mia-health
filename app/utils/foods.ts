import type { FoodCategoryNodeDTO, FoodSource } from '#shared/types/foods'

export const FOOD_SOURCE_SHORT: Record<FoodSource, string> = {
  vn_fct_2007: 'VN',
  usda_sr_legacy: 'USDA',
  user: 'Tự thêm',
}

export const FOOD_SOURCE_LABELS: Record<FoodSource, string> = {
  vn_fct_2007: 'Bảng thành phần thực phẩm Việt Nam 2007 (Viện Dinh dưỡng)',
  usda_sr_legacy: 'USDA FoodData Central — SR Legacy',
  user: 'Tự nhập',
}

/** Nhãn mã gốc để tra lại bảng nguồn: "mã 7013" / "FDC 171077". */
export function sourceCodeLabel(source: FoodSource, code: string | null): string | null {
  if (!code) return null
  return source === 'usda_sr_legacy' ? `FDC ${code}` : `mã ${code}`
}

/** Làm tròn theo độ lớn: 254 · 22,5 · 3,93 · 0,04 — số liệu đo có sai số, không hiện quá nhiều chữ số. */
export function formatAmount(v: number): string {
  const abs = Math.abs(v)
  const digits = abs >= 100 ? 0 : abs >= 1 ? 1 : 2
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(v)
}

/** "Thịt › Gà" cho ô chọn nhóm — nhóm gốc đứng trước các loại con của nó. */
export function flattenCategories(tree: readonly FoodCategoryNodeDTO[]): { label: string; value: number }[] {
  return tree.flatMap((top) => [
    { label: top.name, value: top.id },
    ...top.children.map((c) => ({ label: `${top.name} › ${c.name}`, value: c.id })),
  ])
}

/** Số thực phẩm của cả nhánh (nhóm gốc + các loại con). */
export function branchCount(node: FoodCategoryNodeDTO): number {
  return node.foodCount + node.children.reduce((sum, c) => sum + c.foodCount, 0)
}
