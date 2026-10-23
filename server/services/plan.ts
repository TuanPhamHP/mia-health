import * as repo from '../repositories/plan';
import * as programsSvc from './programs';
import * as routinesSvc from './routines';
import * as sessionsSvc from './sessions';
import { isoWeekday } from '../../shared/utils/date';
import { applyDayChanges, programStatus } from '../../shared/utils/program';
import type { Routine } from '../database/schema';
import type { PlanChangeInput, PlanEntryDTO, PlanProgramDTO } from '../../shared/types/plan';
import type { DayEntry } from '../../shared/utils/program';
import type { TodayPlanComputed } from '../types/plan';
import type { ProgramDetailComputed } from '../types/programs';

// Module không có bảng chương trình riêng — đọc chương trình / giáo án qua service của module
// sở hữu, chỉ ghi bảng plan_changes của mình.

/** Buổi theo lịch của chương trình vào ngày `date`, trước khi áp thay đổi trong ngày. */
function plannedIds(program: ProgramDetailComputed, date: string): number[] {
	const status = programStatus(program, date);
	if (status.kind !== 'active') return [];
	const weekday = isoWeekday(date);
	return program.phases[status.phaseIndex]!.slots.filter((s) => s.weekday === weekday).map((s) => s.routineId);
}

type Following = ProgramDetailComputed & { startDate: string };

// `date` do client gửi (giờ địa phương) — server không tự suy ra "hôm nay".
export async function getTodayPlan(date: string): Promise<TodayPlanComputed> {
	const [programs, changes, sessions] = await Promise.all([
		programsSvc.listPrograms(),
		repo.listChanges(date),
		sessionsSvc.listSessions({ from: date, to: date }),
	]);
	const following = programs.filter((p): p is Following => p.startDate !== null);
	const entriesByProgram = new Map(
		following.map((p) => [p.id, applyDayChanges(plannedIds(p, date), changes.filter((c) => c.programId === p.id))]),
	);
	const adds = changes.filter((c) => c.kind === 'add');

	const routineIds = [...entriesByProgram.values()].flatMap((es) => es.flatMap((e) => [e.routineId, e.replacesId ?? e.routineId]));
	const routines = await routinesSvc.summariesByIds([...routineIds, ...adds.map((c) => c.routineId)]);
	const done = new Map<number, number>();
	for (const s of sessions) if (s.routineId !== null) done.set(s.routineId, (done.get(s.routineId) ?? 0) + 1);

	const toEntries = (list: DayEntry[]): PlanEntryDTO[] =>
		list.flatMap((e) => {
			const r = routines.get(e.routineId);
			if (!r) return [];
			const replaced = e.replacesId === null ? undefined : routines.get(e.replacesId);
			return [
				{
					routine: {
						id: r.id,
						name: r.name,
						description: r.description,
						itemCount: r.itemCount,
						estimatedSec: r.estimatedSec,
						previews: r.previews,
					},
					skipped: e.skipped,
					replaces: replaced ? { id: replaced.id, name: replaced.name } : null,
					changeId: e.changeId,
					doneCount: done.get(r.id) ?? 0,
				},
			];
		});

	return {
		date,
		weekday: isoWeekday(date),
		programs: following.map((p): PlanProgramDTO => {
			const status = programStatus(p, date);
			const phase = status.kind === 'active' ? p.phases[status.phaseIndex]! : null;
			return {
				id: p.id,
				name: p.name,
				goal: p.goal,
				description: p.description,
				startDate: p.startDate,
				repeat: p.repeat,
				status,
				phase: phase ? { name: phase.name, note: phase.note, weeks: phase.weeks } : null,
				entries: toEntries(entriesByProgram.get(p.id) ?? []),
			};
		}),
		idlePrograms: programs.filter((p) => p.startDate === null).map(({ id, name, goal }) => ({ id, name, goal })),
		extras: toEntries(adds.map((c) => ({ routineId: c.routineId, skipped: false, replacesId: null, changeId: c.id }))),
		sessions,
	};
}

function assertPlayable(routine: Routine | undefined): Routine {
	if (!routine) throw createError({ statusCode: 400, message: 'Giáo án không tồn tại' });
	if (routine.isArchived) {
		throw createError({ statusCode: 400, message: `Giáo án "${routine.name}" đã lưu trữ — khôi phục trước khi chọn` });
	}
	return routine;
}

// Chỉ áp cho `date`; lịch lâu dài vẫn nằm nguyên ở chương trình. Trả lịch ngày mới nhất.
export async function addChange(input: PlanChangeInput): Promise<TodayPlanComputed> {
	const ids = input.kind === 'swap' ? [input.routineId, input.replacementId] : [input.routineId];
	const found = new Map((await routinesSvc.findRoutines(ids)).map((r) => [r.id, r]));

	if (input.kind === 'add') {
		assertPlayable(found.get(input.routineId));
		const already = (await repo.listChanges(input.date)).some((c) => c.kind === 'add' && c.routineId === input.routineId);
		if (!already) {
			await repo.createChange({ date: input.date, kind: 'add', programId: null, routineId: input.routineId, replacementId: null });
		}
		return getTodayPlan(input.date);
	}

	const routine = found.get(input.routineId);
	if (!routine) throw createError({ statusCode: 400, message: 'Giáo án không tồn tại' });
	const program = await programsSvc.getProgram(input.programId);
	if (!plannedIds(program, input.date).includes(input.routineId)) {
		throw createError({ statusCode: 400, message: `"${routine.name}" không có trong lịch của "${program.name}" ngày này` });
	}
	let replacementId: number | null = null;
	if (input.kind === 'swap') {
		if (input.replacementId === input.routineId) {
			throw createError({ statusCode: 400, message: 'Chọn một giáo án khác để đổi' });
		}
		replacementId = assertPlayable(found.get(input.replacementId)).id;
	}
	await repo.replaceProgramChange({
		date: input.date,
		kind: input.kind,
		programId: input.programId,
		routineId: input.routineId,
		replacementId,
	});
	return getTodayPlan(input.date);
}

/** Hoàn tác một thay đổi trong ngày — trả lịch của đúng ngày đó. */
export async function removeChange(id: number): Promise<TodayPlanComputed> {
	const change = await repo.getChangeById(id);
	if (!change) throw createError({ statusCode: 404, message: 'Thay đổi không tồn tại' });
	await repo.removeChange(id);
	return getTodayPlan(change.date);
}
