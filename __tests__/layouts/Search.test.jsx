import { render, screen } from '@testing-library/react';
import Search from '@/components/layouts/Search';

describe('Search Component', () => {
  describe('Rendering', () => {
    it('Should contain a textbox with placeholder with Enter your keyword', () => {
      render(<Search />);
      expect(
        screen.getByPlaceholderText('Enter your keyword'),
      ).toBeInTheDocument();
    });

    it('Should contain a button with name Search', () => {
      render(<Search />);
      expect(
        screen.getByRole('button', { name: 'Search' }),
      ).toBeInTheDocument();
    });
  });
});
