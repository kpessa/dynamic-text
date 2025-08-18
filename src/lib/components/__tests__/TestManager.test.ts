import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import TestManager from '../TestManager.svelte';

describe('TestManager', () => {
  const mockSections = [
    {
      id: 1,
      type: 'static' as const,
      name: 'HTML Section',
      content: '<p>Test</p>',
      testCases: []
    },
    {
      id: 2,
      type: 'dynamic' as const,
      name: 'JS Section',
      content: 'return x + y',
      testCases: [
        {
          name: 'Test 1',
          variables: { x: 1, y: 2 },
          expectedOutput: '3'
        },
        {
          name: 'Test 2',
          variables: { x: 5, y: 5 },
          expectedOutput: '10'
        }
      ]
    }
  ];

  const mockTestResults = {
    '2-Test 1': { passed: true, actual: '3' },
    '2-Test 2': { passed: false, actual: '11', error: 'Expected 10 but got 11' }
  };

  const defaultProps = {
    sections: mockSections,
    activeTestCase: {},
    testResults: mockTestResults,
    onAddTestCase: vi.fn(),
    onUpdateTestCase: vi.fn(),
    onDeleteTestCase: vi.fn(),
    onSetActiveTestCase: vi.fn(),
    onRunTest: vi.fn(),
    onRunAllTests: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render test manager', () => {
    const { container } = render(TestManager, { props: defaultProps });
    
    expect(container.querySelector('.test-manager')).toBeTruthy();
    expect(container.querySelector('.test-header')).toBeTruthy();
  });

  it('should display test statistics', () => {
    const { getByText } = render(TestManager, { props: defaultProps });
    
    expect(getByText('1 passed')).toBeTruthy();
    expect(getByText('1 failed')).toBeTruthy();
    expect(getByText('0 pending')).toBeTruthy();
  });

  it('should display only dynamic sections', () => {
    const { queryByText, getByText } = render(TestManager, { props: defaultProps });
    
    expect(queryByText('HTML Section')).toBeFalsy();
    expect(getByText('JS Section')).toBeTruthy();
  });

  it('should display test cases', () => {
    const { container } = render(TestManager, { props: defaultProps });
    
    const testCases = container.querySelectorAll('.test-case');
    expect(testCases).toHaveLength(2);
  });

  it('should show test results with correct styling', () => {
    const { container } = render(TestManager, { props: defaultProps });
    
    const testCases = container.querySelectorAll('.test-case');
    expect(testCases[0]?.classList.contains('passed')).toBe(true);
    expect(testCases[1]?.classList.contains('failed')).toBe(true);
  });

  it('should call onRunTest when run button clicked', async () => {
    const { container } = render(TestManager, { props: defaultProps });
    
    const runButtons = container.querySelectorAll('.btn-run');
    if (runButtons[0]) {
      await fireEvent.click(runButtons[0]);
    }
    
    const section = mockSections[1];
    if (section && section.testCases && section.testCases[0]) {
      expect(defaultProps.onRunTest).toHaveBeenCalledWith(2, section.testCases[0]);
    }
  });

  it('should call onSetActiveTestCase when use button clicked', async () => {
    const { container } = render(TestManager, { props: defaultProps });
    
    const useButtons = container.querySelectorAll('[title="Use this test case"]');
    if (useButtons[0]) {
      await fireEvent.click(useButtons[0]);
    }
    
    const section = mockSections[1];
    if (section && section.testCases && section.testCases[0]) {
      expect(defaultProps.onSetActiveTestCase).toHaveBeenCalledWith(2, section.testCases[0]);
    }
  });

  it('should call onDeleteTestCase when delete button clicked', async () => {
    const { container } = render(TestManager, { props: defaultProps });
    
    const deleteButtons = container.querySelectorAll('[title="Delete test case"]');
    if (deleteButtons[0]) {
      await fireEvent.click(deleteButtons[0]);
    }
    
    expect(defaultProps.onDeleteTestCase).toHaveBeenCalledWith(2, 0);
  });

  it('should call onUpdateTestCase when test name changes', async () => {
    const { container } = render(TestManager, { props: defaultProps });
    
    const nameInputs = container.querySelectorAll('.test-name-input') as NodeListOf<HTMLInputElement>;
    if (nameInputs[0]) {
      nameInputs[0].value = 'Updated Test Name';
      await fireEvent.change(nameInputs[0]);
    }
    
    expect(defaultProps.onUpdateTestCase).toHaveBeenCalledWith(2, 0, { name: 'Updated Test Name' });
  });

  it('should call onUpdateTestCase when expected output changes', async () => {
    const { container } = render(TestManager, { props: defaultProps });
    
    const expectedInputs = container.querySelectorAll('input[placeholder="Expected output"]') as NodeListOf<HTMLInputElement>;
    if (expectedInputs[0]) {
      expectedInputs[0].value = '5';
      await fireEvent.change(expectedInputs[0]);
    }
    
    expect(defaultProps.onUpdateTestCase).toHaveBeenCalledWith(2, 0, { expectedOutput: '5' });
  });

  it('should call onAddTestCase when add button clicked', async () => {
    const { getByText } = render(TestManager, { props: defaultProps });
    
    const addButton = getByText('+ Add Test Case');
    await fireEvent.click(addButton);
    
    expect(defaultProps.onAddTestCase).toHaveBeenCalledWith(2);
  });

  it('should call onRunAllTests when run all button clicked', async () => {
    const { getByText } = render(TestManager, { props: defaultProps });
    
    const runAllButton = getByText('Run All Tests (2)');
    await fireEvent.click(runAllButton);
    
    expect(defaultProps.onRunAllTests).toHaveBeenCalled();
  });

  it('should display test summary modal when tests run', async () => {
    const { getByText, queryByText } = render(TestManager, { props: defaultProps });
    
    const runAllButton = getByText('Run All Tests (2)');
    await fireEvent.click(runAllButton);
    
    await waitFor(() => {
      expect(getByText('Test Results Summary')).toBeTruthy();
    });
    
    // Close modal
    const closeButton = getByText('Close');
    await fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(queryByText('Test Results Summary')).toBeFalsy();
    });
  });

  it('should format variables display correctly', () => {
    const { getByText } = render(TestManager, { props: defaultProps });
    
    expect(getByText('x: 1, y: 2')).toBeTruthy();
    expect(getByText('x: 5, y: 5')).toBeTruthy();
  });

  it('should show error message for failed tests', () => {
    const { getByText } = render(TestManager, { props: defaultProps });
    
    expect(getByText('Expected 10 but got 11')).toBeTruthy();
  });

  it('should show actual output for tests', () => {
    const { getByText } = render(TestManager, { props: defaultProps });
    
    expect(getByText('Actual: 11')).toBeTruthy();
  });

  it('should disable run all button when no tests', () => {
    const props = {
      ...defaultProps,
      sections: [mockSections[0]] // Only static section
    };
    
    const { container } = render(TestManager, { props });
    
    const runAllButton = container.querySelector('.btn-primary') as HTMLButtonElement;
    expect(runAllButton.disabled).toBe(true);
  });

  it('should show empty state for sections without tests', () => {
    const sections = [
      {
        id: 3,
        type: 'dynamic' as const,
        name: 'Empty Section',
        content: 'return 1',
        testCases: []
      }
    ];
    
    const props = {
      ...defaultProps,
      sections
    };
    
    const { getByText } = render(TestManager, { props });
    
    expect(getByText('No test cases yet')).toBeTruthy();
    expect(getByText('Add First Test Case')).toBeTruthy();
  });
});