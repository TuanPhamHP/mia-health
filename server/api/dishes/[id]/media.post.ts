import * as service from '../../../services/dishes';

// Thêm ảnh qua link hoặc video YouTube — service tự nhận loại.
export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'id không hợp lệ' });

	const parsed = addMediaLinkSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addMediaLink(id, parsed.data);
});
