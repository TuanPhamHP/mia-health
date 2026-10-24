import type { ActivityLevel, BmiClass, WeightGoal } from '#shared/utils/body'

/** Mô tả theo tổng vận động cả ngày (công việc + tập), không chỉ số buổi tập — hệ số dễ bị chọn cao quá. */
export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentary: { label: 'Ít vận động', hint: 'Ngồi nhiều, gần như không tập (× 1,2)' },
  light: { label: 'Nhẹ', hint: 'Ngồi nhiều + đi bộ / tập nhẹ ~30 phút hầu hết các ngày (× 1,375)' },
  moderate: { label: 'Vừa', hint: 'Tập vừa–nặng 30–60 phút gần như mỗi ngày, hoặc việc phải đi lại nhiều (× 1,55)' },
  active: { label: 'Nhiều', hint: 'Tập nặng trên 1 giờ mỗi ngày, hoặc lao động chân tay (× 1,725)' },
  very_active: { label: 'Rất nhiều', hint: 'Vận động viên, hoặc lao động nặng kèm tập luyện (× 1,9)' },
}

export const GOAL_WEIGHT_LABELS: Record<WeightGoal, string> = {
  lose: 'Giảm cân',
  maintain: 'Giữ cân',
  gain: 'Tăng cân',
}

/** Ngưỡng cho người châu Á (WHO WPRO 2000) — Bộ Y tế VN đang dùng. */
export const BMI_CLASS_LABELS: Record<BmiClass, string> = {
  underweight: 'Thiếu cân',
  normal: 'Bình thường',
  overweight: 'Thừa cân',
  obese1: 'Béo phì độ I',
  obese2: 'Béo phì độ II',
}
