import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Background, Controls, ReactFlow, type OnNodeDrag, type ReactFlowInstance, useEdgesState, useNodesState } from '@xyflow/react';
import type { DiagramLayout, DiagramView, RelationModel } from '../domain/er-model';
import type { ErEdge, ErNode, FlowGraph } from '../diagram/react-flow-types';
import { applyElkLayout } from '../diagram/layout';
import { applySavedLayout, collectNodeLayout, graphSignature, hasFullSavedLayout } from '../diagram/layout-store';
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

export function CanvasView({
  view,
  graph,
  savedLayout,
  inferredRelations,
  onLayoutChange,
  onAcceptInferred,
  onRejectInferred,
}: {
  view: DiagramView;
  graph: FlowGraph;
  savedLayout?: DiagramLayout;
  inferredRelations?: RelationModel[];
  onLayoutChange?: (view: DiagramView, layout: DiagramLayout) => void;
  onAcceptInferred?: (id: string) => void;
  onRejectInferred?: (id: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const flowRef = useRef<ReactFlowInstance<ErNode, ErEdge> | null>(null);

  // 布局回写会生成新的 graph 对象，但节点集合没变。
  // 这里用 ref 读取最新值，避免位置变化触发重新布局。
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const savedLayoutRef = useRef(savedLayout);
  savedLayoutRef.current = savedLayout;

  const signature = useMemo(() => graphSignature(graph.nodes, graph.edges), [graph]);

  const fitAfterRender = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flowRef.current?.fitView(fitViewOptions);
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function applyInitialLayout() {
      const currentGraph = graphRef.current;
      const saved = savedLayoutRef.current;

      if (currentGraph.layoutStrategy === 'manual' || hasFullSavedLayout(currentGraph.nodes, saved)) {
        setNodes(applySavedLayout(currentGraph.nodes, saved));
        setEdges(currentGraph.edges);
        fitAfterRender();
        return;
      }

      const layouted = await applyElkLayout(currentGraph);
      if (!cancelled) {
        setNodes(applySavedLayout(layouted.nodes, saved));
        setEdges(layouted.edges);
        fitAfterRender();
      }
    }

    applyInitialLayout();

    return () => {
      cancelled = true;
    };
  }, [fitAfterRender, setEdges, setNodes, signature]);

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
    // 自动整理始终走 ELK：Crow's Foot 重新分层，陈氏图重排实体/关系并把属性挂回父节点。
    const layouted = await applyElkLayout({ nodes, edges });
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    // 整理结果要保留，否则切换视图后又会回到初始布局。
    onLayoutChange?.(view, collectNodeLayout(layouted.nodes));
    fitAfterRender();
  }, [edges, fitAfterRender, nodes, onLayoutChange, setEdges, setNodes, view]);

  // 用 React Flow 回调里的最新节点，避免闭包拿到上一帧的位置。
  const persistLayout = useCallback<OnNodeDrag<ErNode>>(
    (_event, _node, draggedNodes) => {
      onLayoutChange?.(view, collectNodeLayout(draggedNodes));
    },
    [onLayoutChange, view]
  );

  const pendingInferred = useMemo(
    () => (inferredRelations ?? []).filter((relation) => relation.status === 'pending'),
    [inferredRelations]
  );

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
        {pendingInferred.length > 0 ? (
          <div className="canvas-toolbar__inferred">
            <span className="canvas-toolbar__inferred-label">推断关系 ({pendingInferred.length})</span>
            <button
              type="button"
              onClick={() => {
                pendingInferred.forEach((relation) => onAcceptInferred?.(relation.id));
              }}
            >
              全部接受
            </button>
            <button
              type="button"
              onClick={() => {
                pendingInferred.forEach((relation) => onRejectInferred?.(relation.id));
              }}
            >
              全部拒绝
            </button>
          </div>
        ) : null}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        ariaLabelConfig={ariaLabelConfig}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={persistLayout}
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
