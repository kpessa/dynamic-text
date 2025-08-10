import * as Babel from '@babel/standalone';
import DOMPurify from 'dompurify';
import type { Section } from '../../types/section.js';
import { tpnStore } from '../../stores/tpnStore.svelte.ts';

// Service for section-related operations and transformations
export class SectionService {
  
  // HTML sanitization
  sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['style']
    });
  }

  // Code transpilation
  transpileCode(code: string): string {
    try {
      const result = Babel.transform(code, {
        presets: ['env'],
        plugins: [
          ['transform-runtime', { regenerator: false }]
        ]
      });
      return result.code || code;
    } catch (error) {
      console.warn('Babel transpilation failed, using original code:', error);
      return code;
    }
  }

  // Code evaluation with TPN context and KPT namespace
  evaluateCode(
    code: string, 
    testVariables: Record<string, any> | null = null
  ): { result: any; actualHTML?: string; actualStyles?: any } {
    try {
      const transpiledCode = this.transpileCode(code);
      const context = tpnStore.createEvaluationContext(testVariables || {});
      
      // Create evaluation function with both me and kpt in scope
      const evalFunction = new Function('me', 'kpt', `
        try {
          ${transpiledCode}
        } catch (e) {
          return 'Error: ' + e.message;
        }
      `);
      
      const result = evalFunction(context.me, context.kpt);
      
      // If result is HTML-like, parse styles
      if (typeof result === 'string' && result.includes('<')) {
        const styles = this.extractStylesFromHTML(result);
        return {
          result,
          actualHTML: result,
          actualStyles: styles
        };
      }
      
      return { result };
    } catch (error) {
      return { 
        result: `Error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  // Extract styles from HTML string
  extractStylesFromHTML(htmlString: string): Record<string, any> {
    try {
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlString;
      
      const styles: Record<string, any> = {};
      
      // Extract computed styles from elements
      const elements = tempDiv.querySelectorAll('*');
      elements.forEach((element, index) => {
        const computedStyle = window.getComputedStyle(element as Element);
        styles[`element_${index}`] = {
          color: computedStyle.color,
          fontSize: computedStyle.fontSize,
          fontWeight: computedStyle.fontWeight,
          backgroundColor: computedStyle.backgroundColor,
          // Add more properties as needed
        };
      });
      
      return styles;
    } catch (error) {
      console.warn('Error extracting styles:', error);
      return {};
    }
  }

  // Strip HTML tags from string
  stripHTML(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  // Convert sections to JSON format
  sectionsToJSON(sections: Section[]): string {
    const jsonData = {
      version: '1.0',
      sections: sections.map(section => ({
        id: section.id,
        type: section.type,
        name: section.name,
        content: section.content,
        testCases: section.testCases
      }))
    };
    
    return JSON.stringify(jsonData, null, 2);
  }

  // Convert sections to line objects format
  sectionsToLineObjects(sections: Section[]): any[] {
    return sections.map(section => {
      if (section.type === 'static') {
        return {
          type: 'text',
          content: this.stripHTML(section.content)
        };
      } else {
        return {
          type: 'dynamic',
          name: section.name,
          code: section.content,
          testCases: section.testCases
        };
      }
    });
  }

  // Generate preview HTML from sections
  generatePreviewHTML(
    sections: Section[], 
    activeTestCases: Record<number, any>
  ): string {
    let html = '';
    
    sections.forEach(section => {
      if (section.type === 'static') {
        html += this.sanitizeHTML(section.content);
      } else {
        try {
          const testCase = activeTestCases[section.id];
          const evaluation = this.evaluateCode(section.content, testCase?.variables);
          
          if (typeof evaluation.result === 'string' && evaluation.result.includes('<')) {
            html += this.sanitizeHTML(evaluation.result);
          } else {
            html += `<div class="dynamic-output">${this.sanitizeHTML(String(evaluation.result))}</div>`;
          }
        } catch (error) {
          html += `<div class="error">Error: ${error instanceof Error ? error.message : String(error)}</div>`;
        }
      }
    });
    
    return html;
  }

  // Convert static section to dynamic
  convertStaticToDynamic(content: string): string {
    // Extract text content and create a simple return statement
    const textContent = this.stripHTML(content);
    return `// Converted from static HTML\nreturn \`${content}\`;`;
  }

  // Validate section content
  validateSection(section: Section): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!section.name?.trim()) {
      errors.push('Section name is required');
    }
    
    if (!section.content?.trim()) {
      errors.push('Section content is required');
    }
    
    if (section.type === 'dynamic') {
      // Try to transpile the code to check for syntax errors
      try {
        this.transpileCode(section.content);
      } catch (error) {
        errors.push(`JavaScript syntax error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create and export service instance
export const sectionService = new SectionService();