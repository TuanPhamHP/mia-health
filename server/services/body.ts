import * as repo from '../repositories/body';
import * as mealsSvc from './meals';
import { bmi, bmiClass, bmrMifflin, dailyTargets, healthyWeightRange, tdee, weeksToTarget } from '../../shared/utils/body';
import type { BodyMetricsDTO, UpdateBodyProfileInput } from '../../shared/types/body';
import type { BodyComputed, BodyProfileComputed } from '../types/body';
import type { NutritionTargetsComputed } from '../types/meals';

const WEIGHT_HISTORY = 60;

function metricsOf(profile: BodyProfileComputed, weight: { date: string; weightKg: number }, today: string): BodyMetricsDTO {
	const age = Number(today.slice(0, 4)) - profile.birthYear;
	const b = bmi(weight.weightKg, profile.heightCm);
	const bmr = bmrMifflin({ sex: profile.sex, weightKg: weight.weightKg, heightCm: profile.heightCm, age });
	const t = tdee(bmr, profile.activityLevel);
	const range = healthyWeightRange(profile.heightCm);
	return {
		age,
		weightKg: weight.weightKg,
		weightDate: weight.date,
		bmi: b,
		bmiClass: bmiClass(b),
		healthyMinKg: range.min,
		healthyMaxKg: range.max,
		bmr,
		tdee: t,
		targets: dailyTargets({ sex: profile.sex, weightKg: weight.weightKg, bmr, tdee: t, goal: profile.goal, goalRateKg: profile.goalRateKg }),
		weeksToTarget: weeksToTarget(weight.weightKg, profile.targetWeightKg, profile.goal, profile.goalRateKg),
	};
}

// `today` do client gửi — tuổi tính theo năm của người dùng, server không tự suy ra.
export async function getBody(today: string): Promise<BodyComputed> {
	const [row, weights] = await Promise.all([repo.getProfile(), repo.listWeights(WEIGHT_HISTORY)]);
	const profile = row ? (({ id: _, ...p }) => p)(row) : null;
	const latest = weights[0];
	return { profile, weights, metrics: profile && latest ? metricsOf(profile, latest, today) : null };
}

export async function setProfile(data: UpdateBodyProfileInput): Promise<BodyComputed> {
	const { today, ...fields } = data;
	await repo.upsertProfile({ ...fields, targetWeightKg: fields.targetWeightKg ?? null });
	return getBody(today);
}

export async function addWeight(data: { today: string; date: string; weightKg: number }): Promise<BodyComputed> {
	await repo.upsertWeight(data.date, data.weightKg);
	return getBody(data.today);
}

export async function removeWeight(id: number, today: string): Promise<BodyComputed> {
	if (!(await repo.getWeightById(id))) throw createError({ statusCode: 404, message: 'Lần cân không tồn tại' });
	await repo.removeWeight(id);
	return getBody(today);
}

/** Ghi mục tiêu tính từ chỉ số cơ thể thành mục tiêu dinh dưỡng của nhật ký ăn. */
export async function applyTargets(today: string): Promise<NutritionTargetsComputed> {
	const { metrics } = await getBody(today);
	if (!metrics) throw createError({ statusCode: 400, message: 'Cần nhập hồ sơ và ít nhất một lần cân trước' });
	const { energyKcal, proteinG, fatG, carbG, fiberG, sodiumMg } = metrics.targets;
	return mealsSvc.setTargets({ energyKcal, proteinG, fatG, carbG, fiberG, sodiumMg });
}
