# TensorLogicStudio MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a browser SPA IDE where users write Tensor Logic (Datalog + tensor equations), see a dual-synced graph with hybrid data/event arrows, run inference/MLP demos, inspect matrices, and save/load projects.

**Architecture:** Vite + React + TypeScript shell; Monaco + React Flow as dual views over a project store (Zustand); pure-TS TensorLogic core (parser → AST → IR → runtime + Event Bus). AST/`source` is the program truth for logic; event edges live only in the graph.

**Tech Stack:** Vite, React 18, TypeScript, Monaco Editor, @xyflow/react, Zustand, Tailwind CSS, dagre, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-20-tensorlogic-studio-design.md`

---

## File map (create in order)

| Path | Responsibility |
|------|----------------|
| `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | Tooling |
| `tailwind.config.js`, `postcss.config.js`, `src/index.css` | Dark theme tokens |
| `src/types/project.ts` | Project, graph node/edge types |
| `src/types/ast.ts` | AST node types |
| `src/core/tensor/Tensor.ts` | SparseBoolTensor, DenseTensor, views |
| `src/core/tensor/Domain.ts` | Symbol ↔ index mapping for axes |
| `src/core/ops/joinProject.ts` | Boolean join + project / step |
| `src/core/ops/dense.ts` | matmul-like, relu, sigmoid, softmax |
| `src/core/parser/tokenize.ts` | Lexer |
| `src/core/parser/parse.ts` | Parser → Program AST |
| `src/core/ir/buildIr.ts` | AST → dependency IR |
| `src/core/runtime/Runtime.ts` | load, run, step, query, getTensor |
| `src/core/runtime/forward.ts` | Fixpoint forward chaining |
| `src/core/runtime/query.ts` | Backward-style query bindings |
| `src/core/runtime/train.ts` | MLP forward + one SGD step |
| `src/core/events/EventBus.ts` | Typed pub/sub for UI wiring |
| `src/store/projectStore.ts` | Zustand project + sync flags |
| `src/editor/CodeEditor.tsx` | Monaco wrapper |
| `src/editor/syncFromSource.ts` | source → graph data nodes |
| `src/editor/syncToSource.ts` | graph data edit → source rewrite |
| `src/graph/GraphCanvas.tsx` | React Flow host |
| `src/graph/nodes/*.tsx` | Custom node components |
| `src/graph/edgeTypes.ts` | data (solid) / event (dashed) |
| `src/graph/layout.ts` | dagre auto-layout |
| `src/graph/Palette.tsx` | Node palette |
| `src/inspector/MatrixView.tsx` | Heatmap grid |
| `src/inspector/QueryResults.tsx` | Bindings list |
| `src/inspector/PropertiesPanel.tsx` | Selected node props |
| `src/components/Toolbar.tsx` | Run/Step/Stop/Examples/Save/Load |
| `src/components/StatusBar.tsx` | Fixpoint / timing / status |
| `src/components/ConsolePanel.tsx` | Logs + diagnostics |
| `src/components/AppShell.tsx` | 3-column resizable layout |
| `src/examples/genealogy.ts` | Full project document |
| `src/examples/mlp.ts` | Full project document |
| `src/App.tsx`, `src/main.tsx` | Bootstrap |
| `src/core/**/*.test.ts` | Vitest unit tests |
| `src/core/runtime/genealogy.integration.test.ts` | End-to-end genealogy |

---

### Task 1: Scaffold the Vite app

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `tailwind.config.js`, `postcss.config.js`, `vitest.config.ts`

- [ ] **Step 1: Scaffold with Vite**

```bash
cd C:\tensorlogicstudio
npm create vite@latest . -- --template react-ts
```

If the directory is non-empty, create files manually instead of wiping existing docs/PDF:

`package.json`:
```json
{
  "name": "tensorlogic-studio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Install deps:
```bash
npm install
npm install zustand @xyflow/react @monaco-editor/react monaco-editor dagre
npm install -D tailwindcss @tailwindcss/vite vitest jsdom @types/dagre
```

- [ ] **Step 2: Configure Vite + Tailwind + Vitest**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

`src/index.css`:
```css
@import "tailwindcss";

:root {
  --bg: #0b1220;
  --panel: #0c1424;
  --border: #1e293b;
  --accent: #38bdf8;
  --accent-2: #a78bfa;
  --ok: #86efac;
  --event: #f472b6;
  --text: #e2e8f0;
  --muted: #64748b;
}

html, body, #root {
  height: 100%;
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
```

`src/App.tsx` temporary:
```tsx
export default function App() {
  return (
    <div className="h-full flex items-center justify-center">
      <h1 className="text-2xl text-sky-400 font-semibold tracking-wide">
        TensorLogic Studio
      </h1>
    </div>
  )
}
```

- [ ] **Step 3: Verify dev server and tests harness**

```bash
npm run build
npm test
```

Expected: build succeeds; vitest exits 0 with no tests (or “no test files”).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json index.html src tailwind* postcss* vitest.config.ts
git commit -m "chore: scaffold Vite React TS app for TensorLogicStudio"
```

---

### Task 2: Core types (project + AST)

**Files:**
- Create: `src/types/ast.ts`, `src/types/project.ts`, `src/types/trace.ts`

- [ ] **Step 1: Write AST types**

