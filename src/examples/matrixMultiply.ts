import type { Project } from '@/types/project'

/**
 * C = A × B
 *
 * Central column layout (must be visible on load):
 *
 *     ┌─────────┐         ┌─────────┐
 *     │  A 2×2  │ ──(×)──►│  B 2×2  │
 *     └─────────┘         └─────────┘
 *              \           /
 *               \         /
 *                ▼       ▼
 *                 [  ×  ]
 *                    │
 *                    ▼
 *                 ┌─────┐
 *                 │  C  │
 *                 └─────┘
 */

const SOURCE = `% Matrix multiply: C = A × B
% @tensor dense A
% @tensor dense B
% @tensor dense C
% --- equations ---
C[i,k] = A[i,j] * B[j,k].
`

const now = new Date().toISOString()

export const matrixMultiplyProject: Project = {
  id: 'example-matmul',
  name: 'Matrix × Matrix',
  version: 1,
  source: SOURCE,
  graph: {
    nodes: [
      {
        id: 'tensor:A',
        kind: 'tensor',
        label: 'A',
        // Prominent center-left
        position: { x: 80, y: 140 },
        data: {
          role: 'factor',
          shape: [2, 2],
          caption: 'matrix 2×2',
        },
      },
      {
        id: 'tensor:B',
        kind: 'tensor',
        label: 'B',
        // Prominent center-right — same row as A so both “cajas” are obvious
        position: { x: 380, y: 140 },
        data: {
          role: 'factor',
          shape: [2, 2],
          caption: 'matrix 2×2',
        },
      },
      {
        id: 'op-mul',
        kind: 'einsum',
        label: '×',
        position: { x: 250, y: 300 },
        data: {
          op: 'matmul',
          symbol: '×',
        },
      },
      {
        id: 'tensor:C',
        kind: 'tensor',
        label: 'C',
        position: { x: 220, y: 420 },
        data: {
          role: 'product',
          shape: [2, 2],
          caption: 'A × B',
        },
      },
      {
        id: 'ex-run',
        kind: 'run',
        label: 'Run',
        position: { x: 560, y: 40 },
        data: {},
      },
    ],
    edges: [
      // Signature visual: two boxes joined by (×)
      {
        id: 'e-a-b-mul',
        kind: 'data',
        source: 'tensor:A',
        target: 'tensor:B',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×',
      },
      {
        id: 'e-a-op',
        kind: 'data',
        source: 'tensor:A',
        target: 'op-mul',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×',
      },
      {
        id: 'e-b-op',
        kind: 'data',
        source: 'tensor:B',
        target: 'op-mul',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×',
      },
      {
        id: 'e-op-c',
        kind: 'data',
        source: 'op-mul',
        target: 'tensor:C',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '=',
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
    panelSizes: [28, 44, 28],
    camera: { x: 0, y: 0, zoom: 1 },
    selectedId: 'tensor:A',
  },
  meta: {
    createdAt: now,
    updatedAt: now,
    exampleId: 'matmul',
    denseSeeds: {
      A: { shape: [2, 2], data: [1, 2, 3, 4] },
      B: { shape: [2, 2], data: [5, 6, 7, 8] },
    },
  },
}
