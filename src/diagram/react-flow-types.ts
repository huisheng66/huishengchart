import type { Edge, Node } from '@xyflow/react';
import type { ColumnModel, RelationModel, TableModel } from '../domain/er-model';

export type TableNodeData = {
  table: TableModel;
} & Record<string, unknown>;

export type ChenEntityNodeData = {
  table: TableModel;
} & Record<string, unknown>;

export type ChenAttributeNodeData = {
  table: TableModel;
  column: ColumnModel;
} & Record<string, unknown>;

export type ChenRelationshipNodeData = {
  relation: RelationModel;
} & Record<string, unknown>;

export type RelationshipEdgeData = {
  relation?: RelationModel;
  label: string;
  inferred: boolean;
  edgeStyle?: 'smooth' | 'straight';
} & Record<string, unknown>;

export type ErNode = Node<
  TableNodeData | ChenEntityNodeData | ChenAttributeNodeData | ChenRelationshipNodeData,
  'table' | 'chenEntity' | 'chenAttribute' | 'chenRelationship'
>;

export type ErEdge = Edge<RelationshipEdgeData, 'relationship'>;

export type FlowGraph = {
  nodes: ErNode[];
  edges: ErEdge[];
  layoutStrategy?: 'elk' | 'manual';
};
