/**
 * KPT Namespace - Utility Functions for Dynamic Text
 * Provides commonly used functions that can be destructured in dynamic text sections
 * Usage: let { redText, formatNumber, weight } = kpt;
 */

// Types for better TypeScript support
export type KPTNamespace = {
  // Text formatting functions
  redText: (text: string | number) => string;
  greenText: (text: string | number) => string;
  blueText: (text: string | number) => string;
  boldText: (text: string | number) => string;
  italicText: (text: string | number) => string;
  highlightText: (text: string | number, color?: string) => string;
  
  // Number formatting functions
  roundTo: (num: number, decimals?: number) => number;
  formatNumber: (num: number, decimals?: number) => string;
  formatPercent: (num: number, decimals?: number) => string;
  formatCurrency: (num: number, currency?: string) => string;
  
  // TPN-specific formatting
  formatWeight: (weight: number, unit?: string) => string;
  formatVolume: (volume: number, unit?: string) => string;
  formatDose: (dose: number, unit?: string) => string;
  formatConcentration: (concentration: number) => string;
  
  // Conditional display functions
  showIf: (condition: boolean, content: string) => string;
  hideIf: (condition: boolean, content: string) => string;
  whenAbove: (value: number, threshold: number, content: string) => string;
  whenBelow: (value: number, threshold: number, content: string) => string;
  whenInRange: (value: number, min: number, max: number, content: string) => string;
  
  // Range checking functions
  checkRange: (value: number, normal?: [number, number], critical?: [number, number]) => string;
  isNormal: (value: number, min: number, max: number) => boolean;
  isCritical: (value: number, criticalMin: number, criticalMax: number) => boolean;
  
  // HTML building functions
  createTable: (data: Array<Array<string | number>>, headers?: string[]) => string;
  createList: (items: Array<string | number>, ordered?: boolean) => string;
  createAlert: (message: string, type?: 'info' | 'warning' | 'error' | 'success') => string;
  
  // Utility functions
  capitalize: (text: string) => string;
  pluralize: (count: number, singular: string, plural?: string) => string;
  abbreviate: (text: string, maxLength: number) => string;
  
  // Math utilities
  clamp: (value: number, min: number, max: number) => number;
  percentage: (part: number, total: number) => number;
  ratio: (a: number, b: number) => string;
  
  // Convenience aliases for common values (these will be populated dynamically)
  weight: number;
  age: number;
  volume: number;
  protein: number;
  calories: number;
};

/**
 * Create the KPT namespace with all utility functions
 */
