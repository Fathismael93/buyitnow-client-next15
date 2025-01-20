import { render, screen } from '@testing-library/react';
import Filters from '@/components/layouts/Filters';

const categories = [
  {
    _id: 1,
    categoryName: 'Electronics',
  },
  {
    _id: 2,
    categoryName: 'Laptops',
  },
  {
    _id: 3,
    categoryName: 'Headphones',
  },
];

describe('Filters Component', () => {
  describe('Rendering', () => {
    it('Should contain a button with name Filter by', () => {
      render(<Filters />);
      expect(
        screen.getByRole('button', { name: 'Filter by' }),
      ).toBeInTheDocument();
    });

    it('Should contain a heading h3 with name Price ($)', () => {
      render(<Filters />);
      expect(
        screen.getByRole('heading', { name: /Price/, level: 3 }),
      ).toBeInTheDocument();
    });

    it('Should contain a textbox with name Min', () => {
      render(<Filters />);
      expect(screen.getByPlaceholderText('Min')).toBeInTheDocument();
    });

    it('Should contain a textbox with name Max', () => {
      render(<Filters />);
      expect(screen.getByPlaceholderText('Max')).toBeInTheDocument();
    });

    it('Should contain a heading h3 with name Category', () => {
      render(<Filters />);
      expect(
        screen.getByRole('heading', { name: 'Category', level: 3 }),
      ).toBeInTheDocument();
    });

    it('Should contain a list', () => {
      render(<Filters categories={categories} />);
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('Should contain a paragraph', () => {
      render(<Filters />);
      expect(screen.getByRole('paragraph')).toBeInTheDocument();
    });
  });
});
