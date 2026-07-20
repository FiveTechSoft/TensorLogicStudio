import type { Project } from '@/types/project'

/**
 * Attention / Transformer-style demo matching the architecture mockup:
 *
 *   INPUT TOKENS ─► Q, KT ─► Scores ─► Softmax ─► Attn ─► × V ─► Out
 *
 * Runtime equations (dense TensorLogic):
 *   Scores[i,j] = Q[i,k] * KT[k,j].
 *   Attn[i,j]   = softmax(Scores[i,j]).
 *   Out[i,d]    = Attn[i,j] * V[j,d].
 */

const TOKENS = ['The', 'cat', 'sat', 'on', 'mat']

const SOURCE = `% Transformer attention block (visual demo)
% Tokens: The cat sat on mat  (seq=5, d_model=4)
% @tensor dense Q
% @tensor dense KT
% @tensor dense V
% @tensor dense Scores
% @tensor dense Attn
% @tensor dense Out
% --- equations (scaled-dot product attention) ---
Scores[i,j] = Q[i,k] * KT[k,j].
Attn[i,j] = softmax(Scores[i,j]).
Out[i,d] = Attn[i,j] * V[j,d].
`

const now = '2026-07-20T00:00:00.000Z'

/** Seed helpers — small deterministic values that look like attention heat. */
const Q: number[] = [
  // 5×4 queries
  1.2, 0.1, 0.0, 0.3,
  0.2, 1.4, 0.1, 0.0,
  0.0, 0.3, 1.1, 0.2,
  0.1, 0.0, 0.4, 1.0,
  0.5, 0.2, 0.1, 0.8,
]

// KT is K^T so Q @ KT → 5×5 scores (K would be 5×4, KT is 4×5)
const KT: number[] = [
  1.0, 0.2, 0.1, 0.0, 0.3,
  0.1, 1.2, 0.4, 0.0, 0.1,
  0.0, 0.3, 1.0, 0.2, 0.1,
  0.2, 0.0, 0.1, 0.9, 0.5,
]

const V: number[] = [
  // 5×4 values
  0.8, 0.1, 0.0, 0.2,
  0.1, 0.9, 0.2, 0.0,
  0.0, 0.2, 0.85, 0.1,
  0.1, 0.0, 0.15, 0.9,
  0.3, 0.2, 0.1, 0.7,
]

