import { parse } from '@/core/parser/parse'
import type { GraphEdge, GraphNode, NodeKind } from '@/types/project'

const DATA_KINDS: ReadonlySet<NodeKind> = new Set([
  'tensor',
  'relation',
  'fact',
])

const OP_KINDS: ReadonlySet<NodeKind> = new Set([
  'einsum',
  'step',
  'relu',
  'sigmoid',
  'softmax',
  'rule',
  'equation',
])

function isDataNode(n: GraphNode): boolean {
  return DATA_KINDS.has(n.kind)
}

function isOpNode(n: GraphNode): boolean {
  return OP_KINDS.has(n.kind)
}

function dataEdges(edges: GraphEdge[]): GraphEdge[] {
  return edges.filter((e) => e.kind === 'data')
}

function incoming(nodeId: string, edges: GraphEdge[], nodes: GraphNode[]): GraphNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return dataEdges(edges)
    .filter((e) => e.target === nodeId)
    .map((e) => byId.get(e.source))
    .filter((n): n is GraphNode => n != null)
}

function outgoing(nodeId: string, edges: GraphEdge[], nodes: GraphNode[]): GraphNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return dataEdges(edges)
    .filter((e) => e.source === nodeId)
    .map((e) => byId.get(e.target))
    .filter((n): n is GraphNode => n != null)
}

/** Keep facts for known relations from previous source. */
function extractFactsBlock(previousSource: string, relationNames: Set<string>): string[] {
  const lines: string[] = []
  try {
    const prog = parse(previousSource)
    for (const s of prog.stmts) {
      if (s.kind === 'fact' && relationNames.has(s.relation)) {
        lines.push(`${s.relation}(${s.args.join(', ')}).`)
      }
    }
  } catch {
    // ignore parse errors; regenerate from graph only
  }
  return lines
}

/** Preserve queries typed by the user that still reference existing relations. */
function extractQueries(previousSource: string, relationNames: Set<string>): string[] {
  const lines: string[] = []
  try {
    const prog = parse(previousSource)
    for (const s of prog.stmts) {
      if (s.kind === 'query' && relationNames.has(s.goal.relation)) {
        lines.push(`?- ${s.goal.relation}(${s.goal.args.join(', ')}).`)
      }
    }
  } catch {
    /* empty */
  }
  return lines
}

function sanitizeName(label: string, fallback: string): string {
  const t = label.trim().replace(/[^A-Za-z0-9_]/g, '_')
  if (!t) return fallback
  if (/^[0-9]/.test(t)) return `T_${t}`
  return t
}

/**
 * Build TensorLogic source from the visual graph (two-way tool).
 * - Relation/tensor nodes declare data
 * - Op nodes with data edges generate rules or equations
 * - Facts for relations are carried over from previousSource when possible
 */
