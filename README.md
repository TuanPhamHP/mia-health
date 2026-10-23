# Mia Health

Ứng dụng cá nhân để lên giáo án và **thực hiện bài tập** — Kegel, thể dục dụng cụ, sức mạnh, giãn cơ, hít thở.
Tách ra từ [mia-finance](../finance) (cùng stack Nuxt 4 + Nitro + Drizzle + Cloudflare D1/Pages), dữ liệu và deploy riêng.

- **Hôm nay** — streak, giáo án có lịch hôm nay, phút tập theo tuần, heatmap 12 tuần.
- **Giáo án** — danh sách bài có thứ tự, thông số riêng từng bài, lịch theo thứ trong tuần.
- **Bài tập** — thư viện theo nhóm; 3 cách tập: đếm số lần / giữ–thả theo nhịp / theo thời gian.
- **Màn hình tập** — đếm ngược, nhịp siết/thả tự động, bíp + rung + giọng đọc tiếng Việt, giữ màn hình sáng; hết bài tự lưu.
- **Lịch sử** — buổi tập theo ngày, cảm giác, ghi chú, ghi thủ công buổi tập ngoài app.

```bash
yarn install && cp .env.example .env && yarn db:migrate:local && yarn dev
```

Chi tiết: [docs/installation.md](docs/installation.md) · Deploy: [docs/deploy.md](docs/deploy.md) · Quy ước cho agent: [CLAUDE.md](CLAUDE.md)
