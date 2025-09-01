import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import KPTFunctionEditor from '../KPTFunctionEditor.svelte';
import { KPTCrudService } from '../../services/KPTCrudService';

vi.mock('../../services/KPTCrudService');

describe('KPTFunctionEditor Component', () => {
  let mockService: any;

  beforeEach(() => {
    mockService = {
      createFunction: vi.fn(),
      updateFunction: vi.fn(),
      deleteFunction: vi.fn(),
      validateFunction: vi.fn(),
      getFunction: vi.fn(),
      getAllFunctions: vi.fn(),
      getUserFunctions: vi.fn()
    };
    
    (KPTCrudService as any).mockImplementation(() => mockService);
  });

  describe('function creation form', () => {
    it('should render function creation form', () => {
      const { container } = render(KPTFunctionEditor, {
        props: { mode: 'create', userId: 'test-user' }
      });

      expect(screen.getByLabelText(/function name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/signature/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/function code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create function/i })).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      render(KPTFunctionEditor, {
        props: { mode: 'create', userId: 'test-user' }
      });

      const submitButton = screen.getByRole('button', { name: /create function/i });
      await fireEvent.click(submitButton);

      expect(await screen.findByText(/function name is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/function code is required/i)).toBeInTheDocument();
    });

    it('should create function with valid data', async () => {
      mockService.validateFunction.mockResolvedValue({ valid: true });
      mockService.createFunction.mockResolvedValue({
        id: 'func-123',
        name: 'testFunc',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      });

      render(KPTFunctionEditor, {
        props: { mode: 'create', userId: 'test-user' }
      });

      // Fill form
      await fireEvent.input(screen.getByLabelText(/function name/i), {
        target: { value: 'testFunc' }
      });
      
      await fireEvent.change(screen.getByLabelText(/category/i), {
        target: { value: 'math' }
      });
      
      await fireEvent.input(screen.getByLabelText(/signature/i), {
        target: { value: 'testFunc(x: number): number' }
      });
      
      await fireEvent.input(screen.getByLabelText(/description/i), {
        target: { value: 'Test function' }
      });
      
      await fireEvent.input(screen.getByLabelText(/function code/i), {
        target: { value: 'return x * 2;' }
      });

      // Submit
      await fireEvent.click(screen.getByRole('button', { name: /create function/i }));

      await waitFor(() => {
        expect(mockService.createFunction).toHaveBeenCalledWith({
          name: 'testFunc',
          category: 'math',
          signature: 'testFunc(x: number): number',
          description: 'Test function',
          code: 'return x * 2;',
          isCustom: true,
          userId: 'test-user'
        });
      });

      expect(await screen.findByText(/function created successfully/i)).toBeInTheDocument();
    });

    it('should show validation errors from service', async () => {
      mockService.validateFunction.mockResolvedValue({
        valid: false,
        error: 'Function contains unsafe code patterns'
      });

      render(KPTFunctionEditor, {
        props: { mode: 'create', userId: 'test-user' }
      });

      await fireEvent.input(screen.getByLabelText(/function name/i), {
        target: { value: 'unsafeFunc' }
      });
      
      await fireEvent.input(screen.getByLabelText(/function code/i), {
        target: { value: 'eval("alert(1)")' }
      });

      await fireEvent.click(screen.getByRole('button', { name: /create function/i }));

      expect(await screen.findByText(/unsafe code patterns/i)).toBeInTheDocument();
    });
  });

  describe('function editing interface', () => {
    const mockFunction = {
      id: 'func-123',
      name: 'existingFunc',
      category: 'math',
      signature: 'existingFunc(x: number): number',
      description: 'Existing function',
      code: 'return x * 3;',
      isCustom: true,
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    it('should load and display existing function for editing', async () => {
      mockService.getFunction.mockResolvedValue(mockFunction);

      render(KPTFunctionEditor, {
        props: { 
          mode: 'edit',
          functionId: 'func-123',
          userId: 'test-user'
        }
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('existingFunc')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Existing function')).toBeInTheDocument();
        expect(screen.getByDisplayValue('return x * 3;')).toBeInTheDocument();
      });
    });

    it('should update function with changes', async () => {
      mockService.getFunction.mockResolvedValue(mockFunction);
      mockService.validateFunction.mockResolvedValue({ valid: true });
      mockService.updateFunction.mockResolvedValue({
        ...mockFunction,
        description: 'Updated description',
        version: 2
      });

      render(KPTFunctionEditor, {
        props: { 
          mode: 'edit',
          functionId: 'func-123',
          userId: 'test-user'
        }
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing function')).toBeInTheDocument();
      });

      // Update description
      const descriptionInput = screen.getByLabelText(/description/i);
      await fireEvent.input(descriptionInput, {
        target: { value: 'Updated description' }
      });

      // Save changes
      await fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockService.updateFunction).toHaveBeenCalledWith('func-123', {
          description: 'Updated description'
        });
      });

      expect(await screen.findByText(/function updated successfully/i)).toBeInTheDocument();
    });

    it('should prevent editing built-in functions', async () => {
      mockService.getFunction.mockResolvedValue({
        ...mockFunction,
        isCustom: false
      });

      render(KPTFunctionEditor, {
        props: { 
          mode: 'edit',
          functionId: 'built-in-func',
          userId: 'test-user'
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/cannot edit built-in functions/i)).toBeInTheDocument();
      });

      // Form fields should be disabled
      expect(screen.getByLabelText(/function name/i)).toBeDisabled();
      expect(screen.getByLabelText(/function code/i)).toBeDisabled();
    });

    it('should show version history', async () => {
      const history = [
        { version: 1, description: 'Initial version', updatedAt: new Date('2024-01-01') },
        { version: 2, description: 'Updated', updatedAt: new Date('2024-01-02') }
      ];

      mockService.getFunction.mockResolvedValue(mockFunction);
      mockService.getFunctionHistory = vi.fn().mockResolvedValue(history);

      render(KPTFunctionEditor, {
        props: { 
          mode: 'edit',
          functionId: 'func-123',
          userId: 'test-user',
          showHistory: true
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/version history/i)).toBeInTheDocument();
        expect(screen.getByText(/version 1/i)).toBeInTheDocument();
        expect(screen.getByText(/version 2/i)).toBeInTheDocument();
      });
    });
  });

  describe('delete confirmation flow', () => {
    const mockFunction = {
      id: 'func-123',
      name: 'deleteMe',
      category: 'math',
      signature: 'deleteMe(): void',
      description: 'Function to delete',
      code: 'return;',
      isCustom: true,
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    it('should show delete confirmation modal', async () => {
      mockService.getFunction.mockResolvedValue(mockFunction);

      render(KPTFunctionEditor, {
        props: { 
          mode: 'edit',
          functionId: 'func-123',
          userId: 'test-user'
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete function/i })).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByRole('button', { name: /delete function/i }));

      expect(await screen.findByText(/are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByText(/deleteMe/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument();
    });

    it('should delete function on confirmation', async () => {
      mockService.getFunction.mockResolvedValue(mockFunction);
      mockService.deleteFunction.mockResolvedValue(true);

      render(KPTFunctionEditor, {
        props: { 
          mode: 'edit',
          functionId: 'func-123',
          userId: 'test-user'
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete function/i })).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByRole('button', { name: /delete function/i }));
      await fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

      await waitFor(() => {
        expect(mockService.deleteFunction).toHaveBeenCalledWith('func-123');
      });

      expect(await screen.findByText(/function deleted successfully/i)).toBeInTheDocument();
    });

    it('should cancel deletion', async () => {
      mockService.getFunction.mockResolvedValue(mockFunction);

      render(KPTFunctionEditor, {
        props: { 
          mode: 'edit',
          functionId: 'func-123',
          userId: 'test-user'
        }
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete function/i })).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByRole('button', { name: /delete function/i }));
      await fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockService.deleteFunction).not.toHaveBeenCalled();
      
      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
      });
    });

    it('should prevent deleting built-in functions', async () => {
      mockService.getFunction.mockResolvedValue({
        ...mockFunction,
        isCustom: false
      });

      render(KPTFunctionEditor, {
        props: { 
          mode: 'edit',
          functionId: 'built-in-func',
          userId: 'test-user'
        }
      });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /delete function/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('validation feedback', () => {
    it('should show real-time syntax validation', async () => {
      mockService.validateFunction.mockImplementation((func) => {
        if (func.code.includes('{{')) {
          return Promise.resolve({ valid: false, error: 'Invalid syntax' });
        }
        return Promise.resolve({ valid: true });
      });

      render(KPTFunctionEditor, {
        props: { mode: 'create', userId: 'test-user' }
      });

      const codeInput = screen.getByLabelText(/function code/i);
      
      // Valid code
      await fireEvent.input(codeInput, {
        target: { value: 'return x * 2;' }
      });

      await waitFor(() => {
        expect(screen.getByText(/✓ valid syntax/i)).toBeInTheDocument();
      });

      // Invalid code
      await fireEvent.input(codeInput, {
        target: { value: 'return {{;' }
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid syntax/i)).toBeInTheDocument();
      });
    });

    it('should validate function name uniqueness', async () => {
      mockService.getAllFunctions.mockResolvedValue([
        { name: 'existingFunc', isCustom: true }
      ]);

      render(KPTFunctionEditor, {
        props: { mode: 'create', userId: 'test-user' }
      });

      await fireEvent.input(screen.getByLabelText(/function name/i), {
        target: { value: 'existingFunc' }
      });

      await waitFor(() => {
        expect(screen.getByText(/function name already exists/i)).toBeInTheDocument();
      });
    });

    it('should check for reserved keywords', async () => {
      render(KPTFunctionEditor, {
        props: { mode: 'create', userId: 'test-user' }
      });

      await fireEvent.input(screen.getByLabelText(/function name/i), {
        target: { value: 'function' } // Reserved keyword
      });

      await waitFor(() => {
        expect(screen.getByText(/reserved keyword/i)).toBeInTheDocument();
      });
    });

    it('should validate function size limit', async () => {
      const largeCode = 'x'.repeat(10 * 1024 + 1); // Over 10KB

      render(KPTFunctionEditor, {
        props: { mode: 'create', userId: 'test-user' }
      });

      await fireEvent.input(screen.getByLabelText(/function code/i), {
        target: { value: largeCode }
      });

      await waitFor(() => {
        expect(screen.getByText(/exceeds size limit/i)).toBeInTheDocument();
      });
    });
  });
});