`src/types/ast.ts`:
```ts
export type Index = string

export interface Fact {
  kind: 'fact'
  id: string
  relation: string
  args: string[]
  span?: { start: number; end: number }
}

export interface Atom {
  relation: string
  args: string[]
}

export interface Rule {
  kind: 'rule'
  id: string
  head: Atom
  body: Atom[]
  span?: { start: number; end: number }
}

export interface TensorRef {
  name: string
  indices: Index[]
}

export type Expr =
  | { kind: 'ref'; ref: TensorRef }
  | { kind: 'bin'; op: '*' | '+'; left: Expr; right: Expr }
  | { kind: 'call'; fn: 'step' | 'relu' | 'sigmoid' | 'softmax'; arg: Expr }

export interface Equation {
  kind: 'equation'
  id: string
  lhs: TensorRef
  rhs: Expr
  span?: { start: number; end: number }
}

export interface Query {
  kind: 'query'
  id: string
  goal: Atom
  span?: { start: number; end: number }
}

export type Stmt = Fact | Rule | Equation | Query

export interface Program {
  stmts: Stmt[]
}
```

- [ ] **Step 2: Write project + graph types**

`src/types/project.ts`:
```ts
export type PortKind = 'data-in' | 'data-out' | 'event-in' | 'event-out'

export type NodeKind =
  | 'tensor' | 'relation' | 'einsum' | 'step' | 'relu' | 'sigmoid' | 'softmax'
  | 'equation' | 'rule' | 'query' | 'fact'
  | 'loss' | 'sgd'
  | 'button' | 'matrixView' | 'console' | 'highlight'
  | 'run' | 'stepIter'

export interface GraphNode {
  id: string
  kind: NodeKind
  label: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  /** AST declaration id when linked */
  astId?: string
}

export type EdgeKind = 'data' | 'event'

export interface GraphEdge {
  id: string
  kind: EdgeKind
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface Project {
  id: string
  name: string
  version: number
  source: string
  graph: { nodes: GraphNode[]; edges: GraphEdge[] }
  ui: {
    panelSizes: number[]
    camera: { x: number; y: number; zoom: number }
    selectedId?: string
  }
  meta: {
    createdAt: string
    updatedAt: string
    exampleId?: string
  }
}

export function emptyProject(name = 'untitled'): Project {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    version: 1,
    source: '',
    graph: { nodes: [], edges: [] },
    ui: { panelSizes: [28, 44, 28], camera: { x: 0, y: 0, zoom: 1 } },
    meta: { createdAt: now, updatedAt: now },
  }
}
```

`src/types/trace.ts`:
```ts
export interface TraceEvent {
  iteration: number
  message: string
  nodeIds?: string[]
  equationId?: string
  newFacts?: number
  ms?: number
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types
git commit -m "feat: add AST and project type definitions"
```

---

### Task 3: Sparse/dense tensors + domain map

**Files:**
- Create: `src/core/tensor/Domain.ts`, `src/core/tensor/Tensor.ts`
- Test: `src/core/tensor/Tensor.test.ts`

- [ ] **Step 1: Write failing tests**

`src/core/tensor/Tensor.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { Domain } from './Domain'
import { SparseBoolTensor, DenseTensor } from './Tensor'

describe('Domain', () => {
  it('maps symbols to stable indices', () => {
    const d = new Domain()
    expect(d.index('adam')).toBe(0)
    expect(d.index('seth')).toBe(1)
    expect(d.index('adam')).toBe(0)
    expect(d.symbol(1)).toBe('seth')
  })
})

describe('SparseBoolTensor', () => {
  it('stores tuples and checks membership', () => {
    const t = new SparseBoolTensor(2)
    t.add(['adam', 'seth'])
    expect(t.has(['adam', 'seth'])).toBe(true)
    expect(t.has(['seth', 'adam'])).toBe(false)
    expect(t.size).toBe(1)
  })
})

describe('DenseTensor', () => {
  it('get/set by multi-index', () => {
    const t = new DenseTensor([2, 2], 0)
    t.set([0, 1], 0.5)
    expect(t.get([0, 1])).toBe(0.5)
    expect(t.get([0, 0])).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/core/tensor/Tensor.test.ts
```

Expected: FAIL (modules not found).

- [ ] **Step 3: Implement Domain + Tensor**

`src/core/tensor/Domain.ts`:
```ts
export class Domain {
  private symToIdx = new Map<string, number>()
  private idxToSym: string[] = []

  index(symbol: string): number {
    let i = this.symToIdx.get(symbol)
    if (i === undefined) {
      i = this.idxToSym.length
      this.symToIdx.set(symbol, i)
      this.idxToSym.push(symbol)
    }
    return i
  }

  symbol(i: number): string {
    return this.idxToSym[i] ?? String(i)
  }

  get size() {
    return this.idxToSym.length
  }

  symbols(): string[] {
    return [...this.idxToSym]
  }
}
```

