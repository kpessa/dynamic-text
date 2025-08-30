import DOMPurify from 'dompurify';
import type { Section, DynamicSection } from '../types';

export interface PreviewEngineOptions {
  tpnMode: boolean;
  currentTPNInstance?: any;
  currentIngredientValues?: Record<string, any>;
  activeTestCase?: Record<number, any>;
}

export class PreviewEngineService {
  private sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'div', 'span', 
                     'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
                     'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'u',
                     'font', 'center', 'strike', 'sup', 'sub', 'small'],
      ALLOWED_ATTR: ['href', 'style', 'color', 'size', 'align', 'colspan', 'rowspan']
    });
  }

  private createMockMe(variables: Record<string, any> = {}, options: PreviewEngineOptions) {
    if (options.tpnMode && options.currentTPNInstance) {
      return options.currentTPNInstance;
    }
    
    // Merge test case variables with ingredient panel values
    const allValues = { ...options.currentIngredientValues, ...variables };
    
    // Enhanced mock object with full TPN API
    const mockMe = {
      getValue: (key: string) => allValues[key] !== undefined ? allValues[key] : 0,
      
      maxP: (value: any, precision = 2) => {
        if (typeof value !== 'number') return String(value);
        let rv = value.toFixed(precision);
        if (rv.includes('.')) {
          rv = rv.replace(/\.?0+$/, '').replace(/\.$/, '');
        }
        return rv;
      },
      
      getObject: (selector: string) => new LegacyElementWrapper(selector, allValues),
      
      pref: (key: string, defaultValue?: any) => {
        const prefs: Record<string, any> = {
          'ADVISOR_TITLE': 'TPN Advisor',
          'CENTER_NAME': 'Medical Center',
          'GLUCOSE_CONVERSION': 5.551,
          'UNIT_AMT_PER_KG_DAY': 'amount/kg/day',
          'UNIT_MOLAR': 'mmol/L',
          'UNIT_MEQ': 'mEq',
          'UNIT_WEIGHT': 'kg'
        };
        return prefs[key] !== undefined ? prefs[key] : (defaultValue || '');
      },
      
      calc: (key: string) => allValues[key] || 0,
      
      kgToLb: (kg: number) => kg * 2.20462,
      lbToKg: (lb: number) => lb / 2.20462,
      
      iss_true: (value: any) => !!value,
      iss_false: (value: any) => !value,
      
      minmaxP: (value: number, min: number, max: number, precision = 2) => {
        const clamped = Math.max(min, Math.min(max, value));
        return mockMe.maxP(clamped, precision);
      }
    };
    
    return mockMe;
  }

  public evaluateCode(code: string, testVariables: Record<string, any> | null, options: PreviewEngineOptions): string {
    try {
      // No need to transpile - Edge supports modern JavaScript
      const me = this.createMockMe(testVariables || {}, options);
      
      const func = new Function('me', code);
      const result = func(me);
      
      return result !== undefined ? String(result) : '';
    } catch (error: any) {
      return `<span style="color: red;">Error: ${error.message}</span>`;
    }
  }

  public generatePreviewHTML(sections: Section[], options: PreviewEngineOptions): string {
    return sections.map(section => {
      if (section.type === 'static') {
        return this.sanitizeHTML(section.content.replace(/\n/g, '<br>'));
      } else if (section.type === 'dynamic') {
        const testCase = options.activeTestCase?.[section.id];
        const evaluated = this.evaluateCode(section.content, testCase?.variables || null, options);
        const evalString = evaluated || '';
        return this.sanitizeHTML(evalString.replace(/\n/g, '<br>'));
      }
      return '';
    }).join('<br>');
  }

  public sectionsToJSON(sections: Section[]): any[] {
    const result: any[] = [];
    
    sections.forEach(section => {
      if (section.type === 'static') {
        const lines = section.content.split('\n');
        lines.forEach(line => {
          result.push({ TEXT: line });
        });
      } else if (section.type === 'dynamic') {
        result.push({ TEXT: '[f(' });
        // No transpilation needed - Edge supports ES6+
        const lines = section.content.split('\n');
        lines.forEach(line => {
          result.push({ TEXT: line });
        });
        result.push({ TEXT: ')]' });
      }
    });
    
    return result;
  }

  public sectionsToLineObjects(sections: Section[]): any[] {
    const objects: any[] = [];
    let lineId = 1;
    
    sections.forEach(section => {
      if (section.type === 'static') {
        const lines = section.content.split('\n');
        lines.forEach(line => {
          objects.push({
            id: lineId++,
            type: 'static',
            content: line
          });
        });
      } else if (section.type === 'dynamic') {
        objects.push({
          id: lineId++,
          type: 'dynamic_start',
          content: '[f('
        });
        
        // No transpilation needed - Edge supports ES6+
        const lines = section.content.split('\n');
        lines.forEach(line => {
          objects.push({
            id: lineId++,
            type: 'dynamic_code',
            content: line
          });
        });
        
        objects.push({
          id: lineId++,
          type: 'dynamic_end',
          content: ')]'
        });
      }
    });
    
    return objects;
  }
}

// Legacy Element Wrapper for jQuery-like API
class LegacyElementWrapper {
  constructor(private selector: string, private values: Record<string, any>) {}
  
  val(): any {
    return this.values[this.selector] || '';
  }
  
  text(): string {
    return String(this.val());
  }
  
  html(): string {
    return this.text();
  }
}

// Export singleton instance
export const previewEngineService = new PreviewEngineService();