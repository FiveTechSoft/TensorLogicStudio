# TensorLogicStudio — Design Specification

**Date:** 2026-07-20  
**Status:** Approved (brainstorm)  
**Product:** Visual IDE for Tensor Logic (Pedro Domingos), browser-based, JavaScript/TypeScript  
**Inspiration:** Symantec Visual Café (arrows to relate elements and assign events) + project mockup `TensorLogicStudio1.png`

---

## 1. Goals

### Product goal

Build **TensorLogicStudio**: a professional, attractive, practical visual IDE for writing, visualizing, and executing Tensor Logic programs entirely in the browser.

### Primary experience

- Dual-synced **code editor** and **graph canvas**
- **Hybrid arrows**: solid = dataflow, dotted = Visual Café–style event wiring
- Live **inference / evaluation** with matrix and query inspectors
- Packaged **examples** (genealogy + MLP) and **save/load** projects

### Non-goals (Phase 1)

- Native desktop shell (Electron/Tauri)
- Server-side runtime or Python backend
- Full paper coverage in the first ship (transformers complete, embedding-space reasoning, WebGPU scale)
- Multi-user collaboration, multi-file monorepos

---

## 2. Decisions (locked)

| Topic | Decision |
|-------|----------|
| Product type | Full visual IDE with live execution |
| Delivery | Pure web SPA (no install) |
| Scope ambition | Entire paper as destination; **phased roadmap** |
| MVP demos | Genealogy + MLP + event wiring + save/load (**all**) |
| Arrow model | Hybrid data + event edges |
| Editing model | Dual-synced code ↔ graph (AST is program source of truth for logic) |
| Technical approach | Vite + React + TypeScript + Monaco + React Flow + Zustand + in-browser TensorLogic core |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  TensorLogicStudio (SPA Vite + React + TS)                  │
├──────────────┬──────────────────────┬───────────────────────┤
│ Monaco       │ React Flow Canvas    │ Inspectors            │
│ Rules/Code   │ data + event edges   │ Matrices / tensors    │
│              │ node palette         │ Query / Results       │
├──────────────┴──────────────────────┴───────────────────────┤
│ Toolbar: Run | Step | Stop | Examples | Save/Load           │
│ Status bar + collapsible console                            │
└─────────────────────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
   ┌───────────────┐    ┌──────────────────┐
   │ Project Store │    │ Event Bus (UI)   │
   │ (Zustand)     │    │ dotted arrows    │
   └───────┬───────┘    └────────┬─────────┘
           │                     │
           ▼                     ▼
   ┌───────────────────────────────────────┐
   │ TensorLogic Core (TypeScript)         │
   │ Parser → AST → IR                     │
   │ Runtime: forward / backward / step    │
   │ Ops: join, project, step, dense ops,  │
   │      relu/sig/softmax, SGD (MVP)      │
   │ TensorStore (sparse + dense)          │
   └───────────────────────────────────────┘
