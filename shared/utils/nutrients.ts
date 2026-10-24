// ---------------------------------------------------------------------------
// Danh mục chất dinh dưỡng — một nguồn duy nhất cho zod, form, nhãn "Nutrition facts" và phép
// cộng / quy đổi theo khối lượng. Thứ tự = thứ tự hiển thị, khớp cột ở server/database/schema.ts.
// ---------------------------------------------------------------------------

export type NutrientGroup = 'energy' | 'macro' | 'mineral' | 'vitamin';
export type NutrientUnit = 'kcal' | 'g' | 'mg' | 'µg';

export interface NutrientDef {
	key: string;
	label: string;
	unit: NutrientUnit;
	group: NutrientGroup;
	/** Dòng con (thụt vào) của dòng trên — béo bão hoà dưới chất béo… */
	sub?: boolean;
	/**
	 * Giá trị tham chiếu hằng ngày cho người lớn, khẩu phần 2.000 kcal (FDA 21 CFR 101.9, bản
	 * 2016) — chỉ để hiện %DV trên nhãn; mục tiêu riêng theo TDEE tính ở phần chỉ số cơ thể.
	 * Không có ⇒ không hiện %DV.
	 */
	dv?: number;
}

export const NUTRIENTS = [
	{ key: 'energyKcal', label: 'Năng lượng', unit: 'kcal', group: 'energy' },
	{ key: 'proteinG', label: 'Chất đạm (protein)', unit: 'g', group: 'macro', dv: 50 },
	{ key: 'fatG', label: 'Chất béo (lipid)', unit: 'g', group: 'macro', dv: 78 },
	{ key: 'satFatG', label: 'Béo bão hoà', unit: 'g', group: 'macro', sub: true, dv: 20 },
	{ key: 'monoFatG', label: 'Béo không no 1 nối đôi', unit: 'g', group: 'macro', sub: true },
	{ key: 'polyFatG', label: 'Béo không no nhiều nối đôi', unit: 'g', group: 'macro', sub: true },
	{ key: 'transFatG', label: 'Béo chuyển hoá (trans)', unit: 'g', group: 'macro', sub: true },
	{ key: 'cholesterolMg', label: 'Cholesterol', unit: 'mg', group: 'macro', dv: 300 },
	// Không gồm xơ (chuẩn Codex, như bảng VN) ⇒ không so được với DV 275 g "total carbohydrate" của FDA.
	{ key: 'carbG', label: 'Glucid (carb, không gồm xơ)', unit: 'g', group: 'macro' },
	{ key: 'fiberG', label: 'Chất xơ', unit: 'g', group: 'macro', sub: true, dv: 28 },
	{ key: 'sugarG', label: 'Đường', unit: 'g', group: 'macro', sub: true },
	{ key: 'waterG', label: 'Nước', unit: 'g', group: 'macro' },
	{ key: 'sodiumMg', label: 'Natri (sodium)', unit: 'mg', group: 'mineral', dv: 2300 },
	{ key: 'potassiumMg', label: 'Kali', unit: 'mg', group: 'mineral', dv: 4700 },
	{ key: 'calciumMg', label: 'Canxi', unit: 'mg', group: 'mineral', dv: 1300 },
	{ key: 'phosphorusMg', label: 'Phospho', unit: 'mg', group: 'mineral', dv: 1250 },
	{ key: 'magnesiumMg', label: 'Magiê', unit: 'mg', group: 'mineral', dv: 420 },
	{ key: 'ironMg', label: 'Sắt', unit: 'mg', group: 'mineral', dv: 18 },
	{ key: 'zincMg', label: 'Kẽm', unit: 'mg', group: 'mineral', dv: 11 },
	{ key: 'vitaminAUg', label: 'Vitamin A (RAE)', unit: 'µg', group: 'vitamin', dv: 900 },
	{ key: 'vitaminB1Mg', label: 'Vitamin B1', unit: 'mg', group: 'vitamin', dv: 1.2 },
	{ key: 'vitaminB2Mg', label: 'Vitamin B2', unit: 'mg', group: 'vitamin', dv: 1.3 },
	{ key: 'niacinMg', label: 'Vitamin B3 (PP)', unit: 'mg', group: 'vitamin', dv: 16 },
	{ key: 'vitaminB6Mg', label: 'Vitamin B6', unit: 'mg', group: 'vitamin', dv: 1.7 },
	{ key: 'folateUg', label: 'Folat (B9)', unit: 'µg', group: 'vitamin', dv: 400 },
	{ key: 'vitaminB12Ug', label: 'Vitamin B12', unit: 'µg', group: 'vitamin', dv: 2.4 },
	{ key: 'vitaminCMg', label: 'Vitamin C', unit: 'mg', group: 'vitamin', dv: 90 },
	{ key: 'vitaminDUg', label: 'Vitamin D', unit: 'µg', group: 'vitamin', dv: 20 },
	{ key: 'vitaminEMg', label: 'Vitamin E', unit: 'mg', group: 'vitamin', dv: 15 },
] as const satisfies readonly NutrientDef[];

export type NutrientKey = (typeof NUTRIENTS)[number]['key'];

export const NUTRIENT_KEYS = NUTRIENTS.map((n) => n.key) as NutrientKey[];

/** Số liệu trên 100 g phần ăn được. null = nguồn không có số liệu (khác 0). */
export type NutrientValues = { energyKcal: number } & { [K in Exclude<NutrientKey, 'energyKcal'>]: number | null };

/** Giá trị cho `grams` gam phần ăn được — null giữ nguyên null (không biết thì vẫn không biết). */
export function scaleNutrients(per100g: NutrientValues, grams: number): NutrientValues {
	const factor = grams / 100;
	const out = { ...per100g };
	for (const key of NUTRIENT_KEYS) {
		const v = per100g[key];
		(out as Record<NutrientKey, number | null>)[key] = v === null ? null : v * factor;
	}
	return out;
}
