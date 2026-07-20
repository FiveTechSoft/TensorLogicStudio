import {
  BaseEdge,
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
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{ stroke: '#38bdf8', strokeWidth: 2, ...style }}
    />
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
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
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
  )
}

export const edgeTypes: EdgeTypes = {
  data: DataEdge,
  event: EventEdge,
}
