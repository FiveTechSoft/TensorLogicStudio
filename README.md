# TensorLogicStudio

**TensorLogicStudio** is a browser-based visual IDE for writing, visualizing, and executing [Tensor Logic](https://arxiv.org/) programs (Pedro Domingos). Edit rules in Monaco, watch a dual-synced React Flow graph, run sparse Datalog-style inference or dense tensor equations, and inspect matrices and query bindings — all client-side, no backend required.

## Stack

| Layer | Tech |
|-------|------|
| App shell | Vite + React + TypeScript |
| Code editor | Monaco |
| Graph canvas | React Flow (`@xyflow/react`) + dagre layout |
| State | Zustand |
| Styling | Tailwind CSS (dark professional theme) |
| Runtime | In-browser TensorLogic core (parser → AST/IR → forward chaining + dense ops) |
| Tests | Vitest |

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

```bash
npm test          # unit + integration suite
npm run build     # production build → dist/
```

## Live demo (GitHub Pages)

**https://fivetechsoft.github.io/TensorLogicStudio/**

Deploys automatically from `main` via GitHub Actions (`.github/workflows/deploy-pages.yml`).

## How to use

1. **Load the genealogy demo:** toolbar **Examples → Genealogy** (loaded by default on first visit).
2. **Run:** press **Run**. The status bar should show fixpoint / iterations / entity count, and **SUCCESSFUL DEDUCTION** when the query returns bindings.
3. **Inspect:** matrices (e.g. parent / ancestor) and query bindings appear in the right-hand Inspector.
4. **MLP:** **Examples → MLP**, then **Run**, to exercise dense forward equations and tensor heatmaps.
5. **Visual → code (two-way):** In **Tensor Graph**, use **+ New Tensor** (and ops like Einsum / Step / ReLU). Create two tensors, add an operation, drag **cyan data handles** to wire `A → op → B`. The **Declarative Rules** panel updates automatically. Typing in the editor still updates the graph.
6. **Spreadsheet tensors (mouse):** Inspector **+ New sheet**, **Sheet** on a matrix, or after **+ New Tensor**. Click cells to toggle facts / edit dense values.
7. **Event wiring:** dotted pink edges are Visual Café–style event links (not TensorLogic syntax).
8. **Save / Load:** **Save** downloads a `.tls.json` project (source + graph including event edges); **Load** restores it. Sessions also autosave to `localStorage`.

## Design spec

See the Phase 1 design document:

[docs/superpowers/specs/2026-07-20-tensorlogic-studio-design.md](docs/superpowers/specs/2026-07-20-tensorlogic-studio-design.md)

## Phase 1 scope

This MVP targets the acceptance criteria in the design spec (§13):

- Genealogy + MLP examples
- Hybrid data / event arrows
- Dual-sync Monaco ↔ graph
- Sparse fixpoint + query; dense MLP path
- Matrix / query inspector, console, status bar
- Project save/load

**Not in Phase 1:** WebGPU, full generic autograd, GNN/attention templates, embedding-space reasoning at paper scale, or a native desktop shell.
