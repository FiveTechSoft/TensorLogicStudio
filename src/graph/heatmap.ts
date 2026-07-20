/** Heat colors matching the Studio mockup (cyan → amber → orange → red). */

export function heatRgb(t: number): string {
  const x = Math.min(1, Math.max(0, t))
  // 0: deep slate-blue, mid: cyan, high: amber, peak: orange-red
  if (x < 0.2) {
    const u = x / 0.2
    return lerpRgb([15, 23, 42], [30, 64, 120], u)
  }
  if (x < 0.45) {
    const u = (x - 0.2) / 0.25
    return lerpRgb([30, 64, 120], [34, 211, 238], u)
  }
  if (x < 0.7) {
    const u = (x - 0.45) / 0.25
    return lerpRgb([34, 211, 238], [251, 191, 36], u)
  }
  if (x < 0.9) {
    const u = (x - 0.7) / 0.2
    return lerpRgb([251, 191, 36], [249, 115, 22], u)
  }
  const u = (x - 0.9) / 0.1
  return lerpRgb([249, 115, 22], [239, 68, 68], u)
}

function lerpRgb(a: number[], b: number[], t: number): string {
  const r = Math.round(a[0]! + (b[0]! - a[0]!) * t)
  const g = Math.round(a[1]! + (b[1]! - a[1]!) * t)
  const bl = Math.round(a[2]! + (b[2]! - a[2]!) * t)
  return `rgb(${r},${g},${bl})`
}

/** Normalize absolute values of a flat buffer into [0,1] cells. */
export function normalizeHeat(values: number[]): number[] {
  let max = 0
  for (const v of values) max = Math.max(max, Math.abs(v))
  if (max <= 0) return values.map(() => 0)
  return values.map((v) => Math.abs(v) / max)
}

/** Build a small preview grid from dense row-major data. */
export function gridFromDense(
  shape: number[],
  data: number[],
  maxCells = 25,
): { rows: number; cols: number; cells: number[] } {
  if (shape.length === 1) {
    const n = Math.min(shape[0]!, maxCells)
    const slice = data.slice(0, n)
    return { rows: 1, cols: n, cells: normalizeHeat(slice) }
  }
  if (shape.length >= 2) {
    const rows = Math.min(shape[0]!, Math.floor(Math.sqrt(maxCells)) + 2)
    const cols = Math.min(shape[1]!, Math.ceil(maxCells / Math.max(1, rows)))
    const cells: number[] = []
    const raw: number[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * shape[1]! + c
        raw.push(data[idx] ?? 0)
      }
    }
    const norm = normalizeHeat(raw)
    for (const v of norm) cells.push(v)
    return { rows, cols, cells }
  }
  return { rows: 0, cols: 0, cells: [] }
}
