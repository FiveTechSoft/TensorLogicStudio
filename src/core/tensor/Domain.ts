export class Domain {
  private symToIdx = new Map<string, number>()
  private idxToSym: string[] = []

  index(symbol: string): number {
    let i = this.symToIdx.get(symbol)
    if (i === undefined) {
      i = this.idxToSym.length
      this.symToIdx.set(symbol, i)
      this.idxToSym.push(symbol)
    }
    return i
  }

  symbol(i: number): string {
    return this.idxToSym[i] ?? String(i)
  }

  get size() {
    return this.idxToSym.length
  }

  symbols(): string[] {
    return [...this.idxToSym]
  }
}
