import { Handle, Position } from '@xyflow/react';

const handles: Array<{ id: string; position: Position }> = [
  { id: 'left', position: Position.Left },
  { id: 'right', position: Position.Right },
  { id: 'top', position: Position.Top },
  { id: 'bottom', position: Position.Bottom },
];

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
        />
      ))}
      {handles.map((handle) => (
        <Handle
          className="chen-handle"
          key={`source:${handle.id}`}
          id={`source:${handle.id}`}
          type="source"
          position={handle.position}
        />
      ))}
    </>
  );
}
