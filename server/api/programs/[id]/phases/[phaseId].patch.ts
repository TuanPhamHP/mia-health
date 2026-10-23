import * as service from '../../../../services/programs';

export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	const phaseId = parseInt(getRouterParam(event, 'phaseId') ?? '', 10);
	if (!id || isNaN(id) || !phaseId || isNaN(phaseId)) {
		throw createError({ statusCode: 400, message: 'id không hợp lệ' });
	}

	const parsed = updatePhaseSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.editPhase(id, phaseId, parsed.data);
});
