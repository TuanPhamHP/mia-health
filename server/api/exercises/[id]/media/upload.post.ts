import * as service from '../../../../services/exercises';

// multipart/form-data: `file` (bắt buộc) + `caption` (tuỳ chọn) — xem readImageUpload.
export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'id không hợp lệ' });

	const { data, caption } = await readImageUpload(event);
	return service.addMediaUpload(id, data, caption);
});
