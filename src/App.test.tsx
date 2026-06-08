import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the initial SQL workspace shell', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Huisheng Chart' })).toBeInTheDocument();
  expect(screen.getByLabelText('SQL input')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '生成' })).toBeInTheDocument();
});
