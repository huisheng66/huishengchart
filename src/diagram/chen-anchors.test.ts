import {
  anchorOnChenNode,
  anchorOnEllipse,
  anchorOnRectangle,
  anchorOnRhombus,
  anchorOnRhombusVertex,
} from './chen-anchors';

const center = { x: 0, y: 0 };

it('anchors a rectangle edge along the direction of the target', () => {
  expect(anchorOnRectangle(center, 100, 40, { x: 200, y: 10 })).toEqual({ x: 50, y: 2.5 });
  expect(anchorOnRectangle(center, 100, 40, { x: 10, y: 100 })).toEqual({ x: 2, y: 20 });
});

it('anchors an ellipse on its curve', () => {
  const point = anchorOnEllipse(center, 100, 40, { x: 50, y: 50 });

  expect((point.x / 50) ** 2 + (point.y / 20) ** 2).toBeCloseTo(1, 6);
  expect(point.x).toBeCloseTo(18.57, 2);
  expect(point.y).toBeCloseTo(18.57, 2);
});

it('anchors a rhombus on its diagonal edge', () => {
  const point = anchorOnRhombus(center, 100, 40, { x: 50, y: 50 });

  expect(Math.abs(point.x) / 50 + Math.abs(point.y) / 20).toBeCloseTo(1, 6);
  expect(point.x).toBeCloseTo(14.286, 3);
  expect(point.y).toBeCloseTo(14.286, 3);
});

it('connects a rhombus at the vertex facing the target', () => {
  expect(anchorOnRhombusVertex(center, 100, 40, { x: 200, y: 10 })).toEqual({ x: 50, y: 0 });
  expect(anchorOnRhombusVertex(center, 100, 40, { x: -200, y: -10 })).toEqual({ x: -50, y: 0 });
  expect(anchorOnRhombusVertex(center, 100, 40, { x: 10, y: 200 })).toEqual({ x: 0, y: 20 });
  expect(anchorOnRhombusVertex(center, 100, 40, { x: -10, y: -200 })).toEqual({ x: 0, y: -20 });
});

it('honors the pair axis when picking a rhombus vertex', () => {
  expect(anchorOnRhombusVertex(center, 100, 40, { x: 40, y: 40 }, 'horizontal')).toEqual({
    x: 50,
    y: 0,
  });
  expect(anchorOnRhombusVertex(center, 100, 40, { x: 40, y: 40 }, 'vertical')).toEqual({
    x: 0,
    y: 20,
  });
});

it('uses the vertex rule for relationship nodes', () => {
  expect(anchorOnChenNode('relationship', center, 100, 40, { x: 200, y: 10 })).toEqual({
    x: 50,
    y: 0,
  });
  expect(anchorOnChenNode('relationship', center, 100, 40, { x: 10, y: 200 })).toEqual({
    x: 0,
    y: 20,
  });
});

it('keeps the anchor on the ray from center to target', () => {
  const toward = { x: 120, y: -80 };
  const point = anchorOnChenNode('entity', center, 148, 56, toward);

  expect(point.y / point.x).toBeCloseTo(toward.y / toward.x, 6);
  expect(Math.abs(point.x)).toBeLessThanOrEqual(74);
  expect(Math.abs(point.y)).toBeLessThanOrEqual(28);
});

it('returns the center when there is no direction', () => {
  expect(anchorOnRectangle(center, 100, 40, center)).toEqual(center);
  expect(anchorOnEllipse(center, 100, 40, center)).toEqual(center);
  expect(anchorOnRhombus(center, 100, 40, center)).toEqual(center);
});
