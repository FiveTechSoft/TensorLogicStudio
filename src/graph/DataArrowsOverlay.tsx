import { ViewportPortal, useStore } from '@xyflow/react'
import { useProjectStore } from '@/store/projectStore'
import { symbolForOp } from './edgeOps'

/**
 * Draws data edges in flow coordinates (inside the viewport transform).
 * Click the symbol on the arrow to change the operation (+, ×, …).
 */
export function DataArrowsOverlay({
  onEdgeClick,
}: {
  onEdgeClick?: (edgeId: string, sourceId: string, targetId: string) => void
}) {
  const edges = useProjectStore((s) => s.project.graph.edges)
  const nodeLookup = useStore((s) => s.nodeLookup)
  const nodeOrigin = useStore((s) => s.nodeOrigin)
  void nodeOrigin

  const dataEdges = edges.filter((e) => e.kind === 'data')

  return (
    <ViewportPortal>
      <svg
        className="tls-data-arrows"
        width="4000"
        height="4000"
        style={{
          position: 'absolute',
          left: -1000,
          top: -1000,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      >
        <defs>
          <marker
            id="tls-arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="9"
            markerHeight="9"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
          </marker>
        </defs>
        {dataEdges.map((e) => {
          const s = nodeLookup.get(e.source)
          const t = nodeLookup.get(e.target)
          if (!s || !t) return null

          const sw = s.measured?.width ?? s.width ?? 180
          const sh = s.measured?.height ?? s.height ?? 110
          const th = t.measured?.height ?? t.height ?? 110

          const ox = 1000
          const oy = 1000
          const x1 = s.position.x + sw + ox
          const y1 = s.position.y + sh / 2 + oy
          const x2 = t.position.x + ox
          const y2 = t.position.y + th / 2 + oy
          const dx = Math.max(48, Math.abs(x2 - x1) * 0.45)
          const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
          const mx = (x1 + x2) / 2
          const my = (y1 + y2) / 2 - 4
          const sym = e.label || symbolForOp(e.op) || '→'

          return (
            <g key={e.id}>
              <path
                d={d}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={3}
                markerEnd="url(#tls-arrowhead)"
              />
              {/* Clickable op badge */}
              <g
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={(ev) => {
                  ev.stopPropagation()
                  onEdgeClick?.(e.id, e.source, e.target)
                }}
              >
                <circle
                  cx={mx}
                  cy={my}
                  r={14}
                  fill="#0c1424"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                />
                <text
                  x={mx}
                  y={my}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#7dd3fc"
                  fontSize={12}
                  fontWeight={700}
                >
                  {sym}
                </text>
                <title>Clic para cambiar operación (+, ×, copy…)</title>
              </g>
            </g>
          )
        })}
      </svg>
    </ViewportPortal>
  )
}
