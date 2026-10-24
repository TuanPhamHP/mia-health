<script setup lang="ts">
	const route = useRoute();
	const pageTitle = usePageTitle();

	// @nuxtjs/color-mode (bundled với @nuxt/ui) tự persist preference vào localStorage.
	const colorMode = useColorMode();
	const isDark = computed(() => colorMode.value === 'dark');
	function toggleColorMode() {
		colorMode.preference = isDark.value ? 'light' : 'dark';
	}

	const { clear: clearSession } = useUserSession();
	const loggingOut = ref(false);
	async function logout() {
		if (loggingOut.value) return;
		loggingOut.value = true;
		try {
			await $fetch('/api/auth/logout', { method: 'POST' });
		} finally {
			await clearSession();
			loggingOut.value = false;
			await navigateTo('/login');
		}
	}

	// Bottom nav: 2 tab | nút "Tập" ở giữa | 2 tab.
	const leftTabs = [
		{ label: 'Hôm nay', icon: 'i-heroicons-sun', to: '/', also: ['/today'] },
		// Chương trình + giáo án + thư viện bài tập chung một tab: chuyển qua lại bằng PlanTabs.
		{ label: 'Kế hoạch', icon: 'i-heroicons-clipboard-document-list', to: '/programs', also: ['/routines', '/exercises'] },
	];
	const rightTabs = [
		{ label: 'Ăn uống', icon: 'i-heroicons-cake', to: '/diary', also: ['/menus', '/dishes', '/foods', '/body'] },
		{ label: 'Lịch sử', icon: 'i-heroicons-calendar-days', to: '/history' },
	];

	const startOpen = ref(false);

	// Service worker vẫn mở được app khi mất mạng, nhưng /api không cache (dữ liệu phải tươi) —
	// báo rõ để người dùng không tưởng app hỏng / bị đăng xuất.
	const online = ref(true);
	function syncOnline() {
		online.value = navigator.onLine;
	}
	onMounted(() => {
		syncOnline();
		window.addEventListener('online', syncOnline);
		window.addEventListener('offline', syncOnline);
	});
	onBeforeUnmount(() => {
		window.removeEventListener('online', syncOnline);
		window.removeEventListener('offline', syncOnline);
	});

	const parentRoute = computed(() => {
		if (route.path === '/today') return '/';
		if (/^\/programs\/[^/]+$/.test(route.path)) return '/programs';
		if (/^\/routines\/[^/]+$/.test(route.path)) return '/routines';
		if (/^\/exercises\/[^/]+$/.test(route.path)) return '/exercises';
		if (/^\/foods\/[^/]+$/.test(route.path)) return '/foods';
		if (/^\/dishes\/[^/]+$/.test(route.path)) return '/dishes';
		if (/^\/menus\/[^/]+$/.test(route.path)) return '/menus';
		return null;
	});

	function matches(to: string): boolean {
		if (to === '/') return route.path === '/';
		return route.path === to || route.path.startsWith(to + '/');
	}

	function isTabActive(tab: { to: string; also?: string[] }): boolean {
		return matches(tab.to) || (tab.also ?? []).some(matches);
	}
</script>

<template>
	<div class="min-h-[100dvh] bg-(--ui-bg)">
		<!-- Top App Bar -->
		<header class="fixed inset-x-0 top-0 z-20 bg-(--ui-bg-elevated) border-b border-(--ui-border)">
			<div class="mx-auto flex h-14 max-w-md items-center gap-2 px-3">
				<NuxtLink
					v-if="parentRoute"
					:to="parentRoute"
					class="flex size-9 shrink-0 items-center justify-center rounded-full text-(--ui-primary) active:bg-(--ui-primary)/10 transition-colors"
					aria-label="Quay lại"
				>
					<UIcon name="i-heroicons-chevron-left" class="size-5" />
				</NuxtLink>
				<h1
					class="flex-1 truncate text-base font-semibold text-(--ui-text-highlighted)"
					:class="parentRoute ? '' : 'pl-1'"
				>
					{{ pageTitle }}
				</h1>
				<ClientOnly>
					<button
						type="button"
						class="flex size-9 shrink-0 items-center justify-center rounded-full text-(--ui-text-muted) active:bg-(--ui-bg) transition-colors"
						:aria-label="isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'"
						@click="toggleColorMode"
					>
						<UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="size-5" />
					</button>
					<button
						type="button"
						class="flex size-9 shrink-0 items-center justify-center rounded-full text-(--ui-text-muted) active:bg-(--ui-bg) transition-colors disabled:opacity-50"
						aria-label="Đăng xuất"
						:disabled="loggingOut"
						@click="logout"
					>
						<UIcon name="i-heroicons-arrow-right-on-rectangle" class="size-5" />
					</button>
					<template #fallback>
						<div class="size-9 shrink-0" />
						<div class="size-9 shrink-0" />
					</template>
				</ClientOnly>
			</div>
		</header>

		<main
			class="mx-auto max-w-md px-4 pt-14"
			:style="{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }"
		>
			<div
				v-if="!online"
				class="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
				role="status"
			>
				<UIcon name="i-heroicons-signal-slash" class="size-5 shrink-0" />
				Đang offline — cần mạng để tải dữ liệu và lưu buổi tập.
			</div>
			<slot />
		</main>

		<nav
			class="fixed inset-x-0 bottom-0 z-20 bg-(--ui-bg-elevated) border-t border-(--ui-border)"
			:style="{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }"
		>
			<div class="mx-auto flex max-w-md">
				<NuxtLink
					v-for="tab in leftTabs"
					:key="tab.to"
					:to="tab.to"
					class="flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors"
					:class="isTabActive(tab) ? 'text-(--ui-primary)' : 'text-(--ui-text-muted)'"
				>
					<UIcon :name="tab.icon" class="size-6 shrink-0" />
					<span class="text-[10px] font-medium leading-none">{{ tab.label }}</span>
				</NuxtLink>

				<!-- Nút chính nhô lên trên mép nav — ô cha KHÔNG được overflow-hidden. -->
				<div class="relative flex w-16 shrink-0 flex-col items-center justify-end pb-2 min-h-[56px]">
					<button
						type="button"
						class="absolute -top-6 flex size-14 items-center justify-center rounded-full bg-(--ui-primary) text-white shadow-lg shadow-(--ui-primary)/30 active:scale-95 transition-transform"
						aria-label="Bắt đầu tập"
						@click="startOpen = true"
					>
						<UIcon name="i-heroicons-play" class="size-7" />
					</button>
					<span class="text-[10px] font-medium leading-none text-(--ui-text-muted)">Tập</span>
				</div>

				<NuxtLink
					v-for="tab in rightTabs"
					:key="tab.to"
					:to="tab.to"
					class="flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors"
					:class="isTabActive(tab) ? 'text-(--ui-primary)' : 'text-(--ui-text-muted)'"
				>
					<UIcon :name="tab.icon" class="size-6 shrink-0" />
					<span class="text-[10px] font-medium leading-none">{{ tab.label }}</span>
				</NuxtLink>
			</div>
		</nav>

		<StartSheet v-model:open="startOpen" />
	</div>
</template>
