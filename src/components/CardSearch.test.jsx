import { render, screen } from '@testing-library/react';
import CardSearch from './CardSearch';

test('renders Card Search heading', () => {
  render(<CardSearch />);
  expect(screen.getByText(/Card Search/i)).toBeInTheDocument();
});
