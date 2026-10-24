# CLAUDE.md — mia-health

> Hướng dẫn cho Claude khi làm việc trong repo này. Đọc kỹ trước khi sinh code.

> **Mới clone / máy mới?** Đọc [`docs/installation.md`](docs/installation.md). **Deploy lên Cloudflare Pages?** Đọc [`docs/deploy.md`](docs/deploy.md).

## 1. Bối cảnh dự án

**mia-health** là ứng dụng web cá nhân để **lên giáo án và thực hiện bài tập** (Kegel, thể dục dụng cụ, sức mạnh, giãn cơ, hít thở…): màn hình tập có hẹn giờ nhịp siết/thả, đếm set, âm báo + giọng đọc tiếng Việt; ghi lịch sử, streak, thống kê theo tuần. Kèm **module dinh dưỡng** (tab "Ăn uống", làm từng phần): ① kho thực phẩm có đủ nutrition facts — ĐÃ CÓ; ② món ăn = công thức từ thực phẩm — ĐÃ CÓ; ③ thực đơn + nhật ký ăn (khối lượng, kcal, các chất); ④ BMI, TDEE, gợi ý món.

- Tách ra từ **mia-finance** (cùng stack, cùng kiến trúc) — app riêng, D1 riêng, deploy riêng. Lý do tách thay vì gộp: dữ liệu tài chính cách ly hoàn toàn, không phải tái cấu trúc 480 file route gốc của finance, mỗi app một icon PWA. Khi có app thứ 3 mới cân nhắc gom phần hạ tầng chung (auth, layout, CSS kính, `useDB`) thành Nuxt Layer.
- Quy mô: **solo / single-user**, dữ liệu nhỏ.
- Web/PWA, tối ưu cho điện thoại (max-width `md`).
- Ngôn ngữ làm việc: **tiếng Việt** (comment, doc, commit message). Thuật ngữ kỹ thuật giữ tiếng Anh.

Domain model:

- `exercises` — thư viện bài tập (category, `mode` = cách thực hiện, thông số mặc định).
- `exercise_components` — bài con của **bài kết hợp** (`exercises.mode = 'combo'`, chạy theo `comboStyle`: luân phiên theo vòng / lần lượt).
- `exercise_media` — ảnh / video hướng dẫn của bài: ảnh tải lên **R2** hoặc link https, video YouTube (link).
- `routines` + `routine_items` — giáo án = **một buổi tập**: danh sách bài có thứ tự. KHÔNG mang lịch.
- `programs` + `program_phases` + `program_slots` — chương trình theo **mục tiêu** (`goal`): các giai đoạn nối tiếp, mỗi giai đoạn một lịch tuần (thứ → giáo án). Lịch tập CHỈ nằm ở đây; nhiều chương trình được theo cùng lúc.
- `plan_changes` — thay đổi lịch chỉ cho MỘT ngày (bỏ qua / đổi buổi / thêm buổi). Module `plan` dựng lịch ngày từ chương trình đang theo + thay đổi.
- `workout_sessions` + `session_entries` — buổi tập đã thực hiện (snapshot tên/nhóm bài).
- `stats` — streak, tuần, heatmap, theo nhóm (không có bảng riêng, aggregate từ sessions).
- `food_categories` + `foods` + `food_portions` — kho thực phẩm: cây nhóm 2 cấp (Thịt → Gà), thực phẩm với 29 chất trên 100 g phần ăn được, khẩu phần quen dùng ("1 bát con" = 150 g).
- `dishes` + `dish_ingredients` — món ăn = công thức: thực phẩm + gam phần ăn được cho cả công thức, nấu cho `servings` phần. Dinh dưỡng không lưu, luôn tính từ thực phẩm.

## 2. Tech stack (ĐÃ KHOÁ — không tự ý đổi)

