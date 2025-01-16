import { render, screen } from '@testing-library/react';
import Header from '@/components/layouts/Header';

describe('Header Component', () => {
  describe('Rendering', () => {

    render(<Header />);

    it('Should contain a link with name BuyItNow', () => {
      expect(
        screen.getByRole('link', { name: 'BuyItNow' }),
      ).toBeInTheDocument();
    });

    it('Should contain an input field with placeholder Enter your keyword', () => {
      expect(
        screen.getByPlaceholderText('Enter your keyword'),
      ).toBeInTheDocument();
    });

    it('Should contain a button with name Search', () => {
      expect(
        screen.getByRole('button', { name: 'Search' }),
      ).toBeInTheDocument();
    });

    it('Should contain a button with name Sign In', () => {
      expect(
        screen.getByRole('button', { name: 'Sign In' }),
      ).toBeInTheDocument();
    });
  });
});