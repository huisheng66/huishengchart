import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { App } from './App';
import { toChenFlow } from './diagram/chen-adapter';

vi.mock('./diagram/chen-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./diagram/chen-adapter')>();
  return { ...actual, toChenFlow: vi.fn(actual.toChenFlow) };
});

it('generates editable Crow Foot and Chen ER views from SQL', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Huisheng Chart' })).toBeInTheDocument();
  expect(screen.getByLabelText('SQL input')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '生成' }));

  expect(screen.getByRole('tab', { name: "鸟爪 ER 图 (Crow's Foot)" })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '陈氏 ER 图' })).toBeInTheDocument();
  expect(screen.getByText('学生')).toBeInTheDocument();
  expect(screen.getByText('student')).toBeInTheDocument();
  expect(screen.getAllByText('主键').length).toBeGreaterThan(0);
  expect(screen.getAllByText('外键').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: '放大' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: 'Mermaid 源码' }));
  expect(screen.getByText(/erDiagram/)).toBeInTheDocument();
  expect(screen.getByText(/major_id FK/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: '数据字典' }));
  expect(within(screen.getByRole('tabpanel')).getByText(/学生/)).toBeInTheDocument();
});

it('shows parser errors without replacing the current workspace', async () => {
  render(<App />);

  await userEvent.clear(screen.getByLabelText('SQL input'));
  await userEvent.type(screen.getByLabelText('SQL input'), 'CREATE TABLE broken (');
  await userEvent.click(screen.getByRole('button', { name: '生成' }));

  expect(screen.getByRole('alert')).toHaveTextContent(/closing parenthesis|No CREATE TABLE|SQL parse|CREATE TABLE/i);
  expect(screen.queryByRole('tab', { name: "鸟爪 ER 图 (Crow's Foot)" })).not.toBeInTheDocument();
});

it('does not rebuild the Chen graph when only the layout changes', async () => {
  const { container } = render(<App />);

  await userEvent.click(screen.getByRole('button', { name: '生成' }));
  expect(screen.getByRole('tab', { name: '陈氏 ER 图' })).toBeInTheDocument();

  const buildCount = vi.mocked(toChenFlow).mock.calls.length;
  const positionBefore = nodeTransform(container, 'student');

  await userEvent.click(screen.getByRole('button', { name: '自动整理' }));

  await waitFor(() => expect(nodeTransform(container, 'student')).not.toBe(positionBefore), {
    timeout: 5000,
  });
  expect(vi.mocked(toChenFlow).mock.calls.length).toBe(buildCount);
});

function nodeTransform(container: HTMLElement, id: string): string {
  const node = container.querySelector(`.react-flow__node[data-id="${id}"]`) as HTMLElement | null;
  return node?.style.transform ?? '';
}
