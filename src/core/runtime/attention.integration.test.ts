import { describe, it, expect } from 'vitest'
import { Runtime } from './Runtime'

describe('attention block (transformer example)', () => {
  it('computes Scores → Softmax Attn → Out = Attn·V', () => {
    const rt = new Runtime()
    // Q 2×2, KT 2×2, V 2×2 — tiny
    rt.seedDense('Q', [2, 2], [1, 0, 0, 1])
    rt.seedDense('KT', [2, 2], [1, 0, 0, 1])
    rt.seedDense('V', [2, 2], [2, 0, 0, 3])
    rt.loadSource(`
Scores[i,j] = Q[i,k] * KT[k,j].
Attn[i,j] = softmax(Scores[i,j]).
Out[i,d] = Attn[i,j] * V[j,d].
`)
    rt.run({ mode: 'forward' })

    const scores = rt.getDense('Scores')!
    expect(scores.shape).toEqual([2, 2])
    // Q=I, KT=I → Scores=I
    expect(scores.get([0, 0])).toBeCloseTo(1)
    expect(scores.get([0, 1])).toBeCloseTo(0)

    const attn = rt.getDense('Attn')!
    expect(attn.shape).toEqual([2, 2])
    // row-softmax of [1,0] ≈ [e/(e+1), 1/(e+1)]
    const e = Math.exp(1)
    expect(attn.get([0, 0])).toBeCloseTo(e / (e + 1))
    expect(attn.get([0, 1])).toBeCloseTo(1 / (e + 1))
    expect(attn.get([0, 0]) + attn.get([0, 1])).toBeCloseTo(1)

    const out = rt.getDense('Out')!
    expect(out.shape).toEqual([2, 2])
  })
})
