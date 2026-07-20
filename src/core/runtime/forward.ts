import type { Fact, Rule } from '@/types/ast'
import { joinProject, type JoinInput } from '../ops/joinProject'
import { SparseBoolTensor } from '../tensor/Tensor'
import { isVariable } from './query'

export interface ForwardResult {
  fixpoint: boolean
  iterations: number
  addedTotal: number
}

export interface ForwardOptions {
  maxIters?: number
  /** If set, run at most this many semi-naive iterations (for step). */
  maxSteps?: number
  /** Called between iterations; return true to abort early. */
  shouldStop?: () => boolean
  onIteration?: (info: {
    iteration: number
    added: number
    ruleId?: string
  }) => void
}

/** Filter a relation to tuples matching ground (constant) positions in `args`. */
export function filterConstants(
  tensor: SparseBoolTensor,
  args: string[],
): SparseBoolTensor {
  const out = new SparseBoolTensor(tensor.rank)
  for (const t of tensor.tuples()) {
    let ok = true
    for (let i = 0; i < args.length; i++) {
      if (!isVariable(args[i]) && t[i] !== args[i]) {
        ok = false
        break
      }
    }
    if (ok) out.add(t)
  }
  return out
}

/**
 * Build join inputs for a rule body. Constants are filtered; join `vars`
 * use atom args (constants become fixed names bound only to themselves after filter).
 */
function bodyJoinInputs(
  body: { relation: string; args: string[] }[],
  relations: Map<string, SparseBoolTensor>,
): JoinInput[] {
  return body.map((atom) => {
    const tensor =
      relations.get(atom.relation) ?? new SparseBoolTensor(atom.args.length)
    const filtered = filterConstants(tensor, atom.args)
    return { tensor: filtered, vars: atom.args }
  })
}

function bodySatisfied(inputs: JoinInput[]): boolean {
  if (inputs.length === 0) return true
  // Project onto first available variable, or all vars of first input if all constant.
  const firstVars = inputs[0].vars
  const free = firstVars.filter(isVariable)
  if (free.length > 0) {
    return joinProject(inputs, [free[0]]).size > 0
  }
  return joinProject(inputs, firstVars).size > 0
}

/**
 * Evaluate one rule: join body, project onto head, return newly derived head tuples.
 * Head constants are filled in when not present as body variables.
 */
export function deriveHead(
  rule: Rule,
  relations: Map<string, SparseBoolTensor>,
): SparseBoolTensor {
  const headRank = rule.head.args.length
  const derived = new SparseBoolTensor(headRank)

  if (rule.body.length === 0) {
    if (rule.head.args.every((a) => !isVariable(a))) {
      derived.add(rule.head.args)
    }
    return derived
  }

  const inputs = bodyJoinInputs(rule.body, relations)

  const headVars = [...new Set(rule.head.args.filter(isVariable))]
  if (headVars.length === 0) {
    if (bodySatisfied(inputs)) {
      derived.add([...rule.head.args])
    }
    return derived
  }

  const bodyVars = [
    ...new Set(rule.body.flatMap((a) => a.args.filter(isVariable))),
  ]
  const projectVars = bodyVars.length > 0 ? bodyVars : headVars
  const joined = joinProject(inputs, projectVars)

  for (const tup of joined.tuples()) {
    const binding: Record<string, string> = {}
    projectVars.forEach((v, i) => {
      binding[v] = tup[i]
    })
    const headTuple: string[] = []
    let ok = true
    for (const a of rule.head.args) {
      if (isVariable(a)) {
        const val = binding[a]
        if (val === undefined) {
          ok = false
          break
        }
        headTuple.push(val)
      } else {
        headTuple.push(a)
      }
    }
    if (ok) derived.add(headTuple)
  }

  return derived
}

/** Seed relation map from facts and known ranks. */
export function seedRelations(
  facts: Fact[],
  relationRanks: Map<string, number>,
): Map<string, SparseBoolTensor> {
  const relations = new Map<string, SparseBoolTensor>()
  for (const [name, rank] of relationRanks) {
    relations.set(name, new SparseBoolTensor(rank))
  }
  for (const fact of facts) {
    let t = relations.get(fact.relation)
    if (!t) {
      t = new SparseBoolTensor(fact.args.length)
      relations.set(fact.relation, t)
    }
    t.add(fact.args)
  }
  return relations
}

/**
 * Naive forward chaining to least fixpoint (or maxIters / maxSteps).
 */
export function forwardChain(
  relations: Map<string, SparseBoolTensor>,
  rules: Rule[],
  opts: ForwardOptions = {},
): ForwardResult {
  const maxIters = opts.maxIters ?? 64
  const maxSteps = opts.maxSteps ?? maxIters
  let iterations = 0
  let addedTotal = 0
  let fixpoint = false

  const steps = Math.min(maxIters, maxSteps)
  for (let iter = 0; iter < steps; iter++) {
    if (opts.shouldStop?.()) break
    let added = 0
    for (const rule of rules) {
      const derived = deriveHead(rule, relations)
      let head = relations.get(rule.head.relation)
      if (!head) {
        head = new SparseBoolTensor(rule.head.args.length)
        relations.set(rule.head.relation, head)
      }
      for (const tup of derived.tuples()) {
        if (!head.has(tup)) {
          head.add(tup)
          added++
          addedTotal++
        }
      }
      opts.onIteration?.({ iteration: iter + 1, added, ruleId: rule.id })
    }
    iterations = iter + 1
    if (added === 0) {
      fixpoint = true
      break
    }
  }

  return { fixpoint, iterations, addedTotal }
}
