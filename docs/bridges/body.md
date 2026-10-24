# Bridge — Body (hồ sơ, cân nặng, BMI / TDEE, gợi ý món)

> Shape lấy từ response thật (`yarn dev` + curl, 2026-10-24). Phần 4 của module dinh dưỡng.

- **Hồ sơ** (`body_profile`, một dòng `id = 1`): giới tính, năm sinh, chiều cao, mức vận động, mục tiêu cân nặng (giảm / giữ / tăng + tốc độ kg/tuần + cân nặng đích).
- **Cân nặng** (`body_weights`): mỗi ngày tối đa một lần cân (unique `date`) — cân lại trong ngày ⇒ **ghi đè**.
- **Chỉ số** (`metrics`): KHÔNG lưu, tính mỗi lần đọc từ hồ sơ + lần cân **mới nhất** bằng pure function `shared/utils/body.ts` (có vitest). Công thức + nguồn: xem đầu file đó và ADR ở CLAUDE.md.
- **Mục tiêu đề xuất** chỉ là con số tính ra; bấm "Áp dụng" mới ghi vào `nutrition_targets` (mục tiêu nhật ký ăn — bridge meals). Người dùng vẫn tự sửa mục tiêu tay được, không bị ghi đè ngầm khi cân lại.
- **Gợi ý món**: chấm điểm món theo phần còn lại của ngày (`shared/utils/suggest.ts`).

`today` / `date` luôn là `'YYYY-MM-DD'` giờ địa phương do **client** gửi (`localDateIso()`): tuổi = năm của `today` − năm sinh.

## `BodyDTO`

```json
{
  "profile": {
    "sex": "male", "birthYear": 1996, "heightCm": 167, "activityLevel": "moderate",
    "goal": "lose", "goalRateKg": 0.5, "targetWeightKg": 65, "updatedAt": "2026-10-24T03:02:48.000Z"
  },
  "weights": [
    { "id": 2, "date": "2026-10-24", "weightKg": 74, "createdAt": "2026-10-24T03:02:48.000Z", "updatedAt": "2026-10-24T03:02:48.000Z" },
    { "id": 1, "date": "2026-10-17", "weightKg": 74.6, "createdAt": "2026-10-24T03:02:48.000Z", "updatedAt": null }
  ],
  "metrics": {
    "age": 30, "weightKg": 74, "weightDate": "2026-10-24",
    "bmi": 26.533758829646096, "bmiClass": "obese1",
    "healthyMinKg": 51.59465, "healthyMaxKg": 63.865809999999996,
    "bmr": 1638.75, "tdee": 2540.0625,
    "targets": { "energyKcal": 1990, "proteinG": 133, "fatG": 60, "carbG": 230, "fiberG": 28, "sodiumMg": 2000, "adjustKcal": -550, "floorApplied": false },
    "weeksToTarget": 18
  }
}
```

| Field | Ghi chú |
|-------|---------|
| `profile` | `null` khi chưa nhập hồ sơ |
| `activityLevel` | `'sedentary' \| 'light' \| 'moderate' \| 'active' \| 'very_active'` — hệ số 1,2 · 1,375 · 1,55 · 1,725 · 1,9; nhãn `ACTIVITY_LABELS` (`app/utils/body.ts`) |
| `goal` / `goalRateKg` | `'lose' \| 'maintain' \| 'gain'`; tốc độ 0–1 kg/tuần (giữ cân ⇒ FE gửi 0) |
| `weights` | Mới nhất trước, tối đa 60 lần |
| `metrics` | `null` khi chưa có hồ sơ HOẶC chưa cân lần nào. Số thô không làm tròn — FE tự định dạng |
| `bmiClass` | Ngưỡng **châu Á** (WHO WPRO 2000): `underweight` < 18,5 · `normal` < 23 · `overweight` < 25 · `obese1` < 30 · `obese2` |
| `healthyMinKg` / `healthyMaxKg` | Khoảng cân nặng có BMI 18,5–22,9 với chiều cao hiện tại |
| `targets.adjustKcal` | kcal mục tiêu − TDEE (âm = thâm hụt) |
| `targets.floorApplied` | Thâm hụt bị chặn ở sàn max(BMR, 1.500 nam / 1.200 nữ) ⇒ giảm chậm hơn tốc độ đã chọn |
| `weeksToTarget` | `null` khi giữ cân / không đặt cân nặng đích; `0` khi đã tới đích |

## `SuggestionsDTO`

```json
{
  "date": "2026-10-24",
  "remainingKcal": 1690.1975,
  "remainingProteinG": 102.5225,
  "items": [
    { "dishId": 55, "name": "Sinh tố whey chuối", "category": "drink", "energyKcal": 287.6, "proteinG": 33.364, "reasons": ["Nhiều đạm: 33 g"] },
    { "dishId": 4, "name": "Ức gà áp chảo", "category": "main", "energyKcal": 226.155, "proteinG": 33.785, "reasons": ["Nhiều đạm: 34 g"] }
  ]
}
```

- `remainingKcal` = mục tiêu − đã ăn (âm = đã vượt). `remainingProteinG = null` khi chưa đặt mục tiêu đạm.
- Tối đa 8 món, `energyKcal` / `proteinG` cho **1 phần**. Món chưa lưu trữ, có kcal > 0.
- Luật chấm (`suggestDishes`): ngân sách một bữa = min(còn lại, 700 kcal), cho lố tối đa 100 kcal; còn < 150 kcal ⇒ chỉ món ≤ 150 kcal (`reasons` có "Món nhẹ — sắp chạm mục tiêu kcal"). Còn thiếu > 10 g đạm (hoặc chưa đặt mục tiêu đạm) ⇒ 60% điểm cho mật độ đạm, 40% cho độ vừa ngân sách; ngược lại 25 / 75. Món **đã ăn trong ngày** bị trừ điểm xuống cuối (đổi món).
- `reasons` có thể rỗng; kcal KHÔNG nằm trong `reasons` (FE hiện riêng).

## Endpoints

Thao tác hồ sơ / cân nặng trả `BodyDTO` mới nhất — FE gán thẳng.

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/body` | query `today` **bắt buộc** | `BodyDTO` |
| PUT | `/api/body/profile` | `{ today, sex, birthYear (1920–2015), heightCm (100–250), activityLevel, goal, goalRateKg (0–1), targetWeightKg? (30–300 \| null) }` | `BodyDTO` |
| POST | `/api/body/weights` | `{ today, date, weightKg (25–300) }` — trùng `date` ⇒ ghi đè | `BodyDTO` |
| DELETE | `/api/body/weights/:id` | query `today` | `BodyDTO` |
| POST | `/api/body/apply-targets` | `{ today }` — ghi `metrics.targets` (kcal, đạm, béo, glucid, xơ, natri) vào mục tiêu nhật ký ăn | `NutritionTargetsDTO` |
| GET | `/api/meal-log/suggestions` | query `date` **bắt buộc** | `SuggestionsDTO` |

## Lỗi

| Status | Khi nào | message mẫu |
|--------|---------|-------------|
| 400 | zod sai / thiếu `today` | JSON array issue của zod (`Chiều cao 100–250 cm`, `Cân nặng 25–300 kg`, `Tối đa 1 kg / tuần`) |
| 400 | Áp mục tiêu khi chưa có hồ sơ hoặc chưa cân | `Cần nhập hồ sơ và ít nhất một lần cân trước` |
| 404 | id lần cân không tồn tại | `Lần cân không tồn tại` |
