import * as service from '../services/programs';

export default defineEventHandler(async (event) => {
	const parsed = createProgramSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addProgram(parsed.data);
});
