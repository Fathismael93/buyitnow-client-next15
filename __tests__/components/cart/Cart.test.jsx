import { render, screen } from '@testing-library/react';
import Cart from '@/components/cart/Cart';

describe('Cart Component', () => {
  describe('Rendering', () => {
    it('Should contain a heading element with level 2', () => {
      render(<Cart />);
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('Should contain an article element', () => {
      render(<Cart />);
      expect(screen.getAllByRole('article').length).toBe(2);
    });

    it('Should contain a list item element with total units', () => {
      render(<Cart />);
      expect(
        screen.getByRole('listitem', { name: 'total units' }),
      ).toBeInTheDocument();
    });

    it('Should contain a list item element with total price', () => {
      render(<Cart />);
      expect(
        screen.getByRole('listitem', { name: 'total price' }),
      ).toBeInTheDocument();
    });

    it('Should contain a link with name Continue', () => {
      render(<Cart />);
      expect(
        screen.getByRole('link', { name: 'Continue' }),
      ).toBeInTheDocument();
    });

    it('Should contain a link with name Back to shop', () => {
      render(<Cart />);
      expect(
        screen.getByRole('link', { name: 'Back to shop' }),
      ).toBeInTheDocument();
    });

    it('Should contain a div element with testID with virtuoso-scroller', () => {
      render(<Cart />);
      expect(screen.getByTestId('virtuoso-scroller')).toBeInTheDocument();
    });

    it('Should contain a div element with testID with virtuoso-item-list', () => {
      render(<Cart />);
      expect(screen.getByTestId('virtuoso-item-list')).toBeInTheDocument();
    });
  });
});
