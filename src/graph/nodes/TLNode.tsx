import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { NodeKind } from '@/types/project'

export type TLNodeData = {
  label: string
  kind: NodeKind
  [key: string]: unknown
}

export type TLRFNode = Node<TLNodeData, 'tl'>

const KIND_COLORS: Record<string, string> = {
  tensor: '#94a3b8',
  relation: '#22d3ee',
  einsum: '#2dd4bf',
  step: '#67e8f9',
  relu: '#34d399',
  sigmoid: '#4ade80',
  softmax: '#a3e635',
  equation: '#60a5fa',
  rule: '#a78bfa',
  query: '#fbbf24',
  fact: '#fcd34d',
  loss: '#fb923c',
  sgd: '#f97316',
  button: '#e879f9',
  matrixView: '#c084fc',
  console: '#a3a3a3',
  highlight: '#facc15',
  run: '#f472b6',
  stepIter: '#fb7185',
}

export function kindColor(kind: string): string {
  return KIND_COLORS[kind] ?? '#64748b'
}

export function TLNode({ data }: NodeProps<TLRFNode>) {
  const color = kindColor(String(data.kind))
  const label = String(data.label ?? data.kind)
  const kind = String(data.kind)
  const isMul = label === '×' || data.symbol === '×' || data.op === 'matmul'
  const caption =
    typeof data.caption === 'string'
      ? data.caption
      : Array.isArray(data.shape)
        ? (data.shape as number[]).join('×')
        : null

  if (isMul) {
    return (
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full border-2 bg-amber-950 shadow-lg shadow-amber-950/50"
        style={{ borderColor: '#fbbf24' }}
        title="Matrix multiply ×"
      >
        <Handle
          type="target"
          position={Position.Left}
          id="data-in"
          style={{ background: '#38bdf8', width: 8, height: 8 }}
        />
        <span className="text-xl font-bold text-amber-300 leading-none">×</span>
        <Handle
          type="source"
          position={Position.Right}
          id="data-out"
          style={{ background: '#38bdf8', width: 8, height: 8 }}
        />
        <Handle
          type="target"
          position={Position.Top}
          id="data-in-top"
          style={{ background: '#38bdf8', width: 8, height: 8 }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="data-out-bottom"
          style={{ background: '#38bdf8', width: 8, height: 8 }}
        />
      </div>
    )
  }

  return (
    <div
      className="min-w-[140px] rounded-md border bg-[#0c1424]/95 px-3 py-2 shadow-lg shadow-black/30"
      style={{ borderColor: color }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="data-in"
        style={{ top: '35%', background: '#38bdf8', width: 8, height: 8 }}
        title="data-in"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="event-in"
        style={{ top: '65%', background: '#f472b6', width: 8, height: 8 }}
        title="event-in"
      />

      <div className="text-sm font-medium text-slate-100 truncate" title={label}>
        {label}
      </div>
      <div
        className="text-[10px] uppercase tracking-wider mt-0.5 truncate"
        style={{ color }}
      >
        {caption ?? kind}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="data-out"
        style={{ top: '35%', background: '#38bdf8', width: 8, height: 8 }}
        title="data-out"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="event-out"
        style={{ top: '65%', background: '#f472b6', width: 8, height: 8 }}
        title="event-out"
      />
    </div>
  )
}
