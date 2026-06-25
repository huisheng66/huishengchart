import {
  pointInsideRect,
  segmentsIntersect,
  segmentIntersectsRect,
  direction,
  pointOnSegment,
  hasBoxOverlap,
  type Rect,
  type Box,
} from './geometry-utils';

describe('pointInsideRect', () => {
  const rect: Rect = { left: 0, top: 0, right: 10, bottom: 10 };

  it('returns true for a point inside the rect', () => {
    expect(pointInsideRect({ x: 5, y: 5 }, rect)).toBe(true);
  });

  it('returns true for a point on the edge', () => {
    expect(pointInsideRect({ x: 0, y: 5 }, rect)).toBe(true);
  });

  it('returns false for a point outside the rect', () => {
    expect(pointInsideRect({ x: 15, y: 5 }, rect)).toBe(false);
  });
});

describe('segmentsIntersect', () => {
  it('returns true for crossing segments', () => {
    expect(
      segmentsIntersect(
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 10, y: 0 }
      )
    ).toBe(true);
  });

  it('returns false for parallel segments', () => {
    expect(
      segmentsIntersect(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 5 },
        { x: 10, y: 5 }
      )
    ).toBe(false);
  });

  it('returns true when an endpoint touches a segment', () => {
    expect(
      segmentsIntersect(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 0 },
        { x: 15, y: 5 }
      )
    ).toBe(true);
  });
});

describe('segmentIntersectsRect', () => {
  const rect: Rect = { left: 0, top: 0, right: 10, bottom: 10 };

  it('returns true when segment crosses the rect', () => {
    expect(
      segmentIntersectsRect({ x: -5, y: 5 }, { x: 15, y: 5 }, rect)
    ).toBe(true);
  });

  it('returns false when segment is outside', () => {
    expect(
      segmentIntersectsRect({ x: -5, y: -5 }, { x: -1, y: -1 }, rect)
    ).toBe(false);
  });
});

describe('hasBoxOverlap', () => {
  it('returns true when boxes overlap', () => {
    const boxes: Box[] = [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 5, y: 5, w: 10, h: 10 },
    ];
    expect(hasBoxOverlap(boxes)).toBe(true);
  });

  it('returns false when boxes are separated', () => {
    const boxes: Box[] = [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 20, w: 10, h: 10 },
    ];
    expect(hasBoxOverlap(boxes)).toBe(false);
  });
});

describe('direction', () => {
  it('returns 1 for counter-clockwise', () => {
    expect(direction({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 })).toBe(1);
  });

  it('returns -1 for clockwise', () => {
    expect(direction({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: -5 })).toBe(-1);
  });

  it('returns 0 for collinear', () => {
    expect(direction({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 })).toBe(0);
  });
});

describe('pointOnSegment', () => {
  it('returns true for a point on the segment', () => {
    expect(
      pointOnSegment({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    ).toBe(true);
  });

  it('returns false for a point outside the segment', () => {
    expect(
      pointOnSegment({ x: 15, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    ).toBe(false);
  });
});
