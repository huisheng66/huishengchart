import type { ColumnModel, RelationModel, TableModel } from '../domain/er-model';

export type Point = {
  x: number;
  y: number;
};

export type HandleSide = 'left' | 'right' | 'top' | 'bottom';

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type NodePlacement = {
  id: string;
  center: Point;
  width: number;
  height: number;
};

export type ChenEdgeData = {
  relation?: RelationModel;
  label: string;
  inferred: boolean;
};

export type AssociativeRelationship = {
  table: TableModel;
  relations: RelationModel[];
  relationship: RelationModel;
  attributeColumns: ColumnModel[];
};

export type ConceptualStyle = {
  tableLabels: Record<string, string>;
  columnLabels: Record<string, Record<string, string>>;
  relationNames: Record<string, string>;
  relationEdgeLabels: Record<string, { source: string; target: string }>;
  extraRelations: RelationModel[];
  entityPositions: Record<string, Point>;
  relationPositions: Record<string, Point>;
  attributePositions: Record<string, Record<string, Point>>;
  attributeAngles: Record<string, number[]>;
  showCardinalityLabels: boolean;
};
