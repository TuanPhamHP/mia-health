// Chặn TẤT CẢ /api/* và /media/* (ảnh tải lên — dữ liệu riêng) yêu cầu có session, trừ
// /api/auth/* (login/logout) và /api/health (route public dùng cho probe). Request <img> cùng
// origin tự kèm cookie nên ảnh vẫn hiện bình thường. Page routes không qua middleware này —
// Vue middleware lo.
//
// Lưu ý cookie session do nuxt-auth-utils tạo là HTTP-only + signed; không thể giả mạo
// từ client mà không có NUXT_SESSION_PASSWORD.

const PROTECTED_PREFIXES = ['/api/', '/media/'] as const;
const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/_auth/'] as const;
const PUBLIC_API_PATHS = ['/api/health'] as const;

function isPublicPath(path: string): boolean {
	if (PUBLIC_API_PATHS.includes(path as (typeof PUBLIC_API_PATHS)[number])) return true;
	return PUBLIC_API_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default defineEventHandler(async (event) => {
	const path = event.path ?? '';
	if (!PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))) return;
	if (isPublicPath(path)) return;

	const session = await getUserSession(event);
	if (!session?.user) {
		throw createError({ statusCode: 401, message: 'Chưa đăng nhập' });
	}
});
