export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function pointInsideRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

export function segmentsIntersect(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point
): boolean {
  const firstDirection = direction(firstStart, firstEnd, secondStart);
  const secondDirection = direction(firstStart, firstEnd, secondEnd);
  const thirdDirection = direction(secondStart, secondEnd, firstStart);
  const fourthDirection = direction(secondStart, secondEnd, firstEnd);

  if (firstDirection === 0 && pointOnSegment(secondStart, firstStart, firstEnd)) {
    return true;
  }

  if (secondDirection === 0 && pointOnSegment(secondEnd, firstStart, firstEnd)) {
    return true;
  }

  if (thirdDirection === 0 && pointOnSegment(firstStart, secondStart, secondEnd)) {
    return true;
  }

  if (fourthDirection === 0 && pointOnSegment(firstEnd, secondStart, secondEnd)) {
    return true;
  }

  return firstDirection * secondDirection < 0 && thirdDirection * fourthDirection < 0;
}

export function segmentIntersectsRect(
  start: Point,
  end: Point,
  rect: Rect
): boolean {
  if (pointInsideRect(start, rect) || pointInsideRect(end, rect)) {
    return true;
  }

  return (
    [
      [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
      ],
      [
        { x: rect.right, y: rect.top },
        { x: rect.right, y: rect.bottom },
      ],
      [
        { x: rect.right, y: rect.bottom },
        { x: rect.left, y: rect.bottom },
      ],
      [
        { x: rect.left, y: rect.bottom },
        { x: rect.left, y: rect.top },
      ],
    ] as Array<[Point, Point]>
  ).some(([rectStart, rectEnd]) =>
    segmentsIntersect(start, end, rectStart, rectEnd)
  );
}

export function direction(
  origin: Point,
  target: Point,
  point: Point
): number {
  const crossProduct =
    (target.x - origin.x) * (point.y - origin.y) -
    (target.y - origin.y) * (point.x - origin.x);

  if (Math.abs(crossProduct) < 0.001) {
    return 0;
  }

  return crossProduct > 0 ? 1 : -1;
}

export function pointOnSegment(
  point: Point,
  start: Point,
  end: Point
): boolean {
  return (
    point.x >= Math.min(start.x, end.x) &&
    point.x <= Math.max(start.x, end.x) &&
    point.y >= Math.min(start.y, end.y) &&
    point.y <= Math.max(start.y, end.y)
  );
}

export function hasBoxOverlap(boxes: Box[]): boolean {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (
        boxes[i].x < boxes[j].x + boxes[j].w &&
        boxes[i].x + boxes[i].w > boxes[j].x &&
        boxes[i].y < boxes[j].y + boxes[j].h &&
        boxes[i].y + boxes[i].h > boxes[j].y
      ) {
        return true;
      }
    }
  }
  return false;
}
