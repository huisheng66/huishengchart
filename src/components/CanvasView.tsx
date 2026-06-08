import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Background, Controls, ReactFlow, type ReactFlowInstance, useEdgesState, useNodesState } from '@xyflow/react';
import type { ErEdge, ErNode, FlowGraph } from '../diagram/react-flow-types';
import { applyElkLayout } from '../diagram/layout';
import { exportReactFlowImage } from '../export/image';
import { ChenAttributeNode } from './ChenAttributeNode';
import { ChenEntityNode } from './ChenEntityNode';
import { ChenRelationshipNode } from './ChenRelationshipNode';
import { RelationshipEdge } from './RelationshipEdge';
import { TableNode } from './TableNode';

const ariaLabelConfig = {
  'node.a11yDescription.default': '按回车或空格选择节点，按删除键移除节点，按 Esc 取消选择。',
  'node.a11yDescription.keyboardDisabled': '按回车或空格选择节点，然后可用方向键移动节点；按删除键移除节点，按 Esc 取消选择。',
  'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }: { direction: string; x: number; y: number }) =>
    `已向${direction}移动选中节点，新位置 x: ${x}, y: ${y}`,
  'edge.a11yDescription.default': '按回车或空格选择连线，然后可按删除键移除连线，按 Esc 取消选择。',
  'controls.ariaLabel': '画布控制',
  'controls.zoomIn.ariaLabel': '放大',
  'controls.zoomOut.ariaLabel': '缩小',
  'controls.fitView.ariaLabel': '适配视图',
  'controls.interactive.ariaLabel': '切换画布交互',
  'minimap.ariaLabel': '缩略图',
  'handle.ariaLabel': '连接点',
};

const fitViewOptions = {
  padding: 0.16,
  minZoom: 0.05,
  maxZoom: 1,
};

export function CanvasView({ graph }: { graph: FlowGraph }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const flowRef = useRef<ReactFlowInstance<ErNode, ErEdge> | null>(null);

  const fitAfterRender = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flowRef.current?.fitView(fitViewOptions);
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function layoutInitialGraph() {
      const layouted = await applyElkLayout(graph);
      if (!cancelled) {
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
        fitAfterRender();
      }
    }

    layoutInitialGraph();

    return () => {
      cancelled = true;
    };
  }, [fitAfterRender, graph, setEdges, setNodes]);

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
    fitAfterRender();
  }, [edges, fitAfterRender, nodes, setEdges, setNodes]);

  return (
    <div className="canvas-wrap">
      <div className="canvas-toolbar">
        <button type="button" onClick={autoLayout}>
          自动整理
        </button>
        <button type="button" onClick={() => exportReactFlowImage('png', 'huishengchart', nodes)}>
          导出 PNG
        </button>
        <button type="button" onClick={() => exportReactFlowImage('svg', 'huishengchart', nodes)}>
          导出 SVG
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        ariaLabelConfig={ariaLabelConfig}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={(instance) => {
          flowRef.current = instance;
        }}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.05}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
