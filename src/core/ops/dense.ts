import { DenseTensor } from '../tensor/Tensor'

export function relu(x: number): number {
  return x > 0 ? x : 0
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

/**
 * Matrix product:
 * - W[m,n] × X[n] → Y[m]
 * - W[m,n] × X[n,p] → Y[m,p]
 */
export function matmul(W: DenseTensor, X: DenseTensor): DenseTensor {
  if (W.shape.length === 2 && X.shape.length === 1) {
    const [m, n] = W.shape
    if (X.shape[0] !== n) throw new Error('matmul shape')
    const Y = new DenseTensor([m!])
    for (let i = 0; i < m!; i++) {
      let s = 0
      for (let j = 0; j < n!; j++) s += W.get([i, j]) * X.get([j])
      Y.set([i], s)
    }
    return Y
  }
  if (W.shape.length === 2 && X.shape.length === 2) {
    const [m, n] = W.shape
    const [n2, p] = X.shape
    if (n !== n2) {
      throw new Error(`matmul shape: [${m},${n}] × [${n2},${p}]`)
    }
    const Y = new DenseTensor([m!, p!])
    for (let i = 0; i < m!; i++) {
      for (let k = 0; k < p!; k++) {
        let s = 0
        for (let j = 0; j < n!; j++) s += W.get([i, j]) * X.get([j, k])
        Y.set([i, k], s)
      }
    }
    return Y
  }
  throw new Error(`unsupported matmul shapes ${W.shape} x ${X.shape}`)
}

export function mapDense(t: DenseTensor, fn: (x: number) => number): DenseTensor {
  const o = t.clone()
  for (let i = 0; i < o.data.length; i++) o.data[i] = fn(o.data[i]!)
  return o
}

/**
 * Softmax over the last axis:
 * - 1D vector → standard softmax
 * - 2D matrix → row-wise softmax (attention-friendly)
 */
export function softmaxDense(t: DenseTensor): DenseTensor {
  if (t.shape.length === 1) {
    const n = t.shape[0]!
    let max = -Infinity
    for (let i = 0; i < n; i++) max = Math.max(max, t.get([i]))
    const o = t.clone()
    let sum = 0
    for (let i = 0; i < n; i++) {
      const e = Math.exp(t.get([i]) - max)
      o.set([i], e)
      sum += e
    }
    if (sum > 0) {
      for (let i = 0; i < n; i++) o.set([i], o.get([i]) / sum)
    }
    return o
  }
  if (t.shape.length === 2) {
    const [rows, cols] = t.shape
    const o = t.clone()
    for (let r = 0; r < rows!; r++) {
      let max = -Infinity
      for (let c = 0; c < cols!; c++) max = Math.max(max, t.get([r, c]))
      let sum = 0
      for (let c = 0; c < cols!; c++) {
        const e = Math.exp(t.get([r, c]) - max)
        o.set([r, c], e)
        sum += e
      }
      if (sum > 0) {
        for (let c = 0; c < cols!; c++) o.set([r, c], o.get([r, c]) / sum)
      }
    }
    return o
  }
  // Fallback: flatten then 1D softmax
  const flat = new DenseTensor([t.data.length])
  flat.data.set(t.data)
  return softmaxDense(flat)
}
