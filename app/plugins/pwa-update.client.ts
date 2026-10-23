// Kích hoạt bản mới của app (service worker mới) = tải lại trang. Đang tập dở mà tải lại là mất
// buổi tập, nên KHÔNG kích hoạt khi đang ở màn hình tập — đợi tới lúc rời /play. Ngoài /play
// thì cập nhật ngay như autoUpdate (xem `pwa.registerType` ở nuxt.config.ts).

// Phần `$pwa` dùng tới. Plugin JS của @vite-pwa/nuxt làm kiểu suy ra thành {} — khai tay.
interface PwaUpdater {
	needRefresh: boolean;
	updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

export default defineNuxtPlugin({
	name: 'pwa-update',
	dependsOn: ['vite-pwa:nuxt:client:plugin'],
	setup(nuxtApp) {
		const pwa = nuxtApp.$pwa as PwaUpdater | undefined;
		if (!pwa) return;
		const router = useRouter();

		function applyIfSafe() {
			if (pwa?.needRefresh && !router.currentRoute.value.path.startsWith('/play')) {
				void pwa.updateServiceWorker();
			}
		}

		watch(() => pwa.needRefresh, applyIfSafe);
		router.afterEach(applyIfSafe);
	},
});
