import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import EditorPanel from '../EditorPanel.svelte';
import { workspaceStore } from '../../../stores/workspaceStore.svelte.ts';
import { uiStore } from '../../../stores/uiStore.svelte.ts';

describe('EditorPanel', () => {
  beforeEach(() => {
    // Reset stores
    workspaceStore.clearWorkspace();
    uiStore.closeAllModals();
  });

  it('should render without errors', () => {
    const { container } = render(EditorPanel, {
      props: {
        sections: [],
        firebaseSyncRef: null,
        onAddSection: vi.fn(),
        onDeleteSection: vi.fn(),
        onUpdateSectionContent: vi.fn(),
        onConvertToDynamic: vi.fn(),
        onSectionDragStart: vi.fn(),
        onSectionDragOver: vi.fn(),
        onSectionDrop: vi.fn(),
        onSectionDragEnd: vi.fn()
      }
    });
    expect(container).toBeTruthy();
  });

  it('should show empty state when no sections', () => {
    render(EditorPanel, {
      props: {
        sections: [],
        firebaseSyncRef: null,
        onAddSection: vi.fn(),
        onDeleteSection: vi.fn(),
        onUpdateSectionContent: vi.fn(),
        onConvertToDynamic: vi.fn()
      }
    });

    expect(screen.getByText('Start Creating Your Reference Text')).toBeTruthy();
    expect(screen.getByText('Add sections to build your dynamic text content')).toBeTruthy();
  });

  it('should call onAddSection when add buttons are clicked', async () => {
    const onAddSection = vi.fn();
    
    render(EditorPanel, {
      props: {
        sections: [],
        firebaseSyncRef: null,
        onAddSection,
        onDeleteSection: vi.fn(),
        onUpdateSectionContent: vi.fn(),
        onConvertToDynamic: vi.fn()
      }
    });

    const staticButton = screen.getByText('+ Static HTML');
    await fireEvent.click(staticButton);
    expect(onAddSection).toHaveBeenCalledWith('static');

    const dynamicButton = screen.getByText('+ Dynamic JS');
    await fireEvent.click(dynamicButton);
    expect(onAddSection).toHaveBeenCalledWith('dynamic');
  });

  it('should render sections when provided', () => {
    const sections = [
      { id: '1', type: 'static', content: 'Static content' },
      { id: '2', type: 'dynamic', content: 'return "Dynamic";' }
    ];

    render(EditorPanel, {
      props: {
        sections,
        firebaseSyncRef: null,
        onAddSection: vi.fn(),
        onDeleteSection: vi.fn(),
        onUpdateSectionContent: vi.fn(),
        onConvertToDynamic: vi.fn()
      }
    });

    expect(screen.getByText('📝 HTML')).toBeTruthy();
    expect(screen.getByText('⚡ JavaScript')).toBeTruthy();
  });

  it('should call onDeleteSection when delete button is clicked', async () => {
    const onDeleteSection = vi.fn();
    const sections = [
      { id: '1', type: 'static', content: 'Test content' }
    ];

    const { container } = render(EditorPanel, {
      props: {
        sections,
        firebaseSyncRef: null,
        onAddSection: vi.fn(),
        onDeleteSection,
        onUpdateSectionContent: vi.fn(),
        onConvertToDynamic: vi.fn()
      }
    });

    const deleteButton = container.querySelector('.delete-section-btn');
    expect(deleteButton).toBeTruthy();
    
    if (deleteButton) {
      await fireEvent.click(deleteButton);
      expect(onDeleteSection).toHaveBeenCalledWith('1');
    }
  });

  it('should show ingredient context bar when loaded', () => {
    workspaceStore.setLoadedIngredient({ id: '1', name: 'Test Ingredient' });
    workspaceStore.setLoadedReference({ 
      id: '1',
      name: 'Test Reference',
      populationType: 'adult',
      healthSystem: 'Test Hospital',
      version: '1.0'
    });

    render(EditorPanel, {
      props: {
        sections: [],
        firebaseSyncRef: null,
        onAddSection: vi.fn(),
        onDeleteSection: vi.fn(),
        onUpdateSectionContent: vi.fn(),
        onConvertToDynamic: vi.fn()
      }
    });

    expect(screen.getByText('📦 Test Ingredient')).toBeTruthy();
    expect(screen.getByText('🏥 Test Hospital')).toBeTruthy();
    expect(screen.getByText('v1.0')).toBeTruthy();
  });

  it('should handle drag and drop interactions', async () => {
    const onSectionDragStart = vi.fn();
    const onSectionDrop = vi.fn();
    const sections = [
      { id: '1', type: 'static', content: 'Section 1' },
      { id: '2', type: 'static', content: 'Section 2' }
    ];

    const { container } = render(EditorPanel, {
      props: {
        sections,
        firebaseSyncRef: null,
        onAddSection: vi.fn(),
        onDeleteSection: vi.fn(),
        onUpdateSectionContent: vi.fn(),
        onConvertToDynamic: vi.fn(),
        onSectionDragStart,
        onSectionDragOver: vi.fn(),
        onSectionDrop,
        onSectionDragEnd: vi.fn()
      }
    });

    const draggableSection = container.querySelector('.section[draggable="true"]');
    expect(draggableSection).toBeTruthy();
    
    if (draggableSection) {
      await fireEvent.dragStart(draggableSection);
      expect(onSectionDragStart).toHaveBeenCalled();
    }
  });
});