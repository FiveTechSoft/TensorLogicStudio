import { useProjectStore } from '@/store/projectStore'
import type { GraphNode, NodeKind } from '@/types/project'
import { kindColor } from './nodes/TLNode'

const PALETTE_KINDS: NodeKind[] = [
  'relation',
  'tensor',
  'rule',
  'query',
  'run',
  'matrixView',
  'einsum',
  'step',
]

function defaultLabel(kind: NodeKind): string {
  switch (kind) {
    case 'matrixView':
      return 'Matrix View'
    case 'einsum':
      return 'Einsum'
    case 'tensor':
      return 'T'
    case 'relation':
      return 'R'
    default:
      return kind.charAt(0).toUpperCase() + kind.slice(1)
  }
}

export function Palette() {
  const nodes = useProjectStore((s) => s.project.graph.nodes)
  const edges = useProjectStore((s) => s.project.graph.edges)
  const setGraph = useProjectStore((s) => s.setGraph)
  const openSpreadsheet = useProjectStore((s) => s.openSpreadsheet)
  const setSelected = useProjectStore((s) => s.setSelected)

  const addNode = (kind: NodeKind) => {
    const offset = nodes.length * 28
    const label = defaultLabel(kind)
    const node: GraphNode = {
      id:
        kind === 'relation'
          ? `relation:${label}`
          : kind === 'tensor'
            ? `tensor:${label}`
            : `n-${crypto.randomUUID()}`,
      kind,
      label,
      position: { x: 80 + offset, y: 80 + offset },
      data: {},
    }
    setGraph([...nodes, node], edges)
    setSelected(node.id)
    if (kind === 'relation') {
      openSpreadsheet(label, 'bool')
    } else if (kind === 'tensor') {
      openSpreadsheet(label, 'dense')
    }
  }

  return (
    <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[90%] rounded-md border border-slate-800 bg-[#0c1424]/90 p-1.5 backdrop-blur-sm">
      {PALETTE_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => addNode(kind)}
          className="px-2 py-1 rounded text-[11px] font-medium border border-slate-700/80 bg-slate-900/50 text-slate-200 hover:bg-slate-800 transition-colors"
          style={{ borderColor: `${kindColor(kind)}55`, color: kindColor(kind) }}
          title={`Add ${kind} node`}
        >
          {defaultLabel(kind)}
        </button>
      ))}
    </div>
  )
}
