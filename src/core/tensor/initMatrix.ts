export type InitMode = 'zeros' | 'random'

export function defaultDomainLabels(n = 4): string[] {
  return Array.from({ length: n }, (_, i) => `e${i + 1}`)
}

/** Square matrix filled with 0 or random 0/1 (bool) / reals (dense). */
export function createInitMatrix(
  mode: InitMode,
  rows: number,
  cols: number,
  kind: 'bool' | 'dense',
): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => {
      if (mode === 'zeros') return 0
      if (kind === 'bool') {
        // ~35% ones so the sheet is not empty noise
        return Math.random() < 0.35 ? 1 : 0
      }
      // Dense: uniform in [-1, 1], 3 decimals
      return Math.round((Math.random() * 2 - 1) * 1000) / 1000
    }),
  )
}

export function matrixToRowMajor(matrix: number[][]): number[] {
  return matrix.flatMap((row) => row)
}