| Lớp             | Công nghệ                                                         |
| --------------- | ----------------------------------------------------------------- |
| Framework       | Nuxt 4 (monolith: UI + API), `ssr: false` (SPA)                   |
| Backend         | Nitro server routes (`server/api/`)                               |
| ORM             | Drizzle ORM + Drizzle Kit                                         |
| Database        | Cloudflare D1 (SQLite), binding name `DB`, database `mia-health-db` |
| File (ảnh)      | Cloudflare R2, binding `MEDIA`, bucket `mia-health-media`          |
| Hosting         | Cloudflare Pages (project `mia-health`), preset `cloudflare-pages` |
| Local dev       | `nitro-cloudflare-dev` (emulate D1 binding qua getPlatformProxy)  |
| UI              | Nuxt UI v4 + Tailwind v4, icon heroicons (bundle vào client)      |
| PWA             | `@vite-pwa/nuxt` — KHÔNG cache `/api`                             |
| Auth            | `nuxt-auth-utils` (1 password qua env var)                        |
| Package manager | **yarn**                                                          |

⚠️ **D1 là SQLite.** Không dùng feature Postgres-only. Không có kiểu số thực cho dữ liệu cần chính xác — thời lượng lưu **integer giây**.

## 3. Kiến trúc & layering

Luồng: **Route handler → Service → Repository → Drizzle**.

```
server/
  api/<module>/             # route handler — MỎNG: validate zod + gọi service
  services/<module>.ts      # business logic, throw createError; KHÔNG chạm DB
  repositories/<module>.ts  # CHỈ lớp này được gọi useDB() / useMediaBucket()
  types/<module>.ts         # *Computed + drift check _assertXDTO (Serialized<Row> ↔ DTO)
  database/
    schema.ts               # Drizzle schema (single source of truth)
    migrations/             # SQL do Drizzle Kit sinh — KHÔNG sửa tay
    seeds/presets.ts        # bộ bài tập + giáo án mẫu
  utils/db.ts               # useDB(), getLastRowId(), D1_MAX_PARAMS, chunk()
  utils/storage.ts          # useMediaBucket() — R2, kiểu tự khai (không kéo @cloudflare/workers-types)
  routes/media/             # GET /media/<key> — phục vụ ảnh R2 (ngoài /api để service worker cache được)
shared/
  schemas/                  # zod — dùng chung server + client
  types/                    # DTO
  utils/                    # pure function: date, weekday, streak, timeline, program (có vitest)
app/                        # UI (pages, components, composables)
```

**Quy tắc tuyệt đối** (giống mia-finance):

- Chỉ **repository** gọi `useDB()` / `useMediaBucket()`. Ngoại lệ duy nhất: `server/api/health.get.ts` (probe hạ tầng).
- Route handler không chứa business logic.
- Module không có bảng riêng (`presets`) được phép không có repository — nhưng mọi lần ghi vẫn đi qua service/repository của module sở hữu bảng. `plan` chỉ ghi bảng của mình (`plan_changes`), đọc chương trình / giáo án qua service của module sở hữu.

## 4. Database workflow

1. Sửa `server/database/schema.ts`.
2. `yarn db:generate` — Drizzle Kit sinh SQL migration.
3. `yarn db:migrate:local` — apply vào D1 local.
4. Sau khi ổn: `yarn db:migrate:remote` — apply lên D1 production.

**Không bao giờ** sửa tay file SQL đã generate. **Không** xoá lịch sử migration.
**Thêm cột FK vào bảng đã có** → `drizzle-kit generate --custom` và viết tay `ALTER TABLE … REFERENCES … ON DELETE …` (drizzle-kit làm rơi mệnh đề `ON DELETE` — bài học từ mia-finance).
**Migration dữ liệu kho thực phẩm / món mẫu** (`0005_seed_foods.sql`, `0007_seed_dishes.sql`) do `node scripts/foods/build-foods.mjs <file>` / `build-dishes.mjs <file>` SINH (cần `pdftotext`, `unzip`; nguồn tải vào `.cache/foods/`). Sửa dữ liệu ở `scripts/foods/curation.mjs` / `dishes.mjs`, rồi sinh vào một migration `--custom` MỚI — không sinh đè migration đã apply. `server/database/__tests__/migrations.test.ts` chạy mọi migration vào `node:sqlite` và soát dữ liệu (Atwater, trùng tên, cột khớp `NUTRIENTS`).

