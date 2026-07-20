import type { Equation, Expr, TensorRef } from '@/types/ast'
import { mapDense, matmul, relu, sigmoid } from '../ops/dense'
import { DenseTensor } from '../tensor/Tensor'

function step(x: number): number {
  return x > 0 ? 1 : 0
}

/** Elementwise stub — real softmax needs a vector axis; enough for MVP parsing. */
function softmaxStub(x: number): number {
  return Math.exp(x)
}

function activationFn(fn: 'step' | 'relu' | 'sigmoid' | 'softmax'): (x: number) => number {
  switch (fn) {
    case 'relu':
      return relu
    case 'sigmoid':
      return sigmoid
    case 'step':
      return step
    case 'softmax':
      return softmaxStub
  }
}

function collectDeps(expr: Expr, deps: Set<string>): void {
  switch (expr.kind) {
    case 'ref':
      deps.add(expr.ref.name)
      break
    case 'bin':
      collectDeps(expr.left, deps)
      collectDeps(expr.right, deps)
      break
    case 'call':
      collectDeps(expr.arg, deps)
      break
  }
}

/** Topological order of equations by RHS tensor dependencies. */
export function topologicalEquations(equations: Equation[]): Equation[] {
  const byName = new Map<string, Equation>()
  for (const eq of equations) {
    byName.set(eq.lhs.name, eq)
  }

  const sorted: Equation[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(name: string): void {
    if (visited.has(name)) return
    if (visiting.has(name)) {
      throw new Error(`cyclic equation dependency involving ${name}`)
    }
    const eq = byName.get(name)
    if (!eq) return
    visiting.add(name)
    const deps = new Set<string>()
    collectDeps(eq.rhs, deps)
    for (const d of deps) {
      if (byName.has(d)) visit(d)
    }
    visiting.delete(name)
    visited.add(name)
    sorted.push(eq)
  }

  for (const eq of equations) {
    visit(eq.lhs.name)
  }
  return sorted
}

/**
 * Match `f(W[a,b] * X[b])` or `W[a,b] * X[b]` and evaluate via matmul + optional map.
 * Returns null if the expression is not this pattern.
 */
function tryMatmulPattern(
  expr: Expr,
  dense: Map<string, DenseTensor>,
): DenseTensor | null {
  let activation: ((x: number) => number) | null = null
  let core = expr
  if (expr.kind === 'call') {
    activation = activationFn(expr.fn)
    core = expr.arg
  }
  if (core.kind !== 'bin' || core.op !== '*') return null
  if (core.left.kind !== 'ref' || core.right.kind !== 'ref') return null

  const left = core.left.ref
  const right = core.right.ref

  let Wref: TensorRef
  let Xref: TensorRef
  if (left.indices.length === 2 && right.indices.length === 1) {
    Wref = left
    Xref = right
  } else if (right.indices.length === 2 && left.indices.length === 1) {
    Wref = right
    Xref = left
  } else {
    return null
  }

  const xIdx = Xref.indices[0]!
  // MVP matmul: W[m,n] * X[n] — contracted index must be last on W
  if (Wref.indices[1] !== xIdx) return null

  const W = dense.get(Wref.name)
  const X = dense.get(Xref.name)
  if (!W) throw new Error(`missing dense tensor ${Wref.name}`)
  if (!X) throw new Error(`missing dense tensor ${Xref.name}`)

  let Y = matmul(W, X)
  if (activation) Y = mapDense(Y, activation)
  return Y
}

function evalExpr(expr: Expr, dense: Map<string, DenseTensor>): DenseTensor {
  const mat = tryMatmulPattern(expr, dense)
  if (mat) return mat

  if (expr.kind === 'ref') {
    const t = dense.get(expr.ref.name)
    if (!t) throw new Error(`missing dense tensor ${expr.ref.name}`)
    return t.clone()
  }

  if (expr.kind === 'call') {
    const arg = evalExpr(expr.arg, dense)
    return mapDense(arg, activationFn(expr.fn))
  }

  if (expr.kind === 'bin') {
    if (expr.op === '+') {
      const L = evalExpr(expr.left, dense)
      const R = evalExpr(expr.right, dense)
      if (L.shape.join(',') !== R.shape.join(',')) {
        throw new Error(
          `shape mismatch for +: [${L.shape}] vs [${R.shape}]`,
        )
      }
      const o = L.clone()
      for (let i = 0; i < o.data.length; i++) {
        o.data[i]! += R.data[i]!
      }
      return o
    }
    throw new Error('unsupported * contraction pattern (expected W[a,b] * X[b])')
  }

  throw new Error('unsupported expression')
}

/** Create a DenseTensor from row-major values. */
export function seedDenseTensor(
  shape: number[],
  rowMajorValues: number[],
): DenseTensor {
  const n = shape.reduce((a, b) => a * b, 1)
  if (rowMajorValues.length !== n) {
    throw new Error(`expected ${n} values for shape [${shape}], got ${rowMajorValues.length}`)
  }
  const t = new DenseTensor(shape)
  t.data.set(rowMajorValues)
  return t
}

/** Evaluate equations in dependency order; write results into `dense`. */
export function evaluateEquations(
  equations: Equation[],
  dense: Map<string, DenseTensor>,
): void {
  if (equations.length === 0) return
  const ordered = topologicalEquations(equations)
  for (const eq of ordered) {
    const result = evalExpr(eq.rhs, dense)
    dense.set(eq.lhs.name, result)
  }
}

/**
 * Minimal train-step: re-evaluate equations (forward).
 * Optional future: squared loss + SGD on weight tensors.
 */
export function trainStep(
  equations: Equation[],
  dense: Map<string, DenseTensor>,
): void {
  evaluateEquations(equations, dense)
}
