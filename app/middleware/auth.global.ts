// Single-user gate: chưa login → ép về /login (trừ chính trang /login).
// Đã login mà tới /login → đẩy về home.
//
// `useUserSession` do nuxt-auth-utils tự auto-import. Plugin của module fetch session
// trước khi router middleware chạy, nên `loggedIn.value` đã reactive đúng.
export default defineNuxtRouteMiddleware((to) => {
	const { loggedIn } = useUserSession();

	if (!loggedIn.value && to.path !== '/login') {
		return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
	}
	if (loggedIn.value && to.path === '/login') {
		return navigateTo('/');
	}
});