## 5. Pattern D1 bắt buộc

- **Không dùng `.returning()`** cho DML — D1 đôi khi throw dù row đã commit. INSERT → `getLastRowId(await db.insert(...).run())` → SELECT theo id.
- **Trần 50 query D1 mỗi request ở gói Workers Free** (Paid: 1000). Local (miniflare) KHÔNG chặn nên không lộ khi dev. Thao tác ghi hàng loạt (seed bộ mẫu) không được lặp `addExercise` / `addItem` — mỗi lần tốn 6–10 query; dùng bản theo lô `addExercises` / `addRoutines` (một `db.batch`, khoá ngoại trỏ qua subquery theo tên vì chưa có id).
- **Trần 100 bound parameter mỗi câu lệnh.** Multi-row INSERT và `inArray(...)` dài phải cắt bằng `chunk()` (xem `createSessionWithEntries`, `listEntries`). 11 cột/entry ⇒ tối đa 9 entry/câu.
- **Không có transaction tương tác.** Ghi nhiều câu cần nguyên tử → `db.batch([...])`. Cần id cha trước (session → entries) thì ghi cha, batch con, batch lỗi ⇒ xoá cha (bù trừ).
- So tên không phân biệt hoa thường làm ở **JS** (`toLocaleLowerCase('vi')`), KHÔNG dùng `lower()` của SQLite — nó chỉ hạ chữ ASCII, "Đ" lọt qua.

## 6. Quy ước code

- TypeScript strict. Không `any` trừ khi bất khả kháng (kèm comment lý do).
- Naming: file kebab-case, biến/hàm camelCase, type PascalCase. Bảng số nhiều, cột snake_case ở DB, camelCase ở TS.
- Validate input ở route handler bằng zod (`shared/schemas`) trước khi vào service. Query param optional bọc `optQuery()` (coi `""` là không truyền).
- Mọi request thành công trả **200** (kể cả POST). Lỗi: `createError({ statusCode, message })` — message tiếng Việt, FE hiển thị nguyên văn.
- Composable FE dùng `createRunner(loading, error)` (`app/utils/api.ts`): lỗi → `error.value` + trả `null`, caller toast.
- `@click` của component Nuxt UI phải trả `void`: biểu thức gán viết `@click="() => { x = 1 }"`, không `@click="x = 1"` (vue-tsc báo lỗi).
- Icon chọn động qua map (vd `CATEGORY_ICONS`) phải khai thêm ở `nuxt.config.ts > icon.clientBundle.icons` — `scan` không bắt được, icon sẽ trống khi offline.
- Màu nhóm bài: `CATEGORY_TONES` (`app/utils/labels.ts`) set biến `--tone`, dùng `bg-(--tone)/15 text-(--tone)`. Bảng màu ở `main.css` đã qua validator của skill dataviz — **đổi màu phải chạy lại validator**, và màu không bao giờ đứng một mình (luôn kèm icon + tên).
- Ảnh bìa bài tập: `coverOf()` (`shared/utils/media.ts`) + component `ExerciseThumb` — đừng tự chọn media[0].

## 7. Lệnh thường dùng

```bash
yarn dev                 # dev (emulate D1 binding)
yarn build               # build cho Cloudflare Pages → ./dist
yarn preview             # chạy bản build trên workerd (wrangler pages dev) với D1 local
yarn typecheck           # vue-tsc — PHẢI XANH trước khi push (build KHÔNG check type)
yarn test                # vitest — shared/utils (streak, weekday, timeline, program, nutrients) + bộ mẫu + mọi migration chạy trên node:sqlite
yarn db:generate         # sinh migration từ schema
yarn db:migrate:local    # apply migration vào D1 local
yarn db:migrate:remote   # apply migration vào D1 production
yarn deploy              # build + wrangler pages deploy (cần wrangler login)
```

> Khác mia-finance: repo này có sẵn `typescript` + `vue-tsc` trong devDependencies nên `yarn typecheck` chạy được thật. Drift check `_assertXDTO` ở `server/types/*.ts` chỉ có tác dụng khi typecheck chạy.

