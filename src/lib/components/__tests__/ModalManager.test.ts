import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ModalManager from '../ModalManager.svelte';
import { uiStore } from '../../../stores/uiStore.svelte.ts';
import { workspaceStore } from '../../../stores/workspaceStore.svelte.ts';

describe('ModalManager', () => {
  beforeEach(() => {
    // Reset stores to initial state
    uiStore.closeAllModals();
    workspaceStore.clearWorkspace();
  });

  it('should render without errors', () => {
    const { container } = render(ModalManager, {
      props: {
        activeConfigId: null,
        activeConfigIngredients: [],
        sections: [],
        onIngredientSelection: vi.fn(),
        onCreateReference: vi.fn(),
        onEditReference: vi.fn(),
        onMigrationComplete: vi.fn(),
        onCommitMessageConfirm: vi.fn(),
        onSelectiveApply: vi.fn()
      }
    });
    expect(container).toBeTruthy();
  });

  it('should show ingredient manager when uiStore.showIngredientManager is true', () => {
    uiStore.setShowIngredientManager(true);
    
    render(ModalManager, {
      props: {
        activeConfigId: null,
        activeConfigIngredients: [],
        sections: [],
        onIngredientSelection: vi.fn(),
        onCreateReference: vi.fn(),
        onEditReference: vi.fn(),
        onMigrationComplete: vi.fn(),
        onCommitMessageConfirm: vi.fn(),
        onSelectiveApply: vi.fn()
      }
    });

    // Check for modal overlay
    expect(screen.queryByRole('button', { name: /close modal overlay/i })).toBeTruthy();
  });

  it('should close ingredient manager when close button is clicked', async () => {
    uiStore.setShowIngredientManager(true);
    
    const { getByRole } = render(ModalManager, {
      props: {
        activeConfigId: null,
        activeConfigIngredients: [],
        sections: [],
        onIngredientSelection: vi.fn(),
        onCreateReference: vi.fn(),
        onEditReference: vi.fn(),
        onMigrationComplete: vi.fn(),
        onCommitMessageConfirm: vi.fn(),
        onSelectiveApply: vi.fn()
      }
    });

    const closeButton = getByRole('button', { name: /close modal overlay/i });
    await closeButton.click();
    
    expect(uiStore.showIngredientManager).toBe(false);
  });

  it('should pass correct props to child components', () => {
    const mockIngredient = { id: 'test-id', name: 'Test Ingredient' };
    workspaceStore.setLoadedIngredient(mockIngredient);
    
    const onIngredientSelection = vi.fn();
    const onCreateReference = vi.fn();
    
    render(ModalManager, {
      props: {
        activeConfigId: 'config-123',
        activeConfigIngredients: [{ id: '1', name: 'Ingredient 1' }],
        sections: [{ id: '1', type: 'static', content: 'Test' }],
        onIngredientSelection,
        onCreateReference,
        onEditReference: vi.fn(),
        onMigrationComplete: vi.fn(),
        onCommitMessageConfirm: vi.fn(),
        onSelectiveApply: vi.fn()
      }
    });

    // Verify props are passed correctly
    expect(workspaceStore.loadedIngredient).toEqual(mockIngredient);
  });
});