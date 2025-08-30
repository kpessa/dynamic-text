<script lang="ts">
  import * as Babel from '@babel/standalone';
  import DOMPurify from 'dompurify';
  import { LegacyElementWrapper } from '../tpnLegacy.js';
  import type { Section } from '../types';
  
  interface Props {
    sections: Section[];
    activeTestCase?: Record<number, any>;
    tpnMode?: boolean;
    currentTPNInstance?: any;
    currentIngredientValues?: Record<string, any>;
    showOutput?: boolean;
    outputMode?: 'json' | 'configurator';
    previewMode?: 'preview' | 'output';
  }
  
  let {
    sections = [],
    activeTestCase = {},
    tpnMode = false,
    currentTPNInstance = null,
    currentIngredientValues = {},
    showOutput = false,
    outputMode = 'json',
    previewMode = 'preview'
  }: Props = $props();
  
  // Sanitize HTML to prevent XSS
  export function sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'em', 'u', 'i', 'b', 
                     'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'code', 'pre', 'blockquote', 'table', 
                     'thead', 'tbody', 'tr', 'th', 'td', 'style'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'id', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  }
  
  // Create mock 'me' object for test cases
  export function createMockMe(variables: Record<string, any> = {}): any {
    if (tpnMode && currentTPNInstance) {
      // In TPN mode, return the actual TPN instance
      return currentTPNInstance;
    }
    
    // Merge test case variables with ingredient panel values
    const allValues = { ...currentIngredientValues, ...variables };
    
    // Enhanced mock object with full TPN API
    const mockMe = {
      // Core value methods
      getValue: (key: string) => allValues[key] !== undefined ? allValues[key] : 0,
      
      // Number formatting
      maxP: (value: any, precision = 2) => {
        if (typeof value !== 'number') return String(value);
        let rv = value.toFixed(precision);
        if (rv.includes('.')) {
          rv = rv.replace(/\.?0+$/, '').replace(/\.$/, '');
        }
        return rv;
      },
      
      // Element wrapper for jQuery-like API
      getObject: (selector: string) => new LegacyElementWrapper(selector, allValues),
      
      // Preferences with defaults
      pref: (key: string, defaultValue?: any) => {
        const prefs: Record<string, string> = {
          'ADVISOR_TITLE': 'TPN Advisor',
          'WEIGHT_REQUIRED_TEXT': 'Dose Weight is required',
          'VOLUME_REQUIRED_TEXT': 'TPN Volume is required',
          'PRECISION_MINVOL_DISPLAY': '2',
          'PRECISION_MINVOL_BREAKDOWN': '2'
        };
        return prefs[key] || defaultValue;
      },
      
      // Stub methods for compatibility
      EtoS: () => {}, // Electrolyte to Salt conversion
      draw: () => {}, // Trigger recalculation
      renderComplete: true,
      EditMode: 'Compound',
      id: 'mock_' + Math.random().toString(36).substr(2, 9)
    };
    
    return mockMe;
  }
  
  // Transpile modern JS to ES5 using Babel
  export function transpileCode(code: string): string {
    try {
      // Wrap the code in a function to handle return statements
      const wrappedCode = `(function() { ${code} })`;
      
      const result = Babel.transform(wrappedCode, {
        presets: ['env'],
        plugins: []
      });
      
      // Extract the function body (remove the wrapper)
      const transpiledCode = result.code;
      const match = transpiledCode.match(/\(function\s*\(\)\s*{\s*([\s\S]*)\s*}\)/);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      return result.code;
    } catch (error) {
      console.error('Transpilation error:', error);
      return code; // Return original if transpilation fails
    }
  }
  
  // Evaluate dynamic code with optional test variables
  export function evaluateCode(code: string, testVariables: Record<string, any> | null = null): string {
    try {
      const transpiledCode = transpileCode(code);
      
      // Always create the me object for consistent API
      const me = createMockMe(testVariables);
      
      // Create function with 'me' in scope
      const func = new Function('me', transpiledCode);
      const result = func(me);
      
      return result !== undefined ? String(result) : '';
    } catch (error) {
      console.error('Evaluation error:', error);
      return `<div style="color: red;">Error: ${error.message}</div>`;
    }
  }
  
  // Extract inline styles from HTML string
  export function extractStylesFromHTML(htmlString: string): Record<string, string> {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    const styles: Record<string, string> = {};
    
    // Find all elements with inline styles
    const elementsWithStyles = tempDiv.querySelectorAll('[style]');
    elementsWithStyles.forEach(element => {
      const styleAttr = element.getAttribute('style');
      if (styleAttr) {
        // Parse style attribute
        styleAttr.split(';').forEach(rule => {
          const [prop, value] = rule.split(':').map(s => s.trim());
          if (prop && value) {
            styles[prop] = value;
          }
        });
      }
    });
    
    return styles;
  }
  
  // Remove HTML tags to get plain text
  export function stripHTML(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  
  // Generate preview for a section
  function generateSectionPreview(section: Section): string {
    if (section.type === 'static') {
      return sanitizeHTML(section.content);
    } else if (section.type === 'dynamic') {
      const testCase = activeTestCase[section.id];
      const variables = testCase?.variables || {};
      return evaluateCode(section.content, variables);
    }
    return '';
  }
  
  // Combined preview of all sections
  let combinedPreview = $derived.by(() => {
    if (previewMode !== 'preview' || showOutput) return '';
    
    return sections
      .map(section => generateSectionPreview(section))
      .filter(content => content.trim() !== '')
      .join('\n');
  });
  
  // JSON output for export
  let jsonOutput = $derived.by(() => {
    if (outputMode !== 'json') return null;
    
    return sections.map(section => {
      if (section.type === 'static') {
        return {
          type: 'static',
          content: section.content
        };
      } else {
        // For dynamic sections, include the code and test cases
        return {
          type: 'dynamic',
          content: section.content,
          testCases: section.testCases || []
        };
      }
    });
  });
  
  // Configurator output (line objects)
  let configuratorOutput = $derived.by(() => {
    if (outputMode !== 'configurator') return null;
    
    const lineObjects = [];
    let currentContent = '';
    
    sections.forEach(section => {
      if (section.type === 'static') {
        // Accumulate static content
        if (currentContent) currentContent += '\n';
        currentContent += section.content;
      } else if (section.type === 'dynamic') {
        // Push accumulated static content as TEXT
        if (currentContent) {
          lineObjects.push({
            TYPE: 'TEXT',
            TEXT: currentContent
          });
          currentContent = '';
        }
        
        // Add dynamic section as JAVASCRIPT
        lineObjects.push({
          TYPE: 'JAVASCRIPT',
          JAVASCRIPT: section.content
        });
      }
    });
    
    // Push any remaining static content
    if (currentContent) {
      lineObjects.push({
        TYPE: 'TEXT',
        TEXT: currentContent
      });
    }
    
    return lineObjects;
  });
</script>

<div class="preview-engine">
  {#if previewMode === 'preview' && !showOutput}
    <div class="preview-content">
      {@html combinedPreview}
    </div>
  {:else if showOutput}
    <div class="output-content">
      {#if outputMode === 'json'}
        <pre class="json-output">{JSON.stringify(jsonOutput, null, 2)}</pre>
      {:else if outputMode === 'configurator'}
        <pre class="configurator-output">{JSON.stringify(configuratorOutput, null, 2)}</pre>
      {/if}
    </div>
  {/if}
</div>

<style>
  .preview-engine {
    height: 100%;
    overflow: auto;
  }
  
  .preview-content {
    padding: 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .output-content {
    padding: 1rem;
  }
  
  .json-output,
  .configurator-output {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.5;
  }
</style>