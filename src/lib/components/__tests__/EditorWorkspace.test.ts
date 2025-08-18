import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import EditorWorkspace from '../EditorWorkspace.svelte';

// Mock CodeEditor component
vi.mock('../../CodeEditor.svelte', () => ({
  default: {
    name: 'CodeEditor',
    render: () => ({
      html: '<div data-testid="code-editor">Mock CodeEditor</div>'
    })
  }
}));

describe('EditorWorkspace', () => {
  const mockSections = [
    {
      id: 1,
      type: 'static' as const,
      name: 'HTML Section',
      content: '<p>Test HTML</p>',
      testCases: []
    },
    {
      id: 2,
      type: 'dynamic' as const,
      name: 'JS Section',
      content: 'return "test"',
      testCases: [{ name: 'Test 1', variables: {} }]
    }
  ];

  const defaultProps = {
    sections: mockSections,
    activeSection: null,
    onSectionUpdate: vi.fn(),
    onSectionDelete: vi.fn(),
    onAddSection: vi.fn(),
    onConvertToDynamic: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the editor workspace', () => {
    const { container } = render(EditorWorkspace, { props: defaultProps });
    
    expect(container.querySelector('.editor-workspace')).toBeTruthy();
    expect(container.querySelector('.editor-header')).toBeTruthy();
    expect(container.querySelector('.sections-container')).toBeTruthy();
  });

  it('should display all sections', () => {
    const { container, getByText } = render(EditorWorkspace, { props: defaultProps });
    
    expect(getByText('HTML Section')).toBeTruthy();
    expect(getByText('JS Section')).toBeTruthy();
    expect(container.querySelectorAll('.section-item')).toHaveLength(2);
  });

  it('should show correct section type badges', () => {
    const { container } = render(EditorWorkspace, { props: defaultProps });
    
    const badges = container.querySelectorAll('.section-type-badge');
    expect(badges[0]?.textContent).toBe('HTML');
    expect(badges[1]?.textContent).toBe('JavaScript');
  });

  it('should highlight active section', () => {
    const props = {
      ...defaultProps,
      activeSection: mockSections[0]
    };
    
    const { container } = render(EditorWorkspace, { props });
    
    const sections = container.querySelectorAll('.section-item');
    expect(sections[0]?.classList.contains('active')).toBe(true);
    expect(sections[1]?.classList.contains('active')).toBe(false);
  });

  it('should call onAddSection when adding HTML section', async () => {
    const { getByTitle } = render(EditorWorkspace, { props: defaultProps });
    
    const addHtmlButton = getByTitle('Add HTML Section');
    await fireEvent.click(addHtmlButton);
    
    expect(defaultProps.onAddSection).toHaveBeenCalledWith('static');
  });

  it('should call onAddSection when adding JavaScript section', async () => {
    const { getByTitle } = render(EditorWorkspace, { props: defaultProps });
    
    const addJsButton = getByTitle('Add JavaScript Section');
    await fireEvent.click(addJsButton);
    
    expect(defaultProps.onAddSection).toHaveBeenCalledWith('dynamic');
  });

  it('should call onSectionDelete when delete button clicked', async () => {
    const { container } = render(EditorWorkspace, { props: defaultProps });
    
    const deleteButtons = container.querySelectorAll('.btn-danger');
    if (deleteButtons[0]) {
      await fireEvent.click(deleteButtons[0]);
    }
    
    expect(defaultProps.onSectionDelete).toHaveBeenCalledWith(1);
  });

  it('should show convert button for static sections with dynamic content', () => {
    const sectionsWithDynamic = [
      {
        id: 1,
        type: 'static' as const,
        name: 'Static with Dynamic',
        content: '<p>[f(return 1)]</p>',
        testCases: []
      }
    ];
    
    const props = {
      ...defaultProps,
      sections: sectionsWithDynamic
    };
    
    const { getByTitle } = render(EditorWorkspace, { props });
    
    expect(getByTitle('Convert to JavaScript')).toBeTruthy();
  });

  it('should call onConvertToDynamic when convert button clicked', async () => {
    const sectionsWithDynamic = [
      {
        id: 1,
        type: 'static' as const,
        name: 'Static with Dynamic',
        content: '<p>[f(return 1)]</p>',
        testCases: []
      }
    ];
    
    const props = {
      ...defaultProps,
      sections: sectionsWithDynamic
    };
    
    const { getByTitle } = render(EditorWorkspace, { props });
    
    const convertButton = getByTitle('Convert to JavaScript');
    await fireEvent.click(convertButton);
    
    expect(defaultProps.onConvertToDynamic).toHaveBeenCalledWith(1, '<p>[f(return 1)]</p>');
  });

  it('should display test count for sections with tests', () => {
    const { container } = render(EditorWorkspace, { props: defaultProps });
    
    const testIndicators = container.querySelectorAll('.test-indicator');
    expect(testIndicators).toHaveLength(1);
    expect(testIndicators[0]?.textContent).toBe('1 test');
  });

  it('should show empty state when no sections', () => {
    const props = {
      ...defaultProps,
      sections: []
    };
    
    const { getByText } = render(EditorWorkspace, { props });
    
    expect(getByText('No sections yet. Add a section to get started!')).toBeTruthy();
  });
});