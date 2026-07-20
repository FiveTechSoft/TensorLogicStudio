import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type EdgeTypes,
} from '@xyflow/react'

function DataEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const text =
    label != null && label !== ''
      ? String(label)
      : null

  const isMul = text === '×' || text === 'x' || text === '*' || text === '(×)'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: '#38bdf8', strokeWidth: isMul ? 2.5 : 2, ...style }}
      />
      {text && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <span
              className={[
                'flex items-center justify-center rounded-full border font-semibold shadow-md shadow-black/40',
                isMul
                  ? 'h-7 w-7 text-sm border-amber-500/80 bg-amber-950 text-amber-300'
                  : 'px-1.5 py-0.5 text-[10px] border-slate-600 bg-slate-900 text-sky-300',
              ].join(' ')}
              title={isMul ? 'Matrix multiply (×)' : text}
            >
              {isMul ? '×' : text}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

function EventEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#f472b6',
          strokeWidth: 2,
          strokeDasharray: '5 4',
          ...style,
        }}
      />
      {label != null && label !== '' && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute text-[10px] px-1 rounded bg-slate-900 border border-pink-800 text-pink-300"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const edgeTypes: EdgeTypes = {
  data: DataEdge,
  default: DataEdge,
  event: EventEdge,
}
