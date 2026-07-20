import type { CSSProperties } from 'react'
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

const handleBase: CSSProperties = {
  width: 14,
  height: 14,
  border: '2px solid #0b1220',
  borderRadius: 999,
  zIndex: 10,
}

/** Blue = TensorLogic dataflow only (event ports hidden for now). */
function DataHandle(props: {
  type: 'source' | 'target'
  position: Position
  id: string
  style?: CSSProperties
}) {
  return (
    <Handle
      type={props.type}
      position={props.position}
      id={props.id}
      title={
        props.type === 'source'
          ? 'Salida de datos — arrastra a otro tensor u operación'
          : 'Entrada de datos — suelta la flecha aquí'
      }
      className="!border-2 !border-slate-950 hover:!scale-125 transition-transform"
      style={{
        ...handleBase,
        background: '#38bdf8',
        boxShadow: '0 0 0 2px rgba(56,189,248,0.35)',
        ...props.style,
      }}
    />
  )
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
        <DataHandle type="target" position={Position.Left} id="data-in" />
        <span className="text-xl font-bold text-amber-300 leading-none">×</span>
        <DataHandle type="source" position={Position.Right} id="data-out" />
        <DataHandle type="target" position={Position.Top} id="data-in-top" />
        <DataHandle type="source" position={Position.Bottom} id="data-out-bottom" />
      </div>
    )
  }

  const isMatrixBox =
    (kind === 'tensor' || kind === 'relation') &&
    (data.role === 'factor' ||
      data.role === 'product' ||
      data.createdVisually === true ||
      caption != null)

  return (
    <div
      className={[
        'rounded-lg border shadow-lg shadow-black/40 relative',
        isMatrixBox
          ? 'min-w-[168px] min-h-[96px] px-4 py-3 bg-slate-900'
          : 'min-w-[140px] px-3 py-2 bg-slate-900/95',
      ].join(' ')}
      style={{
        borderColor: color,
        borderWidth: isMatrixBox ? 2 : 1,
        boxShadow: isMatrixBox
          ? `0 0 0 1px ${color}33, 0 8px 24px rgba(0,0,0,0.45)`
          : undefined,
      }}
    >
      <DataHandle
        type="target"
        position={Position.Left}
        id="data-in"
        style={{ top: '50%' }}
      />

      <div
        className={[
          'font-medium text-slate-100 truncate',
          isMatrixBox ? 'text-lg tracking-wide' : 'text-sm',
        ].join(' ')}
        title={label}
      >
        {label}
      </div>
      <div
        className="text-[10px] uppercase tracking-wider mt-0.5 truncate"
        style={{ color }}
      >
        {caption ?? kind}
      </div>
      {isMatrixBox && Array.isArray(data.shape) && (
        <div className="mt-2 grid grid-cols-2 gap-0.5 opacity-80">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-4 rounded-sm bg-slate-800/90 border border-slate-700/80"
            />
          ))}
        </div>
      )}

      <DataHandle
        type="source"
        position={Position.Right}
        id="data-out"
        style={{ top: '50%' }}
      />
    </div>
  )
}
