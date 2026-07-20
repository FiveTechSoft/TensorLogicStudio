import { describe, it, expect } from 'vitest'
import { synthesizeSourceFromGraph, nextTensorLabel } from './graphToSource'
import type { GraphNode, GraphEdge } from '@/types/project'

describe('synthesizeSourceFromGraph', () => {
  it('creates join rule from two relations through einsum', () => {
    const nodes: GraphNode[] = [
      { id: 'relation:R1', kind: 'relation', label: 'R1', position: { x: 0, y: 0 }, data: {} },
      { id: 'relation:R2', kind: 'relation', label: 'R2', position: { x: 0, y: 0 }, data: {} },
      { id: 'relation:R3', kind: 'relation', label: 'R3', position: { x: 0, y: 0 }, data: {} },
      { id: 'op1', kind: 'einsum', label: 'einsum', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: GraphEdge[] = [
      { id: 'e1', kind: 'data', source: 'relation:R1', target: 'op1' },
      { id: 'e2', kind: 'data', source: 'relation:R2', target: 'op1' },
      { id: 'e3', kind: 'data', source: 'op1', target: 'relation:R3' },
    ]
    const src = synthesizeSourceFromGraph(nodes, edges, '')
    expect(src).toContain('% @tensor relation R1')
    expect(src).toContain('R3(X, Z) :- R1(X, Y), R2(Y, Z).')
  })

  it('creates relu equation for dense tensors', () => {
    const nodes: GraphNode[] = [
      { id: 'tensor:T1', kind: 'tensor', label: 'T1', position: { x: 0, y: 0 }, data: {} },
      { id: 'tensor:T2', kind: 'tensor', label: 'T2', position: { x: 0, y: 0 }, data: {} },
      { id: 'op1', kind: 'relu', label: 'relu', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: GraphEdge[] = [
      { id: 'e1', kind: 'data', source: 'tensor:T1', target: 'op1' },
      { id: 'e2', kind: 'data', source: 'op1', target: 'tensor:T2' },
    ]
    const src = synthesizeSourceFromGraph(nodes, edges, '')
    expect(src).toContain('T2[i] = relu(T1[i]).')
  })

  it('nextTensorLabel increments', () => {
    const nodes: GraphNode[] = [
      { id: 'relation:R1', kind: 'relation', label: 'R1', position: { x: 0, y: 0 }, data: {} },
    ]
    expect(nextTensorLabel(nodes, 'relation')).toBe('R2')
  })
})
