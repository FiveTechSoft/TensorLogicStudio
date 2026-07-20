import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '@/store/projectStore'
import { emptyProject } from '@/types/project'
import { addTensorBox } from './addTensor'

describe('addTensorBox (+ New Tensor)', () => {
  beforeEach(() => {
    useProjectStore.getState().loadProject(emptyProject('test'))
    useProjectStore.setState({
      skipNextSourceToGraph: false,
      graphLockUntil: 0,
      focusNodeId: null,
    })
  })

  it('adds a visible tensor node to the central graph', () => {
    const id = addTensorBox({ kind: 'relation', init: 'zeros' })
    const { project, focusNodeId } = useProjectStore.getState()
    const node = project.graph.nodes.find((n) => n.id === id)

    expect(node).toBeDefined()
    expect(node!.kind).toBe('relation')
    expect(node!.label).toMatch(/^R\d+$/)
    expect(node!.data.role).toBe('factor')
    expect(node!.data.createdVisually).toBe(true)
    expect(node!.data.init).toBe('zeros')
    expect(focusNodeId).toBe(id)
    expect(project.graph.nodes.length).toBe(1)
  })

  it('adds a second box with a new name', () => {
    const id1 = addTensorBox({ kind: 'relation', init: 'zeros' })
    const id2 = addTensorBox({ kind: 'relation', init: 'random' })
    const nodes = useProjectStore.getState().project.graph.nodes
    expect(nodes).toHaveLength(2)
    expect(id1).not.toBe(id2)
    const labels = nodes.map((n) => n.label).sort()
    expect(labels).toEqual(['R1', 'R2'])
  })

  it('updates source with @tensor pragma after microtask', async () => {
    addTensorBox({ kind: 'relation', init: 'zeros' })
    await new Promise((r) => setTimeout(r, 10))
    const src = useProjectStore.getState().project.source
    expect(src).toMatch(/@tensor relation R1/)
  })

  it('seeds dense zeros on create', () => {
    addTensorBox({ kind: 'tensor', init: 'zeros', size: 2 })
    const seeds = useProjectStore.getState().project.meta.denseSeeds
    const t = seeds?.T1
    expect(t?.shape).toEqual([2, 2])
    expect(t?.data).toEqual([0, 0, 0, 0])
  })
})
