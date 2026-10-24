// ---------------------------------------------------------------------------
// Chỉ số cơ thể — pure function, có vitest. Nguồn công thức:
//   BMI phân loại   — WHO Western Pacific Region / IASO / IOTF (2000), "The Asia-Pacific
//                     perspective": ngưỡng cho người châu Á, Bộ Y tế Việt Nam đang dùng
//                     (thừa cân từ 23, béo phì từ 25) — thấp hơn ngưỡng toàn cầu 25 / 30.
//   BMR             — Mifflin-St Jeor (1990), chính xác nhất cho người lớn khoẻ mạnh theo
//                     tổng quan của ADA (Frankenfield 2005).
//   TDEE            — BMR × hệ số vận động (1,2 · 1,375 · 1,55 · 1,725 · 1,9).
//   Thâm hụt / dư   — ~7.700 kcal ≈ 1 kg mô mỡ.
//   Đạm             — 1,6–2,2 g/kg khi tập sức mạnh (ISSN 2017; Morton 2018: lợi ích chững ở
//                     ~1,6 g/kg) — giảm cân lấy 1,8 g/kg để giữ cơ khi ăn thâm hụt.
//   Xơ              — 14 g / 1.000 kcal (IOM).
// ---------------------------------------------------------------------------

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WeightGoal = 'lose' | 'maintain' | 'gain';
export type BmiClass = 'underweight' | 'normal' | 'overweight' | 'obese1' | 'obese2';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
	sedentary: 1.2,
	light: 1.375,
	moderate: 1.55,
	active: 1.725,
	very_active: 1.9,
};

export const KCAL_PER_KG = 7700;

/** Ngưỡng BMI cho người châu Á (WHO WPRO 2000): bình thường 18,5–22,9. */
const ASIA_BMI = { normalMin: 18.5, overweight: 23, obese1: 25, obese2: 30 };

export function bmi(weightKg: number, heightCm: number): number {
	const m = heightCm / 100;
	return weightKg / (m * m);
}

export function bmiClass(value: number): BmiClass {
	if (value < ASIA_BMI.normalMin) return 'underweight';
	if (value < ASIA_BMI.overweight) return 'normal';
	if (value < ASIA_BMI.obese1) return 'overweight';
	if (value < ASIA_BMI.obese2) return 'obese1';
	return 'obese2';
}

/** Khoảng cân nặng có BMI bình thường (18,5 – < 23) theo chiều cao. */
export function healthyWeightRange(heightCm: number): { min: number; max: number } {
	const m2 = (heightCm / 100) ** 2;
	return { min: ASIA_BMI.normalMin * m2, max: (ASIA_BMI.overweight - 0.1) * m2 };
}

export function bmrMifflin(p: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
	return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
}

export function tdee(bmr: number, activity: ActivityLevel): number {
	return bmr * ACTIVITY_FACTORS[activity];
}

export interface DailyTargets {
	energyKcal: number;
	proteinG: number;
	fatG: number;
	carbG: number;
	fiberG: number;
	sodiumMg: number;
	/** kcal cộng (+) / trừ (−) so với TDEE theo mục tiêu. */
	adjustKcal: number;
	/** Thâm hụt bị chặn ở mức sàn (không ăn dưới BMR / 1.500 kcal nam / 1.200 kcal nữ). */
	floorApplied: boolean;
}

const PROTEIN_PER_KG: Record<WeightGoal, number> = { lose: 1.8, maintain: 1.6, gain: 1.8 };
const FAT_SHARE = 0.27; // 27% năng lượng — trong khoảng 20–35% khuyến nghị
const SODIUM_MAX_MG = 2000; // WHO: < 5 g muối / ngày

export function dailyTargets(p: {
	sex: Sex;
	weightKg: number;
	bmr: number;
	tdee: number;
	goal: WeightGoal;
	goalRateKg: number;
}): DailyTargets {
	const sign = p.goal === 'lose' ? -1 : p.goal === 'gain' ? 1 : 0;
	const adjust = (sign * p.goalRateKg * KCAL_PER_KG) / 7;
	const floor = Math.max(p.bmr, p.sex === 'male' ? 1500 : 1200);
	const raw = p.tdee + adjust;
	const floorApplied = p.goal === 'lose' && raw < floor;
	const energyKcal = Math.round((floorApplied ? floor : raw) / 10) * 10;
	const proteinG = Math.round(PROTEIN_PER_KG[p.goal] * p.weightKg);
	const fatG = Math.round((energyKcal * FAT_SHARE) / 9);
	const carbG = Math.max(0, Math.round((energyKcal - proteinG * 4 - fatG * 9) / 4));
	return {
		energyKcal,
		proteinG,
		fatG,
		carbG,
		fiberG: Math.round((energyKcal / 1000) * 14),
		sodiumMg: SODIUM_MAX_MG,
		adjustKcal: Math.round(energyKcal - p.tdee),
		floorApplied,
	};
}

/** Số tuần ước tính để tới cân nặng mục tiêu với tốc độ đã chọn; null nếu không áp dụng. */
export function weeksToTarget(weightKg: number, targetWeightKg: number | null, goal: WeightGoal, rateKg: number): number | null {
	if (targetWeightKg === null || goal === 'maintain' || rateKg <= 0) return null;
	const diff = goal === 'lose' ? weightKg - targetWeightKg : targetWeightKg - weightKg;
	return diff > 0 ? Math.ceil(diff / rateKg) : 0;
}
