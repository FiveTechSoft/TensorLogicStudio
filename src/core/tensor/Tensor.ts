function keyOf(tuple: string[]): string {
  return tuple.join('\u0001')
}

export class SparseBoolTensor {
  private data = new Set<string>()
  readonly rank: number
  constructor(rank: number) {
    this.rank = rank
  }

  add(tuple: string[]): void {
    if (tuple.length !== this.rank) throw new Error(`rank ${this.rank}, got ${tuple.length}`)
    this.data.add(keyOf(tuple))
  }

  has(tuple: string[]): boolean {
    return this.data.has(keyOf(tuple))
  }

  get size() {
    return this.data.size
  }

  tuples(): string[][] {
    return [...this.data].map((k) => k.split('\u0001'))
  }

  clear(): void {
    this.data.clear()
  }

  /** Boolean adjacency matrix over domain symbols for rank-2. */
  toDenseMatrix(rows: string[], cols: string[]): number[][] {
    if (this.rank !== 2) throw new Error('toDenseMatrix requires rank 2')
    return rows.map((r) => cols.map((c) => (this.has([r, c]) ? 1 : 0)))
  }
}

export class DenseTensor {
  data: Float64Array
  shape: number[]
  constructor(shape: number[], fill = 0) {
    this.shape = shape
    const n = shape.reduce((a, b) => a * b, 1)
    this.data = new Float64Array(n)
    if (fill !== 0) this.data.fill(fill)
  }

  private offset(indices: number[]): number {
    let o = 0
    for (let i = 0; i < this.shape.length; i++) {
      o = o * this.shape[i] + indices[i]
    }
    return o
  }

  get(indices: number[]): number {
    return this.data[this.offset(indices)]
  }

  set(indices: number[], v: number): void {
    this.data[this.offset(indices)] = v
  }

  clone(): DenseTensor {
    const t = new DenseTensor(this.shape)
    t.data.set(this.data)
    return t
  }
}
