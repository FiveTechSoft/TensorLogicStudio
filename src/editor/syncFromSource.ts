import { parse } from '@/core/parser/parse'
import type { Expr } from '@/types/ast'
import type { GraphEdge, GraphNode, NodeKind } from '@/types/project'
import { layoutGraph } from '@/graph/layout'

const UI_KINDS: ReadonlySet<NodeKind> = new Set([
  'button',
  'matrixView',
  'console',
  'highlight',
  'run',
  'stepIter',
])

/** Safe DOM/React Flow ids — colons break CSS selectors used for edge handles. */
function relationNodeId(name: string): string {
  return `relation-${name}`
}

function tensorNodeId(name: string): string {
  return `tensor-${name}`
}

function collectRefs(expr: Expr, out: Set<string>): void {
  switch (expr.kind) {
    case 'ref':
      out.add(expr.ref.name)
      break
    case 'bin':
      collectRefs(expr.left, out)
      collectRefs(expr.right, out)
      break
    case 'call':
      collectRefs(expr.arg, out)
      break
  }
}

function ensureRelation(
  name: string,
  nodes: GraphNode[],
  seen: Set<string>,
): void {
  const id = relationNodeId(name)
  if (seen.has(id)) return
  seen.add(id)
  nodes.push({
    id,
    kind: 'relation',
    label: name,
    position: { x: 0, y: 0 },
    data: {},
  })
}

function ensureTensor(
  name: string,
  nodes: GraphNode[],
  seen: Set<string>,
): void {
  const id = tensorNodeId(name)
  if (seen.has(id)) return
  // Prefer an existing relation node with the same logical name
  const relId = relationNodeId(name)
  if (seen.has(relId)) return
  seen.add(id)
  nodes.push({
    id,
    kind: 'tensor',
    label: name,
    position: { x: 0, y: 0 },
    data: {},
  })
}

function applyPrevPositions(
  nodes: GraphNode[],
  prev: { nodes: GraphNode[] },
): GraphNode[] {
  return nodes.map((n) => {
    const p = prev.nodes.find((x) => x.id === n.id)
    return p ? { ...n, position: p.position } : n
  })
}

function tensorOrRelationId(name: string, seen: Set<string>): string {
  const relId = relationNodeId(name)
  if (seen.has(relId)) return relId
  return tensorNodeId(name)
}

function prevPosition(
  prev: { nodes: GraphNode[] },
  id: string,
): { x: number; y: number } {
  const p = prev.nodes.find((n) => n.id === id)
  return p?.position ?? { x: 0, y: 0 }
}

/** Parse visual pragmas: `% @tensor relation Name` / `% @tensor dense Name` */
function parseTensorPragmas(source: string): { relations: string[]; dense: string[] } {
  const relations: string[] = []
  const dense: string[] = []
  for (const line of source.split(/\r?\n/)) {
    const m = /^\s*%\s*@tensor\s+(relation|dense)\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(
      line,
    )
    if (!m) continue
    if (m[1] === 'relation') relations.push(m[2])
    else dense.push(m[2])
  }
  return { relations, dense }
}

/**
 * Parse source and rebuild dataflow graph nodes/edges.
 * UI nodes and event edges from `prev` are preserved when endpoints still exist.
 * Node positions are restored from `prev` when ids match (two-way friendly).
 */
