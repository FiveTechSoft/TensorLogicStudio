import { describe, it, expect } from 'vitest'
import { Runtime } from './Runtime'

const SRC = `
parent(adam, seth).
parent(seth, enos).
parent(enos, cainan).
ancestor(X, Z) :- parent(X, Z).
ancestor(X, Z) :- ancestor(X, Y), parent(Y, Z).
?- ancestor(adam, Who).
`

describe('genealogy fixpoint', () => {
  it('derives all ancestors of adam', () => {
    const rt = new Runtime()
    rt.loadSource(SRC)
    const result = rt.run({ mode: 'forward' })
    expect(result.fixpoint).toBe(true)
    const bindings = rt.query({ relation: 'ancestor', args: ['adam', 'Who'] })
    const whos = bindings.map((b) => b.Who).sort()
    expect(whos).toEqual(['cainan', 'enos', 'seth'])
  })
})
