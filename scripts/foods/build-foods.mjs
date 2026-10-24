// Sinh migration dữ liệu kho thực phẩm từ nguồn gốc, để số liệu luôn truy ngược được:
//   - Bảng thành phần thực phẩm Việt Nam 2007 — Viện Dinh dưỡng, NXB Y học (bản PDF FAO lưu trữ):
//     526 thực phẩm, số liệu trên 100 g phần ăn được + tỷ lệ thải bỏ.
//   - USDA FoodData Central, SR Legacy 04/2018 (public domain): các phần thịt chi tiết bảng VN
//     không tách (ức / đùi / cánh, có / không da) và vài món chín thông dụng — chọn ở curation.mjs.
// Cần `pdftotext` (poppler-utils) và `unzip`. Dữ liệu gốc tải vào .cache/foods/ (không commit).
//
//   node scripts/foods/build-foods.mjs <file-migration.sql>
//
// Chỉ ghi vào migration CHƯA apply (tạo bằng `drizzle-kit generate --custom`); dữ liệu đổi về sau
// thì sinh migration mới, không sửa migration đã chạy.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, PORTIONS, USDA_PICKS, VN_RENAMES, VN_RULES } from './curation.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = join(ROOT, '.cache', 'foods')
const VN_PDF_URL = 'https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf'
const USDA_ZIP_URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip'

const outFile = process.argv[2]
if (!outFile) {
  console.error('Thiếu đường dẫn file migration. VD: node scripts/foods/build-foods.mjs server/database/migrations/0005_seed_foods.sql')
  process.exit(1)
}