export function graphFromSource(
  source: string,
  prev: { nodes: GraphNode[]; edges: GraphEdge[] },
): { nodes: GraphNode[]; edges: GraphEdge[]; error?: string } {
  try {
    const prog = parse(source)
    const dataNodes: GraphNode[] = []
    const dataEdges: GraphEdge[] = []
    const seen = new Set<string>()
    const pragmas = parseTensorPragmas(source)

    for (const name of pragmas.relations) {
      ensureRelation(name, dataNodes, seen)
    }
    for (const name of pragmas.dense) {
      ensureTensor(name, dataNodes, seen)
    }

    // Pass 1: collect unique relations from facts / rules / queries
    for (const stmt of prog.stmts) {
      if (stmt.kind === 'fact') {
        ensureRelation(stmt.relation, dataNodes, seen)
      } else if (stmt.kind === 'rule') {
        ensureRelation(stmt.head.relation, dataNodes, seen)
        for (const atom of stmt.body) {
          ensureRelation(atom.relation, dataNodes, seen)
        }
      } else if (stmt.kind === 'query') {
        ensureRelation(stmt.goal.relation, dataNodes, seen)
      }
    }

    // Pass 2: rule / equation / query nodes + data edges
    for (const stmt of prog.stmts) {
      if (stmt.kind === 'rule') {
        dataNodes.push({
          id: stmt.id,
          kind: 'rule',
          label: stmt.head.relation,
          position: { x: 0, y: 0 },
          data: {
            head: stmt.head,
            body: stmt.body,
          },
          astId: stmt.id,
        })
        seen.add(stmt.id)

        stmt.body.forEach((atom, i) => {
          dataEdges.push({
            id: `de:${stmt.id}:body:${i}`,
            kind: 'data',
            source: relationNodeId(atom.relation),
            target: stmt.id,
          })
        })
        dataEdges.push({
          id: `de:${stmt.id}:head`,
          kind: 'data',
          source: stmt.id,
          target: relationNodeId(stmt.head.relation),
        })
      } else if (stmt.kind === 'equation') {
        dataNodes.push({
          id: stmt.id,
          kind: 'equation',
          label: stmt.lhs.name,
          position: { x: 0, y: 0 },
          data: {
            lhs: stmt.lhs,
            rhs: stmt.rhs,
          },
          astId: stmt.id,
        })
        seen.add(stmt.id)

        const refs = new Set<string>()
        collectRefs(stmt.rhs, refs)
        // LHS as tensor for output legibility
        ensureTensor(stmt.lhs.name, dataNodes, seen)
        for (const name of refs) {
          ensureTensor(name, dataNodes, seen)
          dataEdges.push({
            id: `de:${stmt.id}:ref:${name}`,
            kind: 'data',
            source: tensorOrRelationId(name, seen),
            target: stmt.id,
          })
        }
        dataEdges.push({
          id: `de:${stmt.id}:lhs`,
          kind: 'data',
          source: stmt.id,
          target: tensorOrRelationId(stmt.lhs.name, seen),
        })
      } else if (stmt.kind === 'query') {
        dataNodes.push({
          id: stmt.id,
          kind: 'query',
          label: `?- ${stmt.goal.relation}`,
          position: { x: 0, y: 0 },
          data: {
            goal: stmt.goal,
          },
          astId: stmt.id,
        })
        seen.add(stmt.id)

        dataEdges.push({
          id: `de:${stmt.id}:goal`,
          kind: 'data',
          source: relationNodeId(stmt.goal.relation),
          target: stmt.id,
        })
      }
    }

    // Restore positions from previous graph (avoid dagre thrash on two-way edits)
    for (const n of dataNodes) {
      n.position = prevPosition(prev, n.id)
    }

    // Keep op nodes the user placed that are not yet reflected as AST (still in prev)
    const OP_KEEP: NodeKind[] = [
      'einsum',
      'step',
      'relu',
      'sigmoid',
      'softmax',
      'rule',
      'equation',
    ]
    for (const n of prev.nodes) {
      if (OP_KEEP.includes(n.kind) && !seen.has(n.id)) {
        // Keep if still referenced by a data edge or always keep floating ops
        dataNodes.push(n)
        seen.add(n.id)
      }
    }

    const uiNodes = prev.nodes.filter((n) => UI_KINDS.has(n.kind))
    for (const n of uiNodes) seen.add(n.id)

    let allNodes = [...dataNodes, ...uiNodes]
    allNodes = applyPrevPositions(allNodes, prev)
    const nodeIds = new Set(allNodes.map((n) => n.id))

    const eventEdges = prev.edges.filter((e) => {
      if (e.kind !== 'event') return false
      // Synthetic `runtime` target is always available in AppShell actions map.
      const targetOk = nodeIds.has(e.target) || e.target === 'runtime'
      return nodeIds.has(e.source) && targetOk
    })

    // Preserve data edges that involve kept op nodes from prev
    const opIds = new Set(
      allNodes.filter((n) => OP_KEEP.includes(n.kind)).map((n) => n.id),
    )
    const extraData = prev.edges.filter(
      (e) =>
        e.kind === 'data' &&
        (opIds.has(e.source) || opIds.has(e.target)) &&
        nodeIds.has(e.source) &&
        nodeIds.has(e.target) &&
        !dataEdges.some((d) => d.id === e.id),
    )

    // Only auto-layout nodes still at origin with no previous position
    const needsLayout = allNodes.some(
      (n) => n.position.x === 0 && n.position.y === 0 && !prev.nodes.some((p) => p.id === n.id),
    )
    if (needsLayout && prev.nodes.length === 0) {
      allNodes = layoutGraph(allNodes, [...dataEdges, ...extraData])
    } else {
      // Place brand-new origin nodes to the right of existing content
      let maxX = 0
      let maxY = 0
      for (const n of allNodes) {
        if (n.position.x || n.position.y) {
          maxX = Math.max(maxX, n.position.x)
          maxY = Math.max(maxY, n.position.y)
        }
      }
      let i = 0
      allNodes = allNodes.map((n) => {
        if (n.position.x === 0 && n.position.y === 0 && !prev.nodes.some((p) => p.id === n.id)) {
          const pos = { x: maxX + 180 + (i % 3) * 40, y: 80 + Math.floor(i / 3) * 80 }
          i++
          return { ...n, position: pos }
        }
        return n
      })
    }

    return {
      nodes: allNodes,
      edges: [...dataEdges, ...extraData, ...eventEdges],
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { nodes: prev.nodes, edges: prev.edges, error: message }
  }
}
