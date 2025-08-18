/**
 * Tests for Error Boundary Components
 * Validates error handling and recovery mechanisms
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import ErrorBoundary from '../ErrorBoundary.svelte';
import AsyncErrorBoundary from '../AsyncErrorBoundary.svelte';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('ErrorBoundary', () => {
  let mockOnError: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    mockOnError = vi.fn();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Basic Error Handling', () => {
    it('should render children when no error', async () => {
      const { getByText } = render(ErrorBoundary, {
        props: {
          componentName: 'TestComponent',
          children: () => 'Test Content'
        }
      });
      
      expect(getByText('Test Content')).toBeTruthy();
    });
    
    it('should show fallback UI on error', async () => {
      const ErrorChild = {
        render: () => {
          throw new Error('Test error');
        }
      };
      
      const { getByText, getByRole } = render(ErrorBoundary, {
        props: {
          componentName: 'TestComponent',
          children: ErrorChild
        }
      });
      
      expect(getByRole('alert')).toBeTruthy();
      expect(getByText(/Something went wrong/)).toBeTruthy();
    });
    
    it('should call onError handler', async () => {
      const error = new Error('Test error');
      const ErrorChild = {
        render: () => {
          throw error;
        }
      };
      
      render(ErrorBoundary, {
        props: {
          componentName: 'TestComponent',
          onError: mockOnError,
          children: ErrorChild
        }
      });
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Test error' }),
          expect.any(Object)
        );
      });
    });
  });
  
  describe('Critical Error Detection', () => {
    it('should identify TPN calculation errors as critical', async () => {
      const tpnError = new Error('TPN calculation failed');
      const ErrorChild = {
        render: () => {
          throw tpnError;
        }
      };
      
      const { getByText } = render(ErrorBoundary, {
        props: {
          componentName: 'TPNCalculator',
          children: ErrorChild
        }
      });
      
      expect(getByText(/Critical Error Detected/)).toBeTruthy();
      expect(getByText(/medical calculations/)).toBeTruthy();
    });
    
    it('should identify dosage errors as critical', async () => {
      const dosageError = new Error('Invalid dosage calculation');
      const ErrorChild = {
        render: () => {
          throw dosageError;
        }
      };
      
      const { getByText } = render(ErrorBoundary, {
        props: {
          componentName: 'DosageCalculator',
          children: ErrorChild
        }
      });
      
      expect(getByText(/Critical Error Detected/)).toBeTruthy();
    });
  });
  
  describe('Error Recovery', () => {
    it('should reset error state on retry', async () => {
      let shouldError = true;
      const ErrorChild = {
        render: () => {
          if (shouldError) {
            throw new Error('Recoverable error');
          }
          return 'Recovered content';
        }
      };
      
      const { getByText, getByRole } = render(ErrorBoundary, {
        props: {
          componentName: 'TestComponent',
          children: ErrorChild
        }
      });
      
      // Error state
      expect(getByRole('alert')).toBeTruthy();
      
      // Fix the error
      shouldError = false;
      
      // Click retry
      const retryButton = getByText('Try Again');
      await fireEvent.click(retryButton);
      
      // Should show recovered content
      await waitFor(() => {
        expect(getByText('Recovered content')).toBeTruthy();
      });
    });
    
    it('should respect max recovery attempts', async () => {
      const ErrorChild = {
        render: () => {
          throw new Error('Persistent error');
        }
      };
      
      const { getByText } = render(ErrorBoundary, {
        props: {
          componentName: 'TestComponent',
          children: ErrorChild
        }
      });
      
      // Simulate multiple retry attempts
      for (let i = 0; i < 3; i++) {
        const retryButton = getByText('Try Again');
        await fireEvent.click(retryButton);
      }
      
      // Should show max retries reached
      await waitFor(() => {
        expect(getByText('Max retries reached')).toBeTruthy();
      });
    });
  });
  
  describe('Reset Keys', () => {
    it('should reset on key change', async () => {
      let resetKey = 'key1';
      let shouldError = true;
      
      const ErrorChild = {
        render: () => {
          if (shouldError) {
            throw new Error('Key-based error');
          }
          return 'Content';
        }
      };
      
      const { rerender, getByText, queryByRole } = render(ErrorBoundary, {
        props: {
          componentName: 'TestComponent',
          resetKeys: [resetKey],
          resetOnPropsChange: true,
          children: ErrorChild
        }
      });
      
      // Error state
      expect(queryByRole('alert')).toBeTruthy();
      
      // Fix error and change reset key
      shouldError = false;
      resetKey = 'key2';
      
      await rerender({
        props: {
          componentName: 'TestComponent',
          resetKeys: [resetKey],
          resetOnPropsChange: true,
          children: ErrorChild
        }
      });
      
      // Should reset and show content
      await waitFor(() => {
        expect(getByText('Content')).toBeTruthy();
        expect(queryByRole('alert')).toBeFalsy();
      });
    });
  });
  
  describe('Custom Fallback', () => {
    it('should render custom fallback component', async () => {
      const ErrorChild = {
        render: () => {
          throw new Error('Custom fallback test');
        }
      };
      
      const CustomFallback = ({ error }: { error: Error; resetError: () => void }) => ({
        render: () => `Custom Error: ${error.message}`
      });
      
      const { getByText } = render(ErrorBoundary, {
        props: {
          componentName: 'TestComponent',
          fallback: CustomFallback,
          children: ErrorChild
        }
      });
      
      expect(getByText('Custom Error: Custom fallback test')).toBeTruthy();
    });
  });
});

describe('AsyncErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  describe('Promise Handling', () => {
    it('should show loading state while pending', async () => {
      const promise = new Promise(() => {}); // Never resolves
      
      const { getByText } = render(AsyncErrorBoundary, {
        props: {
          promise,
          componentName: 'TestAsync'
        }
      });
      
      expect(getByText(/Loading TestAsync/)).toBeTruthy();
    });
    
    it('should show result when resolved', async () => {
      const promise = Promise.resolve({ data: 'Success' });
      
      const { getByText } = render(AsyncErrorBoundary, {
        props: {
          promise,
          componentName: 'TestAsync',
          children: (result: any) => `Result: ${result.data}`
        }
      });
      
      await waitFor(() => {
        expect(getByText('Result: Success')).toBeTruthy();
      });
    });
    
    it('should show error when rejected', async () => {
      const promise = Promise.reject(new Error('Async failure'));
      
      const { getByText, getByRole } = render(AsyncErrorBoundary, {
        props: {
          promise,
          componentName: 'TestAsync'
        }
      });
      
      await waitFor(() => {
        expect(getByRole('alert')).toBeTruthy();
        expect(getByText(/Async failure/)).toBeTruthy();
      });
    });
  });
  
  describe('Timeout Handling', () => {
    it('should timeout after specified duration', async () => {
      const promise = new Promise(() => {}); // Never resolves
      
      const { getByText } = render(AsyncErrorBoundary, {
        props: {
          promise,
          timeout: 1000,
          componentName: 'TestTimeout'
        }
      });
      
      // Fast-forward past timeout
      vi.advanceTimersByTime(1100);
      
      await waitFor(() => {
        expect(getByText(/Operation Timed Out/)).toBeTruthy();
        expect(getByText(/timed out after 1000ms/)).toBeTruthy();
      });
    });
  });
  
  describe('Retry Logic', () => {
    it('should retry failed promises', async () => {
      let attemptCount = 0;
      const promise = new Promise((resolve, reject) => {
        attemptCount++;
        if (attemptCount < 3) {
          reject(new Error(`Attempt ${attemptCount} failed`));
        } else {
          resolve('Success after retries');
        }
      });
      
      const mockOnRetry = vi.fn();
      
      const { getByText } = render(AsyncErrorBoundary, {
        props: {
          promise,
          retryCount: 3,
          retryDelay: 100,
          onRetry: mockOnRetry,
          componentName: 'TestRetry',
          children: (result: any) => `Result: ${result}`
        }
      });
      
      // Advance through retries
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(150);
        await vi.runAllTimersAsync();
      }
      
      await waitFor(() => {
        expect(mockOnRetry).toHaveBeenCalledTimes(2); // Called on retry attempts
        expect(getByText('Result: Success after retries')).toBeTruthy();
      });
    });
    
    it('should stop retrying after max attempts', async () => {
      const promise = Promise.reject(new Error('Persistent failure'));
      
      const { getByText } = render(AsyncErrorBoundary, {
        props: {
          promise,
          retryCount: 2,
          retryDelay: 100,
          componentName: 'TestMaxRetry'
        }
      });
      
      // Advance through all retry attempts
      for (let i = 0; i <= 2; i++) {
        vi.advanceTimersByTime(200);
        await vi.runAllTimersAsync();
      }
      
      await waitFor(() => {
        expect(getByText(/Retry attempt 2 of 2 failed/)).toBeTruthy();
      });
    });
  });
  
  describe('Custom Loading', () => {
    it('should render custom loading component', async () => {
      const promise = new Promise(() => {}); // Never resolves
      
      const CustomLoading = () => ({
        render: () => 'Custom Loading State'
      });
      
      const { getByText } = render(AsyncErrorBoundary, {
        props: {
          promise,
          loading: CustomLoading,
          componentName: 'TestCustomLoading'
        }
      });
      
      expect(getByText('Custom Loading State')).toBeTruthy();
    });
  });
});