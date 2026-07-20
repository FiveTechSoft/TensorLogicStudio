import type { Project } from '@/types/project'

const SOURCE = `parent(adam, seth).
parent(seth, enos).
parent(enos, cainan).
ancestor(X, Z) :- parent(X, Z).
ancestor(X, Z) :- ancestor(X, Y), parent(Y, Z).
?- ancestor(adam, Who).
`

const now = '2026-07-20T00:00:00.000Z'

/** Bundled genealogy example: transitive ancestor over parent facts. */
export const genealogyProject: Project = {
  id: 'example-genealogy',
  name: 'Genealogy',
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
      // Canvas Run node → synthetic runtime.run action
      {
        id: 'ev-run-click',
        kind: 'event',
        source: 'ex-run',
        target: 'runtime',
        sourceHandle: 'onClick',
        targetHandle: 'run',
      },
      // Query bindings → highlight matrix view (query id is stable: query:0)
      {
        id: 'ev-query-match',
        kind: 'event',
        source: 'query:0',
        target: 'ex-matrix',
        sourceHandle: 'onMatch',
        targetHandle: 'highlight',
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
    exampleId: 'genealogy',
  },
}