`src/core/tensor/Tensor.ts`:
```ts
function keyOf(tuple: string[]): string {
  return tuple.join('\u0001')
}

export class SparseBoolTensor {
  private data = new Set<string>()
  constructor(public readonly rank: number) {}

  add(tuple: string[]): void {
    if (tuple.length !== this.rank) throw new Error(`rank ${this.rank}, got ${tuple.length}`)
    this.data.add(keyOf(tuple))
  }

  has(tuple: string[]): boolean {
    return this.data.has(keyOf(tuple))
  }

  get size() {
    return this.data.size
  }

  tuples(): string[][] {
    return [...this.data].map((k) => k.split('\u0001'))
  }

  clear(): void {
    this.data.clear()
  }

  /** Boolean adjacency matrix over domain symbols for rank-2. */
  toDenseMatrix(rows: string[], cols: string[]): number[][] {
    if (this.rank !== 2) throw new Error('toDenseMatrix requires rank 2')
    return rows.map((r) => cols.map((c) => (this.has([r, c]) ? 1 : 0)))
  }
}

export class DenseTensor {
  data: Float64Array
  constructor(
    public shape: number[],
    fill = 0,
  ) {
    const n = shape.reduce((a, b) => a * b, 1)
    this.data = new Float64Array(n)
    if (fill !== 0) this.data.fill(fill)
  }

  private offset(indices: number[]): number {
    let o = 0
    for (let i = 0; i < this.shape.length; i++) {
      o = o * this.shape[i] + indices[i]
    }
    return o
  }

  get(indices: number[]): number {
    return this.data[this.offset(indices)]
  }

  set(indices: number[], v: number): void {
    this.data[this.offset(indices)] = v
  }

  clone(): DenseTensor {
    const t = new DenseTensor(this.shape)
    t.data.set(this.data)
    return t
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/core/tensor/Tensor.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/core/tensor
git commit -m "feat: sparse and dense tensor storage with domain map"
```

---

### Task 4: Boolean join / project / step ops

**Files:**
- Create: `src/core/ops/joinProject.ts`
- Test: `src/core/ops/joinProject.test.ts`

- [ ] **Step 1: Write failing tests for ancestor-style join**

```ts
import { describe, it, expect } from 'vitest'
import { SparseBoolTensor } from '../tensor/Tensor'
import { joinProject, stepBool } from './joinProject'

describe('joinProject', () => {
  it('implements parent compose parent → grandparent', () => {
    const parent = new SparseBoolTensor(2)
    parent.add(['adam', 'seth'])
    parent.add(['seth', 'enos'])
    parent.add(['enos', 'cainan'])

    // ancestor(X,Z) :- parent(X,Y), parent(Y,Z)  → join on Y, project X,Z
    const gp = joinProject(
      [
        { tensor: parent, vars: ['X', 'Y'] },
        { tensor: parent, vars: ['Y', 'Z'] },
      ],
      ['X', 'Z'],
    )
    expect(gp.has(['adam', 'enos'])).toBe(true)
    expect(gp.has(['seth', 'cainan'])).toBe(true)
    expect(gp.has(['adam', 'cainan'])).toBe(false)
  })

  it('stepBool thresholds counts to 0/1', () => {
    expect(stepBool(0)).toBe(0)
    expect(stepBool(2)).toBe(1)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- src/core/ops/joinProject.test.ts
```

- [ ] **Step 3: Implement joinProject**

`src/core/ops/joinProject.ts`:
```ts
import { SparseBoolTensor } from '../tensor/Tensor'

export interface JoinInput {
  tensor: SparseBoolTensor
  vars: string[]
}

/**
 * Natural join of sparse Boolean relations on shared variable names,
 * then project onto `outVars` (existential: any match → true).
 */
export function joinProject(inputs: JoinInput[], outVars: string[]): SparseBoolTensor {
  if (inputs.length === 0) return new SparseBoolTensor(outVars.length)

  type Binding = Record<string, string>
  let rows: Binding[] = inputs[0].tensor.tuples().map((t) => {
    const b: Binding = {}
    inputs[0].vars.forEach((v, i) => {
      b[v] = t[i]
    })
    return b
  })

  for (let k = 1; k < inputs.length; k++) {
    const next: Binding[] = []
    const rel = inputs[k]
    for (const left of rows) {
      for (const tup of rel.tensor.tuples()) {
        const cand: Binding = { ...left }
        let ok = true
        for (let i = 0; i < rel.vars.length; i++) {
          const v = rel.vars[i]
          const val = tup[i]
          if (v in cand && cand[v] !== val) {
            ok = false
            break
          }
          cand[v] = val
        }
        if (ok) next.push(cand)
      }
    }
    rows = next
  }

  const out = new SparseBoolTensor(outVars.length)
  for (const b of rows) {
    out.add(outVars.map((v) => b[v]))
  }
  return out
}

export function stepBool(x: number): number {
  return x > 0 ? 1 : 0
}

export function unionSparse(a: SparseBoolTensor, b: SparseBoolTensor): SparseBoolTensor {
  if (a.rank !== b.rank) throw new Error('rank mismatch')
  const u = new SparseBoolTensor(a.rank)
  for (const t of a.tuples()) u.add(t)
  for (const t of b.tuples()) u.add(t)
  return u
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- src/core/ops/joinProject.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/core/ops
git commit -m "feat: Boolean join-project and step for Datalog rules"
```

---

### Task 5: Lexer + parser (facts, rules, queries)

**Files:**
- Create: `src/core/parser/tokenize.ts`, `src/core/parser/parse.ts`
- Test: `src/core/parser/parse.test.ts`

- [ ] **Step 1: Write parser tests**

```ts
import { describe, it, expect } from 'vitest'
import { parse } from './parse'

describe('parse Datalog subset', () => {
  it('parses facts, rules, query', () => {
    const src = `
