import type { Atom, Program } from '@/types/ast'
import type { TraceEvent } from '@/types/trace'
import { buildIr, type IrProgram } from '../ir/buildIr'
import { parse } from '../parser/parse'
import { DenseTensor } from '../tensor/Tensor'
import type { SparseBoolTensor } from '../tensor/Tensor'
import { forwardChain, seedRelations } from './forward'
import { queryRelation } from './query'
import { evaluateEquations, seedDenseTensor, trainStep } from './train'

export interface RunResult {
  fixpoint: boolean
  iterations: number
  ms?: number
}

export type RunMode = 'forward' | 'backward' | 'train-step'

export class Runtime {
  private source = ''
  private program: Program | null = null
  private ir: IrProgram | null = null
  private relations = new Map<string, SparseBoolTensor>()
  private dense = new Map<string, DenseTensor>()
  private traces: TraceEvent[] = []
  private lastFixpoint = false
  private stopRequested = false

  loadSource(source: string): void {
    this.source = source
    this.program = parse(source)
    this.ir = buildIr(this.program)
    this.relations = seedRelations(this.ir.facts, this.ir.relationRanks)
    // Preserve seeded (and previously computed) dense tensors across reloads.
    // Only sparse relations are rebuilt from facts.
    this.traces = []
    this.lastFixpoint = false
    this.stopRequested = false
    this.traces.push({
      iteration: 0,
      message: `loaded ${this.ir.facts.length} facts, ${this.ir.rules.length} rules, ${this.ir.equations.length} equation(s)`,
    })
  }

  /**
   * Seed a dense tensor with row-major values.
   * Survives subsequent `loadSource` calls so examples can seed then load equations.
   */
  seedDense(name: string, shape: number[], rowMajorValues: number[]): void {
    this.dense.set(name, seedDenseTensor(shape, rowMajorValues))
  }

  /** Request cooperative stop of an in-progress run / step loop. */
  stop(): void {
    this.stopRequested = true
  }

  run(opts: { mode: RunMode }): RunResult {
    const t0 = performance.now()
    this.stopRequested = false
    if (!this.ir) {
      return { fixpoint: true, iterations: 0, ms: 0 }
    }

    if (opts.mode === 'forward') {
      const result = forwardChain(this.relations, this.ir.rules, {
        maxIters: 64,
        shouldStop: () => this.stopRequested,
        onIteration: ({ iteration, added }) => {
          if (added > 0) {
            this.traces.push({
              iteration,
              message: `forward iteration ${iteration}: +${added} facts`,
              newFacts: added,
            })
          }
        },
      })
      this.lastFixpoint = result.fixpoint

      if (!this.stopRequested && this.ir.equations.length > 0) {
        evaluateEquations(this.ir.equations, this.dense)
        this.traces.push({
          iteration: result.iterations,
          message: `evaluated ${this.ir.equations.length} dense equation(s)`,
        })
      }

      const ms = performance.now() - t0
      const stopped = this.stopRequested
      this.traces.push({
        iteration: result.iterations,
        message: stopped
          ? `stopped by user after ${result.iterations} iteration(s)`
          : result.fixpoint
            ? `fixpoint reached after ${result.iterations} iteration(s)`
            : `stopped after ${result.iterations} iteration(s) (no fixpoint)`,
        newFacts: result.addedTotal,
        ms,
      })
      return { fixpoint: result.fixpoint, iterations: result.iterations, ms }
    }

    if (opts.mode === 'backward') {
      // Query-driven mode not yet implemented; fall back to forward
      return this.run({ mode: 'forward' })
    }

    // train-step: re-evaluate dense equations (minimal path)
    if (this.ir.equations.length > 0) {
      trainStep(this.ir.equations, this.dense)
      this.traces.push({
        iteration: 0,
        message: `train-step: evaluated ${this.ir.equations.length} equation(s)`,
      })
    }
    const ms = performance.now() - t0
    return { fixpoint: this.lastFixpoint, iterations: 0, ms }
  }

  /** Run a single forward-chaining iteration. */
  step(): RunResult {
    const t0 = performance.now()
    this.stopRequested = false
    if (!this.ir) {
      return { fixpoint: true, iterations: 0, ms: 0 }
    }
    const result = forwardChain(this.relations, this.ir.rules, {
      maxIters: 64,
      maxSteps: 1,
      shouldStop: () => this.stopRequested,
      onIteration: ({ iteration, added }) => {
        this.traces.push({
          iteration,
          message: `step: +${added} facts`,
          newFacts: added,
        })
      },
    })
    this.lastFixpoint = result.fixpoint
    const ms = performance.now() - t0
    return { fixpoint: result.fixpoint, iterations: result.iterations, ms }
  }

  query(goal: Atom): Record<string, string>[] {
    const tensor = this.relations.get(goal.relation)
    return queryRelation(tensor, goal)
  }

  getSparse(name: string): SparseBoolTensor | undefined {
    return this.relations.get(name)
  }

  getDense(name: string): DenseTensor | undefined {
    return this.dense.get(name)
  }

  /** Names of all sparse relations currently held. */
  listRelations(): string[] {
    return [...this.relations.keys()].sort()
  }

  /** Names of all dense tensors currently held. */
  listDenseNames(): string[] {
    return [...this.dense.keys()].sort()
  }

  /** Queries from the last loaded IR, if any. */
  getQueries() {
    return this.ir?.queries ?? []
  }

  getIr(): IrProgram | null {
    return this.ir
  }

  getTrace(): TraceEvent[] {
    return [...this.traces]
  }

  getProgram(): Program | null {
    return this.program
  }

  getSource(): string {
    return this.source
  }
}
