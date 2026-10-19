import { Handle, Position } from '@xyflow/react';

const handles: Array<{ id: string; position: Position }> = [
  { id: 'left', position: Position.Left },
  { id: 'right', position: Position.Right },
  { id: 'top', position: Position.Top },
  { id: 'bottom', position: Position.Bottom },
];

// React Flow 默认句柄约 6px，会让连线停在菱形顶点外侧。
// 用内联样式压到 1px，端点才能贴住菱形四角。
const handleStyle = {
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 0,
  opacity: 0,
};

export function ChenHandles() {
  return (
    <>
      {handles.map((handle) => (
        <Handle
          className="chen-handle"
          key={`target:${handle.id}`}
          id={`target:${handle.id}`}
          type="target"
          position={handle.position}
          style={handleStyle}
        />
      ))}
      {handles.map((handle) => (
        <Handle
          className="chen-handle"
          key={`source:${handle.id}`}
          id={`source:${handle.id}`}
          type="source"
          position={handle.position}
          style={handleStyle}
        />
      ))}
    </>
  );
}
