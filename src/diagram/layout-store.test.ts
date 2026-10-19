import { applySavedLayout, collectNodeLayout, graphSignature, hasFullSavedLayout } from './layout-store';
import type { ErEdge, ErNode } from './react-flow-types';

it('overrides computed positions with saved layout positions', () => {
  const nodes = [node('a', 0, 0), node('b', 100, 100)];

  const result = applySavedLayout(nodes, { a: { x: 40, y: 60 } });

  expect(result[0].position).toEqual({ x: 40, y: 60 });
  expect(result[1]).toBe(nodes[1]);
});

it('returns the original nodes when no layout was saved', () => {
  const nodes = [node('a', 0, 0)];

  expect(applySavedLayout(nodes, {})).toBe(nodes);
  expect(applySavedLayout(nodes, undefined)).toBe(nodes);
});

it('collects every node position into a layout map', () => {
  expect(collectNodeLayout([node('a', 12, 34), node('b', -8, 5)])).toEqual({
    a: { x: 12, y: 34 },
    b: { x: -8, y: 5 },
  });
});

it('treats a layout as complete only when every node has a position', () => {
  const nodes = [node('a', 0, 0), node('b', 0, 0)];

  expect(hasFullSavedLayout(nodes, { a: { x: 0, y: 0 } })).toBe(false);
  expect(hasFullSavedLayout(nodes, { a: { x: 0, y: 0 }, b: { x: 1, y: 1 } })).toBe(true);
  expect(hasFullSavedLayout([], {})).toBe(false);
});

it('keeps the graph signature stable when only node positions change', () => {
  const edge = relationshipEdge('e1');
  const before = graphSignature([node('a', 0, 0), node('b', 0, 0)], [edge]);
  const afterDrag = graphSignature([node('a', 50, 80), node('b', -20, 10)], [edge]);

  expect(afterDrag).toBe(before);
});

it('changes the graph signature when nodes or edges are added', () => {
  const before = graphSignature([node('a', 0, 0)], [relationshipEdge('e1')]);
  const withNode = graphSignature([node('a', 0, 0), node('b', 0, 0)], [relationshipEdge('e1')]);
  const withEdge = graphSignature([node('a', 0, 0)], [relationshipEdge('e1'), relationshipEdge('e2')]);

  expect(withNode).not.toBe(before);
  expect(withEdge).not.toBe(before);
});

function node(id: string, x: number, y: number): ErNode {
  return {
    id,
    type: 'table',
    position: { x, y },
    data: { table: { id, name: id, columns: [], primaryKey: [], uniqueKeys: [] } },
  };
}

function relationshipEdge(id: string): ErEdge {
  return {
    id,
    type: 'relationship',
    source: 'a',
    target: 'b',
    data: { label: 'N:1', inferred: false },
  };
}
