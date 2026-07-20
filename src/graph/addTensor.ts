import { nextTensorLabel } from '@/editor/graphToSource'
import { pushGraphToSource } from '@/editor/pushGraphToSource'
import { useProjectStore } from '@/store/projectStore'
import type { GraphNode } from '@/types/project'
import { getReactFlowInstance } from './rfApi'

function placeOffset(nodes: GraphNode[]): { x: number; y: number } {
  const tensors = nodes.filter((n) => n.kind === 'relation' || n.kind === 'tensor')
  const rf = getReactFlowInstance()
  const pane = document.querySelector('.react-flow') as HTMLElement | null

  // First tensor: left side of visible pane
  if (tensors.length === 0 && rf && pane) {
    const rect = pane.getBoundingClientRect()
    const flowPos = rf.screenToFlowPosition({
      x: rect.left + rect.width * 0.25,
      y: rect.top + rect.height * 0.45,
    })
    return { x: flowPos.x - 90, y: flowPos.y - 50 }
  }

  // Next tensors: always to the RIGHT of the rightmost tensor (gap for arrows)
  if (tensors.length > 0) {
    const rightmost = tensors.reduce((a, b) =>
      a.position.x >= b.position.x ? a : b,
    )
    return {
      x: rightmost.position.x + 320,
      y: rightmost.position.y,
    }
  }

  return { x: 80, y: 140 }
}

/**
 * Add a visible tensor box to the central graph and update Monaco source.
 * Returns the new node id.
 */
export function addTensorBox(kind: 'relation' | 'tensor' = 'relation'): string {
  const s = useProjectStore.getState()
  const { nodes, edges } = s.project.graph
  const label = nextTensorLabel(nodes, kind)
  // No colons in ids — React Flow uses CSS selectors for edge endpoints
  const baseId = kind === 'relation' ? `relation-${label}` : `tensor-${label}`
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
    graphLockUntil: Date.now() + 2500,
    focusNodeId: id,
  })

  // Fit all tensor boxes into view (do NOT re-center every new box on the same spot)
  const reveal = () => {
    const rf = getReactFlowInstance()
    if (!rf) return
    const tensorIds = useProjectStore
      .getState()
      .project.graph.nodes.filter((n) => n.kind === 'relation' || n.kind === 'tensor')
      .map((n) => ({ id: n.id }))
    if (tensorIds.length === 0) return
    rf.fitView({
      nodes: tensorIds,
      padding: 0.35,
      duration: 200,
      maxZoom: 1.15,
      minZoom: 0.45,
    })
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(reveal)
  } else {
    setTimeout(reveal, 0)
  }
  if (typeof window !== 'undefined') {
    window.setTimeout(reveal, 150)
  }

  // Sync code after store has the new node
  queueMicrotask(() => {
    pushGraphToSource(
      kind === 'relation'
        ? `New tensor box ${label} (Boolean) added to graph`
        : `New tensor box ${label} (dense) added to graph`,
    )
    const cur = useProjectStore.getState()
    if (!cur.project.graph.nodes.some((n) => n.id === id)) {
      cur.setGraph([...cur.project.graph.nodes, node], cur.project.graph.edges)
    }
    if (typeof window !== 'undefined') {
      window.setTimeout(reveal, 80)
    }
  })

  s.setStatus(`Created tensor ${label}`)
  s.appendConsole(`+ New Tensor → ${label} on canvas`)
  return id
}
