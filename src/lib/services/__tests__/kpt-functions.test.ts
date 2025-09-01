import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createKPTNamespace, type KPTNamespace } from '../../kptNamespace';

describe('KPT Functions', () => {
  let kpt: KPTNamespace;
  let mockMeContext: any;

  beforeEach(() => {
    mockMeContext = {
      getValue: vi.fn((key: string) => {
        const values: Record<string, number> = {
          DoseWeightKG: 70,
          Age: 45,
          TotalVolume: 2000,
          Protein: 80,
          Calories: 2000
        };
        return values[key] || 0;
      })
    };
    
    kpt = createKPTNamespace(mockMeContext);
  });

  describe('KPT Namespace Availability', () => {
    it('should create KPT namespace with all expected functions', () => {
      expect(kpt).toBeDefined();
      expect(typeof kpt).toBe('object');
    });

    it('should expose text formatting functions', () => {
      expect(kpt.redText).toBeDefined();
      expect(kpt.greenText).toBeDefined();
      expect(kpt.blueText).toBeDefined();
      expect(kpt.boldText).toBeDefined();
      expect(kpt.italicText).toBeDefined();
      expect(kpt.highlightText).toBeDefined();
    });

    it('should expose number formatting functions', () => {
      expect(kpt.roundTo).toBeDefined();
      expect(kpt.formatNumber).toBeDefined();
      expect(kpt.formatPercent).toBeDefined();
      expect(kpt.formatCurrency).toBeDefined();
    });

    it('should expose TPN-specific formatting functions', () => {
      expect(kpt.formatWeight).toBeDefined();
      expect(kpt.formatVolume).toBeDefined();
      expect(kpt.formatDose).toBeDefined();
      expect(kpt.formatConcentration).toBeDefined();
    });

    it('should expose conditional display functions', () => {
      expect(kpt.showIf).toBeDefined();
      expect(kpt.hideIf).toBeDefined();
      expect(kpt.whenAbove).toBeDefined();
      expect(kpt.whenBelow).toBeDefined();
      expect(kpt.whenInRange).toBeDefined();
    });

    it('should expose range checking functions', () => {
      expect(kpt.checkRange).toBeDefined();
      expect(kpt.isNormal).toBeDefined();
      expect(kpt.isCritical).toBeDefined();
    });

    it('should expose HTML building functions', () => {
      expect(kpt.createTable).toBeDefined();
      expect(kpt.createList).toBeDefined();
      expect(kpt.createAlert).toBeDefined();
    });

    it('should expose utility functions', () => {
      expect(kpt.capitalize).toBeDefined();
      expect(kpt.pluralize).toBeDefined();
      expect(kpt.abbreviate).toBeDefined();
    });

    it('should expose math utilities', () => {
      expect(kpt.clamp).toBeDefined();
      expect(kpt.percentage).toBeDefined();
      expect(kpt.ratio).toBeDefined();
    });

    it('should provide convenience aliases from context', () => {
      expect(typeof kpt.weight).toBe('number');
      expect(typeof kpt.age).toBe('number');
      expect(typeof kpt.volume).toBe('number');
      expect(typeof kpt.protein).toBe('number');
      expect(typeof kpt.calories).toBe('number');
    });
  });

  describe('Text Formatting Functions', () => {
    it('should format red text correctly', () => {
      const result = kpt.redText('Alert');
      expect(result).toBe('<span style="color: red; font-weight: bold;">Alert</span>');
    });

    it('should format green text correctly', () => {
      const result = kpt.greenText('Success');
      expect(result).toBe('<span style="color: green; font-weight: bold;">Success</span>');
    });

    it('should format blue text correctly', () => {
      const result = kpt.blueText('Info');
      expect(result).toBe('<span style="color: blue; font-weight: bold;">Info</span>');
    });

    it('should format bold text correctly', () => {
      const result = kpt.boldText('Important');
      expect(result).toBe('<strong>Important</strong>');
    });

    it('should format italic text correctly', () => {
      const result = kpt.italicText('Emphasis');
      expect(result).toBe('<em>Emphasis</em>');
    });

    it('should highlight text with default color', () => {
      const result = kpt.highlightText('Highlighted');
      expect(result).toContain('background-color: #ffff00');
      expect(result).toContain('Highlighted');
    });

    it('should highlight text with custom color', () => {
      const result = kpt.highlightText('Custom', '#ff0000');
      expect(result).toContain('background-color: #ff0000');
    });
  });

  describe('Number Formatting Functions', () => {
    it('should round to specified decimals', () => {
      expect(kpt.roundTo(3.14159, 2)).toBe(3.14);
      expect(kpt.roundTo(3.14159, 3)).toBe(3.142);
      expect(kpt.roundTo(3.14159, 0)).toBe(3);
    });

    it('should format numbers correctly', () => {
      expect(kpt.formatNumber(3.14159, 2)).toBe('3.14');
      expect(kpt.formatNumber(10.00, 2)).toBe('10');
      expect(kpt.formatNumber(10.50, 2)).toBe('10.5');
    });

    it('should format percentages correctly', () => {
      expect(kpt.formatPercent(50.5, 1)).toBe('50.5%');
      expect(kpt.formatPercent(100, 0)).toBe('100%');
    });

    it('should format currency correctly', () => {
      expect(kpt.formatCurrency(100.50)).toBe('$100.5');
      expect(kpt.formatCurrency(100.50, '€')).toBe('€100.5');
    });
  });

  describe('TPN-Specific Formatting', () => {
    it('should format weight correctly', () => {
      expect(kpt.formatWeight(70.5)).toBe('70.5 kg');
      expect(kpt.formatWeight(155, 'lbs')).toBe('155 lbs');
    });

    it('should format volume correctly', () => {
      expect(kpt.formatVolume(1500)).toBe('1500 mL');
      expect(kpt.formatVolume(1.5, 'L')).toBe('2 L');
    });

    it('should format dose correctly', () => {
      expect(kpt.formatDose(2.5)).toBe('2.5 mg/kg/day');
      expect(kpt.formatDose(100, 'mg/day')).toBe('100 mg/day');
    });

    it('should format concentration correctly', () => {
      expect(kpt.formatConcentration(0.05)).toBe('5%');
      expect(kpt.formatConcentration(0.125)).toBe('12.5%');
    });
  });

  describe('Conditional Display Functions', () => {
    it('should show content when condition is true', () => {
      expect(kpt.showIf(true, 'Visible')).toBe('Visible');
      expect(kpt.showIf(false, 'Hidden')).toBe('');
    });

    it('should hide content when condition is true', () => {
      expect(kpt.hideIf(true, 'Hidden')).toBe('');
      expect(kpt.hideIf(false, 'Visible')).toBe('Visible');
    });

    it('should show content when value is above threshold', () => {
      expect(kpt.whenAbove(10, 5, 'High')).toBe('High');
      expect(kpt.whenAbove(3, 5, 'Low')).toBe('');
    });

    it('should show content when value is below threshold', () => {
      expect(kpt.whenBelow(3, 5, 'Low')).toBe('Low');
      expect(kpt.whenBelow(10, 5, 'High')).toBe('');
    });

    it('should show content when value is in range', () => {
      expect(kpt.whenInRange(5, 1, 10, 'In range')).toBe('In range');
      expect(kpt.whenInRange(15, 1, 10, 'Out of range')).toBe('');
    });
  });

  describe('Range Checking Functions', () => {
    it('should check range and return appropriate status', () => {
      const normal = kpt.checkRange(50, [40, 60], [20, 80]);
      expect(normal).toContain('NORMAL');
      expect(normal).toContain('green');

      const warning = kpt.checkRange(35, [40, 60], [20, 80]);
      expect(warning).toContain('WARNING');
      expect(warning).toContain('orange');

      const critical = kpt.checkRange(10, [40, 60], [20, 80]);
      expect(critical).toContain('CRITICAL');
      expect(critical).toContain('red');
    });

    it('should check if value is normal', () => {
      expect(kpt.isNormal(50, 40, 60)).toBe(true);
      expect(kpt.isNormal(30, 40, 60)).toBe(false);
    });

    it('should check if value is critical', () => {
      expect(kpt.isCritical(10, 20, 80)).toBe(true);
      expect(kpt.isCritical(90, 20, 80)).toBe(true);
      expect(kpt.isCritical(50, 20, 80)).toBe(false);
    });
  });

  describe('HTML Building Functions', () => {
    it('should create HTML table', () => {
      const data = [
        ['A', 1],
        ['B', 2]
      ];
      const headers = ['Letter', 'Number'];
      const table = kpt.createTable(data, headers);
      
      expect(table).toContain('<table');
      expect(table).toContain('<thead>');
      expect(table).toContain('Letter');
      expect(table).toContain('Number');
      expect(table).toContain('<td');
      expect(table).toContain('A');
      expect(table).toContain('B');
    });

    it('should create unordered list', () => {
      const list = kpt.createList(['Item 1', 'Item 2']);
      expect(list).toContain('<ul>');
      expect(list).toContain('<li>Item 1</li>');
      expect(list).toContain('<li>Item 2</li>');
    });

    it('should create ordered list', () => {
      const list = kpt.createList(['First', 'Second'], true);
      expect(list).toContain('<ol>');
      expect(list).toContain('<li>First</li>');
    });

    it('should create alerts with different types', () => {
      const info = kpt.createAlert('Info message', 'info');
      expect(info).toContain('background-color: #d1ecf1');
      
      const warning = kpt.createAlert('Warning message', 'warning');
      expect(warning).toContain('background-color: #fff3cd');
      
      const error = kpt.createAlert('Error message', 'error');
      expect(error).toContain('background-color: #f8d7da');
      
      const success = kpt.createAlert('Success message', 'success');
      expect(success).toContain('background-color: #d4edda');
    });
  });

  describe('Utility Functions', () => {
    it('should capitalize text correctly', () => {
      expect(kpt.capitalize('hello')).toBe('Hello');
      expect(kpt.capitalize('WORLD')).toBe('World');
    });

    it('should pluralize correctly', () => {
      expect(kpt.pluralize(1, 'item')).toBe('item');
      expect(kpt.pluralize(2, 'item')).toBe('items');
      expect(kpt.pluralize(2, 'child', 'children')).toBe('children');
    });

    it('should abbreviate text correctly', () => {
      expect(kpt.abbreviate('Short', 10)).toBe('Short');
      expect(kpt.abbreviate('Very long text', 10)).toBe('Very lo...');
    });
  });

  describe('Math Utilities', () => {
    it('should clamp values correctly', () => {
      expect(kpt.clamp(5, 1, 10)).toBe(5);
      expect(kpt.clamp(0, 1, 10)).toBe(1);
      expect(kpt.clamp(15, 1, 10)).toBe(10);
    });

    it('should calculate percentage correctly', () => {
      expect(kpt.percentage(50, 100)).toBe(50);
      expect(kpt.percentage(25, 200)).toBe(12.5);
      expect(kpt.percentage(10, 0)).toBe(0);
    });

    it('should calculate ratio correctly', () => {
      expect(kpt.ratio(4, 2)).toBe('2:1');
      expect(kpt.ratio(6, 9)).toBe('2:3');
      expect(kpt.ratio(10, 10)).toBe('1:1');
    });
  });

  describe('Context Integration', () => {
    it('should pull values from me context', () => {
      expect(kpt.weight).toBe(70);
      expect(kpt.age).toBe(45);
      expect(kpt.volume).toBe(2000);
      expect(kpt.protein).toBe(80);
      expect(kpt.calories).toBe(2000);
      
      expect(mockMeContext.getValue).toHaveBeenCalledWith('DoseWeightKG');
      expect(mockMeContext.getValue).toHaveBeenCalledWith('Age');
    });

    it('should handle missing context gracefully', () => {
      const kptNoContext = createKPTNamespace();
      expect(kptNoContext.weight).toBe(0);
      expect(kptNoContext.age).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid number inputs', () => {
      expect(kpt.formatNumber(NaN)).toBe('NaN');
      expect(kpt.roundTo(NaN)).toBeNaN();
    });

    it('should handle empty strings', () => {
      expect(kpt.capitalize('')).toBe('');
      expect(kpt.abbreviate('', 5)).toBe('');
    });

    it('should handle edge case ranges', () => {
      expect(kpt.isNormal(50, 50, 50)).toBe(true);
      expect(kpt.isCritical(50, 50, 50)).toBe(false);
    });
  });
});