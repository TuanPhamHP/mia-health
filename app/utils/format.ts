/** "2026-10-23" → "23/10/2026" */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

const WEEKDAY_LONG = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'] as const

/** ISO weekday 1–7 → "Thứ 2" … "Chủ nhật" */
export function weekdayLabel(isoDay: number): string {
  return WEEKDAY_LONG[isoDay - 1] ?? ''
}

/** 754 → "12:34" (đồng hồ đếm ngược); ≥ 1 giờ → "1:02:34" */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mmss = `${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`
  return h > 0 ? `${h}:${mmss}` : mmss
}

/** 754 → "12 phút"; 45 → "45 giây"; 3900 → "1 giờ 5 phút" */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  if (s < 60) return `${s} giây`
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  if (h === 0) return `${m} phút`
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`
}

/** Dạng gọn cho ô thống kê hẹp: 754 → "13 phút"; 38580 → "10,7 giờ" */
export function formatDurationShort(totalSec: number): string {
  const min = Math.round(Math.max(0, totalSec) / 60)
  if (min < 60) return `${min} phút`
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(min / 60)} giờ`
}

// Dùng chung server (tìm thực phẩm) + client — định nghĩa ở shared.
export { foldText } from '#shared/utils/text'
