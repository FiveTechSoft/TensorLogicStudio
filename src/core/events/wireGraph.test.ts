import { describe, it, expect, vi } from 'vitest'
import { EventBus } from './EventBus'
import { wireEventEdges } from './wireGraph'
import type { GraphEdge, GraphNode } from '@/types/project'

function node(partial: Partial<GraphNode> & Pick<GraphNode, 'id' | 'kind'>): GraphNode {
  return {
    label: partial.kind,
    position: { x: 0, y: 0 },
    data: {},
    ...partial,
  }
}

describe('wireEventEdges', () => {
  it('subscribes event edges and invokes target actions', () => {
    const bus = new EventBus()
    const run = vi.fn()
    const nodes: GraphNode[] = [
      node({ id: 'btn1', kind: 'button' }),
      node({ id: 'run1', kind: 'run' }),
    ]
    const edges: GraphEdge[] = [
      {
        id: 'e1',
        kind: 'event',
        source: 'btn1',
        target: 'run1',
        sourceHandle: 'onClick',
        targetHandle: 'run',
      },
    ]
    const unwire = wireEventEdges(edges, nodes, bus, {
      run1: { run },
    })

    bus.emit('btn1:onClick')
    expect(run).toHaveBeenCalledTimes(1)

    unwire()
    bus.emit('btn1:onClick')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('defaults generic event handles using node kinds', () => {
    const bus = new EventBus()
    const highlight = vi.fn()
    const nodes: GraphNode[] = [
      node({ id: 'q1', kind: 'query' }),
      node({ id: 'm1', kind: 'matrixView' }),
    ]
    const edges: GraphEdge[] = [
      {
        id: 'e1',
        kind: 'event',
        source: 'q1',
        target: 'm1',
        sourceHandle: 'event-out',
        targetHandle: 'event-in',
      },
    ]
    wireEventEdges(edges, nodes, bus, {
      m1: { highlight },
    })

    bus.emit('q1:onMatch')
    expect(highlight).toHaveBeenCalledTimes(1)
  })

  it('ignores data edges', () => {
    const bus = new EventBus()
    const run = vi.fn()
    const nodes: GraphNode[] = [
      node({ id: 'a', kind: 'tensor' }),
      node({ id: 'b', kind: 'run' }),
    ]
    const edges: GraphEdge[] = [
      {
        id: 'e1',
        kind: 'data',
        source: 'a',
        target: 'b',
        sourceHandle: 'onClick',
        targetHandle: 'run',
      },
    ]
    wireEventEdges(edges, nodes, bus, { b: { run } })
    bus.emit('a:onClick')
    expect(run).not.toHaveBeenCalled()
  })
})