async function download(url, file) {
  if (existsSync(file)) return
  console.log('↓', url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Tải ${url} lỗi ${res.status}`)
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
}

mkdirSync(CACHE, { recursive: true })
const pdf = join(CACHE, 'VTN_FCT_2007.pdf')
const zip = join(CACHE, 'sr_legacy.zip')
await download(VN_PDF_URL, pdf)
await download(USDA_ZIP_URL, zip)

// Cột dinh dưỡng — khớp `nutrientColumns` ở server/database/schema.ts (test migration bắt lệch).
const NUTRIENT_COLUMNS = {
  energyKcal: 'energy_kcal', waterG: 'water_g', proteinG: 'protein_g', fatG: 'fat_g', satFatG: 'sat_fat_g',
  monoFatG: 'mono_fat_g', polyFatG: 'poly_fat_g', transFatG: 'trans_fat_g', cholesterolMg: 'cholesterol_mg',
  carbG: 'carb_g', fiberG: 'fiber_g', sugarG: 'sugar_g', sodiumMg: 'sodium_mg', potassiumMg: 'potassium_mg',
  calciumMg: 'calcium_mg', phosphorusMg: 'phosphorus_mg', magnesiumMg: 'magnesium_mg', ironMg: 'iron_mg',
  zincMg: 'zinc_mg', vitaminAUg: 'vitamin_a_ug', vitaminB1Mg: 'vitamin_b1_mg', vitaminB2Mg: 'vitamin_b2_mg',
  niacinMg: 'niacin_mg', vitaminB6Mg: 'vitamin_b6_mg', folateUg: 'folate_ug', vitaminB12Ug: 'vitamin_b12_ug',
  vitaminCMg: 'vitamin_c_mg', vitaminDUg: 'vitamin_d_ug', vitaminEMg: 'vitamin_e_mg',
}

// ---------------------------------------------------------------------------
// Bảng VN: mỗi thực phẩm một trang, tên tiếng Việt mã TCVN3 (ABC) ⇒ đổi sang Unicode.
// ---------------------------------------------------------------------------

const TCVN3 = {
  '¨': 'ă', '©': 'â', 'ª': 'ê', '«': 'ô', '¬': 'ơ', '­': 'ư', '−': 'ư', '®': 'đ', '¡': 'Ă', '¢': 'Â', '£': 'Ê', '¤': 'Ô',
  '¥': 'Ơ', '¦': 'Ư', '§': 'Đ', 'µ': 'à', 'μ': 'à', '¶': 'ả', '·': 'ã', '¸': 'á', '¹': 'ạ', '»': 'ằ', '¼': 'ẳ', '½': 'ẵ',
  '¾': 'ắ', 'Æ': 'ặ', 'Ç': 'ầ', 'È': 'ẩ', 'É': 'ẫ', 'Ê': 'ấ', 'Ë': 'ậ', 'Ì': 'è', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ð': 'é', 'Ñ': 'ẹ',
  'Ò': 'ề', 'Ó': 'ể', 'Ô': 'ễ', 'Õ': 'ế', 'Ö': 'ệ', '×': 'ì', 'Ø': 'ỉ', 'Ü': 'ĩ', 'Ý': 'í', 'Þ': 'ị', 'ß': 'ò', 'á': 'ỏ',
  'â': 'õ', 'ã': 'ó', 'ä': 'ọ', 'å': 'ồ', 'æ': 'ổ', 'ç': 'ỗ', 'è': 'ố', 'é': 'ộ', 'ê': 'ờ', 'ë': 'ở', 'ì': 'ỡ', 'í': 'ớ',
  'î': 'ợ', 'ï': 'ù', 'ñ': 'ủ', 'ò': 'ũ', 'ó': 'ú', 'ô': 'ụ', 'õ': 'ừ', 'ö': 'ử', '÷': 'ữ', 'ø': 'ứ', 'ù': 'ự', 'ú': 'ỳ',
  'û': 'ỷ', 'ü': 'ỹ', 'ý': 'ý', 'þ': 'ỵ',
}
const fromTcvn3 = (s) => [...s].map((c) => TCVN3[c] ?? c).join('')
const capitalize = (s) => s.charAt(0).toLocaleUpperCase('vi') + s.slice(1)

const NUM = '(-|\\d+(?:\\.\\d+)?)'
const left = (label, unit) => new RegExp(`^\\s*${label}\\s+${unit}\\s+${NUM}`, 'm')
const right = (label, unit) => new RegExp(`${label}[^\\n]*?\\s${unit}\\s+${NUM}`, 'm')
const VN_FIELDS = {
  waterG: left('Nước \\(Water \\)', 'g'),
  energyKcal: left('Năng lượng \\(Energy \\)', 'KCal'),
  proteinG: left('Protein', 'g'),
  fatG: left('Lipid \\(Fat\\)', 'g'),
  carbG: left('Glucid \\(Carbohydrate\\)', 'g'),
  fiberG: left('Celluloza \\(Fiber\\)', 'g'),
  sugarG: left('Đường tổng số \\(Sugar\\)', 'g'),
  calciumMg: left('Calci \\(Calcium\\)', 'mg'),
  ironMg: left('Sắt \\(Iron\\)', 'mg'),
  magnesiumMg: left('Magiê \\(Magnesium\\)', 'mg'),
  phosphorusMg: left('Phospho \\(Phosphorous\\)', 'mg'),
  potassiumMg: left('Kali \\(Potassium\\)', 'mg'),
  sodiumMg: left('Natri \\(Sodium\\)', 'mg'),
  zincMg: left('Kẽm \\(Zinc\\)', 'mg'),
  vitaminCMg: left('Vitamin C \\(Ascorbic acid\\)', 'mg'),
  vitaminB1Mg: left('Vitamin B1 \\(Thiamine\\)', 'mg'),
  vitaminB2Mg: left('Vitamin B2 \\(Riboflavin\\)', 'mg'),
  niacinMg: left('Vitamin PP \\(Niacin\\)', 'mg'),
  vitaminB6Mg: left('Vitamin B6 \\(Pyridoxine\\)', 'mg'),
  folateUg: left('Folat \\(Folate\\)', 'μg'),
  vitaminB12Ug: left('Vitamin B12 \\(Cyanocobalamine\\)', 'μg'),
  retinolUg: left('Vitamin A \\(Retinol\\)', 'μg'),
  vitaminDUg: left('Vitamin D \\(Calciferol \\)', 'μg'),
  vitaminEMg: left('Vitamin E \\(Alpha-tocopherol \\)', 'mg'),
  betaCaroteneUg: left('Beta-caroten', 'μg'),
  // Một trang gốc in sai "béo" thành "bộo" — chấp nhận 1–2 ký tự bất kỳ.
  satFatG: right('Tổng số acid b\\S{1,2}o no', 'g'),
  monoFatG: right('TS acid béo không no 1 nối đôi', 'g'),
  polyFatG: right('TS acid béo không no nhiều nối đôi', 'g'),
  transFatG: right('TS acid béo trans \\(Total trans fatty acid\\)', 'g'),
  cholesterolMg: right('Cholesterol', 'mg'),
}

function parseVn() {
  const text = execFileSync('pdftotext', ['-layout', pdf, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8')
  // Một trang gốc thiếu dấu ":" sau "( Vietnamese)".
  const header = /Tªn thùc phÈm \(\s*Vietnamese\):?/
  const blocks = text.split(new RegExp(`(?=^\\s*${header.source})`, 'm')).filter((b) => header.test(b))
  return blocks.map((b) => {
    const head = b.match(/Tªn thùc phÈm \(\s*Vietnamese\):?\s+(.+?)\s{2,}STT:\s+(\d+)/)
    const en = b.match(/Tªn tiÕng Anh \(English\):\s+(.+?)\s{2,}M· sè:\s+(\d+)/)
    const refuse = b.match(/Th¶i bá \(%\):\s+(-|[\d.]+)/)
    if (!head || !en) throw new Error(`Không đọc được đầu trang: ${b.slice(0, 120)}`)
    const v = {}
    for (const [key, re] of Object.entries(VN_FIELDS)) {
      const m = b.match(re)
      v[key] = m && m[1] !== '-' ? Number(m[1]) : null
    }
    // Vitamin A quy ra RAE (IOM): retinol + β-caroten / 12.
    const { retinolUg, betaCaroteneUg, ...nutrients } = v
    nutrients.vitaminAUg =
      retinolUg === null && betaCaroteneUg === null ? null : round((retinolUg ?? 0) + (betaCaroteneUg ?? 0) / 12)
    return {
      stt: Number(head[2]),
      code: en[2],
      name: capitalize(fromTcvn3(head[1]).trim()),
      sourceName: en[1].trim() === '-' ? null : en[1].trim(),
      refusePct: refuse && refuse[1] !== '-' ? Number(refuse[1]) : null,
      nutrients,
    }
  })
}

// ---------------------------------------------------------------------------
// USDA SR Legacy (CSV)
// ---------------------------------------------------------------------------

const USDA_NUTRIENT_IDS = {
  1008: 'energyKcal', 1051: 'waterG', 1003: 'proteinG', 1004: 'fatG', 1258: 'satFatG', 1292: 'monoFatG',
  1293: 'polyFatG', 1257: 'transFatG', 1253: 'cholesterolMg', 1005: 'carbG', 1079: 'fiberG', 2000: 'sugarG',
  1093: 'sodiumMg', 1092: 'potassiumMg', 1087: 'calciumMg', 1091: 'phosphorusMg', 1090: 'magnesiumMg',
  1089: 'ironMg', 1095: 'zincMg', 1106: 'vitaminAUg', 1165: 'vitaminB1Mg', 1166: 'vitaminB2Mg', 1167: 'niacinMg',
  1175: 'vitaminB6Mg', 1177: 'folateUg', 1178: 'vitaminB12Ug', 1162: 'vitaminCMg', 1114: 'vitaminDUg', 1109: 'vitaminEMg',
}

function parseUsda() {
  const dir = join(CACHE, 'sr_legacy')
  if (!existsSync(dir)) execFileSync('unzip', ['-q', '-o', zip, '-d', dir])
  const csvDir = join(dir, 'FoodData_Central_sr_legacy_food_csv_2018-04')
  const wanted = new Set(USDA_PICKS.map((p) => String(p.fdc)))
  const names = new Map()
  for (const line of readFileSync(join(csvDir, 'food.csv'), 'utf8').split('\n')) {
    const m = line.match(/^"(\d+)","[^"]*","((?:[^"]|"")*)"/)
    if (m && wanted.has(m[1])) names.set(m[1], m[2].replaceAll('""', '"'))
  }
  const values = new Map()
  for (const line of readFileSync(join(csvDir, 'food_nutrient.csv'), 'utf8').split('\n')) {
    const m = line.match(/^"\d+","(\d+)","(\d+)","([^"]*)"/)
    if (!m || !wanted.has(m[1])) continue
    const key = USDA_NUTRIENT_IDS[m[2]]
    if (!key || m[3] === '') continue
    if (!values.has(m[1])) values.set(m[1], {})
    values.get(m[1])[key] = Number(m[3])
  }
  return USDA_PICKS.map((pick) => {
    const id = String(pick.fdc)
    if (!names.has(id)) throw new Error(`Không có FDC ${id} trong SR Legacy`)
    const raw = values.get(id) ?? {}
    const nutrients = Object.fromEntries(Object.keys(NUTRIENT_COLUMNS).map((k) => [k, raw[k] ?? null]))
    // USDA "Carbohydrate, by difference" GỒM xơ; app theo chuẩn Codex / bảng VN (không gồm xơ).
    if (nutrients.carbG !== null && nutrients.fiberG !== null) nutrients.carbG = round(Math.max(0, nutrients.carbG - nutrients.fiberG))
    return { code: id, name: pick.name, cat: pick.cat, sourceName: names.get(id), refusePct: null, nutrients }
  })
}

function round(n) {
  return Math.round(n * 1000) / 1000
}

// ---------------------------------------------------------------------------
// Ghép + kiểm + sinh SQL
// ---------------------------------------------------------------------------

const categories = []
const idByKey = new Map()
for (const [position, top] of CATEGORIES.entries()) {
  const id = categories.length + 1
  categories.push({ id, parentId: null, name: top.name, position })
  idByKey.set(top.key, id)
  for (const [childPos, child] of (top.children ?? []).entries()) {
    const childId = categories.length + 1
    categories.push({ id: childId, parentId: id, name: child.name, position: childPos })
    idByKey.set(child.key, childId)
  }
}

const topByVnGroup = new Map(CATEGORIES.map((c) => [c.vnGroup, c]))
const vn = parseVn()
const usda = parseUsda()
const foods = []

for (const f of vn) {
  const group = Number(f.code.length === 4 ? f.code[0] : f.code.slice(0, 2))
  const top = topByVnGroup.get(group)
  if (!top) throw new Error(`Không có nhóm cho mã ${f.code}`)
  let key = top.key
  const rules = VN_RULES[top.key]
  if (rules) key = rules.rules.find(([, re]) => re.test(f.name))?.[0] ?? rules.fallback
  foods.push({ ...f, name: VN_RENAMES[f.code] ?? f.name, categoryId: idByKey.get(key), source: 'vn_fct_2007' })
}
for (const f of usda) {
  const categoryId = idByKey.get(f.cat)
  if (!categoryId) throw new Error(`Loại "${f.cat}" không có trong CATEGORIES`)
  foods.push({ ...f, categoryId, source: 'usda_sr_legacy' })
}

const problems = []
const seen = new Map()
for (const f of foods) {
  const k = f.name.toLocaleLowerCase('vi')
  if (seen.has(k)) problems.push(`Trùng tên: "${f.name}" (${seen.get(k)} và ${f.code})`)
  seen.set(k, f.code)
  if (f.nutrients.energyKcal === null) problems.push(`Thiếu năng lượng: ${f.name}`)
}
for (const code of Object.keys(VN_RENAMES)) if (!vn.some((f) => f.code === code)) problems.push(`VN_RENAMES: không có mã ${code}`)
for (const name of Object.keys(PORTIONS)) if (!seen.has(name.toLocaleLowerCase('vi'))) problems.push(`PORTIONS: không có "${name}"`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

const sql = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`)
const out = [
  '-- Kho thực phẩm ban đầu — SINH bởi scripts/foods/build-foods.mjs, KHÔNG sửa tay.',
  `-- Nguồn: Bảng thành phần thực phẩm Việt Nam 2007 (Viện Dinh dưỡng; ${VN_PDF_URL})`,
  `--        USDA FoodData Central SR Legacy 2018-04 (${USDA_ZIP_URL})`,
  `-- ${categories.length} nhóm/loại, ${foods.length} thực phẩm (${vn.length} VN + ${usda.length} USDA).`,
]
out.push(
  `INSERT INTO food_categories (id, parent_id, name, position) VALUES\n${categories
    .map((c) => `(${c.id}, ${sql(c.parentId)}, ${sql(c.name)}, ${c.position})`)
    .join(',\n')};`,
)
const foodCols = ['id', 'category_id', 'name', 'source', 'source_code', 'source_name', 'refuse_pct', ...Object.values(NUTRIENT_COLUMNS)]
const rows = foods.map((f, i) => {
  f.id = i + 1
  const vals = [f.id, f.categoryId, f.name, f.source, f.code, f.sourceName, f.refusePct, ...Object.keys(NUTRIENT_COLUMNS).map((k) => f.nutrients[k])]
  return `(${vals.map(sql).join(', ')})`
})
for (let i = 0; i < rows.length; i += 40) {
  out.push(`--> statement-breakpoint\nINSERT INTO foods (${foodCols.join(', ')}) VALUES\n${rows.slice(i, i + 40).join(',\n')};`)
}
const portionRows = []
for (const [name, list] of Object.entries(PORTIONS)) {
  const food = foods.find((f) => f.name === name)
  for (const [position, [label, grams]] of list.entries()) portionRows.push(`(${food.id}, ${sql(label)}, ${grams}, ${position})`)
}
out.push(`--> statement-breakpoint\nINSERT INTO food_portions (food_id, name, grams, position) VALUES\n${portionRows.join(',\n')};`)
writeFileSync(outFile, out.join('\n') + '\n')

const perCategory = new Map()
for (const f of foods) perCategory.set(f.categoryId, (perCategory.get(f.categoryId) ?? 0) + 1)
console.log(`✓ ${outFile}: ${categories.length} nhóm/loại, ${foods.length} thực phẩm, ${portionRows.length} khẩu phần`)
for (const c of categories) {
  console.log(`${c.parentId ? '    ' : ''}${c.name}: ${perCategory.get(c.id) ?? 0}`)
}