## 8. Những điều KHÔNG làm

- Không thêm backend riêng / đổi DB.
- Không query DB ngoài repository.
- Không commit secret (`.env`). `database_id` không phải secret — được commit.
- Không tự ý cài dependency nặng.
- Không cache `/api` trong service worker. (`/media/*` thì CacheFirst — key bất biến.)
- Không bỏ `nitro.prerender.routes: ['/']`, `<NuxtPwaManifest />` (app.vue) hay đổi lại `registerType: 'autoUpdate'` — xem mục PWA ở §10.
- Không gộp code tài chính vào repo này.

## 9. Auth

Giống hệt mia-finance: `nuxt-auth-utils`, cookie session 30 ngày rolling.

| Var | Mục đích |
|-----|----------|
| `NUXT_SESSION_PASSWORD` | ≥ 32 ký tự, ký + mã hoá cookie |
| `NUXT_AUTH_PASSWORD` | Password nhập ở `/login` |

- Page: [`app/middleware/auth.global.ts`](app/middleware/auth.global.ts). API: [`server/middleware/auth.ts`](server/middleware/auth.ts) — mọi `/api/*` **và `/media/*`** (ảnh tải lên — dữ liệu riêng; `<img>` cùng origin tự kèm cookie) bị chặn trừ `PUBLIC_API_PREFIXES` / `PUBLIC_API_PATHS`. Thêm route public phải cập nhật hai danh sách này.

## 10. Quyết định đã chốt (ADR)

