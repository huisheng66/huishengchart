import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { CanvasView } from './CanvasView';
import { toChenFlow } from '../diagram/chen-adapter';
import { sampleSql } from '../domain/sample-sql';
import { parseMySqlToErModel } from '../sql/mysql-parser';
import type { FlowGraph } from '../diagram/react-flow-types';

const graph: FlowGraph = {
  nodes: [
    {
      id: 'student',
      type: 'table',
      position: { x: 0, y: 0 },
      width: 260,
      height: 98,
      data: { table: { id: 'student', name: 'student', columns: [], primaryKey: [], uniqueKeys: [] } },
    },
  ],
  edges: [],
  layoutStrategy: 'manual',
};

it('restores saved node positions instead of the computed layout', async () => {
  const { container } = render(
    <CanvasView view="crowFoot" graph={graph} savedLayout={{ student: { x: 320, y: 180 } }} />
  );

  await waitFor(() => {
    expect(nodeTransform(container, 'student')).toContain('translate(320px,180px)');
  });
});

it('falls back to the computed layout when nothing was saved', async () => {
  const { container } = render(<CanvasView view="crowFoot" graph={graph} />);

  await waitFor(() => {
    expect(nodeTransform(container, 'student')).toContain('translate(0px,0px)');
  });
});

it('runs ELK auto layout for the Chen view and persists the arranged positions', async () => {
  const chenGraph = toChenFlow(parseMySqlToErModel(sampleSql));
  const onLayoutChange = vi.fn();

  render(<CanvasView view="chen" graph={chenGraph} onLayoutChange={onLayoutChange} />);

  await userEvent.click(screen.getByRole('button', { name: '自动整理' }));

  await waitFor(() => expect(onLayoutChange).toHaveBeenCalledTimes(1), { timeout: 5000 });

  const layout = onLayoutChange.mock.calls[0][1];
  expect(Object.keys(layout)).toHaveLength(chenGraph.nodes.length);
});

function nodeTransform(container: HTMLElement, id: string): string {
  const node = container.querySelector(`.react-flow__node[data-id="${id}"]`) as HTMLElement | null;
  if (!node) {
    throw new Error(`Node ${id} was not rendered.`);
  }

  return node.style.transform;
}
