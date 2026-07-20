import type { Atom, Program } from '@/types/ast'
import type { TraceEvent } from '@/types/trace'
import { buildIr, type IrProgram } from '../ir/buildIr'
import { parse } from '../parser/parse'
import { DenseTensor } from '../tensor/Tensor'
import type { SparseBoolTensor } from '../tensor/Tensor'
import { forwardChain, seedRelations } from './forward'
import { queryRelation } from './query'

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

  loadSource(source: string): void {
    this.source = source
    this.program = parse(source)
    this.ir = buildIr(this.program)
    this.relations = seedRelations(this.ir.facts, this.ir.relationRanks)
    this.dense = new Map()
    this.traces = []
    this.lastFixpoint = false
    this.traces.push({
      iteration: 0,
      message: `loaded ${this.ir.facts.length} facts, ${this.ir.rules.length} rules`,
    })
  }

  run(opts: { mode: RunMode }): RunResult {
    const t0 = performance.now()
    if (!this.ir) {
      return { fixpoint: true, iterations: 0, ms: 0 }
    }

    if (opts.mode === 'forward') {
      const result = forwardChain(this.relations, this.ir.rules, {
        maxIters: 64,
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
      const ms = performance.now() - t0
      this.traces.push({
        iteration: result.iterations,
        message: result.fixpoint
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

    // train-step reserved for Task 8
    const ms = performance.now() - t0
    return { fixpoint: this.lastFixpoint, iterations: 0, ms }
  }

  /** Run a single forward-chaining iteration. */
  step(): RunResult {
    const t0 = performance.now()
    if (!this.ir) {
      return { fixpoint: true, iterations: 0, ms: 0 }
    }
    const result = forwardChain(this.relations, this.ir.rules, {
      maxIters: 64,
      maxSteps: 1,
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
