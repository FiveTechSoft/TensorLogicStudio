import dagre from 'dagre'
import type { GraphNode } from '@/types/project'

const NODE_WIDTH = 160
const NODE_HEIGHT = 48

export type LayoutEdge = { source: string; target: string }

/** Assign TB positions with dagre. Optional edges improve rank ordering. */
export function layoutGraph(
  nodes: GraphNode[],
  edges: LayoutEdge[] = [],
): GraphNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 })

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const e of edges) {
    if (
      g.hasNode(e.source)
      && g.hasNode(e.target)
      && e.source !== e.target
      && !g.hasEdge(e.source, e.target)
    ) {
      g.setEdge(e.source, e.target)
    }
  }

  dagre.layout(g)

  return nodes.map((n) => {
    const p = g.node(n.id)
    return {
      ...n,
      position: {
        x: (p?.x ?? 0) - NODE_WIDTH / 2,
        y: (p?.y ?? 0) - NODE_HEIGHT / 2,
      },
    }
  })
}
