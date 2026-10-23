import * as service from '../../services/exercises';

export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'id không hợp lệ' });

	return service.deleteExercise(id);
});
