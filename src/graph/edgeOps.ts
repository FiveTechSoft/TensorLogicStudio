import type { EdgeOp, GraphEdge, GraphNode } from '@/types/project'

export interface EdgeOpOption {
  op: EdgeOp
  label: string
  symbol: string
  description: string
  /** Prefer for bool relations */
  forBool?: boolean
  /** Prefer for dense tensors */
  forDense?: boolean
}

export const EDGE_OP_OPTIONS: EdgeOpOption[] = [
  {
    op: 'copy',
    label: 'Copy / assign',
    symbol: '→',
    description: 'B = A  (or rule B :- A)',
    forBool: true,
    forDense: true,
  },
  {
    op: 'mul',
    label: 'Multiply (elementwise)',
    symbol: '×',
    description: 'B[i] = A[i] * A[i] not used; with 2 inputs into B: B = A * C',
    forDense: true,
  },
  {
    op: 'add',
    label: 'Add (elementwise)',
    symbol: '+',
    description: 'With 2 inputs into B: B[i] = A[i] + C[i]',
    forDense: true,
  },
  {
    op: 'matmul',
    label: 'Matrix product',
    symbol: '×·',
    description: 'B[i,k] = A[i,j] * W[j,k] (needs 2 inputs into target)',
    forDense: true,
  },
  {
    op: 'join',
    label: 'Join / compose',
    symbol: '⋈',
    description: 'B(X,Z) :- A(X,Y), C(Y,Z) (bool, 2 inputs)',
    forBool: true,
  },
  {
    op: 'relu',
    label: 'ReLU',
    symbol: 'σ+',
    description: 'B[i] = relu(A[i])',
    forDense: true,
  },
  {
    op: 'sigmoid',
    label: 'Sigmoid',
    symbol: 'σ',
    description: 'B[i] = sigmoid(A[i])',
    forDense: true,
  },
  {
    op: 'step',
    label: 'Step / Heaviside',
    symbol: 'H',
    description: 'B[i] = step(A[i])',
    forDense: true,
    forBool: true,
  },
]

export function symbolForOp(op: EdgeOp | undefined): string {
  if (!op) return '→'
  return EDGE_OP_OPTIONS.find((o) => o.op === op)?.symbol ?? '→'
}

export function opFromLabel(label: string | undefined): EdgeOp | undefined {
  if (!label || label === '→') return 'copy'
  if (label === '×' || label === 'x' || label === '*') return 'mul'
  if (label === '+') return 'add'
  if (label === '×·' || label === 'matmul') return 'matmul'
  if (label === '⋈' || label === 'join') return 'join'
  if (label === 'σ+' || label === 'relu') return 'relu'
  if (label === 'σ' || label === 'sigmoid') return 'sigmoid'
  if (label === 'H' || label === 'step') return 'step'
  return undefined
}

export function optionsForNodes(
  source: GraphNode,
  target: GraphNode,
): EdgeOpOption[] {
  const boolish =
    (source.kind === 'relation' || source.kind === 'fact') &&
    (target.kind === 'relation' || target.kind === 'fact')
  const denseish =
    source.kind === 'tensor' ||
    target.kind === 'tensor' ||
    !boolish

  return EDGE_OP_OPTIONS.filter((o) => {
    if (boolish && o.forBool) return true
    if (denseish && o.forDense) return true
    return false
  })
}

/** Build TensorLogic line(s) for edges that share the same target (combine multi-input). */
export function linesForTarget(
  target: GraphNode,
  inbound: { edge: GraphEdge; source: GraphNode }[],
): string[] {
  const b = sanitize(target.label, 'B')
  if (inbound.length === 0) return []

  // Prefer op from first non-copy edge, else first edge
  const primary =
    inbound.find((x) => x.edge.op && x.edge.op !== 'copy') ?? inbound[0]!
  const op = primary.edge.op ?? opFromLabel(primary.edge.label) ?? 'copy'
  const srcs = inbound.map((x) => sanitize(x.source.label, 'A'))
  const a = srcs[0]!
  const c = srcs[1]

  const bool =
    target.kind === 'relation' ||
    inbound.every((x) => x.source.kind === 'relation')

  switch (op) {
    case 'copy':
      if (bool) return [`${b}(X, Y) :- ${a}(X, Y).`]
      return [`${b}[i] = ${a}[i].`]
    case 'mul':
      if (c) return [`${b}[i] = ${a}[i] * ${c}[i].`]
      return [`${b}[i] = ${a}[i] * ${a}[i].`] // fallback square
    case 'add':
      if (c) return [`${b}[i] = ${a}[i] + ${c}[i].`]
      return [`${b}[i] = ${a}[i] + 0.`]
    case 'matmul':
      if (c) return [`${b}[i,k] = ${a}[i,j] * ${c}[j,k].`]
      return [`${b}[i] = ${a}[i,j] * ${a}[j].`] // needs vector seed on same name — rare
    case 'join':
      if (c) return [`${b}(X, Z) :- ${a}(X, Y), ${c}(Y, Z).`]
      return [`${b}(X, Y) :- ${a}(X, Y).`]
    case 'relu':
      return [`${b}[i] = relu(${a}[i]).`]
    case 'sigmoid':
      return [`${b}[i] = sigmoid(${a}[i]).`]
    case 'step':
      if (bool) return [`${b}(X, Y) :- ${a}(X, Y).`]
      return [`${b}[i] = step(${a}[i]).`]
    default:
      return [`${b}[i] = ${a}[i].`]
  }
}

function sanitize(label: string, fallback: string): string {
  const t = label.trim().replace(/[^A-Za-z0-9_]/g, '_')
  if (!t) return fallback
  if (/^[0-9]/.test(t)) return `T_${t}`
  return t
}
