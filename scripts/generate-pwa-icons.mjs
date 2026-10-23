// Sinh bộ icon PWA từ public/pwa-icon-source.svg. Chạy lại mỗi khi đổi icon.
// sharp KHÔNG nằm trong dependencies (chỉ dùng một lần) — cài tạm hoặc trỏ SHARP_PATH:
//   yarn add -D sharp && node scripts/generate-pwa-icons.mjs && yarn remove sharp
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sharp = (await import(process.env.SHARP_PATH ?? 'sharp')).default
const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const BG = '#0c1424'

const source = await readFile(resolve(PUBLIC_DIR, 'pwa-icon-source.svg'), 'utf8')
// Bản vuông (không bo góc) — iOS/Android tự bo; bo sẵn sẽ lộ góc nền.
const square = source.replace('rx="112"', 'rx="0"')
// Maskable: thu nội dung còn 80% vào giữa (safe zone), nền tràn viền.
const maskable = square
  .replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${BG}"/><g transform="translate(51.2 51.2) scale(0.8)">`)
  .replace('</svg>', '</g></svg>')

const targets = [
  { name: 'pwa-192x192.png', size: 192, svg: square },
  { name: 'pwa-512x512.png', size: 512, svg: square },
  { name: 'maskable-512x512.png', size: 512, svg: maskable },
  { name: 'apple-touch-icon-180x180.png', size: 180, svg: square },
]

for (const t of targets) {
  const out = resolve(PUBLIC_DIR, t.name)
  await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(out)
  console.log('✓', out)
}