parent(adam, seth).
ancestor(X, Z) :- parent(X, Z).
ancestor(X, Z) :- ancestor(X, Y), parent(Y, Z).
?- ancestor(adam, Who).
`
    const prog = parse(src)
    expect(prog.stmts.filter((s) => s.kind === 'fact')).toHaveLength(1)
    expect(prog.stmts.filter((s) => s.kind === 'rule')).toHaveLength(2)
    const q = prog.stmts.find((s) => s.kind === 'query')
    expect(q?.kind).toBe('query')
    if (q?.kind === 'query') {
      expect(q.goal.relation).toBe('ancestor')
      expect(q.goal.args).toEqual(['adam', 'Who'])
    }
  })

  it('throws on garbage with message', () => {
    expect(() => parse('@@@')).toThrow()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- src/core/parser/parse.test.ts
```

- [ ] **Step 3: Implement tokenizer + recursive-descent parser**

Support:
- Comments: `%` line and `//` line
- Identifiers: `[A-Za-z_][A-Za-z0-9_]*` (variables = start with uppercase or `_`)
- Fact: `name(args).`
- Rule: `head :- body1, body2.`
- Query: `?- goal.`

Assign stable `id`s: `fact:parent:0`, `rule:ancestor:0`, etc.

Keep implementation in `parse.ts` (~150–200 lines). On error throw `ParseError` with `{ message, pos }`.

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- src/core/parser/parse.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/core/parser
git commit -m "feat: parse Datalog facts, rules, and queries"
```

---

### Task 6: Parser equations + dense ops

**Files:**
- Modify: `src/core/parser/parse.ts`
- Create: `src/core/ops/dense.ts`
- Test: `src/core/parser/equations.test.ts`, `src/core/ops/dense.test.ts`

- [ ] **Step 1: Tests for equation syntax and dense kernels**

```ts
// equations.test.ts
import { parse } from './parse'
import { describe, it, expect } from 'vitest'

it('parses Y[i] = relu(W[i,j] * X[j])', () => {
  const p = parse('Y[i] = relu(W[i,j] * X[j]).')
  const eq = p.stmts.find((s) => s.kind === 'equation')
  expect(eq?.kind).toBe('equation')
  if (eq?.kind === 'equation') {
    expect(eq.lhs.name).toBe('Y')
    expect(eq.lhs.indices).toEqual(['i'])
  }
})
```

```ts
// dense.test.ts
import { DenseTensor } from '../tensor/Tensor'
import { matmul, relu, sigmoid } from './dense'
import { describe, it, expect } from 'vitest'

it('matmul 2x3 * 3x1', () => {
  const W = new DenseTensor([2, 3])
  const X = new DenseTensor([3])
  // fill simply
  W.set([0, 0], 1); W.set([0, 1], 0); W.set([0, 2], 0)
  W.set([1, 0], 0); W.set([1, 1], 1); W.set([1, 2], 0)
  X.set([0], 2); X.set([1], 3); X.set([2], 4)
  const Y = matmul(W, X)
  expect(Y.shape).toEqual([2])
  expect(Y.get([0])).toBe(2)
  expect(Y.get([1])).toBe(3)
})

it('relu and sigmoid', () => {
  expect(relu(-1)).toBe(0)
  expect(relu(2)).toBe(2)
  expect(sigmoid(0)).toBeCloseTo(0.5)
})
```

- [ ] **Step 2: Implement equation grammar + dense ops**

Extend parser for:
`Name[idx,...] = expr.` where expr is `fn(expr)` or `A[idx] * B[idx]` or `A + B`.

`dense.ts`:
```ts
import { DenseTensor } from '../tensor/Tensor'

export function relu(x: number) { return x > 0 ? x : 0 }
export function sigmoid(x: number) { return 1 / (1 + Math.exp(-x)) }

/** W[m,n] * X[n] → Y[m]  or W[m,n] * X[n,p] → Y[m,p] */
export function matmul(W: DenseTensor, X: DenseTensor): DenseTensor {
  if (W.shape.length === 2 && X.shape.length === 1) {
    const [m, n] = W.shape
    if (X.shape[0] !== n) throw new Error('matmul shape')
    const Y = new DenseTensor([m])
    for (let i = 0; i < m; i++) {
      let s = 0
      for (let j = 0; j < n; j++) s += W.get([i, j]) * X.get([j])
      Y.set([i], s)
    }
    return Y
  }
  throw new Error(`unsupported matmul shapes ${W.shape} x ${X.shape}`)
}

export function mapDense(t: DenseTensor, fn: (x: number) => number): DenseTensor {
  const o = t.clone()
  for (let i = 0; i < o.data.length; i++) o.data[i] = fn(o.data[i])
  return o
}
```

- [ ] **Step 3: Tests PASS + commit**

```bash
npm test
git add src/core/parser src/core/ops/dense.ts src/core/ops/dense.test.ts src/core/parser/equations.test.ts
git commit -m "feat: parse tensor equations and dense matmul/activations"
```

---

### Task 7: Runtime — forward chaining + query (genealogy)

**Files:**
- Create: `src/core/ir/buildIr.ts`, `src/core/runtime/Runtime.ts`, `src/core/runtime/forward.ts`, `src/core/runtime/query.ts`
- Test: `src/core/runtime/genealogy.integration.test.ts`

- [ ] **Step 1: Write integration test matching the mockup**

```ts
import { describe, it, expect } from 'vitest'
import { Runtime } from './Runtime'

