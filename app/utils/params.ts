import type { ExerciseParams } from '#shared/types/exercises';

/** Chỉ lấy 6 trường thông số từ bài / item / bài con — tránh mang cả id, tên… vào form. */
export function pickParams(src: ExerciseParams): ExerciseParams {
	return {
		sets: src.sets,
		reps: src.reps,
		holdSec: src.holdSec,
		relaxSec: src.relaxSec,
		durationSec: src.durationSec,
		restSec: src.restSec,
	};
}

/** UInputNumber trả null khi ô bị xoá trắng — rơi về giá trị nhỏ nhất hợp lệ thay vì gửi null. */
export function cleanParams(p: ExerciseParams): ExerciseParams {
	return {
		sets: p.sets || 1,
		reps: p.reps || 1,
		holdSec: p.holdSec || 1,
		relaxSec: p.relaxSec ?? 0,
		durationSec: p.durationSec || 1,
		restSec: p.restSec ?? 0,
	};
}
