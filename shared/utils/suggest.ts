// ---------------------------------------------------------------------------
// Gợi ý món cho phần còn lại trong ngày — pure function, có vitest. Không phải "AI": điểm =
// độ giàu đạm (năng lượng từ đạm / tổng) + độ vừa với ngân sách một bữa; còn thiếu nhiều đạm
// thì nghiêng về đạm, đủ đạm rồi thì nghiêng về vừa kcal.
// ---------------------------------------------------------------------------

export interface SuggestCandidate {
	id: number;
	name: string;
	energyKcal: number;
	proteinG: number | null;
}

export interface Suggestion {
	id: number;
	score: number;
	reasons: string[];
}

/** Ngân sách tối đa cho MỘT bữa — còn 1.500 kcal không có nghĩa nên ăn một món 1.500 kcal. */
export const MEAL_BUDGET_KCAL = 700;
/** Đạm chiếm ≥ 40% năng lượng coi như "rất giàu đạm" (ức gà, cá, whey…). */
const RICH_PROTEIN_SHARE = 0.4;
/** Gần chạm mục tiêu kcal: chỉ gợi ý món nhẹ. */
const LIGHT_KCAL = 150;

function fmt(n: number): string {
	return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n);
}

export function suggestDishes(
	candidates: readonly SuggestCandidate[],
	remaining: { kcal: number; proteinG: number | null },
	limit = 8,
	/** Món đã ăn trong ngày — xuống cuối (không loại hẳn) để gợi ý đổi món. */
	eatenIds: ReadonlySet<number> = new Set(),
): Suggestion[] {
	const light = remaining.kcal < LIGHT_KCAL;
	const budget = light ? LIGHT_KCAL : Math.min(remaining.kcal, MEAL_BUDGET_KCAL);
	// Còn thiếu > 10 g đạm (hoặc chưa đặt mục tiêu đạm) ⇒ ưu tiên đạm.
	const proteinWeight = remaining.proteinG === null || remaining.proteinG > 10 ? 0.6 : 0.25;

	// Món nhẹ: chặn cứng ở LIGHT_KCAL; bữa thường: cho lố ngân sách tối đa 100 kcal.
	const maxKcal = light ? LIGHT_KCAL : budget + 100;
	return candidates
		.filter((c) => c.energyKcal > 0 && c.energyKcal <= maxKcal)
		.map((c) => {
			const share = c.proteinG === null ? 0 : (c.proteinG * 4) / c.energyKcal;
			const density = Math.min(1, share / RICH_PROTEIN_SHARE);
			const fit = 1 - Math.min(1, Math.abs(c.energyKcal - budget) / budget);
			const score = proteinWeight * density + (1 - proteinWeight) * fit - (eatenIds.has(c.id) ? 1 : 0);
			const reasons: string[] = [];
			if (c.proteinG !== null && share >= 0.3) reasons.push(`Nhiều đạm: ${fmt(c.proteinG)} g`);
			// kcal đã hiện riêng cạnh tên món — lý do chỉ nói vì sao món được chọn.
			if (light) reasons.push('Món nhẹ — sắp chạm mục tiêu kcal');
			else if (fit >= 0.75) reasons.push('Vừa một bữa');
			return { id: c.id, score, reasons };
		})
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);
}