const SRC = `
parent(adam, seth).
parent(seth, enos).
parent(enos, cainan).
ancestor(X, Z) :- parent(X, Z).
ancestor(X, Z) :- ancestor(X, Y), parent(Y, Z).
?- ancestor(adam, Who).
`

describe('genealogy fixpoint', () => {
  it('derives all ancestors of adam', () => {
    const rt = new Runtime()
    rt.loadSource(SRC)
    const result = rt.run({ mode: 'forward' })
    expect(result.fixpoint).toBe(true)
    const bindings = rt.query({ relation: 'ancestor', args: ['adam', 'Who'] })
    const whos = bindings.map((b) => b.Who).sort()
    expect(whos).toEqual(['cainan', 'enos', 'seth'])
  })
})
```

- [ ] **Step 2: Implement IR + forward + query**

`buildIr.ts`: group facts by relation; list rules; list equations; list queries.

`forward.ts` algorithm:
```
relations = map name → SparseBoolTensor
seed from facts
loop maxIters (default 64):
  added = 0
  for each rule:
    bodyTensors = lookup each body atom relation
    joined = joinProject(body with rule vars, head vars)
    for each new tuple not in head relation:
      add; added++
  if added == 0: fixpoint; break
```

`query.ts`: if all args ground, check membership; if variable args, enumerate tuples matching ground positions.

`Runtime.ts`:
```ts
export class Runtime {
  private source = ''
  private relations = new Map<string, SparseBoolTensor>()
  private dense = new Map<string, DenseTensor>()
  private program: Program | null = null
  private traces: TraceEvent[] = []
  // ...
  loadSource(source: string): void
  run(opts: { mode: 'forward' | 'backward' | 'train-step' }): RunResult
  step(): RunResult
  query(goal: Atom): Record<string, string>[]
  getSparse(name: string): SparseBoolTensor | undefined
  getTrace(): TraceEvent[]
}
```

- [ ] **Step 3: Tests PASS**

```bash
npm test -- src/core/runtime/genealogy.integration.test.ts
```

Expected: PASS with three descendants.

- [ ] **Step 4: Commit**

```bash
git add src/core/ir src/core/runtime
git commit -m "feat: forward-chaining runtime and query for Datalog"
```

---

### Task 8: Runtime — MLP forward + one SGD step

**Files:**
- Create: `src/core/runtime/train.ts`
- Modify: `src/core/runtime/Runtime.ts`
- Test: `src/core/runtime/mlp.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { Runtime } from './Runtime'

it('evaluates two-layer MLP equations', () => {
  const rt = new Runtime()
  // Program may use special init syntax OR runtime.seedDense API for MVP
  rt.seedDense('X', [2], [1, 0])
  rt.seedDense('W1', [2, 2], [1, 0, 0, 1]) // row-major
  rt.seedDense('W2', [1, 2], [1, -1])
  rt.loadSource(`
H[i] = relu(W1[i,j] * X[j]).
Y[k] = sigmoid(W2[k,i] * H[i]).
`)
  rt.run({ mode: 'forward' })
  const Y = rt.getDense('Y')!
  expect(Y.shape).toEqual([1])
  expect(Y.get([0])).toBeGreaterThan(0.5) // roughly sigmoid(1)
})
```

- [ ] **Step 2: Implement equation evaluation order**

Topological eval of equations: for each equation, interpret RHS with einsum-lite:
- product over repeated indices not on LHS summed (Einstein)
- MVP: support pattern `Out[a] = f(W[a,b] * X[b])` via `matmul` + map

`seedDense(name, shape, rowMajorValues)` for examples.

Optional `train-step`: squared loss vs target vector, numeric gradient on W* with small lr (finite-diff acceptable for MVP if analytic is heavy — prefer analytic for matmul+sigmoid).

- [ ] **Step 3: PASS + commit**

```bash
npm test -- src/core/runtime/mlp.test.ts
git add src/core/runtime
git commit -m "feat: dense equation evaluation and MLP demo path"
```

---

### Task 9: Event Bus

**Files:**
- Create: `src/core/events/EventBus.ts`
- Test: `src/core/events/EventBus.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { EventBus } from './EventBus'

it('dispatches to subscribers', () => {
  const bus = new EventBus()
  const fn = vi.fn()
  bus.on('run', fn)
  bus.emit('run', { source: 'toolbar' })
  expect(fn).toHaveBeenCalledWith({ source: 'toolbar' })
})
```

- [ ] **Step 2: Implement**

```ts
type Handler = (payload: unknown) => void

export class EventBus {
  private map = new Map<string, Set<Handler>>()
  on(event: string, h: Handler): () => void {
    if (!this.map.has(event)) this.map.set(event, new Set())
    this.map.get(event)!.add(h)
    return () => this.map.get(event)!.delete(h)
  }
  emit(event: string, payload?: unknown): void {
    this.map.get(event)?.forEach((h) => h(payload))
  }
  clear(): void {
    this.map.clear()
  }
}
```

Wire from graph event edges later: edge `sourceHandle=onClick` → `targetHandle=run` means `bus.on(makeKey(source, onClick), () => actions[target][run]())`.

- [ ] **Step 3: PASS + commit**

```bash
git add src/core/events
git commit -m "feat: EventBus for Visual Café-style wiring"
```

---

### Task 10: Zustand project store

**Files:**
- Create: `src/store/projectStore.ts`

- [ ] **Step 1: Implement store**

```ts
import { create } from 'zustand'
import type { Project, GraphNode, GraphEdge } from '@/types/project'
import { emptyProject } from '@/types/project'
import type { TraceEvent } from '@/types/trace'

