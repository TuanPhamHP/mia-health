// Single-user gate: chưa login → ép về /login (trừ chính trang /login).
// Đã login mà tới /login → đẩy về home.
//
// `useUserSession` do nuxt-auth-utils tự auto-import. Plugin của module fetch session trước
// khi router middleware chạy, nhưng nuốt MỌI lỗi thành "chưa đăng nhập" — kể cả lỗi mạng.
export default defineNuxtRouteMiddleware(async (to) => {
	const { loggedIn, session } = useUserSession();

	if (!loggedIn.value && to.path !== '/login') {
		// Tự hỏi lại để phân biệt: server TRẢ LỜI "không có user" ⇒ về /login; KHÔNG liên lạc
		// được server (offline, wifi phòng gym có sóng mà không ra mạng — navigator.onLine vẫn
		// true) ⇒ ở lại, trang tự báo lỗi tải. Đá về /login lúc đó làm người dùng tưởng bị đăng
		// xuất. Dữ liệu vẫn do server chặn nên không có gì lọt ra.
		try {
			session.value = await $fetch('/api/_auth/session', { headers: { accept: 'application/json' }, retry: false });
		} catch {
			return;
		}
		if (!loggedIn.value) return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
	}
	if (loggedIn.value && to.path === '/login') {
		return navigateTo('/');
	}
});
