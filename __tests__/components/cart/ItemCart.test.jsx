import { render, screen } from '@testing-library/react';
import ItemCart from '@/components/cart/components/ItemCart';

const cartItem = {
  _id: 1,
  product: {
    _id: 1,
    name: 'Product Test',
    category: {
      categoryName: 'Electronics',
    },
    description: 'Product to test For testing purpose',
    stock: 2,
    price: 60,
  },
  quantity: 2,
};

describe('Cart Component', () => {
  describe('Rendering', () => {
    it('Should contain a html figure element', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(screen.getByRole('figure')).toBeInTheDocument();
    });

    it('Should contain an image with description Product Image', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(
        screen.getByRole('img', { description: 'Product Image' }),
      ).toBeInTheDocument();
    });

    it('Should contain a link with name Product Test', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(
        screen.getByRole('link', { name: 'Product Test' }),
      ).toBeInTheDocument();
    });

    it('Should contain a paragraph with name stock left', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(
        screen.getByRole('paragraph', { name: 'stock left' }),
      ).toBeInTheDocument();
    });

    it('Should contain a button with name Remove', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(
        screen.getByRole('button', { name: 'Remove' }),
      ).toBeInTheDocument();
    });

    it('Should contain a paragraph with name total price per item', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(
        screen.getByRole('paragraph', { name: 'total price per item' }),
      ).toBeInTheDocument();
    });

    it('Should contain a small element with testID with unit price per item', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(screen.getByTestId('unit price per item')).toBeInTheDocument();
    });

    it('Should contain a button with sign title decrement', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(screen.getByTitle('decrement')).toBeInTheDocument();
    });

    it('Should contain a button with sign +', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
    });

    it('Should contain a spin button with name item quantity', () => {
      render(<ItemCart cartItem={cartItem} />);
      expect(
        screen.getByRole('spinbutton', { name: 'item quantity' }),
      ).toBeInTheDocument();
    });
  });
});
