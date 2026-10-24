import * as service from '../../../../services/foods';

export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	const mediaId = parseInt(getRouterParam(event, 'mediaId') ?? '', 10);
	if (!id || isNaN(id) || !mediaId || isNaN(mediaId)) throw createError({ statusCode: 400, message: 'id không hợp lệ' });

	const parsed = updateMediaSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.editMedia(id, mediaId, parsed.data);
});
