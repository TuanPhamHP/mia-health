# Deploy mia-health lên Cloudflare Pages (`*.pages.dev`)

Làm **một lần** cho lần deploy đầu, các lần sau chỉ cần `yarn deploy` (+ `yarn db:migrate:remote` nếu có migration mới).
Mọi lệnh chạy ở thư mục gốc repo.

## 1. Đăng nhập Cloudflare

```bash
npx wrangler login          # mở trình duyệt để cấp quyền
npx wrangler whoami         # kiểm tra đúng account
```

## 2. Tạo D1 production

```bash
npx wrangler d1 create mia-health-db
```

Copy `database_id` trong output vào `wrangler.jsonc` (thay chuỗi `00000000-0000-0000-0000-000000000000`).
`database_id` không phải secret — commit bình thường.

> Đổi id xong, D1 **local** cũng đổi file lưu (miniflare lưu theo id) → chạy lại `yarn db:migrate:local`; dữ liệu local cũ không mất nhưng không còn được dùng.

## 2b. Tạo R2 bucket cho ảnh hướng dẫn

```bash
npx wrangler r2 bucket create mia-health-media
```

Tên bucket đã khai sẵn trong `wrangler.jsonc` (binding `MEDIA`) — không cần sửa gì. Free tier R2: 10 GB, ảnh đã thu nhỏ ~150–300 KB/ảnh.
Bucket **không** cần public: ảnh đi qua route `/media/*` của app (yêu cầu đăng nhập).

## 3. Tạo schema trên D1 production

```bash
yarn db:migrate:remote
```

## 4. Tạo Pages project

```bash
npx wrangler pages project create mia-health --production-branch main
```

Tên subdomain `pages.dev` là duy nhất toàn cầu — nếu `mia-health` đã có người dùng, Cloudflare tự thêm hậu tố (vd `mia-health-7xk.pages.dev`); output in ra URL thật.

## 5. Đặt secret auth cho production

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # sinh session password
npx wrangler pages secret put NUXT_SESSION_PASSWORD --project-name mia-health
npx wrangler pages secret put NUXT_AUTH_PASSWORD --project-name mia-health      # password đăng nhập — đặt mạnh
```

## 6. Deploy

```bash
yarn deploy      # = nuxt build && wrangler pages deploy
```

`nitro.cloudflare.deployConfig: true` sinh `dist/_worker.js/wrangler.json` (kèm D1 binding `DB`, R2 binding `MEDIA` + cờ `nodejs_compat`) và
`.wrangler/deploy/config.json` trỏ wrangler sang file đó — nên `wrangler pages deploy` tự biết thư mục `dist` và binding,
không cần khai trong Dashboard. Mở URL in ra → `/login` → nhập `NUXT_AUTH_PASSWORD` → bấm "Thêm bộ mẫu" nếu muốn.

Kiểm tra nhanh: `curl https://<project>.pages.dev/api/health` → `{"ok":true,"db":"connected"}`.

## Cài lên điện thoại

Mở URL bằng Safari (iOS) → Chia sẻ → **Thêm vào MH chính**; Chrome (Android) → **Cài đặt ứng dụng**. App chạy toàn màn hình như app thật.

- **iOS**: âm thanh + giọng đọc chỉ phát sau khi bấm "Bắt đầu" (luật của Safari); công tắc im lặng phần cứng tắt tiếng bíp. Rung không hỗ trợ trên iOS.
- Màn hình được giữ sáng trong lúc tập (Screen Wake Lock — iOS ≥ 16.4, Chrome Android).
- **iOS: app trên màn hình chính có bộ nhớ (cookie) riêng, tách khỏi Safari** — đăng nhập trong Safari không mang sang app; mở app lần đầu sẽ phải nhập password một lần (sau đó giữ 30 ngày, tự gia hạn khi dùng).
- **Cập nhật**: deploy bản mới xong, app tự lên bản mới ở lần mở / chuyển trang kế tiếp (trang tự tải lại một lần). Đang ở màn hình tập thì **hoãn** tới lúc rời màn hình tập — không bao giờ tải lại giữa buổi.
- **Mất mạng**: app vẫn mở được (service worker), hiện dải "Đang offline"; dữ liệu (giáo án, lịch sử) cần mạng. Ảnh bìa các bài của giáo án đang tập được tải sẵn khi mở màn hình tập.

### Kiểm tra PWA trước khi deploy (khi đụng tới nuxt.config `pwa` / `nitro`)

```bash
yarn build
grep -o 'url:"/"' dist/sw.js             # phải có — thiếu là SW không cài được
ls dist/index.html                       # app shell đã prerender
yarn preview                             # wrangler pages dev, mở bằng Chrome
```

Chrome DevTools → Application → Manifest (không có lỗi installability) và Service workers (activated, đang kiểm soát trang); tick "Offline" rồi tải lại — phải thấy app, không phải trang khủng long hay trang đăng nhập.

## Cách khác: deploy tự động từ Git

Push repo lên GitHub/GitLab → Dashboard → Workers & Pages → Create → Pages → Connect to Git:
build command `yarn build`, output `dist`, biến môi trường `NODE_VERSION=22`. Secret auth đặt ở Settings → Variables and Secrets.
Migration D1 vẫn chạy tay bằng `yarn db:migrate:remote`.

## Debug production

```bash
npx wrangler pages deployment tail --project-name mia-health   # log realtime
```
