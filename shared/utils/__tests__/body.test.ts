import { describe, expect, it } from 'vitest';
import { bmi, bmiClass, bmrMifflin, dailyTargets, healthyWeightRange, tdee, weeksToTarget } from '../body';
import { suggestDishes } from '../suggest';

// Ca kiểm chính: nam 30 tuổi, 167 cm, 74 kg, vận động vừa, giảm 0,5 kg / tuần.
const PROFILE = { sex: 'male' as const, weightKg: 74, heightCm: 167, age: 30 };

describe('BMI (ngưỡng châu Á — WHO WPRO 2000)', () => {
	it('74 kg / 1,67 m ≈ 26,5 ⇒ béo phì độ I theo ngưỡng châu Á (toàn cầu chỉ là thừa cân)', () => {
		const v = bmi(74, 167);
		expect(v).toBeCloseTo(26.53, 2);
		expect(bmiClass(v)).toBe('obese1');
	});

	it('ranh giới: 22,9 bình thường, 23 thừa cân, 25 béo phì I, 30 béo phì II, < 18,5 thiếu cân', () => {
		expect(bmiClass(18.4)).toBe('underweight');
		expect(bmiClass(22.9)).toBe('normal');
		expect(bmiClass(23)).toBe('overweight');
		expect(bmiClass(25)).toBe('obese1');
		expect(bmiClass(30)).toBe('obese2');
	});

	it('khoảng cân nặng bình thường cho 167 cm ≈ 51,6 – 63,9 kg', () => {
		const r = healthyWeightRange(167);
		expect(r.min).toBeCloseTo(51.6, 1);
		expect(r.max).toBeCloseTo(63.9, 1);
	});
});

describe('BMR / TDEE / mục tiêu', () => {
	it('Mifflin-St Jeor: nam = 10W + 6,25H − 5A + 5; nữ −161', () => {
		expect(bmrMifflin(PROFILE)).toBeCloseTo(1638.75);
		expect(bmrMifflin({ ...PROFILE, sex: 'female' })).toBeCloseTo(1472.75);
	});

	it('giảm 0,5 kg/tuần: TDEE × 1,55 − 550 kcal, đạm 1,8 g/kg, béo 27%, glucid phần còn lại', () => {
		const b = bmrMifflin(PROFILE);
		const t = dailyTargets({ sex: 'male', weightKg: 74, bmr: b, tdee: tdee(b, 'moderate'), goal: 'lose', goalRateKg: 0.5 });
		expect(tdee(b, 'moderate')).toBeCloseTo(2540.06, 1);
		expect(t.energyKcal).toBe(1990);
		expect(t.proteinG).toBe(133);
		expect(t.fatG).toBe(60);
		expect(t.carbG).toBe(230);
		expect(t.fiberG).toBe(28);
		expect(t.adjustKcal).toBe(-550);
		expect(t.floorApplied).toBe(false);
	});

	it('thâm hụt quá tay bị chặn ở sàn: không dưới BMR (và 1.500 kcal với nam)', () => {
		const b = bmrMifflin(PROFILE);
		const t = dailyTargets({ sex: 'male', weightKg: 74, bmr: b, tdee: tdee(b, 'sedentary'), goal: 'lose', goalRateKg: 1 });
		expect(t.floorApplied).toBe(true);
		expect(t.energyKcal).toBe(1640);
	});

	it('số tuần tới cân nặng mục tiêu', () => {
		expect(weeksToTarget(74, 65, 'lose', 0.5)).toBe(18);
		expect(weeksToTarget(74, 65, 'maintain', 0.5)).toBeNull();
		expect(weeksToTarget(64, 65, 'lose', 0.5)).toBe(0);
	});
});

describe('suggestDishes', () => {
	const dishes = [
		{ id: 1, name: 'Ức gà áp chảo', energyKcal: 226, proteinG: 33.8 },
		{ id: 2, name: 'Cơm rang trứng', energyKcal: 547, proteinG: 14.5 },
		{ id: 3, name: 'Bún chả', energyKcal: 549, proteinG: 21.9 },
		{ id: 4, name: 'Rau muống luộc', energyKcal: 25, proteinG: 3.2 },
		{ id: 5, name: 'Cháo trắng', energyKcal: 900, proteinG: 5 },
	];

	it('còn thiếu nhiều đạm ⇒ món giàu đạm lên đầu; món quá ngân sách bữa bị loại', () => {
		const out = suggestDishes(dishes, { kcal: 1200, proteinG: 60 });
		expect(out[0]!.id).toBe(1);
		expect(out[0]!.reasons[0]).toContain('Nhiều đạm');
		expect(out.map((s) => s.id)).not.toContain(5);
	});

	it('món đã ăn trong ngày xuống cuối để đổi món', () => {
		const out = suggestDishes(dishes, { kcal: 1200, proteinG: 60 }, 8, new Set([1]));
		expect(out[0]!.id).not.toBe(1);
		expect(out.at(-1)!.id).toBe(1);
	});

	it('gần chạm mục tiêu kcal ⇒ chỉ món nhẹ', () => {
		const out = suggestDishes(dishes, { kcal: 80, proteinG: 0 });
		expect(out.map((s) => s.id)).toEqual([4]);
		expect(out[0]!.reasons).toContain('Món nhẹ — sắp chạm mục tiêu kcal');
	});
});
