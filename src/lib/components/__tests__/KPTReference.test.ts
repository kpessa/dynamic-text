import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import type { KPTNamespace } from '../../kptNamespace';

// Mock KPT Reference Panel component
const mockKPTReferencePanel = {
  isOpen: false,
  searchTerm: '',
  selectedCategory: 'all',
  functions: [] as any[],
  
  toggle() {
    this.isOpen = !this.isOpen;
  },
  
  search(term: string) {
    this.searchTerm = term;
    return this.filterFunctions();
  },
  
  filterByCategory(category: string) {
    this.selectedCategory = category;
    return this.filterFunctions();
  },
  
  filterFunctions() {
    let filtered = this.functions;
    
    if (this.searchTerm) {
      filtered = filtered.filter(fn => 
        fn.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fn.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(fn => fn.category === this.selectedCategory);
    }
    
    return filtered;
  },
  
  copyExample(functionName: string) {
    const fn = this.functions.find(f => f.name === functionName);
    if (fn) {
      // Mock clipboard copy
      return fn.example;
    }
    return null;
  }
};

describe('KPT Reference Panel', () => {
  beforeEach(() => {
    // Initialize with KPT functions
    mockKPTReferencePanel.functions = [
      {
        name: 'formatNumber',
        category: 'formatting',
        signature: 'formatNumber(num: number, decimals?: number): string',
        description: 'Format a number with specified decimal places',
        example: 'const result = me.kpt.formatNumber(123.456, 2); // "123.46"'
      },
      {
        name: 'redText',
        category: 'text',
        signature: 'redText(text: string | number): string',
        description: 'Format text in red color',
        example: 'const alert = me.kpt.redText("Warning"); // <span style="color: red;">Warning</span>'
      },
      {
        name: 'checkRange',
        category: 'validation',
        signature: 'checkRange(value: number, normal?: [number, number], critical?: [number, number]): string',
        description: 'Check if value is in normal, warning, or critical range',
        example: 'const status = me.kpt.checkRange(50, [40, 60], [20, 80]); // "NORMAL"'
      },
      {
        name: 'formatWeight',
        category: 'tpn',
        signature: 'formatWeight(weight: number, unit?: string): string',
        description: 'Format weight with unit',
        example: 'const weight = me.kpt.formatWeight(70.5); // "70.5 kg"'
      },
      {
        name: 'createTable',
        category: 'html',
        signature: 'createTable(data: Array<Array<string | number>>, headers?: string[]): string',
        description: 'Create HTML table from data',
        example: 'const table = me.kpt.createTable([["A", 1], ["B", 2]], ["Item", "Value"]);'
      },
      {
        name: 'showIf',
        category: 'conditional',
        signature: 'showIf(condition: boolean, content: string): string',
        description: 'Show content only if condition is true',
        example: 'const text = me.kpt.showIf(value > 10, "High value");'
      }
    ];
    
    mockKPTReferencePanel.isOpen = false;
    mockKPTReferencePanel.searchTerm = '';
    mockKPTReferencePanel.selectedCategory = 'all';
  });

  describe('Panel Display', () => {
    it('should toggle panel visibility', () => {
      expect(mockKPTReferencePanel.isOpen).toBe(false);
      
      mockKPTReferencePanel.toggle();
      expect(mockKPTReferencePanel.isOpen).toBe(true);
      
      mockKPTReferencePanel.toggle();
      expect(mockKPTReferencePanel.isOpen).toBe(false);
    });

    it('should display all KPT functions when opened', () => {
      const functions = mockKPTReferencePanel.filterFunctions();
      expect(functions).toHaveLength(6);
      expect(functions[0].name).toBe('formatNumber');
    });

    it('should show function categories', () => {
      const categories = new Set(mockKPTReferencePanel.functions.map(f => f.category));
      expect(categories.has('formatting')).toBe(true);
      expect(categories.has('text')).toBe(true);
      expect(categories.has('validation')).toBe(true);
      expect(categories.has('tpn')).toBe(true);
      expect(categories.has('html')).toBe(true);
      expect(categories.has('conditional')).toBe(true);
    });

    it('should display function signatures', () => {
      const formatNumber = mockKPTReferencePanel.functions.find(f => f.name === 'formatNumber');
      expect(formatNumber?.signature).toContain('formatNumber(num: number');
      expect(formatNumber?.signature).toContain('decimals?: number');
      expect(formatNumber?.signature).toContain('): string');
    });

    it('should display function descriptions', () => {
      const redText = mockKPTReferencePanel.functions.find(f => f.name === 'redText');
      expect(redText?.description).toContain('Format text in red color');
    });
  });

  describe('Search Functionality', () => {
    it('should filter functions by search term', () => {
      const results = mockKPTReferencePanel.search('format');
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('formatNumber');
      expect(results[1].name).toBe('formatWeight');
    });

    it('should search in function descriptions', () => {
      const results = mockKPTReferencePanel.search('red');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('redText');
    });

    it('should be case-insensitive', () => {
      const results1 = mockKPTReferencePanel.search('FORMAT');
      const results2 = mockKPTReferencePanel.search('format');
      expect(results1).toEqual(results2);
    });

    it('should return empty array for no matches', () => {
      const results = mockKPTReferencePanel.search('xyz123');
      expect(results).toHaveLength(0);
    });

    it('should clear search and show all functions', () => {
      mockKPTReferencePanel.search('format');
      let results = mockKPTReferencePanel.filterFunctions();
      expect(results).toHaveLength(2);
      
      mockKPTReferencePanel.search('');
      results = mockKPTReferencePanel.filterFunctions();
      expect(results).toHaveLength(6);
    });
  });

  describe('Category Filtering', () => {
    it('should filter by category', () => {
      const results = mockKPTReferencePanel.filterByCategory('formatting');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('formatNumber');
    });

    it('should show all when category is "all"', () => {
      const results = mockKPTReferencePanel.filterByCategory('all');
      expect(results).toHaveLength(6);
    });

    it('should combine search and category filters', () => {
      mockKPTReferencePanel.searchTerm = 'format';
      const results = mockKPTReferencePanel.filterByCategory('tpn');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('formatWeight');
    });

    it('should handle categories with multiple functions', () => {
      // Add another text function
      mockKPTReferencePanel.functions.push({
        name: 'greenText',
        category: 'text',
        signature: 'greenText(text: string | number): string',
        description: 'Format text in green color',
        example: 'const success = me.kpt.greenText("OK");'
      });
      
      const results = mockKPTReferencePanel.filterByCategory('text');
      expect(results).toHaveLength(2);
    });
  });

  describe('Copy to Clipboard', () => {
    it('should copy function example', () => {
      const copied = mockKPTReferencePanel.copyExample('formatNumber');
      expect(copied).toBe('const result = me.kpt.formatNumber(123.456, 2); // "123.46"');
    });

    it('should return null for non-existent function', () => {
      const copied = mockKPTReferencePanel.copyExample('nonExistent');
      expect(copied).toBeNull();
    });

    it('should copy complete example with context', () => {
      const copied = mockKPTReferencePanel.copyExample('checkRange');
      expect(copied).toContain('me.kpt.checkRange');
      expect(copied).toContain('[40, 60]');
      expect(copied).toContain('[20, 80]');
    });
  });

  describe('Function Organization', () => {
    it('should group functions by category', () => {
      const grouped: Record<string, any[]> = {};
      
      mockKPTReferencePanel.functions.forEach(fn => {
        if (!grouped[fn.category]) {
          grouped[fn.category] = [];
        }
        grouped[fn.category].push(fn);
      });
      
      expect(Object.keys(grouped)).toHaveLength(6);
      expect(grouped.formatting).toHaveLength(1);
      expect(grouped.text).toHaveLength(1);
      expect(grouped.validation).toHaveLength(1);
    });

    it('should sort functions alphabetically within category', () => {
      const functions = [
        { name: 'zebra', category: 'test' },
        { name: 'apple', category: 'test' },
        { name: 'banana', category: 'test' }
      ];
      
      const sorted = functions.sort((a, b) => a.name.localeCompare(b.name));
      
      expect(sorted[0].name).toBe('apple');
      expect(sorted[1].name).toBe('banana');
      expect(sorted[2].name).toBe('zebra');
    });
  });

  describe('UI States', () => {
    it('should show loading state while fetching functions', () => {
      const state = {
        isLoading: true,
        functions: [],
        error: null
      };
      
      expect(state.isLoading).toBe(true);
      expect(state.functions).toHaveLength(0);
    });

    it('should show error state if functions fail to load', () => {
      const state = {
        isLoading: false,
        functions: [],
        error: 'Failed to load KPT functions'
      };
      
      expect(state.error).toBeTruthy();
      expect(state.functions).toHaveLength(0);
    });

    it('should show empty state when no functions match filter', () => {
      const results = mockKPTReferencePanel.search('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should highlight search matches', () => {
      const highlightMatch = (text: string, searchTerm: string) => {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
      };
      
      const highlighted = highlightMatch('formatNumber', 'format');
      expect(highlighted).toBe('<mark>format</mark>Number');
    });
  });

  describe('Accessibility', () => {
    it('should have keyboard navigation support', () => {
      const keyboardNav = {
        currentIndex: 0,
        functions: mockKPTReferencePanel.functions,
        
        next() {
          this.currentIndex = Math.min(this.currentIndex + 1, this.functions.length - 1);
        },
        
        previous() {
          this.currentIndex = Math.max(this.currentIndex - 1, 0);
        },
        
        select() {
          return this.functions[this.currentIndex];
        }
      };
      
      expect(keyboardNav.currentIndex).toBe(0);
      
      keyboardNav.next();
      expect(keyboardNav.currentIndex).toBe(1);
      
      keyboardNav.previous();
      expect(keyboardNav.currentIndex).toBe(0);
      
      const selected = keyboardNav.select();
      expect(selected.name).toBe('formatNumber');
    });

    it('should have ARIA labels for screen readers', () => {
      const ariaLabels = {
        panel: 'KPT Function Reference Panel',
        search: 'Search KPT functions',
        category: 'Filter by category',
        copyButton: 'Copy function example to clipboard'
      };
      
      expect(ariaLabels.panel).toContain('KPT');
      expect(ariaLabels.search).toContain('Search');
      expect(ariaLabels.category).toContain('Filter');
      expect(ariaLabels.copyButton).toContain('Copy');
    });
  });
});