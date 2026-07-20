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

/**
 * Operation encoded on a data edge (TensorLogic semantics).
 * Shown on the arrow and used to generate rules/equations.
 */
export type EdgeOp =
  | 'copy' // B = A / B(X,Y) :- A(X,Y)
  | 'mul' // elementwise B[i] = A[i] * C[i] — with one source: needs second input via join
  | 'add' // elementwise sum (needs 2 sources into target; 1-edge: B[i] = A[i] + A[i] skipped)
  | 'matmul' // matrix product B[i,k] = A[i,j] * W[j,k] — 1 edge: target uses matmul pattern with another inbound
  | 'join' // bool compose: B(X,Z) :- A(X,Y), Other(Y,Z)
  | 'relu'
  | 'sigmoid'
  | 'step'

export interface GraphEdge {
  id: string
  kind: EdgeKind
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  /** Display label on the arrow (×, +, →, …) */
  label?: string
  /** TensorLogic operation for this link */
  op?: EdgeOp
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
    /** Dense tensor seeds applied when loading this project (e.g. MLP examples). */
    denseSeeds?: Record<string, { shape: number[]; data: number[] }>
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
