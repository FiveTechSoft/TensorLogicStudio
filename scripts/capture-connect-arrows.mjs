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
await page.waitForTimeout(800)

// New project
page.once('dialog', (d) => d.accept())
await page.getByRole('button', { name: 'New', exact: true }).click()
await page.waitForTimeout(700)

await page.getByRole('button', { name: '+ New Tensor' }).click()
await page.waitForTimeout(700)
await page.getByRole('button', { name: '+ New Tensor' }).click()
await page.waitForTimeout(1000)

const r1 = page.locator('.react-flow__node').filter({ hasText: /^R1/ }).first()
const r2 = page.locator('.react-flow__node').filter({ hasText: /^R2/ }).first()
console.log('boxes', await r1.boundingBox(), await r2.boundingBox())

// Prefer exact data attributes from React Flow
let sourceHandle = page.locator('[data-nodeid="relation:R1"][data-handleid="data-out"]')
let targetHandle = page.locator('[data-nodeid="relation:R2"][data-handleid="data-in"]')
if ((await sourceHandle.count()) === 0) {
  sourceHandle = r1.locator('.react-flow__handle-right').first()
}
if ((await targetHandle.count()) === 0) {
  targetHandle = r2.locator('.react-flow__handle-left').first()
}

console.log('handles', await sourceHandle.count(), await targetHandle.count())

// Method 1: dragTo
await sourceHandle.dragTo(targetHandle, { force: true })
await page.waitForTimeout(600)
let edgeCount = await page.locator('.react-flow__edge').count()
console.log('edges after dragTo', edgeCount)

// Method 2: programmatic API
if (edgeCount === 0) {
  const ok = await page.evaluate(() => {
    const fn = window.__tlsConnect
    if (!fn) return false
    // Find node ids from DOM
    const nodes = [...document.querySelectorAll('.react-flow__node')]
    const ids = nodes.map((n) => n.getAttribute('data-id')).filter(Boolean)
    const r1id = ids.find((id) => id.includes('R1') || id.endsWith(':R1'))
    const r2id = ids.find((id) => id.includes('R2') || id.endsWith(':R2'))
    console.log('ids', ids, r1id, r2id)
    if (!r1id || !r2id) return false
    return fn(r1id, r2id)
  })
  console.log('programmatic connect', ok)
  await page.waitForTimeout(500)
  edgeCount = await page.locator('.react-flow__edge').count()
  console.log('edges after programmatic', edgeCount)
}

// Method 3: pointer events sequence
if (edgeCount === 0) {
  const a = await sourceHandle.boundingBox()
  const b = await targetHandle.boundingBox()
  if (a && b) {
    const ax = a.x + a.width / 2
    const ay = a.y + a.height / 2
    const bx = b.x + b.width / 2
    const by = b.y + b.height / 2
    await page.mouse.move(ax, ay)
    await page.mouse.down({ button: 'left' })
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(ax + ((bx - ax) * i) / 12, ay + ((by - ay) * i) / 12)
    }
    await page.mouse.up({ button: 'left' })
    await page.waitForTimeout(500)
    edgeCount = await page.locator('.react-flow__edge').count()
    console.log('edges after mouse path', edgeCount)
  }
}

await page.screenshot({ path: path.join(outDir, 'connect-arrows.png') })
await page
  .locator('section')
  .filter({ hasText: 'Tensor Graph' })
  .first()
  .screenshot({ path: path.join(outDir, 'connect-arrows-center.png') })

const nodeTexts = await page.locator('.react-flow__node').allTextContents()
console.log('nodes', nodeTexts)
console.log('edgeCount final', edgeCount)

await browser.close()
if (edgeCount < 1) {
  console.error('FAIL: no edge')
  process.exit(2)
}
console.log('OK')
