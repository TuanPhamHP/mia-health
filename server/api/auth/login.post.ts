import { z } from 'zod';

const loginSchema = z.object({
	password: z.string().min(1, 'Password không được rỗng'),
});

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: parsed.error.message });
	}

	// String() bắt buộc: Nitro áp env vào runtimeConfig qua destr(), nên
	// NUXT_AUTH_PASSWORD toàn chữ số bị parse thành number ("123456" → 123456)
	// và so sánh strict với password (string) luôn fail. Cũng bao luôn các giá trị
	// destr nuốt được khác: "true"/"false"/"null", chuỗi trông giống JSON.
	const expected = String(useRuntimeConfig(event).authPassword ?? '');
	if (!expected) {
		// Sai cấu hình — chặn login để tránh bypass khi env chưa set.
		throw createError({ statusCode: 500, message: 'Auth chưa được cấu hình (NUXT_AUTH_PASSWORD)' });
	}

	if (parsed.data.password !== expected) {
		throw createError({ statusCode: 401, message: 'Sai password' });
	}

	// Single-user app: chỉ cần "đã login" — không có user id thực.
	await setUserSession(event, {
		user: { id: 'owner' },
		loggedInAt: new Date().toISOString(),
	});

	return { ok: true };
});
