import type { Project } from '@/types/project'

const SOURCE = `H[i] = relu(W1[i,j] * X[j]).
Y[k] = sigmoid(W2[k,i] * H[i]).
`

const now = '2026-07-20T00:00:00.000Z'

/** Bundled two-layer MLP example with dense weight seeds. */
export const mlpProject: Project = {
  id: 'example-mlp',
  name: 'MLP',
  version: 1,
  source: SOURCE,
  graph: {
    nodes: [
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
      {
        id: 'ex-console',
        kind: 'console',
        label: 'Console',
        position: { x: 480, y: 260 },
        data: {},
      },
    ],
    edges: [
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
  },
  meta: {
    createdAt: now,
    updatedAt: now,
    exampleId: 'mlp',
    denseSeeds: {
      X: { shape: [2], data: [1, 0] },
      W1: { shape: [2, 2], data: [1, 0, 0, 1] },
      W2: { shape: [1, 2], data: [0.5, -0.2] },
    },
  },
}
