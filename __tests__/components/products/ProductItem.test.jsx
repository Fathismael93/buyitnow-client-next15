import { render, screen } from '@testing-library/react';
import ProductItem from '@/components/products/ProductItem';

const product = {
  _id: 1,
  name: 'Product Test',
  category: {
    categoryName: 'Electronics',
  },
  description: 'Product to test For testing purpose',
  stock: 2,
  price: 60,
};

describe('ProductItem Component', () => {
  describe('Rendering', () => {
    it('Should contain an article element ', () => {
      render(<ProductItem product={product} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('Should contain a link element with name Product Test', () => {
      render(<ProductItem product={product} />);
      expect(
        screen.getByRole('link', { name: /Product Test/ }),
      ).toBeInTheDocument();
    });

    it('Should contain an image element with name Product Test', () => {
      render(<ProductItem product={product} />);
      expect(
        screen.getByRole('img', { name: /Product Test/ }),
      ).toBeInTheDocument();
    });

    it('Should contain a paragraph element with name Product Test', () => {
      render(<ProductItem product={product} />);
      expect(
        screen.getByRole('paragraph', { name: /Product Test/ }),
      ).toBeInTheDocument();
    });

    it('Should contain a paragraph element with name Electronics', () => {
      render(<ProductItem product={product} />);
      expect(
        screen.getByRole('paragraph', { name: 'Electronics' }),
      ).toBeInTheDocument();
    });

    it('Should contain a paragraph element with name Description', () => {
      render(<ProductItem product={product} />);
      expect(
        screen.getByRole('paragraph', { name: 'Description' }),
      ).toBeInTheDocument();
    });

    it('Should contain a paragraph element with name Stock', () => {
      render(<ProductItem product={product} />);
      expect(
        screen.getByRole('paragraph', { name: 'Stock' }),
      ).toBeInTheDocument();
    });

    it('Should contain a span element with testid Price', () => {
      render(<ProductItem product={product} />);
      expect(screen.getByTestId('Price')).toBeInTheDocument();
    });

    it('Should contain a paragraph element with name Shipping text', () => {
      render(<ProductItem product={product} />);
      expect(
        screen.getByRole('paragraph', { name: 'Shipping text' }),
      ).toBeInTheDocument();
    });

    it('Should contain a button element with name Add to Cart', () => {
      render(<ProductItem product={product} />);
      expect(
        screen.getByRole('button', { name: 'Add to Cart' }),
      ).toBeInTheDocument();
    });
  });
});
