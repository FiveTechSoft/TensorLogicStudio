import { SparseBoolTensor } from '../tensor/Tensor'

export interface JoinInput {
  tensor: SparseBoolTensor
  vars: string[]
}

/**
 * Natural join of sparse Boolean relations on shared variable names,
 * then project onto `outVars` (existential: any match → true).
 */
export function joinProject(inputs: JoinInput[], outVars: string[]): SparseBoolTensor {
  if (inputs.length === 0) return new SparseBoolTensor(outVars.length)

  type Binding = Record<string, string>
  let rows: Binding[] = inputs[0].tensor.tuples().map((t) => {
    const b: Binding = {}
    inputs[0].vars.forEach((v, i) => {
      b[v] = t[i]
    })
    return b
  })

  for (let k = 1; k < inputs.length; k++) {
    const next: Binding[] = []
    const rel = inputs[k]
    for (const left of rows) {
      for (const tup of rel.tensor.tuples()) {
        const cand: Binding = { ...left }
        let ok = true
        for (let i = 0; i < rel.vars.length; i++) {
          const v = rel.vars[i]
          const val = tup[i]
          if (v in cand && cand[v] !== val) {
            ok = false
            break
          }
          cand[v] = val
        }
        if (ok) next.push(cand)
      }
    }
    rows = next
  }

  const out = new SparseBoolTensor(outVars.length)
  for (const b of rows) {
    out.add(outVars.map((v) => b[v]))
  }
  return out
}

export function stepBool(x: number): number {
  return x > 0 ? 1 : 0
}

export function unionSparse(a: SparseBoolTensor, b: SparseBoolTensor): SparseBoolTensor {
  if (a.rank !== b.rank) throw new Error('rank mismatch')
  const u = new SparseBoolTensor(a.rank)
  for (const t of a.tuples()) u.add(t)
  for (const t of b.tuples()) u.add(t)
  return u
}
