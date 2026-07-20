import { nextTensorLabel } from '@/editor/graphToSource'
import { pushGraphToSource } from '@/editor/pushGraphToSource'
import { useProjectStore } from '@/store/projectStore'
import type { GraphNode } from '@/types/project'

function placeOffset(nodes: GraphNode[]): { x: number; y: number } {
  // Keep new boxes in a predictable band near the default fitView origin
  // so they are not lost off-camera after genealogy/example layouts.
  const tensors = nodes.filter((n) => n.kind === 'relation' || n.kind === 'tensor')
  const i = tensors.length
  return {
    x: 80 + (i % 3) * 220,
    y: 120 + Math.floor(i / 3) * 160,
  }
}

/**
 * Add a visible tensor box to the central graph and update Monaco source.
 * Returns the new node id.
 */
export function addTensorBox(kind: 'relation' | 'tensor' = 'relation'): string {
  const s = useProjectStore.getState()
  const { nodes, edges } = s.project.graph
  const label = nextTensorLabel(nodes, kind)
  const baseId = kind === 'relation' ? `relation:${label}` : `tensor:${label}`
  const id = nodes.some((n) => n.id === baseId)
    ? `${baseId}-${crypto.randomUUID().slice(0, 8)}`
    : baseId

  const node: GraphNode = {
    id,
    kind,
    label,
    position: placeOffset(nodes),
    data: {
      createdVisually: true,
      role: 'factor',
      caption: kind === 'relation' ? 'tensor (bool)' : 'tensor (dense)',
      shape: [2, 2],
    },
  }

  const nextNodes = [...nodes, node]
  s.setGraph(nextNodes, edges)
  s.setSelected(id)
  s.openSpreadsheet(label, kind === 'relation' ? 'bool' : 'dense')
  useProjectStore.setState({
    skipNextSourceToGraph: true,
    graphLockUntil: Date.now() + 2000,
    focusNodeId: id,
  })

  // Sync code after store has the new node
  queueMicrotask(() => {
    pushGraphToSource(
      kind === 'relation'
        ? `New tensor box ${label} (Boolean) added to graph`
        : `New tensor box ${label} (dense) added to graph`,
    )
    // Re-assert node still present after source push
    const cur = useProjectStore.getState()
    if (!cur.project.graph.nodes.some((n) => n.id === id)) {
      cur.setGraph([...cur.project.graph.nodes, node], cur.project.graph.edges)
      useProjectStore.setState({ focusNodeId: id, graphLockUntil: Date.now() + 1500 })
    }
  })

  s.setStatus(`Created tensor ${label}`)
  s.appendConsole(`+ New Tensor → ${label} on canvas`)
  return id
}
