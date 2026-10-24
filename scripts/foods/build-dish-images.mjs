// Sinh ảnh mẫu cho món mẫu từ scripts/foods/dish-images.mjs: lấy tác giả + giấy phép từ API
// Wikimedia Commons, tải thumbnail chuẩn 960px (cache ở .cache/dish-images/), cắt về WebP 800×600
// vào public/seed/dishes/<slug>.webp, và ghi migration chèn nutrition_media.
//
//   node scripts/foods/build-dish-images.mjs <file-migration.sql>
//
// Ảnh là file tĩnh đi kèm app (migration không ghi được R2): offline vẫn có, không phụ thuộc
// Commons lúc chạy. `credit` + `source_url` là điều kiện giấy phép CC BY / BY-SA — UI phải hiện.
// SQL trỏ món theo tên + source = 'preset' và bỏ qua món đã có ảnh (người dùng tự thêm trước
// khi migration chạy) ⇒ chạy trên DB nào cũng an toàn. Chỉ ghi vào migration CHƯA apply.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { DISH_IMAGES } from './dish-images.mjs'
import { DISHES } from './dishes.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = join(ROOT, '.cache', 'dish-images')
const OUT_DIR = join(ROOT, 'public', 'seed', 'dishes')
const UA = 'mia-health-dish-images/1.0 (https://github.com/TuanPhamHP/mia-health)'
const FREE_LICENSE = /^(cc0|cc[- ]by(-sa)?[- ][\d.]+.*|public domain|pd.*)$/i

const outFile = process.argv[2]
if (!outFile) {
  console.error('Thiếu đường dẫn file migration. VD: node scripts/foods/build-dish-images.mjs server/database/migrations/0011_seed_dish_images.sql')
  process.exit(1)
}
mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const strip = (html) => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const sql = (s) => `'${s.replace(/'/g, "''")}'`
const slugify = (name) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const presetNames = new Set(DISHES.map((d) => d.name))
const problems = DISH_IMAGES.filter(([dish]) => !presetNames.has(dish)).map(([dish]) => `Không có món mẫu tên "${dish}"`)

// imageinfo theo lô 50 tiêu đề (trần của API).
const info = new Map()
for (let i = 0; i < DISH_IMAGES.length; i += 50) {
  const titles = DISH_IMAGES.slice(i, i + 50).map(([, file]) => file)
  const params = new URLSearchParams({
    action: 'query', format: 'json', titles: titles.join('|'), prop: 'imageinfo',
    iiprop: 'url|extmetadata', iiurlwidth: '960', iiextmetadatafilter: 'Artist|LicenseShortName',
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  const json = await res.json()
  const normalized = new Map((json.query.normalized ?? []).map((n) => [n.to, n.from]))
  for (const page of Object.values(json.query.pages)) {
    const ii = page.imageinfo?.[0]
    if (ii) info.set(normalized.get(page.title) ?? page.title, ii)
  }
}

const statements = []
for (const [dish, file, crop] of DISH_IMAGES) {
  const ii = info.get(file)
  if (!ii) {
    problems.push(`Không tìm thấy trên Commons: ${file}`)
    continue
  }
  const license = strip(ii.extmetadata?.LicenseShortName?.value)
  if (!FREE_LICENSE.test(license)) {
    problems.push(`${dish}: giấy phép không tự do "${license}" (${file})`)
    continue
  }
  // Chữ ký wiki kèm link trang thảo luận: "Mkat (thảo luận)" / "(talk)" — bỏ phần đuôi.
  const artist = strip(ii.extmetadata?.Artist?.value).replace(/\s*\((thảo luận|talk)\)$/i, '') || 'Wikimedia Commons'
  const slug = slugify(dish)
  const cached = join(CACHE, `${slug}.jpg`)
  if (!existsSync(cached)) {
    const img = await fetch(ii.thumburl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
    if (!img.ok) throw new Error(`${dish}: tải ảnh lỗi ${img.status}`)
    writeFileSync(cached, Buffer.from(await img.arrayBuffer()))
  }
  // Cắt về 4:3 (ảnh dọc trong dải ảnh ngang bị viền đen hai bên); `attention` giữ vùng nổi bật — món.
  await sharp(readFileSync(cached))
    .rotate()
    .resize({ width: 800, height: 600, fit: 'cover', position: crop ?? sharp.strategy.attention })
    .webp({ quality: 72 })
    .toFile(join(OUT_DIR, `${slug}.webp`))
  statements.push(
    `INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)\n` +
      `SELECT id, 0, 'image', ${sql(`/seed/dishes/${slug}.webp`)}, ${sql(`${artist} · ${license}`)}, ${sql(ii.descriptionurl)}\n` +
      `FROM dishes WHERE source = 'preset' AND name = ${sql(dish)}\n` +
      `  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);`,
  )
  console.log(`${dish.padEnd(26)} ${license.padEnd(14)} ${artist.slice(0, 40)}`)
}

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

const header = [
  '-- Ảnh mẫu cho món mẫu — SINH bởi scripts/foods/build-dish-images.mjs từ scripts/foods/dish-images.mjs, KHÔNG sửa tay.',
  '-- Ảnh: Wikimedia Commons, giấy phép tự do; file tĩnh ở public/seed/dishes/. credit + source_url phải hiện kèm ảnh.',
]
writeFileSync(outFile, `${header.join('\n')}\n${statements.join('\n--> statement-breakpoint\n')}\n`)
console.log(`${statements.length} ảnh → ${outFile}`)