- **Ngày là TEXT `YYYY-MM-DD` theo giờ ĐỊA PHƯƠNG của người tập, do CLIENT gửi.** Server Cloudflare chạy UTC: tập 6h sáng ở VN (UTC+7) mà để server tự lấy ngày thì bị ghi thành hôm trước, streak gãy. Vì thế `GET /api/stats/overview?today=`, `GET /api/plan/today?date=`, `POST /api/plan/changes { date }` và `POST /api/presets/seed { today }` **bắt buộc** tham số ngày (ngày bắt đầu chương trình `startDate` cũng do client gửi); client lấy bằng `localDateIso()` (`shared/utils/date.ts`). KHÔNG thêm chỗ nào gọi `new Date()` ở server để suy ra "hôm nay".
- **Timestamp hệ thống** (`created_at`, `updated_at`, `started_at`): integer unix, Drizzle `mode: 'timestamp'`.
- **Thời lượng: integer giây.** `durationSec` của session = thời gian tập THẬT (không tính lúc tạm dừng).
- **Thông số bài tập luôn NOT NULL, `mode` quyết định cột nào có nghĩa**: `reps` dùng sets/reps/restSec; `hold` dùng sets/reps/holdSec/relaxSec/restSec; `duration` dùng sets/durationSec/restSec. Để nullable thì đổi mode sẽ rơi vào trạng thái thiếu số.
- **Item giáo án COPY thông số từ bài tập lúc thêm, sửa độc lập sau đó.** Không tham chiếu: sửa bài trong thư viện không được âm thầm đổi các giáo án đã soạn; cùng một bài có thể 3×10 ở giáo án sáng và 2×15 ở giáo án tối.
- **Timeline là pure function dùng chung** (`shared/utils/timeline.ts`): server dùng để ước lượng `estimatedSec`, player ở client chạy đúng chuỗi bước đó — hai bên không bao giờ lệch. Luật nhịp thả: bỏ `relax` sau rep cuối của set khi ngay sau là nghỉ giữa set hoặc hết bài; nếu `restSec = 0` thì GIỮ (kegel không có nhịp thả giữa hai lần siết là sai kỹ thuật). Golden test: `shared/utils/__tests__/timeline.test.ts`.
- **Lịch sử là snapshot, không phụ thuộc thư viện**: `session_entries` lưu `exerciseName`/`category`/`mode`; xoá bài tập ⇒ `exercise_id` về NULL (SET NULL), xoá giáo án ⇒ `workout_sessions.routine_id` về NULL, `title` giữ tên.
- **Xoá bài tập đang nằm trong giáo án ⇒ 409**, không tự gỡ khỏi giáo án (gợi ý lưu trữ `isArchived`). FK `routine_items.exercise_id` là RESTRICT làm lưới an toàn cuối.
- **Streak không đứt vì hôm nay chưa tập**: hôm qua có tập thì chuỗi còn sống tới hết hôm nay. Đứt từ sáng sẽ báo "0 ngày" đúng lúc người dùng mở app để tập.
- **Tuần = ISO (Thứ 2 → CN), gộp ở TS** (`rollupWeeks`), KHÔNG dùng `strftime('%W')` — `%W` đánh số lại từ 00 mỗi đầu năm, tuần vắt qua 1/1 bị chẻ đôi.
- **Lịch tập nằm ở chương trình, không ở giáo án** (thay cho `routines.schedule_mask` cũ, đã drop ở migration 0003). Lịch gắn vào từng giáo án làm màn Hôm nay hiện một chồng buổi không rõ vì sao, muốn đổi phải sửa từng giáo án. Giờ: chương trình = mục tiêu + "vì sao" + giai đoạn, giáo án là khối dùng lại. Ô lịch (`program_slots`) **tham chiếu** giáo án (không copy như item giáo án): sửa giáo án là sửa buổi ở mọi chương trình dùng nó. `weekday` lưu ISO 1–7.
- **Chương trình có thời hạn + giai đoạn.** `startDate` null = không theo. Tuần 1 = tuần ISO chứa `startDate` (bắt đầu giữa tuần thì tuần 1 ngắn). Hết giai đoạn cuối: `repeat` ⇒ quay lại giai đoạn 1, không ⇒ hoàn thành. Tính toán ở `programStatus()` (`shared/utils/program.ts`, có vitest) — server dựng lịch ngày, client hiện trạng thái, KHÔNG trả status từ API chương trình (phụ thuộc "hôm nay" của client). Chương trình luôn ≥ 1 giai đoạn (tạo mới có sẵn "Giai đoạn 1", chặn xoá giai đoạn cuối).
- **Thay đổi lịch chỉ cho một ngày** (`plan_changes`): mỗi buổi theo lịch giữ tối đa MỘT thay đổi skip/swap mỗi ngày (ghi mới = thay cái cũ, cùng batch), `add` không trùng giáo án. Thay đổi trỏ tới buổi không còn trong lịch (chương trình sửa sau) bị bỏ qua lặng lẽ. Đổi lâu dài = sửa chương trình. `applyDayChanges()` là pure function có vitest.
- **Xoá giáo án đang nằm trong lịch chương trình ⇒ 409** (cùng lý do với bài trong giáo án), FK `program_slots.routine_id` RESTRICT là lưới cuối. Giáo án bị lưu trữ sau khi đã vào lịch vẫn giữ trong lịch; chỉ chặn thêm **mới**.
- **Player đo thời gian bằng `performance.now()`**, không tin nhịp `setInterval` (bị bóp khi tab ẩn/máy khoá). Bắt kịp nhiều bước một lúc thì chỉ phát tín hiệu cho bước đang đứng.
- **Hết giáo án ⇒ tự lưu buổi tập** (không chờ người dùng bấm, tránh mất buổi khi đóng app); cảm giác/ghi chú PATCH sau. Dừng sớm ⇒ hỏi lưu phần đã tập (`completed = false`, chỉ entry có `setsDone > 0`) hay bỏ.
- **Seed mẫu idempotent THEO TÊN** (`POST /api/presets/seed`): trùng tên thì bỏ qua, không ghi đè thông số người dùng đã chỉnh. Ghi theo lô (`addExercises` / `addRoutines` / `addPrograms`, mỗi lô một `db.batch`) vì trần 50 query/request (xem §5) — cả bộ ~37 câu lệnh. Chương trình mẫu `follow: true` bắt đầu theo từ `today` client gửi.
- **Bài kết hợp là một bài tập `mode = 'combo'`**, không phải bảng/khái niệm riêng — nhờ vậy nằm trong thư viện, thêm vào giáo án như bài thường (FK `routine_items` giữ nguyên), tập lẻ được. Danh sách bài con ở `exercise_components`. Hai kiểu (`comboStyle`): `circuit` luân phiên — mỗi vòng 1 set từng bài con, `sets` = số vòng, `restSec` = nghỉ giữa vòng, `restSec` của bài con = nghỉ trước bài kế; `sequence` lần lượt — y như các bài rời liền nhau.
- **Bài kết hợp chỉ một tầng**: bài con luôn là bài đơn (service chặn lồng, 400). Timeline trải bài kết hợp đúng một lần bằng `toPlanItems()` — không đệ quy. Cũng vì vậy **không đổi `mode` giữa bài đơn ↔ `combo`** sau khi tạo: bài đơn đang là bài con mà thành combo ⇒ lồng hai tầng; combo thành bài đơn ⇒ bài con mồ côi.
- **Bài con COPY thông số từ thư viện lúc thêm** (như item giáo án). Nhưng **item giáo án trỏ tới bài kết hợp chỉ copy số vòng / nghỉ giữa vòng; danh sách bài con là live** — bài kết hợp là "khối dùng lại", sửa khối thì mọi giáo án dùng nó đổi theo, là hành vi người dùng chờ đợi. Sửa danh sách bài con = ghi đè cả cụm trong một `db.batch` (UPDATE + DELETE + INSERT).
- **Lịch sử ghi từng bài con**, không ghi bài kết hợp: `session_entries.mode` chỉ là bài đơn, streak/thống kê theo nhóm tính đúng nhóm của từng bài. Luân phiên: `setsPlanned`/`setsDone` đếm theo vòng.
- **Xoá bài đang là bài con ⇒ 409** (cùng lý do với giáo án), FK `exercise_components.exercise_id` RESTRICT là lưới cuối; xoá bài kết hợp ⇒ bài con CASCADE. Bài con đã có sẵn mà bị lưu trữ sau đó vẫn giữ được khi sửa bài kết hợp; chỉ chặn thêm **mới** bài đã lưu trữ.
- **Ảnh hướng dẫn: tải lên R2 hoặc dán link https; video = link YouTube** (không upload video — nặng, YouTube làm tốt hơn). Tối đa 10 media/bài.
- **Client thu nhỏ + mã hoá lại ảnh trước khi gửi** (`app/utils/image.ts`: cạnh dài ≤ 1600px, WebP → JPEG nếu trình duyệt không mã hoá được WebP). Mã hoá lại qua canvas còn **xoá EXIF** — ảnh chụp điện thoại thường mang toạ độ GPS. Server **nhận định dạng bằng magic bytes**, không tin `Content-Type` client gửi; trần 5 MB chỉ chặn file thô bất thường.
- **Key R2 = `exercises/<id>/<uuid>.<ext>`, phục vụ ở `/media/<key>` NGOÀI `/api`**: nội dung không bao giờ đổi ⇒ `Cache-Control: private, immutable` + workbox CacheFirst ⇒ màn hình tập vẫn có ảnh khi mạng chập chờn, mà luật "không cache /api" giữ nguyên. Route chỉ phục vụ đúng dạng key do app sinh (chặn path traversal / dò key).
- **Xoá media / bài tập phải dọn R2 bằng tay** — CASCADE của D1 không với tới R2: lấy danh sách key TRƯỚC khi xoá row, xoá row, rồi xoá object. Lỗi khi xoá object chỉ log (row đã xoá; object mồ côi vô hại) — không làm request thất bại. Upload: ghi R2 trước, ghi row lỗi thì xoá object vừa ghi.
- **Link YouTube chuẩn hoá về một dạng lúc lưu** (`watch?v=ID&t=Ns`, nhận cả youtu.be / shorts / embed / live), nhúng bằng `youtube-nocookie` kiểu "lite" (chỉ thumbnail, chạm mới nạp iframe). Chuẩn hoá và dựng link nhúng dùng cùng một hàm ở `shared/utils/media.ts` (có vitest).
- **Bài kết hợp chưa có media riêng mượn ảnh bài con** (ảnh bìa + gallery ở trang chi tiết); trên màn hình tập mỗi bài con hiện ảnh của chính nó.
- **Kho thực phẩm: nguồn chính là Bảng thành phần thực phẩm Việt Nam 2007** (Viện Dinh dưỡng; 526 thực phẩm, trích từ bản PDF FAO lưu trữ), bổ sung **USDA FoodData Central SR Legacy** (public domain) cho phần thịt bảng VN không tách (ức / đùi / cánh, có / không da) và vài món chín. Mỗi thực phẩm giữ `source` + `sourceCode` (mã số VN / FDC ID) + `sourceName` để tra lại; sửa thực phẩm từ bảng nguồn vẫn giữ `source`, `updatedAt` báo đã khác bản gốc.
- **Số liệu dinh dưỡng là REAL, NULL = không có số liệu (khác 0).** Giá trị đo có sai số phân tích sẵn, không phải dữ liệu cần chính xác như thời lượng. NULL hiện "—", không cộng thành 0. Chỉ `energyKcal` bắt buộc.
- **Glucid (`carbG`) KHÔNG gồm xơ** (chuẩn Codex, như bảng VN); số USDA "by difference" trừ xơ khi nhập. Vitamin A = RAE (bảng VN: retinol + β-caroten / 12). %DV theo FDA 2.000 kcal chỉ để hiện nhãn — mục tiêu riêng theo TDEE làm ở phần ④.
- **Kho thực phẩm nạp bằng migration dữ liệu, KHÔNG qua `POST /api/presets/seed`**: ~600 dòng vượt trần 50 query/request; migration chạy cùng `db:migrate` nên DB nào cũng có sẵn.
- **Món ăn = công thức, dinh dưỡng KHÔNG lưu, luôn tính từ thực phẩm** (`sumNutrients` / `multiplyNutrients`, có vitest): sửa thực phẩm là mọi món dùng nó đổi theo (như bài kết hợp lấy bài con live). Nguyên liệu = gam phần ăn được cho cả công thức; nấu hao nước nhưng chất gần như giữ nguyên ⇒ tổng = cộng nguyên liệu, bỏ qua hao hụt vitamin; dầu rán = lượng ngấm. Nguyên liệu thiếu số liệu một chất ⇒ cộng phần biết được + `missing` ⇒ UI hiện "≥" — KHÔNG coi null là 0, kể cả với hành lá vài gam: cùng luật đó sẽ biến nước mắm thiếu số natri thành 0 natri.
- **Món mẫu: công thức ƯỚC LƯỢNG, kcal đối chiếu nguồn công bố** (Viện Dinh dưỡng qua báo chí, bảng Nutrihome; `build-dishes.mjs` cảnh báo lệch > 30%). Không có nguồn công bố công thức chuẩn — ghi rõ "ước lượng" ở UI. Migration trỏ thực phẩm qua `(source, source_code)`, bền với đổi tên.
- **Xoá thực phẩm đang là nguyên liệu ⇒ 409** (FK `dish_ingredients.food_id` RESTRICT là lưới cuối); thực phẩm lưu trữ sau khi đã vào món vẫn giữ được khi sửa món, chỉ chặn thêm mới.
- **Tab "Ăn uống" = Món ăn | Thực phẩm** (`MealsTabs`), mở vào Món ăn.
- **Nhóm thực phẩm 2 cấp, theo con vật / loại** (Thịt → Gà gồm cả ức, đùi, cánh, gan, mề…) — nhóm gốc khớp 14 nhóm của bảng VN. Xoá nhóm còn loại con / thực phẩm ⇒ 409 (FK RESTRICT là lưới cuối).
- **Tab dưới: Hôm nay · Kế hoạch (Chương trình | Giáo án | Bài tập) · [Tập] · Ăn uống · Lịch sử** — thư viện bài tập vào trong Kế hoạch để nhường chỗ cho Ăn uống.
- **PWA — ba điều kiện để "Thêm vào màn hình chính" chạy đúng** (đã kiểm bằng build production + `wrangler pages dev` + Chrome: installability không lỗi, SW kiểm soát trang, offline mở được app):
  1. **Prerender `/`** (`nitro.prerender.routes`). `ssr: false` không sinh `index.html`; `navigateFallback: '/'` gọi `createHandlerBoundToURL('/')` ngay khi nạp `sw.js` ⇒ '/' không có trong precache ⇒ Workbox ném `non-precached-url` ⇒ SW không cài được (mất offline + cache ảnh). Kiểm: `grep -o 'url:"/"' dist/sw.js`.
  2. **`<NuxtPwaManifest />` trong app.vue** — `<link rel="manifest">` chỉ được chèn qua component này; thiếu thì Android/Chrome không nhận ra PWA.
  3. **`registerType: 'prompt'` + `app/plugins/pwa-update.client.ts`**, KHÔNG `autoUpdate`: autoUpdate gọi `location.reload()` ngay khi SW mới chiếm quyền — đang tập dở là mất buổi. Plugin vẫn cập nhật tự động nhưng hoãn khi đang ở `/play`.
