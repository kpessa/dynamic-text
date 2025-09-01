/**
 * KPT Service - Manages KPT function metadata and documentation
 * Provides information about available KPT functions for the reference panel
 */

export interface KPTFunction {
  name: string;
  category: KPTCategory;
  signature: string;
  description: string;
  example: string;
  parameters?: KPTParameter[];
  returns?: string;
}

export interface KPTParameter {
  name: string;
  type: string;
  optional?: boolean;
  default?: any;
  description?: string;
}

export type KPTCategory = 
  | 'text'
  | 'formatting'
  | 'tpn'
  | 'conditional'
  | 'validation'
  | 'html'
  | 'utility'
  | 'math';

export class KPTService {
  private functions: KPTFunction[] = [];
  
  constructor() {
    this.initializeFunctions();
  }
  
  private initializeFunctions(): void {
    this.functions = [
      // Text Formatting Functions
      {
        name: 'redText',
        category: 'text',
        signature: 'redText(text: string | number): string',
        description: 'Format text in red color with bold weight',
        example: 'const alert = me.kpt.redText("Critical Value");',
        parameters: [
          { name: 'text', type: 'string | number', description: 'Text to format' }
        ],
        returns: 'HTML string with red styling'
      },
      {
        name: 'greenText',
        category: 'text',
        signature: 'greenText(text: string | number): string',
        description: 'Format text in green color with bold weight',
        example: 'const success = me.kpt.greenText("Normal Range");'
      },
      {
        name: 'blueText',
        category: 'text',
        signature: 'blueText(text: string | number): string',
        description: 'Format text in blue color with bold weight',
        example: 'const info = me.kpt.blueText("Information");'
      },
      {
        name: 'boldText',
        category: 'text',
        signature: 'boldText(text: string | number): string',
        description: 'Format text in bold',
        example: 'const important = me.kpt.boldText("Important");'
      },
      {
        name: 'italicText',
        category: 'text',
        signature: 'italicText(text: string | number): string',
        description: 'Format text in italics',
        example: 'const emphasis = me.kpt.italicText("Note");'
      },
      {
        name: 'highlightText',
        category: 'text',
        signature: 'highlightText(text: string | number, color?: string): string',
        description: 'Highlight text with background color',
        example: 'const highlighted = me.kpt.highlightText("Important", "#ffff00");'
      },
      
      // Number Formatting Functions
      {
        name: 'roundTo',
        category: 'formatting',
        signature: 'roundTo(num: number, decimals?: number): number',
        description: 'Round number to specified decimal places',
        example: 'const rounded = me.kpt.roundTo(3.14159, 2); // 3.14',
        parameters: [
          { name: 'num', type: 'number', description: 'Number to round' },
          { name: 'decimals', type: 'number', optional: true, default: 2, description: 'Decimal places' }
        ]
      },
      {
        name: 'formatNumber',
        category: 'formatting',
        signature: 'formatNumber(num: number, decimals?: number): string',
        description: 'Format number with specified decimal places, removing trailing zeros',
        example: 'const formatted = me.kpt.formatNumber(123.456, 2); // "123.46"'
      },
      {
        name: 'formatPercent',
        category: 'formatting',
        signature: 'formatPercent(num: number, decimals?: number): string',
        description: 'Format number as percentage',
        example: 'const percent = me.kpt.formatPercent(50.5, 1); // "50.5%"'
      },
      {
        name: 'formatCurrency',
        category: 'formatting',
        signature: 'formatCurrency(num: number, currency?: string): string',
        description: 'Format number as currency',
        example: 'const price = me.kpt.formatCurrency(99.99); // "$99.99"'
      },
      
      // TPN-Specific Functions
      {
        name: 'formatWeight',
        category: 'tpn',
        signature: 'formatWeight(weight: number, unit?: string): string',
        description: 'Format weight value with unit',
        example: 'const weight = me.kpt.formatWeight(70.5); // "70.5 kg"'
      },
      {
        name: 'formatVolume',
        category: 'tpn',
        signature: 'formatVolume(volume: number, unit?: string): string',
        description: 'Format volume value with unit',
        example: 'const volume = me.kpt.formatVolume(1500); // "1500 mL"'
      },
      {
        name: 'formatDose',
        category: 'tpn',
        signature: 'formatDose(dose: number, unit?: string): string',
        description: 'Format dose value with unit',
        example: 'const dose = me.kpt.formatDose(2.5); // "2.5 mg/kg/day"'
      },
      {
        name: 'formatConcentration',
        category: 'tpn',
        signature: 'formatConcentration(concentration: number): string',
        description: 'Format concentration as percentage',
        example: 'const conc = me.kpt.formatConcentration(0.05); // "5%"'
      },
      
      // Conditional Display Functions
      {
        name: 'showIf',
        category: 'conditional',
        signature: 'showIf(condition: boolean, content: string): string',
        description: 'Show content only if condition is true',
        example: 'const text = me.kpt.showIf(value > 10, "High value");'
      },
      {
        name: 'hideIf',
        category: 'conditional',
        signature: 'hideIf(condition: boolean, content: string): string',
        description: 'Hide content if condition is true',
        example: 'const text = me.kpt.hideIf(value < 5, "Low value");'
      },
      {
        name: 'whenAbove',
        category: 'conditional',
        signature: 'whenAbove(value: number, threshold: number, content: string): string',
        description: 'Show content when value is above threshold',
        example: 'const alert = me.kpt.whenAbove(temp, 38, "Fever detected");'
      },
      {
        name: 'whenBelow',
        category: 'conditional',
        signature: 'whenBelow(value: number, threshold: number, content: string): string',
        description: 'Show content when value is below threshold',
        example: 'const alert = me.kpt.whenBelow(glucose, 70, "Low glucose");'
      },
      {
        name: 'whenInRange',
        category: 'conditional',
        signature: 'whenInRange(value: number, min: number, max: number, content: string): string',
        description: 'Show content when value is within range',
        example: 'const status = me.kpt.whenInRange(value, 10, 20, "Normal");'
      },
      
      // Range Validation Functions
      {
        name: 'checkRange',
        category: 'validation',
        signature: 'checkRange(value: number, normal?: [number, number], critical?: [number, number]): string',
        description: 'Check if value is normal, warning, or critical',
        example: 'const status = me.kpt.checkRange(50, [40, 60], [20, 80]);'
      },
      {
        name: 'isNormal',
        category: 'validation',
        signature: 'isNormal(value: number, min: number, max: number): boolean',
        description: 'Check if value is within normal range',
        example: 'const normal = me.kpt.isNormal(value, 40, 60);'
      },
      {
        name: 'isCritical',
        category: 'validation',
        signature: 'isCritical(value: number, criticalMin: number, criticalMax: number): boolean',
        description: 'Check if value is outside critical range',
        example: 'const critical = me.kpt.isCritical(value, 20, 80);'
      },
      
      // HTML Building Functions
      {
        name: 'createTable',
        category: 'html',
        signature: 'createTable(data: Array<Array<string | number>>, headers?: string[]): string',
        description: 'Create HTML table from data array',
        example: 'const table = me.kpt.createTable([["A", 1], ["B", 2]], ["Item", "Value"]);'
      },
      {
        name: 'createList',
        category: 'html',
        signature: 'createList(items: Array<string | number>, ordered?: boolean): string',
        description: 'Create HTML list (ordered or unordered)',
        example: 'const list = me.kpt.createList(["Item 1", "Item 2"]);'
      },
      {
        name: 'createAlert',
        category: 'html',
        signature: 'createAlert(message: string, type?: "info" | "warning" | "error" | "success"): string',
        description: 'Create styled alert box',
        example: 'const alert = me.kpt.createAlert("Warning message", "warning");'
      },
      
      // Utility Functions
      {
        name: 'capitalize',
        category: 'utility',
        signature: 'capitalize(text: string): string',
        description: 'Capitalize first letter of text',
        example: 'const title = me.kpt.capitalize("hello"); // "Hello"'
      },
      {
        name: 'pluralize',
        category: 'utility',
        signature: 'pluralize(count: number, singular: string, plural?: string): string',
        description: 'Return singular or plural form based on count',
        example: 'const text = me.kpt.pluralize(2, "item", "items"); // "items"'
      },
      {
        name: 'abbreviate',
        category: 'utility',
        signature: 'abbreviate(text: string, maxLength: number): string',
        description: 'Abbreviate text to maximum length with ellipsis',
        example: 'const short = me.kpt.abbreviate("Very long text", 10); // "Very lo..."'
      },
      
      // Math Utilities
      {
        name: 'clamp',
        category: 'math',
        signature: 'clamp(value: number, min: number, max: number): number',
        description: 'Clamp value between min and max',
        example: 'const clamped = me.kpt.clamp(15, 0, 10); // 10'
      },
      {
        name: 'percentage',
        category: 'math',
        signature: 'percentage(part: number, total: number): number',
        description: 'Calculate percentage of part in total',
        example: 'const pct = me.kpt.percentage(25, 100); // 25'
      },
      {
        name: 'ratio',
        category: 'math',
        signature: 'ratio(a: number, b: number): string',
        description: 'Calculate simplified ratio',
        example: 'const r = me.kpt.ratio(6, 9); // "2:3"'
      }
    ];
  }
  
