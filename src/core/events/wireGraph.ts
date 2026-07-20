import type { GraphEdge, GraphNode, NodeKind } from '@/types/project'
import type { EventBus } from './EventBus'

/** Logical event-out port when the canvas handle is generic. */
function defaultOutPort(kind?: NodeKind): string {
  if (kind === 'query') return 'onMatch'
  return 'onClick'
}

/** Logical event-in port when the canvas handle is generic. */
function defaultInPort(kind?: NodeKind): string {
  if (kind === 'console') return 'log'
  if (kind === 'matrixView' || kind === 'highlight') return 'highlight'
  return 'run'
}

function resolveOutPort(handle: string | undefined, kind?: NodeKind): string {
  if (
    handle == null
    || handle === ''
    || handle === 'event-out'
    || handle === 'out'
    || handle === 'data-out'
  ) {
    return defaultOutPort(kind)
  }
  return handle
}

function resolveInPort(handle: string | undefined, kind?: NodeKind): string {
  if (
    handle == null
    || handle === ''
    || handle === 'event-in'
    || handle === 'in'
    || handle === 'data-in'
  ) {
    return defaultInPort(kind)
  }
  return handle
}

/**
 * Compile graph event edges into EventBus subscriptions.
 * Edge `sourceHandle=onClick` → `targetHandle=run` means
 * `bus.on(`${source}:onClick`, () => actions[target].run())`.
 */
export function wireEventEdges(
  edges: GraphEdge[],
  nodes: GraphNode[],
  bus: EventBus,
  actions: Record<string, Record<string, () => void>>,
): () => void {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const unsubs: Array<() => void> = []
  for (const e of edges.filter((x) => x.kind === 'event')) {
    const outPort = resolveOutPort(e.sourceHandle ?? 'onClick', byId.get(e.source)?.kind)
    const inPort = resolveInPort(e.targetHandle ?? 'run', byId.get(e.target)?.kind)
    const eventName = `${e.source}:${outPort}`
    unsubs.push(
      bus.on(eventName, () => {
        actions[e.target]?.[inPort]?.()
      }),
    )
  }
  return () => unsubs.forEach((u) => u())
}
