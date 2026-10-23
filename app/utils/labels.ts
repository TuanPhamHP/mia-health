import type {
  ComboStyle,
  ExerciseCategory,
  ExerciseComponentDTO,
  ExerciseMode,
  ExerciseParams,
  SingleMode,
} from '#shared/types/exercises'
import type { ProgramGoal } from '#shared/types/programs'
import type { ProgramStatus } from '#shared/utils/program'
import type { PlanItem, Step } from '#shared/utils/timeline'
import { formatDate } from './format'

export const CATEGORY_ORDER: ExerciseCategory[] = [
  'kegel',
  'strength',
  'gymnastics',
  'stretching',
  'cardio',
  'breathing',
  'other',
]

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  kegel: 'Kegel',
  strength: 'Sức mạnh',
  gymnastics: 'Thể dục dụng cụ',
  stretching: 'Giãn cơ',
  cardio: 'Cardio',
  breathing: 'Hít thở',
  other: 'Khác',
}

export const CATEGORY_ICONS: Record<ExerciseCategory, string> = {
  kegel: 'i-heroicons-heart',
  strength: 'i-heroicons-bolt',
  gymnastics: 'i-heroicons-trophy',
  stretching: 'i-heroicons-arrows-pointing-out',
  cardio: 'i-heroicons-fire',
  breathing: 'i-heroicons-cloud',
  other: 'i-heroicons-squares-2x2',
}

/**
 * Lớp màu nhận diện nhóm (định nghĩa + lý do chọn ở main.css): set biến `--tone`, dùng kèm
 * `bg-(--tone)/15 text-(--tone)`. Luôn đi cùng icon/tên — không để màu gánh nghĩa một mình.
 */
export const CATEGORY_TONES: Record<ExerciseCategory, string> = {
  kegel: 'tone-kegel',
  strength: 'tone-strength',
  gymnastics: 'tone-gymnastics',
  stretching: 'tone-stretching',
  cardio: 'tone-cardio',
  breathing: 'tone-breathing',
  other: 'tone-other',
}

export const MODE_LABELS: Record<SingleMode, string> = {
  reps: 'Đếm số lần',
  hold: 'Giữ / thả theo nhịp',
  duration: 'Theo thời gian',
}

export const MODE_HINTS: Record<SingleMode, string> = {
  reps: 'Tự bấm "Xong set" sau mỗi set (hít đất, squat…)',
  hold: 'Tự động đếm nhịp siết – thả (kegel, hít thở)',
  duration: 'Đếm ngược mỗi set (plank, giãn cơ…)',
}

/** Icon bài kết hợp — dùng trong ternary nên phải khai ở nuxt.config `icon.clientBundle`. */
export const COMBO_ICON = 'i-heroicons-squares-plus'

export const COMBO_STYLE_LABELS: Record<ComboStyle, string> = {
  circuit: 'Luân phiên theo vòng',
  sequence: 'Lần lượt',
}

export const COMBO_STYLE_HINTS: Record<ComboStyle, string> = {
  circuit: 'Mỗi vòng tập 1 set từng bài, nghỉ giữa vòng rồi lặp lại (circuit)',
  sequence: 'Hết các set bài này mới sang bài kế — như các bài liền nhau trong giáo án',
}

/**
 * Tóm tắt thông số: "3 × 10 · giữ 5s / thả 5s · nghỉ 30s". `inCircuit` = bài con của bài
 * luân phiên: thông số một lượt (số vòng nằm ở bài kết hợp), nghỉ = nghỉ trước bài kế.
 */
export function describeParams(mode: SingleMode, p: ExerciseParams, inCircuit = false): string {
  const parts: string[] = []
  const sets = inCircuit ? '' : `${p.sets} × `
  if (mode === 'reps') parts.push(`${sets}${p.reps} lần`)
  else if (mode === 'duration') parts.push(`${sets}${p.durationSec}s`)
  else parts.push(inCircuit ? `${p.reps} lần` : `${p.sets} × ${p.reps}`, `giữ ${p.holdSec}s / thả ${p.relaxSec}s`)
  if ((inCircuit || p.sets > 1) && p.restSec > 0) parts.push(`nghỉ ${p.restSec}s`)
  return parts.join(' · ')
}

/** "Luân phiên · 3 vòng · nghỉ 60s · 3 bài" / "Lần lượt · 3 bài" */
export function describeCombo(style: ComboStyle, p: Pick<ExerciseParams, 'sets' | 'restSec'>, count: number): string {
  const parts = [style === 'circuit' ? 'Luân phiên' : 'Lần lượt']
  if (style === 'circuit') {
    parts.push(`${p.sets} vòng`)
    if (p.sets > 1 && p.restSec > 0) parts.push(`nghỉ ${p.restSec}s`)
  }
  parts.push(`${count} bài`)
  return parts.join(' · ')
}

