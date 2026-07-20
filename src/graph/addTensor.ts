import { nextTensorLabel } from '@/editor/graphToSource'
import { pushGraphToSource } from '@/editor/pushGraphToSource'
import { useProjectStore } from '@/store/projectStore'
import type { GraphNode } from '@/types/project'
import { getReactFlowInstance, revealNodeInView } from './rfApi'

function placeOffset(nodes: GraphNode[]): { x: number; y: number } {
  const rf = getReactFlowInstance()
  if (rf) {
    const pane = document.querySelector('.react-flow') as HTMLElement | null
    if (pane) {
      const rect = pane.getBoundingClientRect()
      const tensors = nodes.filter((n) => n.kind === 'relation' || n.kind === 'tensor')
      const i = tensors.length
      const flowPos = rf.screenToFlowPosition({
        x: rect.left + rect.width * (0.35 + (i % 3) * 0.12),
        y: rect.top + rect.height * (0.4 + Math.floor(i / 3) * 0.12),
      })
      return { x: flowPos.x - 90, y: flowPos.y - 50 }
    }
  }
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
    graphLockUntil: Date.now() + 2500,
    focusNodeId: id,
  })

  // Bring the box into the visible center of Tensor Graph (critical UX)
  const reveal = () => {
    revealNodeInView(id)
    // Keep store position in sync with RF instance after reveal
    const later =
      typeof window !== 'undefined' ? window.setTimeout.bind(window) : setTimeout
    later(() => {
      const rf = getReactFlowInstance()
      const rfNode = rf?.getNode(id)
      if (!rfNode) return
      const cur = useProjectStore.getState()
      cur.setGraph(
        cur.project.graph.nodes.map((n) =>
          n.id === id ? { ...n, position: { ...rfNode.position } } : n,
        ),
        cur.project.graph.edges,
      )
    }, 120)
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(reveal)
  } else {
    // Vitest/node has no rAF
    setTimeout(reveal, 0)
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
      window.setTimeout(() => revealNodeInView(id), 50)
      window.setTimeout(() => revealNodeInView(id), 250)
    }
  })

  s.setStatus(`Created tensor ${label}`)
  s.appendConsole(`+ New Tensor → ${label} on canvas`)
  return id
}