  /**
   * Get all KPT functions
   */
  getAllFunctions(): KPTFunction[] {
    return [...this.functions];
  }
  
  /**
   * Get functions by category
   */
  getFunctionsByCategory(category: KPTCategory): KPTFunction[] {
    return this.functions.filter(fn => fn.category === category);
  }
  
  /**
   * Search functions by name or description
   */
  searchFunctions(searchTerm: string): KPTFunction[] {
    const term = searchTerm.toLowerCase();
    return this.functions.filter(fn => 
      fn.name.toLowerCase().includes(term) ||
      fn.description.toLowerCase().includes(term)
    );
  }
  
  /**
   * Get function by name
   */
  getFunction(name: string): KPTFunction | undefined {
    return this.functions.find(fn => fn.name === name);
  }
  
  /**
   * Get all categories
   */
  getCategories(): KPTCategory[] {
    return ['text', 'formatting', 'tpn', 'conditional', 'validation', 'html', 'utility', 'math'];
  }
  
  /**
   * Get category display name
   */
  getCategoryDisplayName(category: KPTCategory): string {
    const displayNames: Record<KPTCategory, string> = {
      text: 'Text Formatting',
      formatting: 'Number Formatting',
      tpn: 'TPN Specific',
      conditional: 'Conditional Display',
      validation: 'Range Validation',
      html: 'HTML Building',
      utility: 'Utilities',
      math: 'Math Utilities'
    };
    return displayNames[category] || category;
  }
  
  /**
   * Generate function example code
   */
  generateExample(functionName: string, customValues?: Record<string, any>): string {
    const fn = this.getFunction(functionName);
    if (!fn) return '';
    
    // If custom values provided, generate custom example
    if (customValues) {
      const args = Object.values(customValues).map(v => 
        typeof v === 'string' ? `"${v}"` : v
      ).join(', ');
      return `const result = me.kpt.${functionName}(${args});`;
    }
    
    // Return default example
    return fn.example;
  }
  
  /**
   * Validate if a function exists
   */
  functionExists(name: string): boolean {
    return this.functions.some(fn => fn.name === name);
  }
  
  /**
   * Get function count by category
   */
  getCategoryCounts(): Record<KPTCategory, number> {
    const counts: Partial<Record<KPTCategory, number>> = {};
    
    this.functions.forEach(fn => {
      counts[fn.category] = (counts[fn.category] || 0) + 1;
    });
    
    return counts as Record<KPTCategory, number>;
  }
}

// Export singleton instance
export const kptService = new KPTService();