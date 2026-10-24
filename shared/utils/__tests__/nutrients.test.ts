import { describe, expect, it } from 'vitest';
import { NUTRIENT_KEYS, NUTRIENTS, scaleNutrients, sumNutrients } from '../nutrients';
import type { NutrientValues } from '../nutrients';
import { foldText } from '../text';

function values(over: Partial<NutrientValues>): NutrientValues {
	const base = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])) as unknown as NutrientValues;
	return { ...base, energyKcal: 0, ...over };
}

describe('scaleNutrients', () => {
	it('quy theo số gam phần ăn được', () => {
		const out = scaleNutrients(values({ energyKcal: 120, proteinG: 22.5, fatG: 2.62 }), 150);
		expect(out.energyKcal).toBeCloseTo(180);
		expect(out.proteinG).toBeCloseTo(33.75);
		expect(out.fatG).toBeCloseTo(3.93);
	});

	it('không có số liệu (null) vẫn là null — không biến thành 0', () => {
		expect(scaleNutrients(values({ energyKcal: 50 }), 200).sugarG).toBeNull();
	});
});

describe('sumNutrients', () => {
	it('cộng các phần; chất có phần thiếu số liệu ⇒ cộng phần biết được + đánh dấu missing', () => {
		const total = sumNutrients([values({ energyKcal: 100, proteinG: 10, sodiumMg: 50 }), values({ energyKcal: 30, proteinG: 2 })]);
		expect(total.values.energyKcal).toBe(130);
		expect(total.values.proteinG).toBe(12);
		expect(total.values.sodiumMg).toBe(50);
		expect(total.missing).toEqual(['sodiumMg']);
	});

	it('mọi phần đều thiếu ⇒ null, không tính là missing; không có phần nào ⇒ 0 kcal', () => {
		const total = sumNutrients([values({ energyKcal: 10 }), values({ energyKcal: 20 })]);
		expect(total.values.vitaminCMg).toBeNull();
		expect(total.missing).toEqual([]);
		expect(sumNutrients([]).values.energyKcal).toBe(0);
	});
});

describe('NUTRIENTS', () => {
	it('khoá không trùng, năng lượng đứng đầu', () => {
		expect(new Set(NUTRIENT_KEYS).size).toBe(NUTRIENTS.length);
		expect(NUTRIENT_KEYS[0]).toBe('energyKcal');
	});
});

describe('foldText', () => {
	it('bỏ dấu, đ → d, hạ chữ', () => {
		expect(foldText('Ức gà không da')).toBe('uc ga khong da');
		expect(foldText('Đậu phụ')).toBe('dau phu');
	});
});
