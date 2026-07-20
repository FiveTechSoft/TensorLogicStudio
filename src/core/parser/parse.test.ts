import { describe, it, expect } from 'vitest'
import { parse } from './parse'

describe('parse Datalog subset', () => {
  it('parses facts, rules, query', () => {
    const src = `
parent(adam, seth).
ancestor(X, Z) :- parent(X, Z).
ancestor(X, Z) :- ancestor(X, Y), parent(Y, Z).
?- ancestor(adam, Who).
`
    const prog = parse(src)
    expect(prog.stmts.filter((s) => s.kind === 'fact')).toHaveLength(1)
    expect(prog.stmts.filter((s) => s.kind === 'rule')).toHaveLength(2)
    const q = prog.stmts.find((s) => s.kind === 'query')
    expect(q?.kind).toBe('query')
    if (q?.kind === 'query') {
      expect(q.goal.relation).toBe('ancestor')
      expect(q.goal.args).toEqual(['adam', 'Who'])
    }
  })

  it('throws on garbage with message', () => {
    expect(() => parse('@@@')).toThrow()
  })
})
