// Sinh migration dữ liệu món ăn mẫu từ scripts/foods/dishes.mjs. Chạy mọi migration trước đó vào
// SQLite trong bộ nhớ (node:sqlite) để tra nguyên liệu theo tên → (nguồn, mã gốc), tính dinh dưỡng
// một phần và đối chiếu kcal với nguồn công bố (`ref`).
//
//   node scripts/foods/build-dishes.mjs <file-migration.sql>
//
// SQL trỏ thực phẩm qua (source, source_code) — bền với việc người dùng đổi tên thực phẩm trước
// khi migration chạy. Chỉ ghi vào migration CHƯA apply.
import { DatabaseSync } from 'node:sqlite'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DISH_REFS, DISHES } from './dishes.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MIGRATIONS = join(ROOT, 'server', 'database', 'migrations')

const outFile = process.argv[2]
if (!outFile) {
  console.error('Thiếu đường dẫn file migration. VD: node scripts/foods/build-dishes.mjs server/database/migrations/0007_seed_dishes.sql')
  process.exit(1)
}

const db = new DatabaseSync(':memory:')
for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
  if (file === basename(outFile)) break // chỉ các migration TRƯỚC file đang sinh
  db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'))
}
const findFood = db.prepare('SELECT id, source, source_code, energy_kcal, protein_g, fat_g, carb_g FROM foods WHERE name = ?')

const problems = []
const names = new Set()
const report = []
for (const dish of DISHES) {
  if (names.has(dish.name.toLocaleLowerCase('vi'))) problems.push(`Trùng tên món: ${dish.name}`)
  names.add(dish.name.toLocaleLowerCase('vi'))
  const total = { kcal: 0, protein: 0, fat: 0, carb: 0 }
  dish.resolved = dish.ingredients.map(([name, grams]) => {
    const food = findFood.get(name)
    if (!food) {
      problems.push(`${dish.name}: không có thực phẩm "${name}"`)
      return null
    }
    if (!food.source_code) problems.push(`${dish.name}: "${name}" không có mã gốc`)
    const f = grams / 100
    total.kcal += food.energy_kcal * f
    total.protein += (food.protein_g ?? 0) * f
    total.fat += (food.fat_g ?? 0) * f
    total.carb += (food.carb_g ?? 0) * f
    return { food, grams }
  })
  const per = Object.fromEntries(Object.entries(total).map(([k, v]) => [k, v / dish.servings]))
  let check = ''
  if (dish.ref) {
    const [src, kcal, label] = dish.ref
    const diff = (per.kcal - kcal) / kcal
    check = `${src} "${label}" ${kcal} kcal → ${diff >= 0 ? '+' : ''}${Math.round(diff * 100)}%`
    if (Math.abs(diff) > 0.3) problems.push(`${dish.name}: lệch ${Math.round(diff * 100)}% so với ${check}`)
  }
  report.push(`${dish.name.padEnd(26)} ${String(Math.round(per.kcal)).padStart(4)} kcal  Đ ${per.protein.toFixed(1).padStart(5)}  B ${per.fat.toFixed(1).padStart(5)}  G ${per.carb.toFixed(1).padStart(5)}   ${check}`)
}
console.log('Một phần:\n' + report.join('\n'))
if (problems.length) {
  console.error('\n' + problems.join('\n'))
  process.exit(1)
}

const sql = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`)
const out = [
  '-- Món ăn mẫu — SINH bởi scripts/foods/build-dishes.mjs từ scripts/foods/dishes.mjs, KHÔNG sửa tay.',
  '-- Công thức: định lượng phổ biến (ước lượng); dinh dưỡng app tự tính từ thực phẩm trong kho.',
  `-- Đối chiếu kcal: ${Object.values(DISH_REFS).join('; ')}.`,
  `INSERT INTO dishes (id, name, category, description, servings, source) VALUES\n${DISHES.map(
    (d, i) => `(${i + 1}, ${sql(d.name)}, ${sql(d.category)}, ${sql(d.description)}, ${d.servings}, 'preset')`,
  ).join(',\n')};`,
]
// VALUES làm bảng tạm: column1 = dish_id, column2 = source, column3 = source_code, column4 = grams, column5 = position.
const rows = DISHES.flatMap((d, i) =>
  d.resolved.map(({ food, grams }, position) => `(${i + 1}, ${sql(food.source)}, ${sql(food.source_code)}, ${grams}, ${position})`),
)
for (let i = 0; i < rows.length; i += 80) {
  out.push(
    `--> statement-breakpoint\nINSERT INTO dish_ingredients (dish_id, food_id, grams, position)\nSELECT v.column1, f.id, v.column4, v.column5 FROM (VALUES\n${rows
      .slice(i, i + 80)
      .join(',\n')}\n) AS v JOIN foods f ON f.source = v.column2 AND f.source_code = v.column3;`,
  )
}
writeFileSync(outFile, out.join('\n') + '\n')
console.log(`\n✓ ${outFile}: ${DISHES.length} món, ${rows.length} nguyên liệu`)
