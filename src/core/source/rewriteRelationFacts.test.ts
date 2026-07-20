import { describe, it, expect } from 'vitest'
import {
  extractRelationSheet,
  rewriteRelationFacts,
} from './rewriteRelationFacts'

describe('relation spreadsheet rewrite', () => {
  it('extracts matrix from parent facts', () => {
    const src = `
parent(adam, seth).
parent(seth, enos).
`
    const { labels, matrix } = extractRelationSheet(src, 'parent')
    expect(labels).toContain('adam')
    expect(labels).toContain('seth')
    expect(labels).toContain('enos')
    const iAdam = labels.indexOf('adam')
    const iSeth = labels.indexOf('seth')
    expect(matrix[iAdam][iSeth]).toBe(1)
  })

  it('rewrites facts from toggled cells and keeps rules', () => {
    const src = `
parent(adam, seth).
ancestor(X, Z) :- parent(X, Z).
`
    const labels = ['adam', 'seth', 'enos']
    const matrix = [
      [0, 1, 0],
      [0, 0, 1],
      [0, 0, 0],
    ]
    const out = rewriteRelationFacts(src, 'parent', labels, matrix)
    expect(out).toContain('parent(adam, seth).')
    expect(out).toContain('parent(seth, enos).')
    expect(out).toContain('ancestor(X, Z) :- parent(X, Z).')
    expect(out).not.toMatch(/parent\(enos/)
  })
})