```

### Principles

1. **AST is the logical program source of truth.** Monaco `source` text and dataflow graph nodes/edges are views that read/write the AST (via parse / pretty-print of affected spans).
2. **Two edge kinds.** Data edges reflect TensorLogic dependencies; event edges are IDE/runtime wiring only and never appear as language syntax.
3. **100% browser.** No required backend. WebGPU is a later phase; MVP runs on CPU JavaScript.
4. **Examples are first-class projects.** Bundled `.tls.json` documents load into the same store as user projects.

---

## 4. UI shell

### Layout

| Zone | Role |
|------|------|
| Top bar | Branding, project name, Run / Step / Stop, Examples, Save / Load, version + compute badge (CPU) |
| Column 1 — Rules | Monaco editor: facts, rules, equations, queries |
| Column 2 — Graph | React Flow canvas: nodes, solid data edges, dotted event edges, palette |
| Column 3 — Inspector | Matrix heatmaps, query bindings, selected-node properties |
| Bottom | Status bar + collapsible console (parse errors, chain traces) |

### Visual language

- Dark professional theme (slate base; cyan / violet / emerald / pink accents)
- Monospace in editor and code chips
- Solid edges: cyan/violet (data)
- Dashed edges: pink/amber (events)
- Aligned with mockup `TensorLogicStudio1.png` (three-pane deduction workspace)

### Interactions

- Resizable splitters between columns
- Node selection opens properties (indices, shape, nonlinearity, event ports)
- Matrix cell click can highlight related code/graph when event wiring or selection binding exists
- Palette / drawer: Tensor, Relation, Einsum, Step, Relu, Sigmoid, Softmax, Rule, Query, Fact, Loss, SGD, Button, MatrixView, Console, Run

---

## 5. Project model

### File format: `.tls.json`

```ts
interface Project {
  id: string
  name: string
  version: number
  source: string
  graph: {
    nodes: GraphNode[]
    edges: GraphEdge[]
  }
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
```

### Persistence

- **Save/Load:** download/upload `.tls.json`; also last-session snapshot in `localStorage`
- Event wiring is stored in `graph.edges` and must round-trip intact

---

## 6. Graph model (nodes & arrows)

### Node categories (Phase 1)

| Category | Nodes |
|----------|--------|
| Data | `Tensor`, `Relation` |
| Ops | `Einsum` / `JoinProject`, `Step`, `Relu`, `Sigmoid`, `Softmax` |
| Program | `Equation`, `Rule`, `Query`, `Fact` |
| Learning | `Loss`, `SGD` |
| UI (Visual Café) | `Button`, `MatrixView`, `Console`, `Highlight` |
| Control | `Run`, `StepIter` |

### Ports

- **Data in / data out** — tensor or binding flow
- **Event out** — e.g. `onClick`, `onMatch`, `onFixpoint`, `onEpoch`, `onError`
- **Event in** — e.g. `run`, `refresh`, `highlight`, `log`

### Edges

| Kind | Style | Meaning | Affects `source`? |
|------|-------|---------|-------------------|
| `data` | Solid | Tensor/rule dependency, join/use | Yes (via AST rewrite) |
| `event` | Dashed | UI/runtime reaction wiring | No |

### Example event wirings (MVP)

- `Run.onClick` → runtime `run`
- `Query.onMatch` → `MatrixView.highlight`
- `Runtime.onFixpoint` → `Console.log` + `MatrixView.refresh`

### Dual-sync rules

1. **Code → Graph:** parse `source` → AST → data nodes/edges; auto-layout (dagre/elk). Event edges preserved by stable node ids when possible.
2. **Graph → Code:** edits to equation/rule/tensor nodes rewrite the corresponding `source` span in Monaco.
3. **Parse failure:** graph marked stale; show diagnostics; do not destroy event edges.
4. **Stable ids:** graph nodes that map to AST declarations use deterministic ids (e.g. hash of name + kind) so event wiring survives re-parse when possible.

---

## 7. TensorLogic core (runtime)

### Pipeline

```
source → Parser → AST → IR (equations + dependency graph)
                         → Scheduler (forward | backward | step | train-step)
                         → Kernels → TensorStore → snapshots
                         → TraceEvent stream → UI + Event Bus
```

### Tensor representations

| Mode | Use | Storage |
|------|-----|---------|
| Sparse boolean | Datalog relations | Set/Map of index tuples (symbols or ints) |
| Dense float | MLP weights/activations | `Float64Array` + shape |
| Scalar / bindings | Loss, query answers | number or list of substitutions |

Symbolic indices (`adam`, `seth`, …) map through a **domain dictionary** per axis for matrix visualization.

### Phase 1 operations

- Join + project (sum / existential for Boolean)
- Heaviside / step
- Elementwise: add, mul, relu, sigmoid
- Einsum-lite via named indices on equations
- Softmax (axis-selectable)
- Minimal SGD update for the MLP demo graph
- Forward chaining to fixpoint (with `maxIters`)
- Single-step iteration for animation
- Backward/query evaluation for goals like `?- ancestor(adam, Who)`

### Public runtime API

```ts
runtime.load(project)
runtime.run({ mode: 'forward' | 'backward' | 'train-step' })
runtime.step()
runtime.stop()
runtime.query(goal) => bindings[]
runtime.getTensor(name) => TensorView
runtime.on(eventName, handler)
```

### Observability

Each scheduler step emits `TraceEvent`:

- fired rule/equation id  
- new tuples or tensor delta summary  
- graph node ids to highlight  
- iteration index and timing  

Status bar example: `Fixpoint · 3 iterations · 4 entities · 0.12 ms`

### Phase 1 limits (explicit)

- CPU only (no WebGPU)
- No full generic autograd for arbitrary programs (MLP demo path only)
- Datalog without function symbols / full Prolog unification
- Not paper-scale sparse engines or join-tree optimizers

---

## 8. Language surface (Phase 1)

Supported syntax (subset aligned with the paper):

```text
% Facts (Boolean sparse)
parent(adam, seth).
parent(seth, enos).
parent(enos, cainan).

% Rules (Datalog sugar)
ancestor(X, Z) :- parent(X, Z).
ancestor(X, Z) :- ancestor(X, Y), parent(Y, Z).

% Tensor equations (dense / general)
Y[i] = step(W[i,j] * X[j]).
H[i] = relu(W1[i,j] * X[j]).
Y[k] = sigmoid(W2[k,i] * H[i]).

% Query
?- ancestor(adam, Who).
```

Parser produces AST nodes for facts, rules, equations, and queries. Unknown syntax yields Monaco markers and console diagnostics.

---

## 9. MVP examples

### Example A — Genealogy (mockup)

- Facts: parent chain Adam → Seth → Enos → Cainan  
- Rules: transitive ancestor  
- Query: `?- ancestor(adam, Who)`  
- Inspector matrices: **P** (parents), **P×P** (grandparents), **A = H(P + P×P + …)** up to fixpoint  
- Status: successful deduction when bindings match expected set  

### Example B — Small MLP

- Dense tensors X, W1, W2  
- Equations with relu + sigmoid  
- Optional one SGD step with simple squared loss  
- Inspector shows weight/activation heatmaps  

### Event demo (both examples)

Pre-wired project graph:

- Toolbar/canvas Run button → `runtime.run`  
- Query matches → highlight ancestor cells in MatrixView  

---

## 10. Stack

| Layer | Choice |
|-------|--------|
| Bundler | Vite |
| UI | React 18 + TypeScript |
| Editor | Monaco Editor |
| Graph | @xyflow/react (React Flow) |
| Auto-layout | dagre or elkjs |
| State | Zustand |
| Styling | Tailwind CSS (dark theme tokens) |
| Tests | Vitest (parser + ops + runtime) |
| Persistence | localStorage + file export/import |

---

## 11. Repository structure

```
tensorlogicstudio/
├── package.json
├── vite.config.ts
├── index.html
├── public/examples/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/
│   ├── components/       # Toolbar, split panes, console, status
│   ├── editor/           # Monaco + sync
│   ├── graph/            # React Flow nodes, edges, palette
│   ├── inspector/        # matrices, properties, query results
│   ├── core/
│   │   ├── parser/
│   │   ├── ast/
│   │   ├── ir/
│   │   ├── tensor/
│   │   ├── ops/
│   │   ├── runtime/
│   │   └── events/
│   ├── store/
│   ├── examples/
│   └── types/
├── docs/superpowers/specs/
└── TensorLogic.pdf       # reference paper (existing)
```

---

## 12. Roadmap

| Phase | Name | Deliverables |
|-------|------|----------------|
| **1** | MVP IDE | Shell, dual-sync, hybrid arrows, sparse+dense runtime core, genealogy + MLP, matrices, event bus wiring, save/load |
| **2** | Generic learning | Broader autograd on IR, more losses, training curves in inspector |
| **3** | Paper templates | GNN + attention minimal templates (paper tables 1–2) |
| **4** | Embedding reasoning | Section 5: superposition, temperature T, analogical vs deductive modes |
| **5** | Scale | WebGPU kernels, large sparse, profiling UI |

---

## 13. Phase 1 acceptance criteria

1. **Genealogy:** load example → Run → matrices P / multi-hop / A correct; query returns expected descendants of Adam.  
2. **MLP:** load example → forward (and optional train-step) executes; tensors visible in inspector.  
3. **Events:** dotted edge from Run to runtime and from Query to MatrixView highlight works without editing code.  
4. **Dual-sync:** edit a rule in Monaco updates graph; edit Rule/Equation node updates source.  
5. **Persistence:** Save `.tls.json`, reload, event edges and source restored.  
6. **Polish:** dark professional UI, resizable panels, console diagnostics, no backend required.  
7. **Tests:** Vitest covers parser for sample programs and fixpoint result for genealogy facts/rules.

---

## 14. Error handling

| Case | Behavior |
|------|----------|
| Parse error | Monaco markers; console error; graph stale badge; Run disabled or runs last good IR with warning |
| Runtime error | Stop scheduler; console stack/message; highlight offending node if mapped |
| Shape / index mismatch | Diagnostic on edge/node; fail that equation; continue others when safe |
| Max iterations | Status warning “not converged”; partial tensors still shown |
| Corrupt project file | Import error toast; do not clobber current session |

---

## 15. Testing strategy

- **Unit:** parser fixtures, join/project/step kernels, domain dictionary, SGD one-step numeric smoke test  
- **Integration:** load genealogy project → run → assert query bindings and dense matrix views  
- **Manual:** dual-sync edits, event wiring, save/load round-trip, panel resize, example switching  

---

## 16. Open points deferred (not blockers)

- Exact pretty-printer formatting style (match input vs canonical)  
- Choice between dagre vs elkjs after prototype feel  
- Whether toolbar Run is also a canvas node by default (yes for event demo; can mirror toolbar)  
- i18n: UI English first with Spanish labels optional later (product discussion language was Spanish; code/UI strings default **English** for IDE convention, unless changed at implementation start)

---

## 17. References

- Domingos, P. *Tensor Logic: The Language of AI* (arXiv:2510.12269) — local `TensorLogic.pdf`  
- Project visual mockup: `TensorLogicStudio1.png`  
- Historical UX inspiration: Symantec Visual Café (GUI builder + connection metaphors)