export const transformerProject: Project = {
  id: 'example-transformer',
  name: 'Transformer Attention',
  version: 1,
  source: SOURCE,
  graph: {
    nodes: [
      // ── Frame: Encoder ──────────────────────────────────────────
      {
        id: 'frame-encoder',
        kind: 'highlight',
        label: 'TRANSFORMER ENCODER',
        position: { x: 20, y: 20 },
        data: {
          variant: 'frame',
          frame: true,
          frameW: 980,
          frameH: 360,
          caption: 'Multi-head attention · seq=5 · d=4',
        },
      },

      // Input tokens
      {
        id: 'tensor-Tokens',
        kind: 'tensor',
        label: 'Tokens',
        position: { x: 50, y: 90 },
        data: {
          role: 'factor',
          variant: 'block',
          caption: 'input seq',
          tokens: TOKENS,
          shape: [5],
        },
      },

      // Q, KT, V
      {
        id: 'tensor-Q',
        kind: 'tensor',
        label: 'Q',
        position: { x: 240, y: 70 },
        data: {
          role: 'attention',
          variant: 'attention',
          shape: [5, 4],
          caption: 'queries 5×4',
        },
      },
      {
        id: 'tensor-KT',
        kind: 'tensor',
        label: 'KT',
        position: { x: 240, y: 230 },
        data: {
          role: 'attention',
          variant: 'attention',
          shape: [4, 5],
          caption: 'keysᵀ 4×5',
        },
      },
      {
        id: 'tensor-V',
        kind: 'tensor',
        label: 'V',
        position: { x: 700, y: 250 },
        data: {
          role: 'attention',
          variant: 'attention',
          shape: [5, 4],
          caption: 'values 5×4',
        },
      },

      // Ops
      {
        id: 'op-mul-scores',
        kind: 'einsum',
        label: '×',
        position: { x: 440, y: 150 },
        data: { op: 'matmul', symbol: '×' },
      },
      {
        id: 'tensor-Scores',
        kind: 'tensor',
        label: 'Scores',
        position: { x: 520, y: 80 },
        data: {
          role: 'product',
          variant: 'attention',
          shape: [5, 5],
          caption: 'Q·Kᵀ 5×5',
        },
      },
      {
        id: 'op-softmax',
        kind: 'softmax',
        label: 'Softmax',
        position: { x: 700, y: 90 },
        data: { caption: 'row-wise' },
      },
      {
        id: 'tensor-Attn',
        kind: 'tensor',
        label: 'Attn',
        position: { x: 840, y: 60 },
        data: {
          role: 'attention',
          variant: 'attention',
          shape: [5, 5],
          caption: 'attention map',
          tokens: TOKENS,
        },
      },

      // Output
      {
        id: 'op-mul-out',
        kind: 'einsum',
        label: '×',
        position: { x: 1040, y: 180 },
        data: { op: 'matmul', symbol: '×' },
      },
      {
        id: 'tensor-Out',
        kind: 'tensor',
        label: 'Out',
        position: { x: 1140, y: 140 },
        data: {
          role: 'product',
          variant: 'attention',
          shape: [5, 4],
          caption: 'Attn·V 5×4',
        },
      },

      // UI
      {
        id: 'ex-run',
        kind: 'run',
        label: 'Run',
        position: { x: 1140, y: 40 },
        data: {},
      },
      {
        id: 'ex-matrix',
        kind: 'matrixView',
        label: 'Matrix View',
        position: { x: 1140, y: 320 },
        data: {},
      },
    ],
    edges: [
      {
        id: 'e-tok-q',
        kind: 'data',
        source: 'tensor-Tokens',
        target: 'tensor-Q',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '→',
        op: 'copy',
      },
      {
        id: 'e-q-mul',
        kind: 'data',
        source: 'tensor-Q',
        target: 'op-mul-scores',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×·',
        op: 'matmul',
      },
      {
        id: 'e-kt-mul',
        kind: 'data',
        source: 'tensor-KT',
        target: 'op-mul-scores',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×·',
        op: 'matmul',
      },
      {
        id: 'e-mul-scores',
        kind: 'data',
        source: 'op-mul-scores',
        target: 'tensor-Scores',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '=',
        op: 'copy',
      },
      {
        id: 'e-scores-soft',
        kind: 'data',
        source: 'tensor-Scores',
        target: 'op-softmax',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: 'σ',
        op: 'copy',
      },
      {
        id: 'e-soft-attn',
        kind: 'data',
        source: 'op-softmax',
        target: 'tensor-Attn',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '→',
        op: 'copy',
      },
      {
        id: 'e-attn-outmul',
        kind: 'data',
        source: 'tensor-Attn',
        target: 'op-mul-out',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×·',
        op: 'matmul',
      },
      {
        id: 'e-v-outmul',
        kind: 'data',
        source: 'tensor-V',
        target: 'op-mul-out',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×·',
        op: 'matmul',
      },
      {
        id: 'e-mul-out',
        kind: 'data',
        source: 'op-mul-out',
        target: 'tensor-Out',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '=',
        op: 'copy',
      },
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
    panelSizes: [26, 48, 26],
    camera: { x: 0, y: 0, zoom: 0.78 },
    selectedId: 'tensor-Attn',
  },
  meta: {
    createdAt: now,
    updatedAt: now,
    exampleId: 'transformer',
    denseSeeds: {
      Q: { shape: [5, 4], data: Q },
      KT: { shape: [4, 5], data: KT },
      V: { shape: [5, 4], data: V },
    },
  },
}
