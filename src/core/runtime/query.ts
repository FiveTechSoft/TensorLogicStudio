import type { Atom } from '@/types/ast'
import type { SparseBoolTensor } from '../tensor/Tensor'

/** True if `name` is a Datalog variable (uppercase or `_`). */
export function isVariable(name: string): boolean {
  if (name.length === 0) return false
  const c = name[0]
  return c === '_' || (c >= 'A' && c <= 'Z')
}

/**
 * Query a sparse Boolean relation for bindings matching `goal`.
 * - All ground args: returns `[{}]` if member, else `[]`.
 * - Variables: enumerate matching tuples as binding maps.
 */
export function queryRelation(
  tensor: SparseBoolTensor | undefined,
  goal: Atom,
): Record<string, string>[] {
  if (!tensor) return []

  const { args } = goal
  const allGround = args.every((a) => !isVariable(a))

  if (allGround) {
    return tensor.has(args) ? [{}] : []
  }

  const results: Record<string, string>[] = []
  for (const tuple of tensor.tuples()) {
    if (tuple.length !== args.length) continue
    const binding: Record<string, string> = {}
    let ok = true
    for (let i = 0; i < args.length; i++) {
      const a = args[i]
      const v = tuple[i]
      if (isVariable(a)) {
        if (a in binding && binding[a] !== v) {
          ok = false
          break
        }
        binding[a] = v
      } else if (a !== v) {
        ok = false
        break
      }
    }
    if (ok) results.push(binding)
  }
  return results
}
