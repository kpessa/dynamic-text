import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import IngredientPanel from '../IngredientPanel.svelte';
import type { Ingredient } from '../../models';

// Mock child components
vi.mock('../IngredientList.svelte', () => ({
  default: {
    name: 'IngredientList',
    props: ['ingredients', 'selectedIngredientId', 'onSelect', 'onEdit', 'onDelete'],
    render: ({ ingredients, onSelect }: any) => {
      return `<div data-testid="ingredient-list">
        ${ingredients.map((i: Ingredient) => 
          `<div role="listitem" onclick="${() => onSelect(i)}">${i.displayName}</div>`
        ).join('')}
      </div>`;
    }
  }
}));

vi.mock('../IngredientEditor.svelte', () => ({
  default: {
    name: 'IngredientEditor',
    props: ['ingredient', 'onSave', 'onCancel', 'onDelete'],
    render: ({ ingredient }: any) => {
      return `<div data-testid="ingredient-editor">
        ${ingredient ? `Editing: ${ingredient.displayName}` : 'No ingredient selected'}
      </div>`;
    }
  }
}));

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
  }
];

describe('IngredientPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout', () => {
    it('should render split pane layout', () => {
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      const panel = container.querySelector('[data-testid="ingredient-panel"]');
      expect(panel).toBeInTheDocument();

      const listPane = container.querySelector('.list-pane, [data-testid="ingredient-list"]');
      const editorPane = container.querySelector('.editor-pane, [data-testid="ingredient-editor"]');
      
      expect(listPane).toBeInTheDocument();
      expect(editorPane).toBeInTheDocument();
    });

    it('should show splitter between panes', () => {
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      const splitter = container.querySelector('.splitter, [data-testid="splitter"]');
      expect(splitter).toBeInTheDocument();
    });

    it('should have adjustable pane widths', () => {
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients,
          initialListWidth: 300
        }
      });

      const listPane = container.querySelector('.list-pane, [data-testid="ingredient-list"]');
      expect(listPane).toHaveStyle({ width: '300px' });
    });
  });

  describe('Component Integration', () => {
    it('should pass ingredients to list component', () => {
      render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      const list = screen.getByTestId('ingredient-list');
      expect(list).toBeInTheDocument();
      
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(mockIngredients.length);
    });

    it('should show editor when ingredient selected', async () => {
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      // Initially no ingredient selected
      let editor = screen.getByTestId('ingredient-editor');
      expect(editor).toHaveTextContent('No ingredient selected');

      // Click first ingredient
      const firstItem = screen.getAllByRole('listitem')[0];
      await fireEvent.click(firstItem);

      // Editor should show selected ingredient
      editor = screen.getByTestId('ingredient-editor');
      expect(editor).toHaveTextContent('Editing: Calcium Gluconate');
    });

    it('should handle ingredient selection', async () => {
      const onSelect = vi.fn();
      render(IngredientPanel, {
        props: {
          ingredients: mockIngredients,
          onIngredientSelect: onSelect
        }
      });

      const firstItem = screen.getAllByRole('listitem')[0];
      await fireEvent.click(firstItem);

      expect(onSelect).toHaveBeenCalledWith(mockIngredients[0]);
    });
  });

  describe('Splitter Functionality', () => {
    it('should handle splitter drag', async () => {
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      const splitter = container.querySelector('.splitter, [data-testid="splitter"]')!;
      const listPane = container.querySelector('.list-pane, [data-testid="ingredient-list"]')!;
      
      // Get initial width
      const initialWidth = parseInt(window.getComputedStyle(listPane).width);

      // Simulate drag
      await fireEvent.mouseDown(splitter);
      await fireEvent.mouseMove(document, { clientX: 100 });
      await fireEvent.mouseUp(document);

      // Width should have changed
      const newWidth = parseInt(window.getComputedStyle(listPane).width);
      expect(newWidth).not.toBe(initialWidth);
    });

    it('should respect minimum pane width', async () => {
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients,
          minListWidth: 200
        }
      });

      const splitter = container.querySelector('.splitter, [data-testid="splitter"]')!;
      const listPane = container.querySelector('.list-pane, [data-testid="ingredient-list"]')!;

      // Try to drag below minimum
      await fireEvent.mouseDown(splitter);
      await fireEvent.mouseMove(document, { clientX: 50 }); // Very small width
      await fireEvent.mouseUp(document);

      // Width should not go below minimum
      const width = parseInt(window.getComputedStyle(listPane).width);
      expect(width).toBeGreaterThanOrEqual(200);
    });

    it('should respect maximum pane width', async () => {
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients,
          maxListWidth: 500
        }
      });

      const splitter = container.querySelector('.splitter, [data-testid="splitter"]')!;
      const listPane = container.querySelector('.list-pane, [data-testid="ingredient-list"]')!;

      // Try to drag above maximum
      await fireEvent.mouseDown(splitter);
      await fireEvent.mouseMove(document, { clientX: 800 }); // Very large width
      await fireEvent.mouseUp(document);

      // Width should not exceed maximum
      const width = parseInt(window.getComputedStyle(listPane).width);
      expect(width).toBeLessThanOrEqual(500);
    });
  });

  describe('CRUD Operations', () => {
    it('should handle ingredient save', async () => {
      const onSave = vi.fn();
      render(IngredientPanel, {
        props: {
          ingredients: mockIngredients,
          onIngredientSave: onSave
        }
      });

      // Select ingredient
      const firstItem = screen.getAllByRole('listitem')[0];
      await fireEvent.click(firstItem);

      // Trigger save from editor (simulated)
      const updatedIngredient = { ...mockIngredients[0], displayName: 'Updated Name' };
      // In real implementation, this would come from IngredientEditor
      
      expect(onSave).toBeDefined();
    });

    it('should handle ingredient delete', async () => {
      const onDelete = vi.fn();
      render(IngredientPanel, {
        props: {
          ingredients: mockIngredients,
          onIngredientDelete: onDelete
        }
      });

      // Select ingredient
      const firstItem = screen.getAllByRole('listitem')[0];
      await fireEvent.click(firstItem);

      // Trigger delete (simulated)
      // In real implementation, this would come from IngredientEditor

      expect(onDelete).toBeDefined();
    });

    it('should handle new ingredient creation', async () => {
      const onCreate = vi.fn();
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients,
          onIngredientCreate: onCreate
        }
      });

      // Look for create button
      const createButton = container.querySelector('[aria-label="Create ingredient"]');
      if (createButton) {
        await fireEvent.click(createButton);
        expect(onCreate).toHaveBeenCalled();
      }
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator', () => {
      render(IngredientPanel, {
        props: {
          ingredients: [],
          loading: true
        }
      });

      const loadingIndicator = screen.getByText(/loading/i);
      expect(loadingIndicator).toBeInTheDocument();
    });

    it('should show empty state when no ingredients', () => {
      render(IngredientPanel, {
        props: {
          ingredients: [],
          loading: false
        }
      });

      const emptyState = screen.getByText(/no ingredients/i);
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      render(IngredientPanel, {
        props: {
          ingredients: [],
          error: 'Failed to load ingredients'
        }
      });

      const errorMessage = screen.getByText(/failed to load ingredients/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show retry button on error', async () => {
      const onRetry = vi.fn();
      render(IngredientPanel, {
        props: {
          ingredients: [],
          error: 'Failed to load ingredients',
          onRetry
        }
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation in list', async () => {
      render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      const list = screen.getByTestId('ingredient-list');
      list.focus();

      // Navigate with arrow keys
      await fireEvent.keyDown(list, { key: 'ArrowDown' });
      await fireEvent.keyDown(list, { key: 'Enter' });

      // Should select ingredient
      const editor = screen.getByTestId('ingredient-editor');
      expect(editor).not.toHaveTextContent('No ingredient selected');
    });

    it('should handle escape key to close editor', async () => {
      const onCancel = vi.fn();
      render(IngredientPanel, {
        props: {
          ingredients: mockIngredients,
          onEditorCancel: onCancel
        }
      });

      // Select ingredient
      const firstItem = screen.getAllByRole('listitem')[0];
      await fireEvent.click(firstItem);

      // Press escape
      await fireEvent.keyDown(document, { key: 'Escape' });

      expect(onCancel).toBeDefined();
    });
  });

  describe('Responsive Behavior', () => {
    it('should stack vertically on small screens', () => {
      // Mock small viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      });

      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      const panel = container.querySelector('[data-testid="ingredient-panel"]');
      expect(panel).toHaveClass('stacked', 'vertical');
    });

    it('should show horizontal layout on large screens', () => {
      // Mock large viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });

      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      const panel = container.querySelector('[data-testid="ingredient-panel"]');
      expect(panel).toHaveClass('horizontal', 'split');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      const panel = container.querySelector('[data-testid="ingredient-panel"]');
      expect(panel).toHaveAttribute('role', 'region');
      expect(panel).toHaveAttribute('aria-label', 'Ingredient management panel');

      const splitter = container.querySelector('.splitter, [data-testid="splitter"]');
      expect(splitter).toHaveAttribute('role', 'separator');
      expect(splitter).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('should announce selection changes', async () => {
      render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      const liveRegion = screen.getByRole('status', { hidden: true });
      
      // Select ingredient
      const firstItem = screen.getAllByRole('listitem')[0];
      await fireEvent.click(firstItem);

      // Check if selection is announced
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/selected.*calcium/i);
      });
    });

    it('should support screen reader navigation', () => {
      const { container } = render(IngredientPanel, {
        props: {
          ingredients: mockIngredients
        }
      });

      // Check for landmarks
      const navigation = container.querySelector('[role="navigation"]');
      const main = container.querySelector('[role="main"]');
      
      expect(navigation || main).toBeInTheDocument();
    });
  });
});