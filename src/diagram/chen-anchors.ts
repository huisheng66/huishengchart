import type { Point } from './geometry-utils';

export type ChenNodeShape = 'entity' | 'attribute' | 'relationship';

/**
 * 求中心指向 toward 的射线与节点边界的交点。
 * 实体是矩形，属性是椭圆，关系是菱形——这样连线可以落在边界任意位置，
 * 而不是固定在四个方向的句柄上。
 */
export function anchorOnChenNode(
  shape: ChenNodeShape,
  center: Point,
  width: number,
  height: number,
  toward: Point,
  axis?: 'horizontal' | 'vertical'
): Point {
  if (width <= 0 || height <= 0) {
    return center;
  }

  if (shape === 'attribute') {
    return anchorOnEllipse(center, width, height, toward);
  }

  if (shape === 'relationship') {
    return anchorOnRhombusVertex(center, width, height, toward, axis);
  }

  return anchorOnRectangle(center, width, height, toward);
}

/**
 * 菱形只连四个顶点：按主轴方向选左/右或上/下顶点。
 * 同一对实体的两条边传同一个 axis，保证连的是对角顶点。
 */
export function anchorOnRhombusVertex(
  center: Point,
  width: number,
  height: number,
  toward: Point,
  axis?: 'horizontal' | 'vertical'
): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const horizontal = axis ? axis === 'horizontal' : Math.abs(dx) >= Math.abs(dy);

  if (horizontal) {
    return { x: center.x + (dx >= 0 ? width / 2 : -width / 2), y: center.y };
  }

  return { x: center.x, y: center.y + (dy >= 0 ? height / 2 : -height / 2) };
}

export function anchorOnRectangle(
  center: Point,
  width: number,
  height: number,
  toward: Point
): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;

  if (dx === 0 && dy === 0) {
    return center;
  }

  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : width / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : height / 2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  if (!Number.isFinite(scale)) {
    return center;
  }

  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export function anchorOnEllipse(
  center: Point,
  width: number,
  height: number,
  toward: Point
): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const denominator = Math.hypot(dx / (width / 2), dy / (height / 2));

  if (denominator === 0) {
    return center;
  }

  const scale = 1 / denominator;
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export function anchorOnRhombus(
  center: Point,
  width: number,
  height: number,
  toward: Point
): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const denominator = Math.abs(dx) / (width / 2) + Math.abs(dy) / (height / 2);

  if (denominator === 0) {
    return center;
  }

  const scale = 1 / denominator;
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}
