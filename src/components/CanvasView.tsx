import { useCallback, useEffect, useMemo } from 'react';
import { Background, Controls, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import type { FlowGraph } from '../diagram/react-flow-types';
import { applyElkLayout } from '../diagram/layout';
import { exportReactFlowImage } from '../export/image';
import { ChenAttributeNode } from './ChenAttributeNode';
import { ChenEntityNode } from './ChenEntityNode';
import { ChenRelationshipNode } from './ChenRelationshipNode';
import { RelationshipEdge } from './RelationshipEdge';
import { TableNode } from './TableNode';

export function CanvasView({ graph }: { graph: FlowGraph }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    let cancelled = false;

    async function layoutInitialGraph() {
      const layouted = await applyElkLayout(graph);
      if (!cancelled) {
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      }
    }

    layoutInitialGraph();

    return () => {
      cancelled = true;
    };
  }, [graph, setEdges, setNodes]);

  const nodeTypes = useMemo(
    () => ({
      table: TableNode,
      chenEntity: ChenEntityNode,
      chenAttribute: ChenAttributeNode,
      chenRelationship: ChenRelationshipNode,
    }),
    []
  );

  const edgeTypes = useMemo(() => ({ relationship: RelationshipEdge }), []);

  const autoLayout = useCallback(async () => {
    const layouted = await applyElkLayout({ nodes, edges });
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [edges, nodes, setEdges, setNodes]);

  return (
    <div className="canvas-wrap">
      <div className="canvas-toolbar">
        <button type="button" onClick={autoLayout}>
          自动整理
        </button>
        <button type="button" onClick={() => exportReactFlowImage('png', 'huishengchart')}>
          导出 PNG
        </button>
        <button type="button" onClick={() => exportReactFlowImage('svg', 'huishengchart')}>
          导出 SVG
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
