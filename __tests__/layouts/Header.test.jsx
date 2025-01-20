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

    // it('Should contain a link with testId login', () => {
    //   render(<Header />);
    //   expect(screen.getByTestId('login')).toBeInTheDocument();
    // });

    it('Should contain a link with testId cart link', () => {
      render(<Header />);
      expect(screen.getByTestId('cart link')).toBeInTheDocument();
    });

    it('Should contain an image with testId profile image', () => {
      render(<Header />);
      expect(screen.getByTestId('profile image')).toBeInTheDocument();
    });

    it('Should contain a paragraph element', () => {
      render(<Header />);
      expect(screen.getByRole('paragraph')).toBeInTheDocument();
    });

    it('Should contain a time element', () => {
      render(<Header />);
      expect(screen.getByRole('time')).toBeInTheDocument();
    });
  });
});
