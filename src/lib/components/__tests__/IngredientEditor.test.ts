import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import IngredientEditor from '../IngredientEditor.svelte';
import type { Ingredient, Section, TestCase } from '../../models';

// Mock CodeEditor component
vi.mock('../CodeEditor.svelte', () => ({
  default: {
    name: 'CodeEditor',
    props: ['value', 'mode', 'onChange'],
    render: ({ value, onChange }: any) => {
      return `<textarea data-testid="code-editor">${value || ''}</textarea>`;
    }
  }
}));

// Mock ingredient data
const mockIngredient: Ingredient = {
  id: 'calcium',
  keyname: 'Calcium',
  displayName: 'Calcium Gluconate',
  category: 'Micronutrient',
  sections: [
    {
      id: 'sec-1',
      type: 'javascript',
      content: 'return me.getValue("calcium");',
      order: 0
    },
    {
      id: 'sec-2',
      type: 'html',
      content: '<div>Calcium Information</div>',
      order: 1
    }
  ],
  tests: [
    {
      id: 'test-1',
      name: 'Normal Range Test',
      variables: { calcium: 2.5 }
    }
  ],
  metadata: {
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
};

describe('IngredientEditor Component', () => {
  let onSave: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSave = vi.fn();
    onCancel = vi.fn();
    onDelete = vi.fn();
  });

  describe('Rendering', () => {
    it('should render ingredient details', () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      expect(screen.getByDisplayValue('Calcium')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Calcium Gluconate')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Micronutrient')).toBeInTheDocument();
    });

    it('should render tabs for sections, tests, and variants', () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      expect(screen.getByRole('tab', { name: /sections/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tests/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /variants/i })).toBeInTheDocument();
    });

    it('should show sections by default', () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      expect(screen.getByText(/javascript/i)).toBeInTheDocument();
      expect(screen.getByText(/html/i)).toBeInTheDocument();
    });

    it('should handle null ingredient gracefully', () => {
      render(IngredientEditor, {
        props: {
          ingredient: null,
          onSave,
          onCancel,
          onDelete
        }
      });

      expect(screen.getByText(/no ingredient selected/i)).toBeInTheDocument();
    });
  });

  describe('Basic Field Editing', () => {
    it('should update keyname', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const keynameInput = screen.getByLabelText(/keyname/i);
      await fireEvent.input(keynameInput, { target: { value: 'CalciumUpdated' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          keyname: 'CalciumUpdated'
        })
      );
    });

    it('should update display name', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const displayInput = screen.getByLabelText(/display name/i);
      await fireEvent.input(displayInput, { target: { value: 'New Display Name' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'New Display Name'
        })
      );
    });

    it('should update category', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const categorySelect = screen.getByLabelText(/category/i);
      await fireEvent.change(categorySelect, { target: { value: 'Macronutrient' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Macronutrient'
        })
      );
    });
  });

  describe('Sections Tab', () => {
    it('should display all sections', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const sectionsTab = screen.getByRole('tab', { name: /sections/i });
      await fireEvent.click(sectionsTab);

      expect(screen.getByText('return me.getValue("calcium");')).toBeInTheDocument();
      expect(screen.getByText('<div>Calcium Information</div>')).toBeInTheDocument();
    });

    it('should add new section', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const addButton = screen.getByRole('button', { name: /add section/i });
      await fireEvent.click(addButton);

      // Should show new section form
      expect(screen.getByPlaceholderText(/section content/i)).toBeInTheDocument();
    });

    it('should edit section content', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await fireEvent.click(editButtons[0]);

      // Should show editor for section
      const editor = screen.getByTestId('code-editor');
      await fireEvent.input(editor, { target: { value: 'return me.getValue("calcium_updated");' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              content: 'return me.getValue("calcium_updated");'
            })
          ])
        })
      );
    });

    it('should delete section', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await fireEvent.click(confirmButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.not.objectContaining({
              id: 'sec-1'
            })
          ])
        })
      );
    });

    it('should reorder sections', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const moveUpButtons = screen.getAllByRole('button', { name: /move up/i });
      await fireEvent.click(moveUpButtons[1]); // Move second section up

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: [
            expect.objectContaining({ id: 'sec-2', order: 0 }),
            expect.objectContaining({ id: 'sec-1', order: 1 })
          ]
        })
      );
    });
  });

  describe('Tests Tab', () => {
    it('should display all tests', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const testsTab = screen.getByRole('tab', { name: /tests/i });
      await fireEvent.click(testsTab);

      expect(screen.getByText('Normal Range Test')).toBeInTheDocument();
      expect(screen.getByText(/calcium.*2\.5/i)).toBeInTheDocument();
    });

    it('should add new test', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const testsTab = screen.getByRole('tab', { name: /tests/i });
      await fireEvent.click(testsTab);

      const addButton = screen.getByRole('button', { name: /add test/i });
      await fireEvent.click(addButton);

      const nameInput = screen.getByPlaceholderText(/test name/i);
      await fireEvent.input(nameInput, { target: { value: 'New Test' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              name: 'New Test'
            })
          ])
        })
      );
    });

    it('should edit test variables', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const testsTab = screen.getByRole('tab', { name: /tests/i });
      await fireEvent.click(testsTab);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await fireEvent.click(editButtons[0]);

      const variableInput = screen.getByLabelText(/calcium/i);
      await fireEvent.input(variableInput, { target: { value: '3.0' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              variables: { calcium: 3.0 }
            })
          ])
        })
      );
    });

    it('should delete test', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const testsTab = screen.getByRole('tab', { name: /tests/i });
      await fireEvent.click(testsTab);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await fireEvent.click(confirmButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          tests: []
        })
      );
    });
  });

  describe('Variants Tab', () => {
    it('should display variant options', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const variantsTab = screen.getByRole('tab', { name: /variants/i });
      await fireEvent.click(variantsTab);

      expect(screen.getByText(/neonatal/i)).toBeInTheDocument();
      expect(screen.getByText(/child/i)).toBeInTheDocument();
      expect(screen.getByText(/adolescent/i)).toBeInTheDocument();
      expect(screen.getByText(/adult/i)).toBeInTheDocument();
    });

    it('should add population variant', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const variantsTab = screen.getByRole('tab', { name: /variants/i });
      await fireEvent.click(variantsTab);

      const addVariantButton = screen.getByRole('button', { name: /add variant for neonatal/i });
      await fireEvent.click(addVariantButton);

      const displayNameInput = screen.getByPlaceholderText(/variant display name/i);
      await fireEvent.input(displayNameInput, { target: { value: 'Calcium (Neonatal)' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          variants: expect.objectContaining({
            NEO: expect.objectContaining({
              populationType: 'neonatal',
              overrides: expect.objectContaining({
                displayName: 'Calcium (Neonatal)'
              })
            })
          })
        })
      );
    });
  });

  describe('User Actions', () => {
    it('should call onSave with updated ingredient', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const keynameInput = screen.getByLabelText(/keyname/i);
      await fireEvent.input(keynameInput, { target: { value: 'UpdatedCalcium' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'calcium',
          keyname: 'UpdatedCalcium'
        })
      );
    });

    it('should call onCancel when cancel clicked', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onDelete when delete clicked', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const deleteButton = screen.getByRole('button', { name: /delete ingredient/i });
      await fireEvent.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await fireEvent.click(confirmButton);

      expect(onDelete).toHaveBeenCalledWith('calcium');
    });
  });

  describe('Validation', () => {
    it('should validate required fields', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const keynameInput = screen.getByLabelText(/keyname/i);
      await fireEvent.input(keynameInput, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await fireEvent.click(saveButton);

      expect(screen.getByText(/keyname is required/i)).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should validate section type', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const addSectionButton = screen.getByRole('button', { name: /add section/i });
      await fireEvent.click(addSectionButton);

      const typeSelect = screen.getByLabelText(/section type/i);
      await fireEvent.change(typeSelect, { target: { value: 'invalid' } });

      expect(screen.getByText(/invalid section type/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getByLabelText(/keyname/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation between tabs', async () => {
      render(IngredientEditor, {
        props: {
          ingredient: mockIngredient,
          onSave,
          onCancel,
          onDelete
        }
      });

      const sectionsTab = screen.getByRole('tab', { name: /sections/i });
      sectionsTab.focus();

      await fireEvent.keyDown(sectionsTab, { key: 'ArrowRight' });
      expect(screen.getByRole('tab', { name: /tests/i })).toHaveFocus();

      await fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
      expect(screen.getByRole('tab', { name: /variants/i })).toHaveFocus();
    });
  });
});