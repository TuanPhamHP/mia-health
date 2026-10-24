// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0c1424' },
        // iOS standalone (Add to Home Screen) — bắt buộc để mở fullscreen, ẩn URL bar.
        // `mobile-web-app-capable` là tên chuẩn (Chrome báo apple-* đã cũ); Safari vẫn đọc apple-*.
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Mia Health' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
  },

  modules: [
    'nitro-cloudflare-dev',
    '@nuxt/ui',
    '@nuxt/eslint',
    '@vite-pwa/nuxt',
    'nuxt-auth-utils',
  ],

  // Bundle icon vào client: màn hình tập phải chạy được khi mạng chập chờn (phòng gym,
  // PWA offline) — không phụ thuộc Iconify API lúc runtime.
  // `scan` chỉ bắt tên icon viết thẳng trong template; icon chọn động qua map
  // (CATEGORY_ICONS, GOAL_ICONS, COMBO_ICON ở app/utils/labels.ts) phải liệt kê tay, nếu không sẽ trống khi offline.
  icon: {
    clientBundle: {
      scan: true,
      icons: [
        'heroicons:heart',
        'heroicons:bolt',
        'heroicons:trophy',
        'heroicons:arrows-pointing-out',
        'heroicons:fire',
        'heroicons:cloud',
        'heroicons:squares-2x2',
        'heroicons:squares-plus',
        'heroicons:check-circle-solid',
        'heroicons:stop',
        // GOAL_ICONS (mục tiêu chương trình) — fire/bolt/heart/arrows-pointing-out đã có ở trên
        'heroicons:shield-check',
        'heroicons:lifebuoy',
        'heroicons:flag',
      ],
    },
  },

  // Env vars (server-only) cho auth — set ở .env (local) và CF Pages secrets (prod):
  // - NUXT_SESSION_PASSWORD : ≥32 ký tự, dùng để ký + mã hoá cookie session (nuxt-auth-utils đọc tự động)
  // - NUXT_AUTH_PASSWORD    : password user nhập ở /login để truy cập app
  runtimeConfig: {
    authPassword: '', // map NUXT_AUTH_PASSWORD; mặc định rỗng = chặn login (fail-safe)
    session: {
      maxAge: 60 * 60 * 24 * 30, // 30 ngày rolling — nuxt-auth-utils tự refresh expiry mỗi request có session valid
    },
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    preset: 'cloudflare-pages',
    // Prerender app shell ra dist/index.html. BẮT BUỘC cho service worker: `navigateFallback: '/'`
    // gọi createHandlerBoundToURL('/') ngay khi nạp sw.js, '/' không có trong precache ⇒
    // Workbox ném `non-precached-url` ⇒ SW không cài được (mất offline + cache ảnh /media).
    // ssr:false nên không có index.html nếu không prerender; @vite-pwa/nuxt đổi entry
    // 'index.html' thành '/' trong precache.
    prerender: { routes: ['/'] },
    experimental: { asyncContext: true },
    cloudflare: { deployConfig: true, nodeCompat: true },
  },

  pwa: {
    // KHÔNG dùng 'autoUpdate': SW mới chiếm quyền ⇒ client gọi location.reload() ngay — đang
    // tập dở là mất buổi (iOS dạng app không có hộp hỏi rời trang). 'prompt' + plugin
    // app/plugins/pwa-update.client.ts: vẫn tự cập nhật, nhưng hoãn khi đang ở /play.
    registerType: 'prompt',
    manifest: {
      // Định danh app cố định — đổi start_url sau này không biến thành "app khác" trên máy.
      id: '/',
      name: 'Mia Health',
      short_name: 'Mia Health',
      description: 'Lịch tập & hẹn giờ bài tập cá nhân',
      lang: 'vi',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      theme_color: '#0c1424',
      background_color: '#0c1424',
      categories: ['health', 'fitness'],
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // SPA fallback: route lạ → trả index để Vue Router lo, NHƯNG loại trừ API & CF Access.
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//, /^\/media\//, /^\/cdn-cgi\//],
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      // Lịch sử/streak phải luôn tươi → KHÔNG cache /api.
      // Ảnh tải lên (/media/<uuid>) bất biến → CacheFirst: màn hình tập vẫn hiện ảnh khi
      // mạng chập chờn. Chỉ cache response 200 (401 lúc hết phiên không được dính vào cache).
      runtimeCaching: [
        {
          urlPattern: /^.*\/api\/.*/,
          handler: 'NetworkOnly',
        },
        {
          urlPattern: /^.*\/media\/.*/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'exercise-media',
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          // Ảnh mẫu đi kèm app (public/seed/, vd ảnh món mẫu) — không precache (~3 MB, chỉ tải
          // khi xem). Tên file theo tên món, sinh lại có thể đổi nội dung ⇒ StaleWhileRevalidate:
          // offline vẫn có, online thì tự làm mới.
          urlPattern: /^.*\/seed\/.*/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'seed-media',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [200] },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    // <link rel="manifest"> do <NuxtPwaManifest /> (app.vue) chèn lúc chạy — thiếu nó thì
    // Android/Chrome không nhận ra PWA, "Cài đặt ứng dụng" chỉ tạo lối tắt.
  },
})
