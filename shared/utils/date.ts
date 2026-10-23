// Mọi ngày trong app là chuỗi 'YYYY-MM-DD' theo giờ ĐỊA PHƯƠNG của người tập.
// Tính toán dùng epoch UTC của chính chuỗi đó để không dính DST / lệch múi giờ server.

const DAY_MS = 86_400_000;

function toEpoch(dateIso: string): number {
	return Date.parse(dateIso + 'T00:00:00Z');
}

function fromEpoch(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(dateIso: string, n: number): string {
	return fromEpoch(toEpoch(dateIso) + n * DAY_MS);
}

/** Số ngày từ `from` tới `to` (âm nếu `to` trước `from`). */
export function daysBetween(from: string, to: string): number {
	return Math.round((toEpoch(to) - toEpoch(from)) / DAY_MS);
}

/** ISO weekday: 1 = Thứ 2 … 7 = Chủ nhật. */
export function isoWeekday(dateIso: string): number {
	const js = new Date(toEpoch(dateIso)).getUTCDay(); // 0 = CN
	return js === 0 ? 7 : js;
}

/** Thứ 2 của tuần chứa `dateIso`. */
export function startOfIsoWeek(dateIso: string): string {
	return addDays(dateIso, 1 - isoWeekday(dateIso));
}

/**
 * Ngày hôm nay theo đồng hồ của MÁY đang chạy. Chỉ gọi ở client: server Cloudflare
 * chạy UTC, tập lúc 6h sáng ở VN (UTC+7) sẽ bị ghi thành ngày hôm trước.
 * Vì thế mọi endpoint phụ thuộc "hôm nay" đều nhận ngày từ client.
 */
export function localDateIso(d: Date = new Date()): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}
