export type PortKind = 'data-in' | 'data-out' | 'event-in' | 'event-out'

export type NodeKind =
  | 'tensor' | 'relation' | 'einsum' | 'step' | 'relu' | 'sigmoid' | 'softmax'
  | 'equation' | 'rule' | 'query' | 'fact'
  | 'loss' | 'sgd'
  | 'button' | 'matrixView' | 'console' | 'highlight'
  | 'run' | 'stepIter'

export interface GraphNode {
  id: string
  kind: NodeKind
  label: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  /** AST declaration id when linked */
  astId?: string
}

export type EdgeKind = 'data' | 'event'

export interface GraphEdge {
  id: string
  kind: EdgeKind
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface Project {
  id: string
  name: string
  version: number
  source: string
  graph: { nodes: GraphNode[]; edges: GraphEdge[] }
  ui: {
    panelSizes: number[]
    camera: { x: number; y: number; zoom: number }
    selectedId?: string
  }
  meta: {
    createdAt: string
    updatedAt: string
    exampleId?: string
  }
}

export function emptyProject(name = 'untitled'): Project {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    version: 1,
    source: '',
    graph: { nodes: [], edges: [] },
    ui: { panelSizes: [28, 44, 28], camera: { x: 0, y: 0, zoom: 1 } },
    meta: { createdAt: now, updatedAt: now },
  }
}
