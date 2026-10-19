import { applyElkLayout, findNodeOverlaps } from './layout';
import { toChenFlow } from './chen-adapter';
import { sampleSql } from '../domain/sample-sql';
import { parseMySqlToErModel } from '../sql/mysql-parser';
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

it('lays out Chen entities, relationships, and attributes without overlaps', async () => {
  const graph = toChenFlow(parseMySqlToErModel(sampleSql));
  const layouted = await applyElkLayout(graph);

  expect(findNodeOverlaps(layouted.nodes)).toEqual([]);

  const coreNodes = layouted.nodes.filter(
    (node) => node.type === 'chenEntity' || node.type === 'chenRelationship'
  );
  const attributes = layouted.nodes.filter((node) => node.type === 'chenAttribute');

  expect(attributes.length).toBeGreaterThan(0);
  for (const attribute of attributes) {
    const nearestCoreDistance = Math.min(
      ...coreNodes.map((coreNode) => centerDistance(coreNode, attribute))
    );
    expect(nearestCoreDistance).toBeLessThan(360);
  }
});

function centerDistance(left: FlowGraph['nodes'][number], right: FlowGraph['nodes'][number]): number {
  const leftCenter = {
    x: left.position.x + (left.width ?? 0) / 2,
    y: left.position.y + (left.height ?? 0) / 2,
  };
  const rightCenter = {
    x: right.position.x + (right.width ?? 0) / 2,
    y: right.position.y + (right.height ?? 0) / 2,
  };

  return Math.hypot(leftCenter.x - rightCenter.x, leftCenter.y - rightCenter.y);
}

function table(name: string) {
  return {
    id: name,
    name,
    columns: [],
    primaryKey: [],
    uniqueKeys: [],
  };
}
