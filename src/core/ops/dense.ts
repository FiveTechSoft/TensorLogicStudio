import { DenseTensor } from '../tensor/Tensor'

export function relu(x: number): number {
  return x > 0 ? x : 0
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

/** W[m,n] * X[n] → Y[m]  or W[m,n] * X[n,p] → Y[m,p] */
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
  throw new Error(`unsupported matmul shapes ${W.shape} x ${X.shape}`)
}

export function mapDense(t: DenseTensor, fn: (x: number) => number): DenseTensor {
  const o = t.clone()
  for (let i = 0; i < o.data.length; i++) o.data[i] = fn(o.data[i]!)
  return o
}
