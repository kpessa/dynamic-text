import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import IngredientList from '../IngredientList.svelte';
import type { Ingredient } from '../../models';

// Mock ingredient data
const mockIngredients: Ingredient[] = [
  {
    id: 'calcium',
    keyname: 'Calcium',
    displayName: 'Calcium Gluconate',
    category: 'Micronutrient',
    sections: [],
    tests: [],
    metadata: {
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  },
  {
    id: 'phosphate',
    keyname: 'Phosphate',
    displayName: 'Sodium Phosphate',
    category: 'Micronutrient',
    sections: [],
    tests: [],
    metadata: {
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  },
  {
    id: 'dextrose',
    keyname: 'Dextrose',
    displayName: 'Dextrose 70%',
    category: 'Macronutrient',
    sections: [],
    tests: [],
    metadata: {
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z'
    }
  }
];

describe('IngredientList Component', () => {
  let onSelect: ReturnType<typeof vi.fn>;
  let onEdit: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelect = vi.fn();
    onEdit = vi.fn();
    onDelete = vi.fn();
  });

  describe('Rendering', () => {
    it('should render all ingredients', () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      expect(screen.getByText('Calcium Gluconate')).toBeInTheDocument();
      expect(screen.getByText('Sodium Phosphate')).toBeInTheDocument();
      expect(screen.getByText('Dextrose 70%')).toBeInTheDocument();
    });

    it('should show empty state when no ingredients', () => {
      render(IngredientList, {
        props: {
          ingredients: [],
          onSelect,
          onEdit,
          onDelete
        }
      });

      expect(screen.getByText(/no ingredients/i)).toBeInTheDocument();
    });

    it('should highlight selected ingredient', () => {
      const { container } = render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          selectedIngredientId: 'calcium',
          onSelect,
          onEdit,
          onDelete
        }
      });

      const selectedItem = container.querySelector('[data-selected="true"]');
      expect(selectedItem).toBeInTheDocument();
      expect(selectedItem).toHaveTextContent('Calcium Gluconate');
    });

    it('should show category badges', () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      expect(screen.getByText('Micronutrient')).toBeInTheDocument();
      expect(screen.getByText('Macronutrient')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter ingredients by search query', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await fireEvent.input(searchInput, { target: { value: 'calcium' } });

      await waitFor(() => {
        expect(screen.getByText('Calcium Gluconate')).toBeInTheDocument();
        expect(screen.queryByText('Sodium Phosphate')).not.toBeInTheDocument();
        expect(screen.queryByText('Dextrose 70%')).not.toBeInTheDocument();
      });
    });

    it('should search by keyname', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await fireEvent.input(searchInput, { target: { value: 'dextrose' } });

      await waitFor(() => {
        expect(screen.getByText('Dextrose 70%')).toBeInTheDocument();
        expect(screen.queryByText('Calcium Gluconate')).not.toBeInTheDocument();
      });
    });

    it('should be case-insensitive', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await fireEvent.input(searchInput, { target: { value: 'PHOSPHATE' } });

      await waitFor(() => {
        expect(screen.getByText('Sodium Phosphate')).toBeInTheDocument();
      });
    });
  });

  describe('Category Filtering', () => {
    it('should filter by category', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const categorySelect = screen.getByLabelText(/category/i);
      await fireEvent.change(categorySelect, { target: { value: 'Micronutrient' } });

      await waitFor(() => {
        expect(screen.getByText('Calcium Gluconate')).toBeInTheDocument();
        expect(screen.getByText('Sodium Phosphate')).toBeInTheDocument();
        expect(screen.queryByText('Dextrose 70%')).not.toBeInTheDocument();
      });
    });

    it('should show all when no category selected', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const categorySelect = screen.getByLabelText(/category/i);
      await fireEvent.change(categorySelect, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('Calcium Gluconate')).toBeInTheDocument();
        expect(screen.getByText('Sodium Phosphate')).toBeInTheDocument();
        expect(screen.getByText('Dextrose 70%')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by name by default', () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('Calcium Gluconate');
      expect(items[1]).toHaveTextContent('Dextrose 70%');
      expect(items[2]).toHaveTextContent('Sodium Phosphate');
    });

    it('should sort by category', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const sortSelect = screen.getByLabelText(/sort/i);
      await fireEvent.change(sortSelect, { target: { value: 'category' } });

      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('Dextrose 70%'); // Macronutrient
        expect(items[1]).toHaveTextContent('Calcium Gluconate'); // Micronutrient
        expect(items[2]).toHaveTextContent('Sodium Phosphate'); // Micronutrient
      });
    });

    it('should sort by modified date', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const sortSelect = screen.getByLabelText(/sort/i);
      await fireEvent.change(sortSelect, { target: { value: 'modified' } });

      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('Dextrose 70%'); // Most recent
        expect(items[1]).toHaveTextContent('Calcium Gluconate');
        expect(items[2]).toHaveTextContent('Sodium Phosphate'); // Oldest
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onSelect when ingredient clicked', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const calciumItem = screen.getByText('Calcium Gluconate').closest('[role="listitem"]');
      await fireEvent.click(calciumItem!);

      expect(onSelect).toHaveBeenCalledWith(mockIngredients[0]);
    });

    it('should call onEdit when edit button clicked', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const editButtons = screen.getAllByLabelText(/edit/i);
      await fireEvent.click(editButtons[0]);

      expect(onEdit).toHaveBeenCalledWith(mockIngredients[0]);
    });

    it('should call onDelete when delete button clicked', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await fireEvent.click(deleteButtons[0]);

      expect(onDelete).toHaveBeenCalledWith('calcium');
    });
  });

  describe('Combined Filters', () => {
    it('should apply search and category filter together', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      // Filter by category first
      const categorySelect = screen.getByLabelText(/category/i);
      await fireEvent.change(categorySelect, { target: { value: 'Micronutrient' } });

      // Then search
      const searchInput = screen.getByPlaceholderText(/search/i);
      await fireEvent.input(searchInput, { target: { value: 'phosphate' } });

      await waitFor(() => {
        expect(screen.getByText('Sodium Phosphate')).toBeInTheDocument();
        expect(screen.queryByText('Calcium Gluconate')).not.toBeInTheDocument();
        expect(screen.queryByText('Dextrose 70%')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(IngredientList, {
        props: {
          ingredients: mockIngredients,
          onSelect,
          onEdit,
          onDelete
        }
      });

      const firstItem = screen.getAllByRole('listitem')[0];
      firstItem.focus();
      
      await fireEvent.keyDown(firstItem, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledWith(mockIngredients[0]);
    });
  });
});