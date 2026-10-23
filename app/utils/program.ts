import type { ProgramDetailDTO, ProgramSlotDTO } from '#shared/types/programs'
import { programStatus } from '#shared/utils/program'

/** Mask T2…CN (bit isoDay − 1) của các ngày có buổi — cho WeekdayPills. */
export function slotsMask(slots: readonly ProgramSlotDTO[]): number {
  return slots.reduce((mask, s) => mask | (1 << (s.weekday - 1)), 0)
}

/** Khối lượng một tuần của giai đoạn: số buổi + tổng thời lượng ước tính. */
export function weekLoad(slots: readonly ProgramSlotDTO[]): { sessions: number; sec: number } {
  return { sessions: slots.length, sec: slots.reduce((sum, s) => sum + s.routine.estimatedSec, 0) }
}

/** Giai đoạn đang chạy vào `today`; chưa / hết theo thì giai đoạn đầu — để tóm tắt ở danh sách. */
export function focusPhaseIndex(program: ProgramDetailDTO, today: string): number {
  const status = programStatus(program, today)
  return status.kind === 'active' ? status.phaseIndex : 0
}
