import { render, screen } from '@testing-library/react';
import CustomPagination from '@/components/layouts/CustomPagination';

describe('CustomPagination Component', () => {
  describe('Rendering', () => {
    it('Should contain a textbox with placeholder with Enter your keyword', () => {
      render(<CustomPagination resPerPage={2} productsCount={6} />);
    });
  });
});
