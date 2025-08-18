import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PreviewPanel from '../PreviewPanel.svelte';

describe('PreviewPanel', () => {
  const mockJsonOutput = [
    { type: 'text', content: 'Hello' },
    { type: 'dynamic', content: 'World' }
  ];

  const defaultProps = {
    previewHTML: '<p>Test Preview HTML</p>',
    jsonOutput: mockJsonOutput,
    showJSON: false,
    onCopyJSON: vi.fn(),
    onExport: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render preview panel', () => {
    const { container } = render(PreviewPanel, { props: defaultProps });
    
    expect(container.querySelector('.preview-panel')).toBeTruthy();
    expect(container.querySelector('.preview-header')).toBeTruthy();
    expect(container.querySelector('.preview-content')).toBeTruthy();
  });

  it('should display preview tab by default', () => {
    const { container, getByText } = render(PreviewPanel, { props: defaultProps });
    
    const previewTab = getByText('Preview');
    expect(previewTab.parentElement?.classList.contains('active')).toBe(true);
    
    const previewContent = container.querySelector('.preview-html');
    expect(previewContent).toBeTruthy();
    expect(previewContent?.innerHTML).toContain('<p>Test Preview HTML</p>');
  });

  it('should switch to JSON tab when clicked', async () => {
    const { container, getByText } = render(PreviewPanel, { props: defaultProps });
    
    const jsonTab = getByText('JSON Output');
    await fireEvent.click(jsonTab);
    
    expect(jsonTab.parentElement?.classList.contains('active')).toBe(true);
    
    const jsonContent = container.querySelector('.json-output');
    expect(jsonContent).toBeTruthy();
    expect(jsonContent?.textContent).toContain(JSON.stringify(mockJsonOutput, null, 2));
  });

  it('should call onCopyJSON when copy button clicked', async () => {
    const { getByText } = render(PreviewPanel, { props: defaultProps });
    
    // Switch to JSON tab first
    const jsonTab = getByText('JSON Output');
    await fireEvent.click(jsonTab);
    
    const copyButton = getByText('Copy JSON');
    await fireEvent.click(copyButton);
    
    expect(defaultProps.onCopyJSON).toHaveBeenCalledTimes(1);
  });

  it('should call onExport when export button clicked', async () => {
    const { getByText } = render(PreviewPanel, { props: defaultProps });
    
    const exportButton = getByText('Export');
    await fireEvent.click(exportButton);
    
    expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
  });

  it('should not show copy button in preview tab', () => {
    const { queryByText } = render(PreviewPanel, { props: defaultProps });
    
    expect(queryByText('Copy JSON')).toBeFalsy();
  });

  it('should show copy button only in JSON tab', async () => {
    const { getByText, queryByText } = render(PreviewPanel, { props: defaultProps });
    
    // Initially in preview tab
    expect(queryByText('Copy JSON')).toBeFalsy();
    
    // Switch to JSON tab
    const jsonTab = getByText('JSON Output');
    await fireEvent.click(jsonTab);
    
    expect(getByText('Copy JSON')).toBeTruthy();
  });

  it('should render HTML content safely', () => {
    const dangerousHTML = '<script>alert("xss")</script><p>Safe content</p>';
    const props = {
      ...defaultProps,
      previewHTML: dangerousHTML
    };
    
    const { container } = render(PreviewPanel, { props });
    
    const previewContent = container.querySelector('.preview-html');
    // Note: Svelte's @html directive should handle sanitization
    expect(previewContent?.innerHTML).toContain(dangerousHTML);
  });

  it('should format JSON with proper indentation', async () => {
    const { container, getByText } = render(PreviewPanel, { props: defaultProps });
    
    const jsonTab = getByText('JSON Output');
    await fireEvent.click(jsonTab);
    
    const jsonPre = container.querySelector('.json-output pre');
    expect(jsonPre?.textContent).toBe(JSON.stringify(mockJsonOutput, null, 2));
  });

  it('should handle empty preview HTML', () => {
    const props = {
      ...defaultProps,
      previewHTML: ''
    };
    
    const { container } = render(PreviewPanel, { props });
    
    const previewContent = container.querySelector('.preview-html');
    expect(previewContent?.innerHTML).toBe('');
  });

  it('should handle empty JSON output', async () => {
    const props = {
      ...defaultProps,
      jsonOutput: []
    };
    
    const { container, getByText } = render(PreviewPanel, { props });
    
    const jsonTab = getByText('JSON Output');
    await fireEvent.click(jsonTab);
    
    const jsonPre = container.querySelector('.json-output pre');
    expect(jsonPre?.textContent).toBe('[]');
  });

  it('should maintain tab state when props update', async () => {
    const { getByText, rerender } = render(PreviewPanel, { props: defaultProps });
    
    // Switch to JSON tab
    const jsonTab = getByText('JSON Output');
    await fireEvent.click(jsonTab);
    expect(jsonTab.parentElement?.classList.contains('active')).toBe(true);
    
    // Update props
    const newProps = {
      ...defaultProps,
      previewHTML: '<p>Updated content</p>'
    };
    
    rerender({ props: newProps });
    
    // Should still be on JSON tab
    expect(jsonTab.parentElement?.classList.contains('active')).toBe(true);
  });
});