export function synthesizeSourceFromGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  previousSource: string,
): string {
  const relationNames = new Set<string>()
  const tensorNames = new Set<string>()

  for (const n of nodes) {
    if (n.kind === 'relation' || n.kind === 'fact') {
      relationNames.add(sanitizeName(n.label, 'R'))
    } else if (n.kind === 'tensor') {
      tensorNames.add(sanitizeName(n.label, 'T'))
    }
  }

  const factLines = extractFactsBlock(previousSource, relationNames)
  const ruleLines: string[] = []
  const equationLines: string[] = []
  const seenRule = new Set<string>()
  const seenEq = new Set<string>()

  // Direct data edges tensor/relation → tensor/relation (no op): identity / copy
  for (const e of dataEdges(edges)) {
    const src = nodes.find((n) => n.id === e.source)
    const tgt = nodes.find((n) => n.id === e.target)
    if (!src || !tgt) continue
    if (!isDataNode(src) || !isDataNode(tgt)) continue
    const a = sanitizeName(src.label, 'A')
    const b = sanitizeName(tgt.label, 'B')
    if (a === b) continue
    if (src.kind === 'relation' && tgt.kind === 'relation') {
      const line = `${b}(X, Y) :- ${a}(X, Y).`
      if (!seenRule.has(line)) {
        seenRule.add(line)
        ruleLines.push(line)
      }
    } else {
      const line = `${b}[i] = ${a}[i].`
      if (!seenEq.has(line)) {
        seenEq.add(line)
        equationLines.push(line)
      }
    }
  }

  // Op-centered: inputs → op → outputs
  for (const op of nodes.filter(isOpNode)) {
    const ins = incoming(op.id, edges, nodes).filter(isDataNode)
    const outs = outgoing(op.id, edges, nodes).filter(isDataNode)
    if (outs.length === 0) continue

    for (const out of outs) {
      const outName = sanitizeName(out.label, 'Out')
      const inNames = ins.map((n) => sanitizeName(n.label, 'In'))
      const allRel =
        out.kind === 'relation' && ins.every((n) => n.kind === 'relation')

      let line: string | null = null

      if (op.kind === 'rule' || (allRel && (op.kind === 'einsum' || op.kind === 'equation'))) {
        if (inNames.length === 0) {
          // no body yet
          line = null
        } else if (inNames.length === 1) {
          line = `${outName}(X, Y) :- ${inNames[0]}(X, Y).`
        } else if (inNames.length >= 2) {
          // join / compose on middle index
          line = `${outName}(X, Z) :- ${inNames[0]}(X, Y), ${inNames[1]}(Y, Z).`
        }
      } else if (op.kind === 'step') {
        if (allRel && inNames[0]) {
          line = `${outName}(X, Y) :- ${inNames[0]}(X, Y).`
        } else if (inNames[0]) {
          line = `${outName}[i] = step(${inNames[0]}[i]).`
        }
      } else if (op.kind === 'relu') {
        if (inNames[0]) line = `${outName}[i] = relu(${inNames[0]}[i]).`
      } else if (op.kind === 'sigmoid') {
        if (inNames[0]) line = `${outName}[i] = sigmoid(${inNames[0]}[i]).`
      } else if (op.kind === 'softmax') {
        if (inNames[0]) line = `${outName}[i] = softmax(${inNames[0]}[i]).`
      } else if (op.kind === 'einsum' || op.kind === 'equation') {
        if (inNames.length >= 2) {
          line = `${outName}[i] = ${inNames[0]}[i,j] * ${inNames[1]}[j].`
        } else if (inNames[0]) {
          line = `${outName}[i] = ${inNames[0]}[i].`
        }
      }

      if (!line) continue
      if (line.includes(':-')) {
        if (!seenRule.has(line)) {
          seenRule.add(line)
          ruleLines.push(line)
        }
      } else if (!seenEq.has(line)) {
        seenEq.add(line)
        equationLines.push(line)
      }
    }
  }

  // Queries from query nodes
  const queryLines: string[] = []
  for (const q of nodes.filter((n) => n.kind === 'query')) {
    const goalRel =
      typeof q.data?.goal === 'object' &&
      q.data.goal &&
      'relation' in (q.data.goal as object)
        ? String((q.data.goal as { relation: string }).relation)
        : sanitizeName(q.label.replace(/^\?\-\s*/, ''), 'Q')
    const args =
      typeof q.data?.goal === 'object' &&
      q.data.goal &&
      'args' in (q.data.goal as object)
        ? (q.data.goal as { args: string[] }).args
        : ['X', 'Y']
    if (relationNames.has(goalRel) || nodes.some((n) => n.kind === 'relation')) {
      queryLines.push(`?- ${goalRel}(${args.join(', ')}).`)
    }
  }
  if (queryLines.length === 0) {
    queryLines.push(...extractQueries(previousSource, relationNames))
  }

  // Pragmas so empty tensors survive round-trips in comments
  const pragmaLines: string[] = []
  for (const n of nodes) {
    if (n.kind === 'relation') {
      const name = sanitizeName(n.label, 'R')
      pragmaLines.push(`% @tensor relation ${name}`)
    } else if (n.kind === 'tensor') {
      const name = sanitizeName(n.label, 'T')
      pragmaLines.push(`% @tensor dense ${name}`)
    }
  }

  const sections: string[] = []
  if (pragmaLines.length) {
    sections.push('% --- tensors (visual) ---', ...unique(pragmaLines))
  }
  if (factLines.length) {
    sections.push('% --- facts ---', ...factLines)
  }
  if (ruleLines.length) {
    sections.push('% --- rules ---', ...ruleLines)
  }
  if (equationLines.length) {
    sections.push('% --- equations ---', ...equationLines)
  }
  if (queryLines.length) {
    sections.push('% --- queries ---', ...unique(queryLines))
  }

  if (sections.length === 0) {
    return previousSource.trim() ? previousSource : '% empty program — add tensors in the graph\n'
  }

  return sections.join('\n') + '\n'
}

function unique(lines: string[]): string[] {
  const s = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    if (s.has(l)) continue
    s.add(l)
    out.push(l)
  }
  return out
}

/** Next free label like R1, R2 or T1, T2 */
export function nextTensorLabel(
  nodes: GraphNode[],
  kind: 'relation' | 'tensor',
): string {
  const prefix = kind === 'relation' ? 'R' : 'T'
  const used = new Set(
    nodes
      .filter((n) => n.kind === kind || n.kind === 'relation' || n.kind === 'tensor')
      .map((n) => n.label),
  )
  let i = 1
  while (used.has(`${prefix}${i}`)) i++
  return `${prefix}${i}`
}

export function nextOpLabel(nodes: GraphNode[], kind: NodeKind): string {
  const base =
    kind === 'einsum'
      ? 'einsum'
      : kind === 'step'
        ? 'step'
        : kind === 'relu'
          ? 'relu'
          : kind === 'sigmoid'
            ? 'sigmoid'
            : kind === 'rule'
              ? 'rule'
              : String(kind)
  const used = new Set(nodes.map((n) => n.label))
  if (!used.has(base)) return base
  let i = 2
  while (used.has(`${base}${i}`)) i++
  return `${base}${i}`
}
