import { synthesizeSourceFromGraph } from './graphToSource'
import { useProjectStore } from '@/store/projectStore'

/**
 * Graph → Monaco: rewrite TensorLogic source from the current canvas
 * without triggering source→graph rebuild (two-way lock).
 */
export function pushGraphToSource(message?: string): void {
  const s = useProjectStore.getState()
  const { nodes, edges } = s.project.graph
  const next = synthesizeSourceFromGraph(nodes, edges, s.project.source)
  s.setSourceFromGraph(next)
  if (message) {
    s.setStatus(message)
    s.appendConsole(message)
  } else {
    s.setStatus('Code updated from graph')
  }
}
