import { Runtime, type RunResult } from '@/core/runtime/Runtime'
import { EventBus } from '@/core/events/EventBus'
import type { DenseTensor } from '@/core/tensor/Tensor'
import type { Project } from '@/types/project'
import { useProjectStore, type MatrixEntry } from '@/store/projectStore'

export const ideRuntime = new Runtime()
export const ideBus = new EventBus()

/**
 * Apply (or clear) dense tensor seeds when loading a project / example.
 * Always clears first so switching examples does not leak prior dense state.
 */
export function applyProjectDenseSeeds(project: Project): void {
  ideRuntime.clearDense()
  const seeds = project.meta.denseSeeds
  if (!seeds) return
  for (const [name, seed] of Object.entries(seeds)) {
    ideRuntime.seedDense(name, seed.shape, seed.data)
  }
}

/** Load a project into the store and seed any dense tensors for the runtime. */
export function loadProjectIntoIde(project: Project): void {
  useProjectStore.getState().loadProject(project)
  applyProjectDenseSeeds(project)
}

/** Emit `${queryNodeId}:onMatch` when the last publish produced bindings. */
export function emitQueryOnMatch(): void {
  const s = useProjectStore.getState()
  if (s.queryBindings.length === 0) return
  for (const n of s.project.graph.nodes) {
    if (n.kind === 'query') {
      ideBus.emit(`${n.id}:onMatch`, s.queryBindings)
    }
  }
}

export interface InspectorActions {
  setMatrices: (m: MatrixEntry[]) => void
  setQueryBindings: (b: Record<string, string>[]) => void
  setTraces: (t: ReturnType<Runtime['getTrace']>) => void
  setStatus: (s: string) => void
  appendConsole: (line: string) => void
}

/** Gather all symbols appearing in any sparse relation tuples. */
export function collectDomainSymbols(rt: Runtime): string[] {
  const set = new Set<string>()
  for (const name of rt.listRelations()) {
    const tensor = rt.getSparse(name)
    if (!tensor) continue
    for (const tup of tensor.tuples()) {
      for (const sym of tup) set.add(sym)
    }
  }
  return [...set].sort()
}

function denseToMatrixEntry(name: string, t: DenseTensor): MatrixEntry | null {
  if (t.shape.length === 2) {
    const [rows, cols] = t.shape
    const n = Math.max(rows, cols)
    if (n === 0 || n > 64) return null
    const labels = Array.from({ length: n }, (_, i) => String(i))
    const matrix = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) =>
        r < rows && c < cols ? t.get([r, c]) : 0,
      ),
    )
    return { title: name, labels, matrix }
  }

  if (t.shape.length === 1) {
    const n = t.shape[0]
    if (n === 0 || n > 64) return null
    const labels = Array.from({ length: n }, (_, i) => String(i))
    // Represent 1d vector as a single-row (first row filled, rest zero for square view).
    const firstRow = Array.from({ length: n }, (_, i) => t.get([i]))
    const matrix = Array.from({ length: n }, (_, r) =>
      r === 0 ? firstRow : Array.from({ length: n }, () => 0),
    )
    return { title: name, labels, matrix }
  }

  return null
}

/**
 * Push sparse rank-2 relations + small dense tensors into the inspector,
 * and run any Query statements from the last loaded program.
 */
export function publishInspector(rt: Runtime, actions: InspectorActions): void {
  const domain = collectDomainSymbols(rt)
  const matrices: MatrixEntry[] = []

  for (const name of rt.listRelations()) {
    const tensor = rt.getSparse(name)
    if (!tensor || tensor.rank !== 2) continue
    if (domain.length === 0) {
      matrices.push({ title: name, labels: [], matrix: [] })
      continue
    }
    matrices.push({
      title: name,
      labels: domain,
      matrix: tensor.toDenseMatrix(domain, domain),
    })
  }

  for (const name of rt.listDenseNames()) {
    const t = rt.getDense(name)
    if (!t) continue
    const entry = denseToMatrixEntry(name, t)
    if (entry) matrices.push(entry)
  }

  actions.setMatrices(matrices)

  const bindings: Record<string, string>[] = []
  for (const q of rt.getQueries()) {
    const rows = rt.query(q.goal)
    bindings.push(...rows)
  }
  actions.setQueryBindings(bindings)

  actions.setTraces(rt.getTrace())
}

export function runCurrentProject(source: string): RunResult {
  ideRuntime.loadSource(source)
  return ideRuntime.run({ mode: 'forward' })
}

/** Full Run path: load → forward → publish store + bus. */
export function runAndPublish(source: string, actions: InspectorActions): RunResult {
  actions.setStatus('Running…')
  actions.appendConsole('Run started')

  let result: RunResult
  try {
    result = runCurrentProject(source)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    actions.setStatus(`Error: ${msg}`)
    actions.appendConsole(`Error: ${msg}`)
    throw err
  }

  publishInspector(ideRuntime, actions)
  emitQueryOnMatch()

  const status = result.fixpoint
    ? `Fixpoint · ${result.iterations} iteration(s)${result.ms != null ? ` · ${result.ms.toFixed(1)}ms` : ''}`
    : `No fixpoint · ${result.iterations} iteration(s)${result.ms != null ? ` · ${result.ms.toFixed(1)}ms` : ''}`
  actions.setStatus(status)
  actions.appendConsole(status)
  for (const t of ideRuntime.getTrace()) {
    if (t.message) actions.appendConsole(t.message)
  }

  ideBus.emit('fixpoint', result)
  return result
}

/** Single forward step (requires source already loaded, or reloads). */
export function stepAndPublish(source: string, actions: InspectorActions): RunResult {
  // Ensure program is loaded; if source changed, reload without re-running.
  if (ideRuntime.getSource() !== source || !ideRuntime.getProgram()) {
    try {
      ideRuntime.loadSource(source)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      actions.setStatus(`Error: ${msg}`)
      actions.appendConsole(`Error: ${msg}`)
      throw err
    }
  }

  actions.setStatus('Stepping…')
  const result = ideRuntime.step()
  publishInspector(ideRuntime, actions)
  emitQueryOnMatch()

  const status = result.fixpoint
    ? `Step fixpoint · ${result.iterations} iteration(s)`
    : `Step · ${result.iterations} iteration(s)`
  actions.setStatus(status)
  actions.appendConsole(status)
  ideBus.emit('step', result)
  return result
}

export function stopRuntime(actions?: Pick<InspectorActions, 'setStatus' | 'appendConsole'>): void {
  ideRuntime.stop()
  actions?.setStatus('Stopped')
  actions?.appendConsole('Stop requested')
  ideBus.emit('stop', undefined)
}