- **Mất mạng ≠ đăng xuất**: plugin nuxt-auth-utils nuốt mọi lỗi fetch session thành "chưa đăng nhập". `auth.global.ts` tự hỏi lại `/api/_auth/session`: server trả lời không có user ⇒ `/login`; không liên lạc được ⇒ ở lại trang (layout hiện dải "Đang offline" khi `navigator.onLine` false). KHÔNG dựa vào `navigator.onLine` để quyết định — wifi có sóng mà không ra mạng vẫn báo `true`.
- **Màn hình tập tải trước ảnh bìa mọi bài khi mở** (qua SW ⇒ vào cache `exercise-media`), để mạng rớt giữa buổi vẫn có ảnh bài phía sau. `/api` vẫn không cache ⇒ offline thì mở được app nhưng không tải được dữ liệu mới.
- **Mở hướng dẫn khi đang tập ⇒ tự tạm dừng đồng hồ, đóng ⇒ chạy tiếp** — chỉ khi chính sheet hướng dẫn đã dừng (không tự chạy một buổi người dùng đang tự tạm dừng).
- **Luật nhịp thả áp nguyên cho bài luân phiên**: bỏ `relax` sau rep cuối của set khi ngay sau là nghỉ (chuyển bài / giữa vòng) hoặc hết cả bài kết hợp; chuyển thẳng sang bài con kế mà không nghỉ thì GIỮ. Golden test ở `timeline.test.ts` (mục "bài kết hợp").

