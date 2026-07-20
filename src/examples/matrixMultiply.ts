import type { Project } from '@/types/project'

/**
 * C = A × B  (matrix product)
 *
 * Visual layout (Tensor Graph):
 *   [ A ] ──(×)──► [ B ]     two matrix boxes + labeled multiply edge
 *              ╲
 *               ──► [ × ] ──► [ C ]   explicit product node (also wired)
 *
 * We emphasize the two-box + (×) edge the user asked for, and keep C as result.
 */

const SOURCE = `% Matrix multiply demo: C = A × B
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
        position: { x: 40, y: 120 },
        data: {
          role: 'factor',
          shape: [2, 2],
          caption: '2×2',
        },
      },
      {
        id: 'tensor:B',
        kind: 'tensor',
        label: 'B',
        position: { x: 320, y: 120 },
        data: {
          role: 'factor',
          shape: [2, 2],
          caption: '2×2',
        },
      },
      {
        id: 'op-mul',
        kind: 'einsum',
        label: '×',
        position: { x: 180, y: 280 },
        data: {
          op: 'matmul',
          symbol: '×',
        },
      },
      {
        id: 'tensor:C',
        kind: 'tensor',
        label: 'C',
        position: { x: 180, y: 420 },
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
        position: { x: 480, y: 40 },
        data: {},
      },
      {
        id: 'ex-matrix',
        kind: 'matrixView',
        label: 'Matrix View',
        position: { x: 480, y: 140 },
        data: {},
      },
    ],
    edges: [
      // The signature edge: A ──(×)──► B  (two boxes joined by multiply)
      {
        id: 'e-a-b-mul',
        kind: 'data',
        source: 'tensor:A',
        target: 'tensor:B',
        sourceHandle: 'data-out',
        targetHandle: 'data-in',
        label: '×',
      },
      // Dataflow into product: A,B → × → C
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
      // A = [[1, 2], [3, 4]]
      A: { shape: [2, 2], data: [1, 2, 3, 4] },
      // B = [[5, 6], [7, 8]]
      B: { shape: [2, 2], data: [5, 6, 7, 8] },
      // C filled on Run: [[19, 22], [43, 50]]
    },
  },
}
