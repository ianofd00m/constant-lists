import { render, screen } from '@testing-library/react';
import DeckBuilder from './DeckBuilder';
test('renders Deck Builder heading', () => {
  render(<DeckBuilder />);
  expect(screen.getByText(/Deck Builder/i)).toBeInTheDocument();
});
