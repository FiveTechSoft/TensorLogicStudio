import type { CSSProperties } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { NodeKind } from '@/types/project'
import { useProjectStore } from '@/store/projectStore'
import { gridFromDense, heatRgb } from '@/graph/heatmap'

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
  highlight: '#38bdf8',
  run: '#f472b6',
  stepIter: '#fb7185',
}

export function kindColor(kind: string): string {
  return KIND_COLORS[kind] ?? '#64748b'
}

/** Blue data ports — large and outside the box so they are easy to drag. */
function DataHandle(props: {
  type: 'source' | 'target'
  position: Position
  id: string
}) {
  const isSource = props.type === 'source'
  return (
    <Handle
      type={props.type}
      position={props.position}
      id={props.id}
      isConnectable={true}
      title={
        isSource
          ? 'Salida — arrastra o haz clic, luego suelta/clic en la entrada azul de otra caja'
          : 'Entrada — suelta aquí la flecha (o haz clic si ya elegiste la salida)'
      }
      style={
        {
          width: 18,
          height: 18,
          background: '#38bdf8',
          border: '3px solid #0f172a',
          zIndex: 30,
          boxShadow: '0 0 10px #38bdf866',
        } as CSSProperties
      }
    />
  )
}

function MiniHeatmap({
  shape,
  data,
  size = 'md',
}: {
  shape: number[]
  data: number[]
  size?: 'sm' | 'md'
}) {
  const { rows, cols, cells } = gridFromDense(shape, data, size === 'sm' ? 16 : 25)
  if (rows === 0 || cols === 0) return null
  const cell = size === 'sm' ? 7 : 10
  return (
    <div
      className="mt-1.5 grid gap-px rounded-sm overflow-hidden border border-slate-700/60 pointer-events-none"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        gridTemplateRows: `repeat(${rows}, ${cell}px)`,
      }}
    >
      {cells.map((t, i) => (
        <div key={i} style={{ background: heatRgb(t) }} />
      ))}
    </div>
  )
}

