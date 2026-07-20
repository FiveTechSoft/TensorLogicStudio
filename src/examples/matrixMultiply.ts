import type { Project } from '@/types/project'

/**
 * C = A × B — layout tuned so A and B are large, centered boxes in Tensor Graph.
 *
 *     [ A ]  ──(×)──►  [ B ]
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
        position: { x: 60, y: 160 },
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
        position: { x: 420, y: 160 },
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
        position: { x: 270, y: 320 },
        data: {
          op: 'matmul',
          symbol: '×',
        },
      },
      {
        id: 'tensor:C',
        kind: 'tensor',
        label: 'C',
        position: { x: 240, y: 440 },
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
        position: { x: 620, y: 40 },
        data: {},
      },
    ],
    edges: [
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
