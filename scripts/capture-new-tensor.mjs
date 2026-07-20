import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../screenshots')
fs.mkdirSync(outDir, { recursive: true })

const url = process.env.TLS_URL || 'http://127.0.0.1:5173/'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.waitForSelector('text=+ New Tensor', { timeout: 30000 })

await page.getByRole('button', { name: '+ New Tensor' }).click()
await page.waitForTimeout(2000)

const r1 = page.locator('.react-flow__node').filter({ hasText: 'R1' }).first()
const styles = await r1.evaluate((el) => {
  const s = getComputedStyle(el)
  return {
    visibility: s.visibility,
    opacity: s.opacity,
    transform: s.transform,
    w: el.offsetWidth,
    h: el.offsetHeight,
  }
})
const box = await r1.boundingBox()
console.log('styles', styles)
console.log('box', box)
console.log('visible', await r1.isVisible())

const full = path.join(outDir, 'new-tensor-box.png')
const centerPath = path.join(outDir, 'new-tensor-center.png')
await page.screenshot({ path: full })
const center = page.locator('section').filter({ hasText: 'Tensor Graph' }).first()
await center.screenshot({ path: centerPath })

console.log('wrote', full)
console.log('wrote', centerPath)

await browser.close()

if (styles.visibility === 'hidden') {
  console.error('FAIL: still visibility:hidden')
  process.exit(1)
}
if (!box || box.width < 20) {
  console.error('FAIL: no bounding box')
  process.exit(2)
}
// Must be roughly inside the center column (not off-screen)
if (box.y < 0 || box.y > 900) {
  console.error('FAIL: box outside vertical viewport', box)
  process.exit(3)
}
console.log('OK: tensor box visible')
