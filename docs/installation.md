# Cài đặt & chạy mia-health trên máy mới

## Yêu cầu

- Node.js ≥ 22 (đã chạy với Node 24)
- yarn 1.x
- Không cần cài wrangler global — có sẵn trong devDependencies (`npx wrangler …`)

## Các bước

```bash
git clone <repo-url> health
cd health
yarn install
cp .env.example .env      # rồi điền 2 biến auth bên dưới
yarn db:migrate:local     # tạo schema trong D1 local (.wrangler/)
yarn dev                  # http://localhost:3000
```

### `.env` (bắt buộc — auth)

| Biến | Mô tả |
|------|-------|
| `NUXT_SESSION_PASSWORD` | ≥ 32 ký tự ngẫu nhiên: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `NUXT_AUTH_PASSWORD` | Password nhập ở `/login` (local có thể đặt đơn giản, vd `mia-local`) |

Không set → login luôn 500 ("Auth chưa được cấu hình") — fail-safe.

### Dữ liệu mẫu

Đăng nhập xong, trang **Hôm nay** có nút **"Thêm bộ mẫu"** (gọi `POST /api/presets/seed`): 62 bài tập, 11 giáo án và 4 chương trình theo mục tiêu — "Giảm mỡ tại nhà" (8 tuần, buổi sáng 30–40 phút với tạ ấm, tạ tay, ghế, máy chạy bộ, thảm) và "Sàn chậu & sinh lý nam" được theo luôn từ hôm nay. Chạy lại không tạo trùng — DB đã có dữ liệu thì dùng nút **"Bổ sung mẫu còn thiếu"** cuối trang **Kế hoạch**.

### Kho thực phẩm

Có sẵn sau `yarn db:migrate:local` — migration `0005_seed_foods.sql` nạp 573 thực phẩm (Bảng thành phần thực phẩm Việt Nam 2007 + USDA). Chỉ khi **sinh lại** dữ liệu từ nguồn gốc mới cần `pdftotext` (gói `poppler-utils`) và `unzip`: `node scripts/foods/build-foods.mjs <file-migration-mới.sql>` — xem `docs/bridges/foods.md`.

## Phạm vi ảnh hưởng — local vs prod

| Lệnh | Ảnh hưởng |
|------|-----------|
| `yarn dev`, `yarn preview` | D1 + R2 local (`.wrangler/`, tự giả lập — không cần tạo bucket) + `.env`. Không đụng prod |
| `yarn db:migrate:local`, `yarn db:reset:local` | Chỉ D1 local |
| `yarn db:migrate:remote` | **D1 production** — cần `wrangler login` đúng account |
| `yarn deploy` | **Deploy production** — xem `docs/deploy.md` |

## Kiểm tra trước khi push

```bash
yarn typecheck   # vue-tsc — phải xanh (build KHÔNG check type)
yarn test        # vitest: streak, weekday, timeline
yarn build
```
