import type { Project } from '@/types/project'

/**
 * Two-layer MLP (neural network) — visual layout:
 *
 *   [X] ──┐
 *         ├──► [×] ──► [ReLU] ──► [H] ──┐
 *  [W1] ──┘                              ├──► [×] ──► [σ] ──► [Y]
 *                                 [W2] ──┘
 *
 * Equations (runtime):
 *   H[i] = relu(W1[i,j] * X[j]).
 *   Y[k] = sigmoid(W2[k,i] * H[i]).
 */

const SOURCE = `% Two-layer neural network (MLP forward)
% @tensor dense X   — input vector
% @tensor dense W1  — hidden weights
% @tensor dense H   — hidden activations
% @tensor dense W2  — output weights
% @tensor dense Y   — output
% --- equations ---
H[i] = relu(W1[i,j] * X[j]).
Y[k] = sigmoid(W2[k,i] * H[i]).
`

const now = '2026-07-20T00:00:00.000Z'

/** Bundled two-layer MLP with a full visual graph + dense seeds. */
export const mlpProject: Project = {
  id: 'example-mlp',
  name: 'Neural Network',
  version: 1,
  source: SOURCE,
  graph: {
    nodes: [
      // ── Layer 0: input ──────────────────────────────────────────
      {
        id: 'tensor-X',
        kind: 'tensor',
        label: 'X',
        position: { x: 40, y: 80 },
        data: {
          role: 'factor',
          shape: [2],
          caption: 'input 2',
        },
      },
      {
        id: 'tensor-W1',
        kind: 'tensor',
        label: 'W1',
        position: { x: 40, y: 280 },
        data: {
          role: 'factor',
          shape: [2, 2],
          caption: 'weights 2×2',
        },
      },

      // ── Layer 1: matmul + ReLU → hidden ─────────────────────────
      {
        id: 'op-mul1',
        kind: 'einsum',
        label: '×',
        position: { x: 280, y: 180 },
        data: {
          op: 'matmul',
          symbol: '×',
        },
      },
      {
        id: 'op-relu',
        kind: 'relu',
        label: 'ReLU',
        position: { x: 400, y: 175 },
        data: {
          caption: 'activation',
        },
      },
      {
        id: 'tensor-H',
        kind: 'tensor',
        label: 'H',
        position: { x: 560, y: 150 },
        data: {
          role: 'product',
          shape: [2],
          caption: 'hidden 2',
        },
      },

      // ── Layer 2: matmul + sigmoid → output ─────────────────────
      {
        id: 'tensor-W2',
        kind: 'tensor',
        label: 'W2',
        position: { x: 560, y: 340 },
        data: {
          role: 'factor',
          shape: [1, 2],
          caption: 'weights 1×2',
        },
      },
      {
        id: 'op-mul2',
        kind: 'einsum',
        label: '×',
        position: { x: 800, y: 220 },
        data: {
          op: 'matmul',
          symbol: '×',
        },
      },
      {
        id: 'op-sigmoid',
        kind: 'sigmoid',
        label: 'σ',
        position: { x: 920, y: 215 },
        data: {
          caption: 'sigmoid',
        },
      },
      {
        id: 'tensor-Y',
        kind: 'tensor',
        label: 'Y',
        position: { x: 1080, y: 190 },
        data: {
          role: 'product',
          shape: [1],
          caption: 'output 1',
        },
      },

      // ── UI ──────────────────────────────────────────────────────
      {
        id: 'ex-run',
        kind: 'run',
        label: 'Run',
        position: { x: 1080, y: 40 },
        data: {},
      },
      {
        id: 'ex-matrix',
        kind: 'matrixView',
        label: 'Matrix View',
        position: { x: 1080, y: 360 },
        data: {},
      },
      {
        id: 'ex-console',
        kind: 'console',
        label: 'Console',
        position: { x: 1080, y: 460 },
        data: {},
      },
    ],
    edges: [
      // X, W1 → matmul₁
      {
        id: 'e-x-mul1',
        kind: 'data',
        source: 'tensor-X',
        target: 'op-mul1',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×·',
        op: 'matmul',
      },
      {
        id: 'e-w1-mul1',
        kind: 'data',
        source: 'tensor-W1',
        target: 'op-mul1',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×·',
        op: 'matmul',
      },
      // matmul₁ → ReLU → H
      {
        id: 'e-mul1-relu',
        kind: 'data',
        source: 'op-mul1',
        target: 'op-relu',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '→',
        op: 'copy',
      },
      {
        id: 'e-relu-h',
        kind: 'data',
        source: 'op-relu',
        target: 'tensor-H',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: 'σ+',
        op: 'relu',
      },
      // H, W2 → matmul₂
      {
        id: 'e-h-mul2',
        kind: 'data',
        source: 'tensor-H',
        target: 'op-mul2',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×·',
        op: 'matmul',
      },
      {
        id: 'e-w2-mul2',
        kind: 'data',
        source: 'tensor-W2',
        target: 'op-mul2',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×·',
        op: 'matmul',
      },
      // matmul₂ → sigmoid → Y
      {
        id: 'e-mul2-sig',
        kind: 'data',
        source: 'op-mul2',
        target: 'op-sigmoid',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '→',
        op: 'copy',
      },
      {
        id: 'e-sig-y',
        kind: 'data',
        source: 'op-sigmoid',
        target: 'tensor-Y',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: 'σ',
        op: 'sigmoid',
      },
      // Run button
      {
        id: 'ev-run-click',
        kind: 'event',
        source: 'ex-run',
        target: 'runtime',
        sourceHandle: 'onClick',
        targetHandle: 'run',
      },
    ],
  },
  ui: {
    panelSizes: [28, 44, 28],
    camera: { x: 0, y: 0, zoom: 0.85 },
    selectedId: 'tensor-X',
  },
  meta: {
    createdAt: now,
    updatedAt: now,
    exampleId: 'mlp',
    denseSeeds: {
      // Input one-hot: class 0
      X: { shape: [2], data: [1, 0] },
      // Identity → hidden ≈ ReLU(X)
      W1: { shape: [2, 2], data: [1, 0, 0, 1] },
      // Prefer first hidden unit
      W2: { shape: [1, 2], data: [0.5, -0.2] },
    },
  },
}