function resolveHeat(
  label: string,
  shape: unknown,
  denseSeeds: Record<string, { shape: number[]; data: number[] }> | undefined,
  matrices: { title: string; labels: string[]; matrix: number[][] }[],
): { shape: number[]; data: number[] } | null {
  // Prefer live run matrices (title may be "Attn [5×5]")
  const live = matrices.find(
    (m) => m.title === label || m.title.startsWith(`${label} `) || m.title.startsWith(`${label}[`),
  )
  if (live && live.matrix.length > 0) {
    const rows = live.matrix.length
    const cols = live.matrix[0]?.length ?? 0
    const data = live.matrix.flat()
    return { shape: [rows, cols], data }
  }
  const seed = denseSeeds?.[label]
  if (seed) return { shape: seed.shape, data: seed.data }
  if (Array.isArray(shape) && shape.every((x) => typeof x === 'number')) {
    const n = (shape as number[]).reduce((a, b) => a * b, 1)
    return { shape: shape as number[], data: Array.from({ length: n }, () => 0) }
  }
  return null
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

  const denseSeeds = useProjectStore((s) => s.project.meta.denseSeeds)
  const matrices = useProjectStore((s) => s.matrices)
  const heat = resolveHeat(label, data.shape, denseSeeds, matrices)

  const variant = typeof data.variant === 'string' ? data.variant : null
  const isFrame = variant === 'frame' || kind === 'highlight' && data.frame === true
  const isBlock = variant === 'block' || data.role === 'block'
  const isAttention = variant === 'attention' || data.role === 'attention'
  const tokens = Array.isArray(data.tokens) ? (data.tokens as string[]) : null

  if (isMul) {
    return (
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full border-2 bg-amber-950 shadow-lg relative"
        style={{
          borderColor: '#fbbf24',
          overflow: 'visible',
          boxShadow: '0 0 16px #fbbf2444',
        }}
        title="Matrix multiply ×"
      >
        <DataHandle type="target" position={Position.Left} id="data-in" />
        <span className="text-xl font-bold text-amber-300 leading-none pointer-events-none">
          ×
        </span>
        <DataHandle type="source" position={Position.Right} id="data-out" />
      </div>
    )
  }

  // Architecture frame (encoder / decoder group)
  if (isFrame) {
    return (
      <div
        className="rounded-2xl border-2 px-3 py-2 pointer-events-none"
        style={{
          minWidth: typeof data.frameW === 'number' ? data.frameW : 420,
          minHeight: typeof data.frameH === 'number' ? data.frameH : 200,
          borderColor: `${color}66`,
          background:
            'linear-gradient(145deg, rgba(14,30,50,0.55), rgba(8,16,32,0.35))',
          boxShadow: `inset 0 0 40px ${color}14, 0 0 24px ${color}18`,
        }}
      >
        <div
          className="text-[11px] font-semibold tracking-[0.18em] uppercase"
          style={{ color }}
        >
          {label}
        </div>
        {caption && (
          <div className="text-[10px] text-slate-500 mt-0.5">{caption}</div>
        )}
      </div>
    )
  }

  // Softmax / ReLU compact activation pill
  if (kind === 'softmax' || kind === 'relu' || kind === 'sigmoid' || kind === 'step') {
    return (
      <div
        className="rounded-lg border px-3 py-2 bg-slate-950/90 shadow-lg relative min-w-[100px]"
        style={{
          borderColor: color,
          boxShadow: `0 0 18px ${color}33`,
          overflow: 'visible',
        }}
      >
        <DataHandle type="target" position={Position.Left} id="data-in" />
        <div className="text-sm font-semibold text-slate-100 pointer-events-none">
          {label}
        </div>
        <div
          className="text-[9px] uppercase tracking-wider pointer-events-none"
          style={{ color }}
        >
          {caption ?? kind}
        </div>
        <DataHandle type="source" position={Position.Right} id="data-out" />
      </div>
    )
  }

  const isMatrixBox =
    (kind === 'tensor' || kind === 'relation') &&
    (data.role === 'factor' ||
      data.role === 'product' ||
      data.createdVisually === true ||
      isAttention ||
      isBlock ||
      caption != null ||
      heat != null)

  return (
    <div
      className={[
        'rounded-xl border shadow-lg shadow-black/40 relative',
        isMatrixBox
          ? 'min-w-[168px] min-h-[96px] px-3.5 py-2.5 bg-slate-950/95'
          : 'min-w-[140px] px-3 py-2 bg-slate-900/95',
        isAttention ? 'backdrop-blur-sm' : '',
      ].join(' ')}
      style={{
        borderColor: isAttention ? '#22d3ee' : color,
        borderWidth: isMatrixBox || isAttention ? 2 : 1,
        overflow: 'visible',
        boxShadow: isAttention
          ? '0 0 0 1px #22d3ee44, 0 0 28px #22d3ee33, 0 8px 24px rgba(0,0,0,0.45)'
          : isMatrixBox
            ? `0 0 0 1px ${color}33, 0 0 20px ${color}18, 0 8px 24px rgba(0,0,0,0.45)`
            : undefined,
      }}
    >
      <DataHandle type="target" position={Position.Left} id="data-in" />

      <div
        className={[
          'font-medium text-slate-100 truncate pointer-events-none',
          isMatrixBox ? 'text-base tracking-wide' : 'text-sm',
        ].join(' ')}
        title={label}
      >
        {label}
      </div>
      <div
        className="text-[10px] uppercase tracking-wider mt-0.5 truncate pointer-events-none"
        style={{ color: isAttention ? '#22d3ee' : color }}
      >
        {caption ?? kind}
      </div>

      {tokens && tokens.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-0.5 pointer-events-none max-w-[200px]">
          {tokens.map((t) => (
            <span
              key={t}
              className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-cyan-200/90 border border-slate-700/80"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {heat && (
        <MiniHeatmap
          shape={heat.shape}
          data={heat.data}
          size={isAttention ? 'md' : 'sm'}
        />
      )}

      {!heat && isMatrixBox && Array.isArray(data.shape) && (
        <div className="mt-2 grid grid-cols-4 gap-0.5 opacity-70 pointer-events-none">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="h-3 rounded-sm border border-slate-700/80"
              style={{ background: heatRgb((i % 5) / 5) }}
            />
          ))}
        </div>
      )}

      <DataHandle type="source" position={Position.Right} id="data-out" />
    </div>
  )
}
