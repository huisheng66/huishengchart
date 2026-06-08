import { applyElkLayout, findNodeOverlaps } from './layout';
import type { FlowGraph } from './react-flow-types';

it('detects overlapping nodes by their measured rectangles', () => {
  const graph: FlowGraph = {
    nodes: [
      { id: 'a', type: 'table', position: { x: 0, y: 0 }, width: 120, height: 80, data: { table: table('a') } },
      { id: 'b', type: 'table', position: { x: 60, y: 20 }, width: 120, height: 80, data: { table: table('b') } },
      { id: 'c', type: 'table', position: { x: 300, y: 0 }, width: 120, height: 80, data: { table: table('c') } },
    ],
    edges: [],
  };

  expect(findNodeOverlaps(graph.nodes)).toEqual([['a', 'b']]);
});

it('lays out connected nodes without node overlaps', async () => {
  const graph: FlowGraph = {
    nodes: [
      { id: 'student', type: 'table', position: { x: 0, y: 0 }, width: 220, height: 120, data: { table: table('student') } },
      { id: 'major', type: 'table', position: { x: 0, y: 0 }, width: 220, height: 120, data: { table: table('major') } },
      { id: 'course', type: 'table', position: { x: 0, y: 0 }, width: 220, height: 120, data: { table: table('course') } },
    ],
    edges: [
      {
        id: 'student-major',
        type: 'relationship',
        source: 'student',
        target: 'major',
        data: { label: 'N:1', inferred: false },
      },
      {
        id: 'course-major',
        type: 'relationship',
        source: 'course',
        target: 'major',
        data: { label: 'N:1', inferred: false },
      },
    ],
  };

  const layouted = await applyElkLayout(graph);

  expect(findNodeOverlaps(layouted.nodes)).toEqual([]);
  expect(layouted.nodes.every((node) => node.position.x >= 0 && node.position.y >= 0)).toBe(true);
});

function table(name: string) {
  return {
    id: name,
    name,
    columns: [],
    primaryKey: [],
    uniqueKeys: [],
  };
}
