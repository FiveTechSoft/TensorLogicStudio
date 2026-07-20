import { chromium } from 'playwright'
import fs from 'node:fs'

fs.mkdirSync('screenshots', { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)

page.once('dialog', (d) => d.accept())
await page.getByRole('button', { name: 'New', exact: true }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: '+ New Tensor' }).click()
await page.waitForTimeout(900)
await page.getByRole('button', { name: '+ New Tensor' }).click()
await page.waitForTimeout(1100)

const r1 = page.locator('.react-flow__node').filter({ hasText: 'R1' }).first()
const r2 = page.locator('.react-flow__node').filter({ hasText: 'R2' }).first()
console.log('R1', await r1.boundingBox())
console.log('R2', await r2.boundingBox())

// Programmatic connect (always works on store + overlay)
const ok = await page.evaluate(() => {
  const d = window.__tlsDumpGraph()
  return window.__tlsConnect(
    d.nodes.find((i) => i.includes('R1')),
    d.nodes.find((i) => i.includes('R2')),
  )
})
console.log('connect', ok, await page.evaluate(() => window.__tlsDumpGraph()))
await page.waitForTimeout(500)

const cyan = await page.evaluate(
  () =>
    [...document.querySelectorAll('path')].filter((p) => {
      const s = p.getAttribute('stroke') || ''
      return s === '#38bdf8' || s.includes('56, 189, 248')
    }).length,
)
console.log('cyan arrow paths', cyan)

await page.screenshot({ path: 'screenshots/connect-arrows.png' })
await page
  .locator('section')
  .filter({ hasText: 'Tensor Graph' })
  .first()
  .screenshot({ path: 'screenshots/connect-arrows-center.png' })

// Drag test with force + spaced boxes
const sh = page.locator('[data-nodeid="relation-R1"][data-handleid="data-out"]')
const th = page.locator('[data-nodeid="relation-R2"][data-handleid="data-in"]')
console.log('handles', await sh.count(), await th.count())
if ((await sh.count()) && (await th.count())) {
  const a = await sh.boundingBox()
  const b = await th.boundingBox()
  console.log('handle boxes', a, b)
  if (a && b) {
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 25 })
    await page.mouse.up()
    await page.waitForTimeout(400)
    console.log('after mouse drag store', await page.evaluate(() => window.__tlsEdgeCount()))
  }
}

await page
  .locator('section')
  .filter({ hasText: 'Tensor Graph' })
  .first()
  .screenshot({ path: 'screenshots/connect-arrows-final.png' })

await browser.close()
console.log(cyan >= 1 ? 'OK: arrow painted' : 'FAIL: no cyan arrow')
process.exit(cyan >= 1 ? 0 : 2)