interface ProjectState {
  project: Project
  sourceDirty: boolean
  graphStale: boolean
  parseError: string | null
  traces: TraceEvent[]
  consoleLines: string[]
  status: string
  setSource: (source: string) => void
  setGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void
  loadProject: (p: Project) => void
  setSelected: (id?: string) => void
  appendConsole: (line: string) => void
  setTraces: (t: TraceEvent[]) => void
  setStatus: (s: string) => void
  setParseError: (e: string | null) => void
  setGraphStale: (v: boolean) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: emptyProject('untitled'),
  sourceDirty: false,
  graphStale: false,
  parseError: null,
  traces: [],
  consoleLines: [],
  status: 'Ready',
  setSource: (source) =>
    set((s) => ({
      project: { ...s.project, source, meta: { ...s.project.meta, updatedAt: new Date().toISOString() } },
      sourceDirty: true,
    })),
  setGraph: (nodes, edges) =>
    set((s) => ({
      project: { ...s.project, graph: { nodes, edges } },
    })),
  loadProject: (p) =>
    set({
      project: p,
      sourceDirty: false,
      graphStale: false,
      parseError: null,
      traces: [],
      consoleLines: [`Loaded ${p.name}`],
      status: 'Ready',
    }),
  setSelected: (id) =>
    set((s) => ({ project: { ...s.project, ui: { ...s.project.ui, selectedId: id } } })),
  appendConsole: (line) => set((s) => ({ consoleLines: [...s.consoleLines, line] })),
  setTraces: (traces) => set({ traces }),
  setStatus: (status) => set({ status }),
  setParseError: (parseError) => set({ parseError }),
  setGraphStale: (graphStale) => set({ graphStale }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/store
git commit -m "feat: Zustand project store for IDE state"
```

---

### Task 11: App shell layout (3 columns + toolbar + status)

**Files:**
- Create: `src/components/AppShell.tsx`, `src/components/Toolbar.tsx`, `src/components/StatusBar.tsx`, `src/components/ConsolePanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build dark 3-pane shell**

Use CSS grid:
```tsx
// AppShell.tsx structure
<div className="h-full flex flex-col">
  <Toolbar />
  <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: '28% 44% 28%' }}>
    <section className="border-r border-slate-800 min-h-0">{/* editor */}</section>
    <section className="border-r border-slate-800 min-h-0">{/* graph */}</section>
    <section className="min-h-0">{/* inspector */}</section>
  </div>
  <ConsolePanel />
  <StatusBar />
</div>
```

Toolbar buttons (disabled handlers ok): Run, Step, Stop, Examples dropdown placeholder, Save, Load.

Style to match mockup: `#0b1220` background, sky title `TENSORLOGIC STUDIO`.

- [ ] **Step 2: Manual check**

```bash
npm run dev
```

Open browser: three columns visible, no crash.

- [ ] **Step 3: Commit**

```bash
git add src/components src/App.tsx
git commit -m "feat: professional three-pane IDE shell"
```

---

### Task 12: Monaco code editor

**Files:**
- Create: `src/editor/CodeEditor.tsx`
- Modify: `src/components/AppShell.tsx`

- [ ] **Step 1: Monaco integration**

```tsx
import Editor from '@monaco-editor/react'
import { useProjectStore } from '@/store/projectStore'

export function CodeEditor() {
  const source = useProjectStore((s) => s.project.source)
  const setSource = useProjectStore((s) => s.setSource)
  const parseError = useProjectStore((s) => s.parseError)

  return (
    <div className="h-full flex flex-col">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 px-3 py-2">
        Declarative Rules
      </div>
      <Editor
        height="100%"
        theme="vs-dark"
        defaultLanguage="plaintext"
        value={source}
        onChange={(v) => setSource(v ?? '')}
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
      {parseError && (
        <div className="text-xs text-red-400 px-2 py-1 border-t border-slate-800">{parseError}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/editor
git commit -m "feat: Monaco editor bound to project source"
```

---

### Task 13: React Flow canvas + edge kinds + basic nodes

**Files:**
- Create: `src/graph/GraphCanvas.tsx`, `src/graph/edgeTypes.tsx`, `src/graph/nodes/TLNode.tsx`, `src/graph/Palette.tsx`
- Modify: `AppShell`

- [ ] **Step 1: Canvas with data/event edges**

Use `@xyflow/react`:
- `edgeTypes`: `data` solid stroke `#38bdf8`, `event` strokeDasharray `5 4` stroke `#f472b6`
- Custom node `tl` showing `label` + kind color
- Controlled nodes/edges from `project.graph`
- `onNodesChange` / `onEdgesChange` / `onConnect`:
  - default new connections: if source handle starts with `event` or kind is UI→control, create `event` edge; else `data`

Handles:
- left: data-in / event-in
- right: data-out / event-out

- [ ] **Step 2: Palette**

Buttons to add node kinds at viewport center with unique ids.

- [ ] **Step 3: Manual check + commit**

```bash
npm run dev
git add src/graph
git commit -m "feat: React Flow canvas with data and event edges"
```

---

### Task 14: source → graph sync + dagre layout

**Files:**
- Create: `src/editor/syncFromSource.ts`, `src/graph/layout.ts`
- Modify: store or App effect

- [ ] **Step 1: Implement syncFromSource**

```ts
import { parse } from '@/core/parser/parse'
import type { GraphNode, GraphEdge } from '@/types/project'
import { layoutGraph } from '@/graph/layout'

export function graphFromSource(
  source: string,
  prev: { nodes: GraphNode[]; edges: GraphEdge[] },
): { nodes: GraphNode[]; edges: GraphEdge[]; error?: string } {
  try {
    const prog = parse(source)
    const dataNodes: GraphNode[] = []
    const dataEdges: GraphEdge[] = []
    // For each fact → relation node
    // For each rule → rule node + data edges from body relations to rule to head
    // For each equation → equation/op nodes
    // For each query → query node
    // Preserve previous event edges and UI nodes (button, matrixView, run…)
    const uiNodes = prev.nodes.filter((n) =>
      ['button', 'matrixView', 'console', 'highlight', 'run', 'stepIter'].includes(n.kind),
    )
    const eventEdges = prev.edges.filter((e) => e.kind === 'event')
    const laidOut = layoutGraph([...dataNodes, ...uiNodes])
    return { nodes: laidOut, edges: [...dataEdges, ...eventEdges] }
  } catch (e) {
    return { nodes: prev.nodes, edges: prev.edges, error: String(e) }
  }
}
```

`layout.ts`: use `dagre` graphlib — rankdir TB, node width 160 height 48.

- [ ] **Step 2: Debounced effect in AppShell**

On `project.source` change (300ms debounce), call `graphFromSource`, `setGraph`, set parse error / stale.

- [ ] **Step 3: Manual: type genealogy facts → nodes appear**

- [ ] **Step 4: Commit**

```bash
git add src/editor/syncFromSource.ts src/graph/layout.ts src/components
git commit -m "feat: dual-sync code to graph with dagre layout"
```

---

### Task 15: graph → source sync for rules/equations

**Files:**
- Create: `src/editor/syncToSource.ts`

- [ ] **Step 1: Implement pretty-print of program from data nodes**

MVP approach (reliable):
- Keep `source` as primary while typing in Monaco
- When user edits `data.label` or rule fields in Properties panel, regenerate the corresponding AST statement text via `printProgram(stmts)` and replace full source from current parse + mutation

```ts
export function printProgram(stmts: Stmt[]): string {
  // facts: parent(adam, seth).
  // rules: ancestor(X, Z) :- parent(X, Z).
  // equations: Y[i] = relu(W[i,j] * X[j]).
  // queries: ?- ancestor(adam, Who).
}
```

Properties panel: editing rule head/body fields → update AST → `setSource(printProgram(...))`.

- [ ] **Step 2: Commit**

```bash
git add src/editor/syncToSource.ts src/inspector/PropertiesPanel.tsx
git commit -m "feat: graph property edits rewrite TensorLogic source"
```

---

### Task 16: Inspector — matrices + query results

**Files:**
- Create: `src/inspector/MatrixView.tsx`, `src/inspector/QueryResults.tsx`, `src/inspector/InspectorPanel.tsx`

- [ ] **Step 1: Matrix heatmap**

Props: `title`, `labels`, `matrix: number[][]`, optional `highlight: Set<string>` keys `r,c`.

Cell color: 0 → slate, >0 → blue/violet scale.

- [ ] **Step 2: After run, show P and ancestor matrix**

From runtime: domain symbols, `parent.toDenseMatrix(syms, syms)`, `ancestor.toDenseMatrix(...)`.

QueryResults: list bindings as table.

- [ ] **Step 3: Commit**

```bash
git add src/inspector
git commit -m "feat: matrix inspector and query results panel"
```

---

### Task 17: Wire Run / Step / Stop to runtime

**Files:**
- Create: `src/runtime/ideRuntime.ts` (singleton Runtime + bridge)
- Modify: `Toolbar.tsx`, `EventBus` wiring

- [ ] **Step 1: Bridge**

```ts
import { Runtime } from '@/core/runtime/Runtime'
import { EventBus } from '@/core/events/EventBus'

export const ideRuntime = new Runtime()
export const ideBus = new EventBus()

export function runCurrentProject(source: string) {
  ideRuntime.loadSource(source)
  return ideRuntime.run({ mode: 'forward' })
}
```

Toolbar Run:
1. parse/load source  
2. `run`  
3. push traces to store  
4. update status `Fixpoint · N iterations`  
5. `ideBus.emit('fixpoint', result)`  
6. refresh inspector tensors  

Step: `ideRuntime.step()`. Stop: set flag on runtime.

- [ ] **Step 2: Manual genealogy in editor → Run → green status**

- [ ] **Step 3: Commit**

```bash
git add src/runtime src/components/Toolbar.tsx
git commit -m "feat: connect toolbar Run/Step to TensorLogic runtime"
```

---

### Task 18: Event-edge execution (Visual Café)

**Files:**
- Create: `src/core/events/wireGraph.ts`
- Modify: GraphCanvas / run bridge

- [ ] **Step 1: Compile event edges to bus subscriptions**

```ts
export function wireEventEdges(
  edges: GraphEdge[],
  nodes: GraphNode[],
  bus: EventBus,
  actions: Record<string, Record<string, () => void>>,
): () => void {
  const unsubs: Array<() => void> = []
  for (const e of edges.filter((x) => x.kind === 'event')) {
    const outPort = e.sourceHandle ?? 'out'
    const inPort = e.targetHandle ?? 'in'
    const eventName = `${e.source}:${outPort}`
    unsubs.push(
      bus.on(eventName, () => {
        actions[e.target]?.[inPort]?.()
      }),
    )
  }
  return () => unsubs.forEach((u) => u())
}
```

Actions map includes:
- `run-node`: `{ run: () => runCurrentProject(...) }`
- `matrixView-id`: `{ refresh, highlight }`
- `console-id`: `{ log: () => appendConsole(...) }`

Canvas Button / Run node onClick → `bus.emit(`${id}:onClick`)`.

- [ ] **Step 2: Manual: dotted edge Run→actions works even without toolbar**

- [ ] **Step 3: Commit**

```bash
git add src/core/events/wireGraph.ts src/graph
git commit -m "feat: execute Visual Café event wiring from graph edges"
```

---

### Task 19: Example projects — genealogy + MLP

**Files:**
- Create: `src/examples/genealogy.ts`, `src/examples/mlp.ts`
- Modify: Toolbar Examples menu

- [ ] **Step 1: Genealogy project constant**

Include:
- Full `source` string (facts + rules + query)
- UI nodes: `run`, `matrixView`, `console`
- Prewired event edges: run.onClick → runtime run; query.onMatch → matrix highlight
- Optional initial data node positions

- [ ] **Step 2: MLP project constant**

Source equations + `seedDense` metadata in `project.graph.nodes` data or `meta` field `denseSeeds`:

```ts
denseSeeds: {
  X: { shape: [2], data: [1, 0] },
  W1: { shape: [2, 2], data: [1, 0, 0, 1] },
  W2: { shape: [1, 2], data: [0.5, -0.2] },
}
```

Load path applies seeds into runtime.

- [ ] **Step 3: Examples dropdown loads via `loadProject`**

- [ ] **Step 4: Commit**

```bash
git add src/examples src/components/Toolbar.tsx
git commit -m "feat: ship genealogy and MLP example projects"
```

---

### Task 20: Save / Load projects

**Files:**
- Create: `src/persistence/fileIo.ts`
- Modify: Toolbar

- [ ] **Step 1: Implement**

```ts
export function downloadProject(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${project.name || 'project'}.tls.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function openProjectFile(file: File): Promise<Project> {
  const text = await file.text()
  const data = JSON.parse(text)
  if (!data.source || !data.graph) throw new Error('Invalid TensorLogicStudio project')
  return data as Project
}

export function saveSession(project: Project) {
  localStorage.setItem('tls:lastProject', JSON.stringify(project))
}

export function loadSession(): Project | null {
  const t = localStorage.getItem('tls:lastProject')
  return t ? (JSON.parse(t) as Project) : null
}
```

On app mount: restore session or load genealogy example.

- [ ] **Step 2: Manual round-trip save/load with event edges**

- [ ] **Step 3: Commit**

```bash
git add src/persistence src/components/Toolbar.tsx src/App.tsx
git commit -m "feat: save/load .tls.json and localStorage session"
```

---

### Task 21: Polish + acceptance pass

**Files:**
- Modify: CSS, StatusBar, Console, empty states, README

- [ ] **Step 1: Status bar**

Show: iteration count, fixpoint flag, entity count, last run ms, `Status: SUCCESSFUL DEDUCTION` when genealogy query non-empty.

- [ ] **Step 2: README**

Replace `README.md` with:
- what TensorLogicStudio is  
- `npm install && npm run dev`  
- `npm test`  
- link to design spec  

- [ ] **Step 3: Run full test suite + production build**

```bash
npm test
npm run build
```

Expected: all tests green; build output in `dist/`.

- [ ] **Step 4: Manual acceptance checklist (spec §13)**

1. Genealogy example → correct matrices + bindings  
2. MLP example → forward works  
3. Event dotted arrows fire actions  
4. Edit rule in Monaco → graph updates  
5. Edit rule in properties → source updates  
6. Save/load preserves event edges  
7. UI looks professional dark theme  

- [ ] **Step 5: Final commit**

```bash
git add README.md src
git commit -m "feat: polish MVP IDE to Phase 1 acceptance criteria"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task(s) |
|------------------|---------|
| Web SPA Vite/React/TS | 1 |
| Monaco + React Flow + Zustand | 10–13 |
| Hybrid data/event arrows | 13, 18 |
| Dual-sync code ↔ graph | 14–15 |
| Parser Datalog + equations | 5–6 |
| Forward chaining + query | 7 |
| Dense MLP path | 8 |
| Matrices inspector | 16 |
| Event wiring Visual Café | 9, 18 |
| Genealogy + MLP examples | 19 |
| Save/load | 20 |
| Toolbar Run/Step/status/console | 11, 17, 21 |
| Vitest core tests | 3–9 |
| Phase 2–5 deferred | Not in tasks (correct) |

**Placeholder scan:** none intentional.  
**Type consistency:** `GraphNode`, `GraphEdge`, `Project`, `Program`, `Runtime` names stable across tasks.

---

## Execution notes

- Prefer **TDD** on `src/core/**` (tasks 3–9). UI tasks are manual-verify + commit.
- Do not delete `TensorLogic.pdf` or `TensorLogicStudio1.png`.
- Keep commits small as listed.
- If `npm create vite` conflicts with existing files, scaffold manually without removing `docs/`.
