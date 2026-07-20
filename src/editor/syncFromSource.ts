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

function relationNodeId(name: string): string {
  return `relation:${name}`
}

function tensorNodeId(name: string): string {
  return `tensor:${name}`
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

function tensorOrRelationId(name: string, seen: Set<string>): string {
  const relId = relationNodeId(name)
  if (seen.has(relId)) return relId
  return tensorNodeId(name)
}

/**
 * Parse source and rebuild dataflow graph nodes/edges.
 * UI nodes and event edges from `prev` are preserved when endpoints still exist.
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

    const uiNodes = prev.nodes.filter((n) => UI_KINDS.has(n.kind))
    for (const n of uiNodes) seen.add(n.id)

    const allNodes = [...dataNodes, ...uiNodes]
    const nodeIds = new Set(allNodes.map((n) => n.id))

    const eventEdges = prev.edges.filter((e) => {
      if (e.kind !== 'event') return false
      // Synthetic `runtime` target is always available in AppShell actions map.
      const targetOk = nodeIds.has(e.target) || e.target === 'runtime'
      return nodeIds.has(e.source) && targetOk
    })

    const laidOut = layoutGraph(allNodes, dataEdges)
    return { nodes: laidOut, edges: [...dataEdges, ...eventEdges] }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { nodes: prev.nodes, edges: prev.edges, error: message }
  }
}
