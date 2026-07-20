import type { ReactFlowInstance } from '@xyflow/react'

let instance: ReactFlowInstance | null = null

export function setReactFlowInstance(rf: ReactFlowInstance | null): void {
  instance = rf
}

export function getReactFlowInstance(): ReactFlowInstance | null {
  return instance
}

/** Move a node into the visible center of the graph pane and zoom to it. */
export function revealNodeInView(nodeId: string): void {
  const rf = instance
  if (!rf) return

  const pane = document.querySelector('.react-flow') as HTMLElement | null
  if (pane) {
    const rect = pane.getBoundingClientRect()
    const flowPos = rf.screenToFlowPosition({
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.45,
    })
    rf.setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              position: { x: flowPos.x - 90, y: flowPos.y - 50 },
              style: { ...n.style, visibility: 'visible', opacity: 1 },
            }
          : n,
      ),
    )
  }

  // Multiple attempts: measure may lag one frame
  const focus = () => {
    rf.fitView({
      nodes: [{ id: nodeId }],
      padding: 0.5,
      duration: 200,
      maxZoom: 1.2,
      minZoom: 0.5,
    })
  }
  focus()
  window.setTimeout(focus, 100)
  window.setTimeout(focus, 300)
}
