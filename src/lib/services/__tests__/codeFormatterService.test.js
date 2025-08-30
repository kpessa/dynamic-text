import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  formatJavaScript, 
  loadFormatterConfig, 
  saveFormatterConfig,
  isValidJavaScript,
  getDefaultConfig 
} from '../codeFormatterService';

describe('CodeFormatterService', () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn()
  };

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('formatJavaScript', () => {
    it('formats simple object correctly', () => {
      const input = 'const x={a:1,b:2}';
      const result = formatJavaScript(input);
      
      expect(result.success).toBe(true);
      expect(result.formatted).toContain('const x = { a: 1, b: 2 }');
    });

    it('formats function with proper indentation', () => {
      const input = 'function test(){const a=1;return a+2;}';
      const result = formatJavaScript(input);
      
      expect(result.success).toBe(true);
      expect(result.formatted).toContain('function test()');
      expect(result.formatted).toContain('const a = 1');
      expect(result.formatted).toContain('return a + 2');
    });

    it('formats arrow function correctly', () => {
      const input = 'const fn=(a,b)=>{return a+b}';
      const result = formatJavaScript(input);
      
      expect(result.success).toBe(true);
      expect(result.formatted).toContain('const fn = (a, b) => {');
      expect(result.formatted).toContain('return a + b');
    });

    it('handles syntax errors gracefully', () => {
      const input = 'const x = {';
      const result = formatJavaScript(input);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unexpected end of input');
    });

    it('handles empty input', () => {
      const input = '';
      const result = formatJavaScript(input);
      
      expect(result.success).toBe(true);
      expect(result.formatted).toBe('');
    });

    it('preserves TPN function calls', () => {
      const input = "const val=me.getValue('Sodium')";
      const result = formatJavaScript(input);
      
      expect(result.success).toBe(true);
      expect(result.formatted).toContain("me.getValue('Sodium')");
    });

    it('formats complex expressions with test variables', () => {
      const input = 'const result=me.getValue("Sodium")*testVar1+testVar2';
      const result = formatJavaScript(input);
      
      expect(result.success).toBe(true);
      expect(result.formatted).toContain('const result =');
      expect(result.formatted).toContain('me.getValue("Sodium")');
      expect(result.formatted).toContain('* testVar1 + testVar2');
    });

    it('respects custom configuration', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        semi: true,
        singleQuote: false,
        tabWidth: 4
      }));

      const input = 'const x = {a:1}';
      const result = formatJavaScript(input);
      
      expect(result.success).toBe(true);
      expect(result.formatted).toContain(';'); // Should have semicolon
      expect(result.formatted).toContain('"a"'); // Should use double quotes
    });
  });

  describe('isValidJavaScript', () => {
    it('returns true for valid JavaScript', () => {
      expect(isValidJavaScript('const x = 1')).toBe(true);
      expect(isValidJavaScript('function test() { return 42; }')).toBe(true);
      expect(isValidJavaScript('() => {}')).toBe(true);
    });

    it('returns false for invalid JavaScript', () => {
      expect(isValidJavaScript('const x = {')).toBe(false);
      expect(isValidJavaScript('function (')).toBe(false);
      expect(isValidJavaScript('return without function')).toBe(false);
    });
  });

  describe('loadFormatterConfig', () => {
    it('returns empty object when no config stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const config = loadFormatterConfig();
      expect(config).toEqual({});
    });

    it('returns parsed config from localStorage', () => {
      const storedConfig = { semi: true, tabWidth: 4 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedConfig));
      
      const config = loadFormatterConfig();
      expect(config).toEqual(storedConfig);
    });

    it('handles invalid JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const config = loadFormatterConfig();
      expect(config).toEqual({});
    });
  });

  describe('saveFormatterConfig', () => {
    it('saves config to localStorage', () => {
      const config = { semi: true, singleQuote: false };
      
      saveFormatterConfig(config);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'prettierConfig',
        JSON.stringify(config)
      );
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw
      expect(() => saveFormatterConfig({ test: true })).not.toThrow();
    });
  });

  describe('getDefaultConfig', () => {
    it('returns correct default configuration', () => {
      const defaults = getDefaultConfig();
      
      expect(defaults).toEqual({
        semi: false,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        printWidth: 80,
        bracketSpacing: true,
        arrowParens: 'always'
      });
    });
  });
});