## 11. Tài liệu tham chiếu

**`docs/backend/`** — quy tắc viết backend (kế thừa từ mia-finance, áp dụng nguyên văn):

| Tình huống | Doc |
|------------|-----|
| Thêm module, đặt file ở đâu | `docs/backend/architecture.md` |
| Response format, status code, error shape | `docs/backend/api-conventions.md` |
| Naming, error handling, import order | `docs/backend/coding-rules.md` |
| Repository, query Drizzle, migration | `docs/backend/drizzle-repository-rules.md` |
| Zod schema, safeParse | `docs/backend/validation-zod-rules.md` |

**`docs/bridges/`** — API contract:

| Module | Doc |
|--------|-----|
| Exercises (thư viện bài tập) + Presets (bộ mẫu) | `docs/bridges/exercises.md` |
| Routines (giáo án + item) | `docs/bridges/routines.md` |
| Sessions (buổi tập) | `docs/bridges/sessions.md` |
| Stats (streak, tuần, heatmap) | `docs/bridges/stats.md` |
| Programs (chương trình, giai đoạn, lịch) + Plan (lịch ngày, bỏ qua / đổi / thêm buổi) | `docs/bridges/programs.md` |
| Foods (kho thực phẩm, nhóm, khẩu phần, nguồn số liệu) | `docs/bridges/foods.md` |
| Dishes (món ăn = công thức, dinh dưỡng tính từ nguyên liệu, món mẫu) | `docs/bridges/dishes.md` |

**Quy trình bridge-doc cuốn chiếu** (giữ nguyên từ mia-finance): xong backend một module ⇒ viết/cập nhật bridge-doc NGAY trong cùng đợt, shape lấy từ response thật (`yarn dev` + curl), không bịa từ đọc code.