/** Bài đơn hoặc bài kết hợp, với thông số `p` của thư viện / item giáo án. */
export function describeExercise(
  ex: { mode: ExerciseMode; comboStyle: ComboStyle; components: readonly unknown[] },
  p: ExerciseParams,
): string {
  return ex.mode === 'combo' ? describeCombo(ex.comboStyle, p, ex.components.length) : describeParams(ex.mode, p)
}

/** "Plank → Gập bụng → Cầu mông" */
export function describeComponents(components: readonly ExerciseComponentDTO[]): string {
  return components.map((c) => c.exercise.name).join(' → ')
}

/** Nhãn to trên màn hình tập. Nhóm hít thở dùng "Hít vào / Thở ra" thay cho "Siết / Thả". */
export function stepLabel(step: Step, item: PlanItem): string {
  const breathing = item.category === 'breathing'
  switch (step.kind) {
    case 'prep':
      return 'Chuẩn bị'
    case 'rest':
      return 'Nghỉ'
    case 'hold':
      return breathing ? 'Hít vào' : 'Siết'
    case 'relax':
      return breathing ? 'Thở ra' : 'Thả lỏng'
    case 'work':
      return item.mode === 'reps' ? `${item.reps} lần` : 'Tập'
  }
}

/** Màu nền vòng đếm theo loại bước. */
export const STEP_TONES: Record<Step['kind'], string> = {
  prep: 'text-amber-500',
  work: 'text-(--ui-primary)',
  hold: 'text-rose-500',
  relax: 'text-emerald-500',
  rest: 'text-indigo-400',
}

export const FEELING_OPTIONS = [
  { value: 1, emoji: '😫', label: 'Rất mệt' },
  { value: 2, emoji: '😕', label: 'Hơi mệt' },
  { value: 3, emoji: '🙂', label: 'Bình thường' },
  { value: 4, emoji: '😊', label: 'Tốt' },
  { value: 5, emoji: '🤩', label: 'Tuyệt vời' },
] as const

export function feelingEmoji(v: number | null): string {
  return FEELING_OPTIONS.find((o) => o.value === v)?.emoji ?? ''
}

// ---------------------------------------------------------------------------
// Mục tiêu chương trình
// ---------------------------------------------------------------------------

export const GOAL_ORDER: ProgramGoal[] = ['fat_loss', 'muscle', 'health', 'rehab', 'pelvic', 'mobility', 'other']

export const GOAL_LABELS: Record<ProgramGoal, string> = {
  fat_loss: 'Giảm mỡ',
  muscle: 'Tăng cơ',
  health: 'Sức khoẻ chung',
  rehab: 'Phục hồi · vật lý trị liệu',
  pelvic: 'Sàn chậu & sinh lý',
  mobility: 'Dẻo dai',
  other: 'Khác',
}

/** Chọn động qua map ⇒ phải khai ở nuxt.config `icon.clientBundle`. */
export const GOAL_ICONS: Record<ProgramGoal, string> = {
  fat_loss: 'i-heroicons-fire',
  muscle: 'i-heroicons-bolt',
  health: 'i-heroicons-shield-check',
  rehab: 'i-heroicons-lifebuoy',
  pelvic: 'i-heroicons-heart',
  mobility: 'i-heroicons-arrows-pointing-out',
  other: 'i-heroicons-flag',
}

/**
 * Mục tiêu mượn lớp màu của nhóm bài gần nghĩa nhất — không thêm màu mới vào bảng đã qua
 * validator dataviz. Như nhóm bài: luôn đi cùng icon + tên, màu không gánh nghĩa một mình.
 */
export const GOAL_TONES: Record<ProgramGoal, string> = {
  fat_loss: 'tone-cardio',
  muscle: 'tone-strength',
  health: 'tone-gymnastics',
  rehab: 'tone-breathing',
  pelvic: 'tone-kegel',
  mobility: 'tone-stretching',
  other: 'tone-other',
}

/** "Tuần 3/8" · "Tuần 2/26 · vòng 2" · "Lặp mỗi tuần" · "Bắt đầu 26/10/2026" · "Hoàn thành 13/12/2026" */
export function describeProgramStatus(status: ProgramStatus): string {
  switch (status.kind) {
    case 'idle':
      return 'Chưa theo'
    case 'upcoming':
      return `Bắt đầu ${formatDate(status.startDate)}`
    case 'finished':
      return `Hoàn thành ${formatDate(status.endDate)}`
    case 'active':
      if (status.totalWeeks === 1) return 'Lặp mỗi tuần'
      return `Tuần ${status.week}/${status.totalWeeks}${status.cycle > 1 ? ` · vòng ${status.cycle}` : ''}`
  }
}
