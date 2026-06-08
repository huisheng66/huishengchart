import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

it('generates editable Crow Foot and Chen ER views from SQL', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Huisheng Chart' })).toBeInTheDocument();
  expect(screen.getByLabelText('SQL input')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '生成' }));

  expect(screen.getByRole('tab', { name: "Crow's Foot" })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '陈氏 ER 图' })).toBeInTheDocument();
  expect(screen.getByText('student')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: 'Mermaid' }));
  expect(screen.getByText(/erDiagram/)).toBeInTheDocument();
  expect(screen.getByText(/major_id FK/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: '数据字典' }));
  expect(within(screen.getByRole('tabpanel')).getByText(/学生表/)).toBeInTheDocument();
});

it('shows parser errors without replacing the current workspace', async () => {
  render(<App />);

  await userEvent.clear(screen.getByLabelText('SQL input'));
  await userEvent.type(screen.getByLabelText('SQL input'), 'CREATE TABLE broken (');
  await userEvent.click(screen.getByRole('button', { name: '生成' }));

  expect(screen.getByRole('alert')).toHaveTextContent(/closing parenthesis|No CREATE TABLE|SQL parse|CREATE TABLE/i);
  expect(screen.queryByRole('tab', { name: "Crow's Foot" })).not.toBeInTheDocument();
});
