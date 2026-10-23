import * as service from '../../../../services/exercises';

export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	const mediaId = parseInt(getRouterParam(event, 'mediaId') ?? '', 10);
	if (!id || isNaN(id) || !mediaId || isNaN(mediaId)) throw createError({ statusCode: 400, message: 'id không hợp lệ' });

	return service.removeMedia(id, mediaId);
});
