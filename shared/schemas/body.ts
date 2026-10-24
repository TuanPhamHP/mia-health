import { z } from 'zod';
import { dateStr } from './common';

export const sexEnum = z.enum(['male', 'female']);
export const activityLevelEnum = z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']);
export const weightGoalEnum = z.enum(['lose', 'maintain', 'gain']);

// `today` BẮT BUỘC từ client: tuổi + chỉ số tính theo ngày của người dùng, server không tự suy ra.
export const bodyQuerySchema = z.object({ today: dateStr });

export const updateBodyProfileSchema = z.object({
	today: dateStr,
	sex: sexEnum,
	birthYear: z.number().int().min(1920).max(2015),
	heightCm: z.number().min(100, 'Chiều cao 100–250 cm').max(250, 'Chiều cao 100–250 cm'),
	activityLevel: activityLevelEnum,
	goal: weightGoalEnum,
	// Giảm / tăng quá 1 kg mỗi tuần không bền và mất cơ.
	goalRateKg: z.number().min(0).max(1, 'Tối đa 1 kg / tuần'),
	targetWeightKg: z.number().min(30).max(300).nullable().optional(),
});

// Mỗi ngày một lần cân — cân lại trong ngày thì ghi đè.
export const addBodyWeightSchema = z.object({
	today: dateStr,
	date: dateStr,
	weightKg: z.number().min(25, 'Cân nặng 25–300 kg').max(300, 'Cân nặng 25–300 kg'),
});

export const applyBodyTargetsSchema = z.object({ today: dateStr });

export const suggestionsQuerySchema = z.object({ date: dateStr });
