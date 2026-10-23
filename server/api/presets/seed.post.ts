import * as service from '../../services/presets';

// Idempotent theo tên — chạy lại bao nhiêu lần cũng chỉ thêm phần còn thiếu. `today` (giờ địa
// phương của client) là ngày bắt đầu của chương trình mẫu "đang theo".
export default defineEventHandler(async (event) => {
	const parsed = seedPresetsSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.seedPresets(parsed.data.today);
});