export function createKPTNamespace(meContext?: any): KPTNamespace {
  // Text formatting functions
  const redText = (text: string | number): string => 
    `<span style="color: red; font-weight: bold;">${text}</span>`;
    
  const greenText = (text: string | number): string => 
    `<span style="color: green; font-weight: bold;">${text}</span>`;
    
  const blueText = (text: string | number): string => 
    `<span style="color: blue; font-weight: bold;">${text}</span>`;
    
  const boldText = (text: string | number): string => 
    `<strong>${text}</strong>`;
    
  const italicText = (text: string | number): string => 
    `<em>${text}</em>`;
    
  const highlightText = (text: string | number, color: string = '#ffff00'): string => 
    `<span style="background-color: ${color}; padding: 2px 4px; border-radius: 2px;">${text}</span>`;

  // Number formatting functions
  const roundTo = (num: number, decimals: number = 2): number => {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  };
  
  const formatNumber = (num: number, decimals: number = 2): string => {
    if (typeof num !== 'number' || isNaN(num)) return String(num);
    return num.toFixed(decimals).replace(/\.?0+$/, '').replace(/\.$/, '');
  };
  
  const formatPercent = (num: number, decimals: number = 1): string => {
    return formatNumber(num, decimals) + '%';
  };
  
  const formatCurrency = (num: number, currency: string = '$'): string => {
    return currency + formatNumber(num, 2);
  };

  // TPN-specific formatting
  const formatWeight = (weight: number, unit: string = 'kg'): string => {
    return `${formatNumber(weight, 1)} ${unit}`;
  };
  
  const formatVolume = (volume: number, unit: string = 'mL'): string => {
    return `${formatNumber(volume, 0)} ${unit}`;
  };
  
  const formatDose = (dose: number, unit: string = 'mg/kg/day'): string => {
    return `${formatNumber(dose, 2)} ${unit}`;
  };
  
  const formatConcentration = (concentration: number): string => {
    return `${formatNumber(concentration * 100, 1)}%`;
  };

  // Conditional display functions
  const showIf = (condition: boolean, content: string): string => {
    return condition ? content : '';
  };
  
  const hideIf = (condition: boolean, content: string): string => {
    return !condition ? content : '';
  };
  
  const whenAbove = (value: number, threshold: number, content: string): string => {
    return value > threshold ? content : '';
  };
  
  const whenBelow = (value: number, threshold: number, content: string): string => {
    return value < threshold ? content : '';
  };
  
  const whenInRange = (value: number, min: number, max: number, content: string): string => {
    return value >= min && value <= max ? content : '';
  };

  // Range checking functions
  const checkRange = (
    value: number, 
    normal: [number, number] = [0, 100], 
    critical: [number, number] = [0, 200]
  ): string => {
    if (value < critical[0] || value > critical[1]) {
      return redText('CRITICAL');
    } else if (value < normal[0] || value > normal[1]) {
      return `<span style="color: orange; font-weight: bold;">WARNING</span>`;
    }
    return greenText('NORMAL');
  };
  
  const isNormal = (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  };
  
  const isCritical = (value: number, criticalMin: number, criticalMax: number): boolean => {
    return value < criticalMin || value > criticalMax;
  };

  // HTML building functions
  const createTable = (data: Array<Array<string | number>>, headers?: string[]): string => {
    let html = '<table border="1" style="border-collapse: collapse; margin: 10px 0;">';
    
    if (headers) {
      html += '<thead><tr>';
      headers.forEach(header => {
        html += `<th style="padding: 8px; background-color: #f5f5f5; font-weight: bold;">${header}</th>`;
      });
      html += '</tr></thead>';
    }
    
    html += '<tbody>';
    data.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    
    return html;
  };
  
  const createList = (items: Array<string | number>, ordered: boolean = false): string => {
    const tag = ordered ? 'ol' : 'ul';
    let html = `<${tag}>`;
    items.forEach(item => {
      html += `<li>${item}</li>`;
    });
    html += `</${tag}>`;
    return html;
  };
  
  const createAlert = (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): string => {
    const colors = {
      info: '#d1ecf1',
      warning: '#fff3cd',
      error: '#f8d7da',
      success: '#d4edda'
    };
    
    const borderColors = {
      info: '#bee5eb',
      warning: '#ffeeba',
      error: '#f5c6cb',
      success: '#c3e6cb'
    };
    
    return `<div style="padding: 12px; margin: 10px 0; border: 1px solid ${borderColors[type]}; border-radius: 4px; background-color: ${colors[type]};">${message}</div>`;
  };

  // Utility functions
  const capitalize = (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };
  
  const pluralize = (count: number, singular: string, plural?: string): string => {
    if (count === 1) return singular;
    return plural || singular + 's';
  };
  
  const abbreviate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  };

  // Math utilities
  const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  };
  
  const percentage = (part: number, total: number): number => {
    if (total === 0) return 0;
    return (part / total) * 100;
  };
  
  const ratio = (a: number, b: number): string => {
    const gcd = (x: number, y: number): number => y === 0 ? x : gcd(y, x % y);
    const divisor = gcd(a, b);
    return `${a / divisor}:${b / divisor}`;
  };

  // Convenience aliases for common values (populated from meContext)
  const getContextValue = (key: string): number => {
    if (meContext && typeof meContext.getValue === 'function') {
      return meContext.getValue(key) || 0;
    }
    return 0;
  };

  const weight = getContextValue('DoseWeightKG');
  const age = getContextValue('Age');
  const volume = getContextValue('TotalVolume');
  const protein = getContextValue('Protein');
  const calories = getContextValue('Calories');

  // Return the complete namespace
  return {
    // Text formatting
    redText,
    greenText,
    blueText,
    boldText,
    italicText,
    highlightText,
    
    // Number formatting
    roundTo,
    formatNumber,
    formatPercent,
    formatCurrency,
    
    // TPN-specific formatting
    formatWeight,
    formatVolume,
    formatDose,
    formatConcentration,
    
    // Conditional display
    showIf,
    hideIf,
    whenAbove,
    whenBelow,
    whenInRange,
    
    // Range checking
    checkRange,
    isNormal,
    isCritical,
    
    // HTML building
    createTable,
    createList,
    createAlert,
    
    // Utility functions
    capitalize,
    pluralize,
    abbreviate,
    
    // Math utilities
    clamp,
    percentage,
    ratio,
    
    // Convenience aliases
    weight,
    age,
    volume,
    protein,
    calories
  };
}