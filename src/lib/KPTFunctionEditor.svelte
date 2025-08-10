<script lang="ts">
  import type { KPTFunction } from './kptPersistence';
  import { KPTPersistence } from './kptPersistence';
  import CodeEditor from './CodeEditor.svelte';
  import DOMPurify from 'dompurify';
  
  let { 
    functionData = $bindable(null),
    onSave = () => {},
    onCancel = () => {},
    onTest = () => {},
    isVisible = false
  } = $props();
  
  // Form state - now handles complete function code
  let functionCode = $state('');
  let description = $state('');
  let category = $state('CUSTOM');
  
  // Test state
  let testParameters = $state('');
  let testResult = $state('');
  let testError = $state('');
  let isEditing = $state(false);
  let showHtmlPreview = $state(true);
  let testResultType = $state('text'); // 'text', 'html', 'object'
  
  // Derived values from function code
  let extractedFunctionName = $derived.by(() => {
    const match = functionCode.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/)
    return match ? match[1] : ''
  })
  
  let extractedParameters = $derived.by(() => {
    const match = functionCode.match(/function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(([^)]*)\)/)
    return match ? match[1].trim() : ''
  })
  
  let extractedBody = $derived.by(() => {
    const match = functionCode.match(/function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*\{([\s\S]*)\}$/)
    return match ? match[1].trim() : ''
  })
  
  // Categories for custom functions
  const categories = [
    'CUSTOM',
    'TEXT_FORMATTING',
    'NUMBER_FORMATTING', 
    'TPN_FORMATTING',
    'CONDITIONAL',
    'VALIDATION',
    'HTML_BUILDERS',
    'UTILITIES',
    'MATH'
  ];
  
  // Watch for function data changes
  $effect(() => {
    if (functionData) {
      // Convert legacy format to full function code
      const name = functionData.name || 'myFunction'
      const params = functionData.parameters || ''
      const body = functionData.body || 'return "Hello World!"'
      
      functionCode = `function ${name}(${params}) {
  ${body.split('\n').join('\n  ')}
}`
      description = functionData.description || '';
      category = functionData.category || 'CUSTOM';
      isEditing = true;
    } else {
      // Reset for new function
      functionCode = 'function myFunction() {\n  return "Hello World!";\n}';
      description = '';
      category = 'CUSTOM';
      isEditing = false;
    }
    testResult = '';
    testError = '';
    testParameters = '';
  });
  
  function handleSave() {
    try {
      // Validate function code
      if (!functionCode.trim()) {
        throw new Error('Function code is required');
      }
      
      if (!extractedFunctionName) {
        throw new Error('Function must have a valid name (e.g., function myFunction() { ... })');
      }
      
      // Validate function syntax
      try {
        new Function('return ' + functionCode)
      } catch (syntaxError) {
        throw new Error(`Function syntax error: ${syntaxError.message}`);
      }
      
      const func: KPTFunction = {
        name: extractedFunctionName,
        parameters: extractedParameters,
        body: extractedBody,
        description: description.trim() || '',
        category: category,
        createdAt: functionData?.createdAt || new Date(),
        modifiedAt: new Date()
      };
      
      // Save the function
      console.log('[KPT Editor] Saving function to localStorage:', func);
      KPTPersistence.saveFunction(func);
      console.log('[KPT Editor] Function saved, calling parent onSave handler');
      
      // Call parent save handler
      onSave(func);
      
      // Reset form
      functionCode = 'function myFunction() {\n  return "Hello World!";\n}';
      description = '';
      category = 'CUSTOM';
    } catch (error) {
      testError = error.message;
    }
  }
  
  function handleTest() {
    try {
      testError = '';
      testResult = '';
      
      if (!functionCode.trim() || !extractedFunctionName) {
        throw new Error('Valid function code is required for testing');
      }
      
      // Create and execute the function
      const testFunc = new Function('return ' + functionCode)()
      
      // Parse test parameters
      let testArgs = [];
      if (testParameters.trim()) {
        try {
          // Try to parse as JSON array first
          testArgs = JSON.parse('[' + testParameters + ']');
        } catch {
          // Fall back to simple comma-split
          testArgs = testParameters.split(',').map(arg => {
            const trimmed = arg.trim();
            // Try to parse as number, boolean, or keep as string
            if (trimmed === 'true') return true;
            if (trimmed === 'false') return false;
            if (!isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
            return trimmed.replace(/^["']|["']$/g, ''); // Remove quotes
          });
        }
      }
      
      // Execute test
      const result = testFunc(...testArgs);
      
      // Determine result type and format appropriately
      if (typeof result === 'string') {
        testResult = result;
        // Check if result contains HTML tags
        const htmlPattern = /<[^>]*>/;
        testResultType = htmlPattern.test(result) ? 'html' : 'text';
      } else if (typeof result === 'object' && result !== null) {
        testResult = JSON.stringify(result, null, 2);
        testResultType = 'object';
      } else {
        testResult = String(result);
        testResultType = 'text';
      }
    } catch (error) {
      testError = `Test failed: ${error.message}`;
    }
  }
  
  function handleCancel() {
    functionCode = 'function myFunction() {\n  return "Hello World!";\n}';
    description = '';
    category = 'CUSTOM';
    testResult = '';
    testError = '';
    testParameters = '';
    onCancel();
  }
  
  // Sample function templates - now complete functions
  const templates = {
    textFormatter: {
      code: `function formatText(text) {
  return \`<span style="color: #646cff; font-weight: bold;">\${text}</span>\`;
}`,
      description: 'Format text with primary color and bold styling'
    },
    numberValidator: {
      code: `function validateRange(value, min, max) {
  if (typeof value !== 'number') {
    return 'INVALID TYPE';
  }
  if (value < min || value > max) {
    return \`OUT OF RANGE (\${min}-\${max})\`;
  }
  return 'VALID';
}`,
      description: 'Validate if a number is within specified range'
    },
    conditionalDisplay: {
      code: `function conditionalDisplay(condition, content, fallback = '') {
  return condition ? content : fallback;
}`,
      description: 'Display content based on condition'
    },
    tpnFormatter: {
      code: `function formatTPNValue(value, unit = 'mg/dL', precision = 1) {
  if (typeof value !== 'number') return 'N/A';
  
  return \`<strong>\${value.toFixed(precision)}</strong> <em>\${unit}</em>\`;
}`,
      description: 'Format TPN values with units and precision'
    },
    htmlBuilder: {
      code: `function buildCard(title, content, type = 'info') {
  const colors = {
    info: '#646cff',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545'
  };
  
  return \`
    <div style="border-left: 4px solid \${colors[type] || colors.info}; padding: 12px; margin: 8px 0; background: #f8f9fa; border-radius: 4px;">
      <h4 style="margin: 0 0 8px 0; color: \${colors[type] || colors.info};">\${title}</h4>
      <p style="margin: 0; color: #495057;">\${content}</p>
    </div>
  \`;
}`,
      description: 'Build styled card components with different types'
    }
  };
  
  function loadTemplate(templateName: keyof typeof templates) {
    const template = templates[templateName];
    functionCode = template.code;
    description = template.description;
  }
</script>

{#if isVisible}
<div class="kpt-function-editor-overlay">
  <div class="kpt-function-editor">
    <div class="editor-header">
      <h3>{isEditing ? 'Edit' : 'Create'} KPT Function</h3>
      <button class="close-btn" onclick={handleCancel} title="Close editor">
        ×
      </button>
    </div>
    
    <div class="editor-content">
      <!-- Code Section (Main 70% area) -->
      <div class="code-section">
        <div class="code-header">
          <div class="code-title">
            Complete Function
            {#if extractedFunctionName}
              <span class="function-name">→ {extractedFunctionName}({extractedParameters})</span>
            {/if}
          </div>
          <div class="template-section">
            <span class="template-label">Templates:</span>
            <button type="button" onclick={() => loadTemplate('textFormatter')} class="template-btn">Text</button>
            <button type="button" onclick={() => loadTemplate('numberValidator')} class="template-btn">Validator</button>
            <button type="button" onclick={() => loadTemplate('conditionalDisplay')} class="template-btn">Conditional</button>
            <button type="button" onclick={() => loadTemplate('tpnFormatter')} class="template-btn">TPN</button>
            <button type="button" onclick={() => loadTemplate('htmlBuilder')} class="template-btn">HTML</button>
          </div>
        </div>
        
        <div class="code-editor-container">
          <div class="code-editor-wrapper">
            <CodeEditor 
              bind:value={functionCode}
              language="javascript"
              onChange={(newValue) => { functionCode = newValue; }}
            />
          </div>
        </div>
      </div>
      
      <!-- Metadata Sidebar (30% area) -->
      <div class="metadata-sidebar">
        <!-- Function Information -->
        <div class="metadata-section function-info">
          <h4 class="section-title">Function Details</h4>
          <div class="form-grid">
            <div class="function-status">
              <div class="status-item">
                <span class="status-label">Name:</span>
                <span class="status-value {extractedFunctionName ? 'valid' : 'invalid'}">
                  {extractedFunctionName || 'Not detected'}
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">Parameters:</span>
                <span class="status-value {extractedParameters !== '' ? 'valid' : 'empty'}">
                  {extractedParameters || 'none'}
                </span>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="category">Category</label>
                <select id="category" bind:value={category}>
                  {#each categories as cat}
                    <option value={cat}>{cat.replace('_', ' ').toLowerCase()}</option>
                  {/each}
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="description">Description</label>
              <input 
                id="description"
                type="text" 
                bind:value={description}
                placeholder="Describe what this function does"
              />
              <small class="form-help">Brief explanation of the function's purpose</small>
            </div>
            
            <div class="help-text">
              <strong>💡 How to write functions:</strong>
              <ul>
                <li>Start with <code>function myName() {'{'}</code></li>
                <li>Add parameters: <code>function calc(a, b = 10) {'{'}</code></li>
                <li>Return a value: <code>return a + b;</code></li>
                <li>Close with <code>{'}'}</code></li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Test Section -->
        <div class="metadata-section test-section">
          <h4 class="section-title">Test & Preview</h4>
          
          <div class="test-controls">
            <div class="form-group">
              <label for="test-params">Test Parameters</label>
              <input 
                id="test-params"
                type="text" 
                bind:value={testParameters}
                placeholder="'Hello', 42, true"
              />
              <small class="form-help">Comma-separated test values</small>
            </div>
            
            <button type="button" onclick={handleTest} class="test-btn" disabled={!extractedFunctionName || !functionCode}>
              🧪 Test Function
            </button>
          </div>
          
          <div class="test-result-container">
            {#if testResult}
              <div class="test-result success">
                <div class="result-header">
                  <strong>Result:</strong>
                  {#if testResultType === 'html'}
                    <div class="preview-toggles">
                      <button 
                        type="button" 
                        class="toggle-btn {showHtmlPreview ? 'active' : ''}"
                        onclick={() => showHtmlPreview = true}
                      >
                        Preview
                      </button>
                      <button 
                        type="button" 
                        class="toggle-btn {!showHtmlPreview ? 'active' : ''}"
                        onclick={() => showHtmlPreview = false}
                      >
                        Raw HTML
                      </button>
                    </div>
                  {/if}
                </div>
                
                {#if testResultType === 'html'}
                  {#if showHtmlPreview}
                    <div class="html-preview">
                      {@html DOMPurify.sanitize(testResult)}
                    </div>
                  {:else}
                    <pre class="code-result">{testResult}</pre>
                  {/if}
                {:else}
                  <pre class="code-result">{testResult}</pre>
                {/if}
              </div>
            {/if}
            
            {#if testError}
              <div class="test-result error">
                <strong>Error:</strong>
                <pre>{testError}</pre>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
    
    <div class="editor-actions">
      <div class="action-info">
        <span>💡</span>
        <span>{isEditing ? 'Editing function' : 'Creating new function'}</span>
      </div>
      <div class="action-buttons">
        <button onclick={handleCancel} class="cancel-btn">Cancel</button>
        <button onclick={handleSave} class="save-btn" disabled={!extractedFunctionName || !functionCode}>
          {isEditing ? 'Update' : 'Save'} Function
        </button>
      </div>
    </div>
  </div>
</div>
{/if}

<style>
  /* CSS Custom Properties - Light Theme First */
  :root {
    /* Light theme as default */
    --editor-bg: #ffffff;
    --editor-surface: #f8f9fa;
    --editor-surface-raised: #ffffff;
    --editor-surface-hover: #e9ecef;
    --editor-text: #212529;
    --editor-text-muted: #6c757d;
    --editor-text-light: #868e96;
    --editor-accent: #646cff;
    --editor-accent-hover: #545bd6;
    --editor-accent-light: rgba(100, 108, 255, 0.1);
    --editor-success: #28a745;
    --editor-success-light: rgba(40, 167, 69, 0.1);
    --editor-error: #dc3545;
    --editor-error-light: rgba(220, 53, 69, 0.1);
    --editor-warning: #ffc107;
    --editor-warning-light: rgba(255, 193, 7, 0.1);
    --editor-info: #17a2b8;
    --editor-border: #dee2e6;
    --editor-border-light: #f1f3f4;
    --editor-border-strong: #adb5bd;
    --editor-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    --editor-shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.05);
    --editor-shadow-lg: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    --editor-shadow-elevated: 0 1rem 3rem rgba(0, 0, 0, 0.175);
    --editor-radius: 6px;
    --editor-radius-sm: 4px;
    --editor-radius-lg: 8px;
    --editor-transition: all 0.15s ease-in-out;
    --editor-transition-fast: all 0.1s ease-in-out;
  }

  .kpt-function-editor-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: calc(var(--z-modal) + 10);
    padding: 20px;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(4px);
    }
  }
  
  .kpt-function-editor {
    background: var(--editor-bg);
    border-radius: var(--editor-radius-lg);
    box-shadow: var(--editor-shadow-elevated);
    border: 1px solid var(--editor-border);
    width: 100%;
    max-width: 1400px;
    height: 90vh;
    max-height: 900px;
    min-height: 600px;
    display: grid;
    grid-template-rows: auto 1fr auto;
    overflow: hidden;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--editor-border);
    background: var(--editor-surface);
    position: relative;
  }

  .editor-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--editor-accent), #747bff);
    opacity: 1;
  }
  
  .editor-header h3 {
    margin: 0;
    color: var(--editor-text);
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .editor-header h3::before {
    content: '⚡';
    font-size: 1.25rem;
    color: var(--editor-accent);
  }
  
  .close-btn {
    background: var(--editor-surface-hover);
    border: 1px solid var(--editor-border);
    font-size: 18px;
    cursor: pointer;
    color: var(--editor-text-muted);
    padding: 8px 10px;
    border-radius: var(--editor-radius);
    transition: var(--editor-transition);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    min-height: 36px;
  }
  
  .close-btn:hover {
    background: var(--editor-error);
    color: white;
    border-color: var(--editor-error);
    transform: scale(1.05);
  }
  
  .editor-content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0;
    overflow: hidden;
    background: var(--editor-surface);
  }

  .code-section {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--editor-border);
    background: var(--editor-bg);
  }

  .code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--editor-border);
    background: var(--editor-surface-raised);
    font-size: 0.875rem;
    color: var(--editor-text-muted);
  }

  .code-title {
    font-weight: 600;
    color: var(--editor-text);
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .code-title::before {
    content: '{ }';
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    color: var(--editor-accent);
    font-size: 0.9rem;
  }
  
  .function-name {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    color: var(--editor-accent);
    font-weight: 500;
    font-size: 0.9rem;
    background: var(--editor-accent-light);
    padding: 2px 6px;
    border-radius: var(--editor-radius-sm);
    margin-left: 8px;
  }

  .template-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .template-label {
    font-size: 0.75rem;
    color: var(--editor-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .template-btn {
    padding: 6px 10px;
    font-size: 0.75rem;
    background: white;
    border: 1px solid var(--editor-border);
    border-radius: var(--editor-radius-sm);
    cursor: pointer;
    color: var(--editor-text-muted);
    transition: var(--editor-transition-fast);
    font-weight: 500;
  }
  
  .template-btn:hover {
    background: var(--editor-accent);
    color: white;
    border-color: var(--editor-accent);
    transform: translateY(-1px);
    box-shadow: var(--editor-shadow);
  }

  .code-editor-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .code-editor-wrapper {
    height: 100%;
    border: none;
    position: relative;
  }

  .code-editor-wrapper::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--editor-accent), #747bff);
    opacity: 0;
    transition: var(--editor-transition);
    z-index: 1;
  }

  .code-editor-wrapper:focus-within::before {
    opacity: 1;
  }

  .metadata-sidebar {
    background: var(--editor-surface);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .metadata-section {
    padding: 20px;
    border-bottom: 1px solid var(--editor-border);
  }

  .metadata-section:last-child {
    border-bottom: none;
    flex: 1;
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--editor-text);
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--editor-border-light);
  }

  .function-info .section-title::before { 
    content: '⚙️'; 
    font-size: 1rem;
  }
  .test-section .section-title::before { 
    content: '🧪'; 
    font-size: 1rem;
  }

  .form-grid {
    display: grid;
    gap: 16px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .form-group label {
    font-weight: 500;
    color: var(--editor-text-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .form-group input,
  .form-group select {
    padding: 12px 14px;
    border: 1px solid var(--editor-border);
    border-radius: var(--editor-radius);
    font-size: 0.875rem;
    font-family: inherit;
    background: white;
    color: var(--editor-text);
    transition: var(--editor-transition);
  }
  
  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--editor-accent);
    box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
  }
  
  .form-group input:hover,
  .form-group select:hover {
    border-color: var(--editor-border-strong);
  }

  .form-group input::placeholder {
    color: var(--editor-text-muted);
    opacity: 0.7;
  }
  
  .form-help {
    font-size: 0.7rem;
    color: var(--editor-text-muted);
    line-height: 1.4;
    margin-top: 2px;
  }

  .test-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .test-btn {
    padding: 12px 20px;
    background: var(--editor-success);
    color: white;
    border: none;
    border-radius: var(--editor-radius);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    transition: var(--editor-transition);
    position: relative;
    overflow: hidden;
  }

  .test-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.4s ease;
  }

  .test-btn:hover::before {
    left: 100%;
  }
  
  .test-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(40, 167, 69, 0.3);
    background: #218838;
  }
  
  .test-btn:disabled {
    background: var(--editor-text-light);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .test-btn:disabled::before {
    display: none;
  }

  .test-result-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow: hidden;
  }
  
  .test-result {
    padding: 12px;
    border-radius: var(--editor-radius);
    border-left: 3px solid;
    font-size: 0.875rem;
    animation: slideInResult 0.3s ease-out;
  }

  @keyframes slideInResult {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .test-result.success {
    background: rgba(76, 175, 80, 0.1);
    border-color: var(--editor-success);
    color: var(--editor-text);
  }
  
  .test-result.error {
    background: rgba(244, 67, 54, 0.1);
    border-color: var(--editor-error);
    color: var(--editor-text);
  }
  
  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .preview-toggles {
    display: flex;
    gap: 4px;
    border-radius: 4px;
    background: var(--editor-surface-raised);
    padding: 2px;
  }

  .toggle-btn {
    padding: 4px 8px;
    font-size: 0.7rem;
    background: transparent;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    color: var(--editor-text-muted);
    transition: var(--editor-transition);
  }

  .toggle-btn.active {
    background: var(--editor-accent);
    color: white;
  }

  .toggle-btn:hover:not(.active) {
    color: var(--editor-text);
  }

  .html-preview {
    background: var(--editor-bg);
    border: 1px solid var(--editor-border);
    border-radius: 4px;
    padding: 12px;
    min-height: 60px;
    overflow: auto;
    max-height: 200px;
  }

  .code-result {
    margin: 0;
    font-size: 0.8rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-height: 200px;
    overflow-y: auto;
    background: var(--editor-bg);
    padding: 12px;
    border: 1px solid var(--editor-border);
    border-radius: 4px;
    color: var(--editor-text);
    line-height: 1.4;
  }
  
  .editor-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    border-top: 1px solid var(--editor-border);
    background: var(--editor-surface);
  }

  .action-info {
    font-size: 0.875rem;
    color: var(--editor-text-muted);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
  }
  
  .cancel-btn {
    padding: 12px 24px;
    background: white;
    color: var(--editor-text-muted);
    border: 1px solid var(--editor-border);
    border-radius: var(--editor-radius);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: var(--editor-transition);
  }
  
  .cancel-btn:hover {
    background: var(--editor-surface-hover);
    color: var(--editor-text);
    border-color: var(--editor-border-strong);
    transform: translateY(-1px);
    box-shadow: var(--editor-shadow);
  }
  
  .save-btn {
    padding: 12px 28px;
    background: var(--editor-accent);
    color: white;
    border: none;
    border-radius: var(--editor-radius);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: var(--editor-transition);
    position: relative;
    overflow: hidden;
  }

  .save-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.4s ease;
  }

  .save-btn:hover::before {
    left: 100%;
  }
  
  .save-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(100, 108, 255, 0.3);
    background: var(--editor-accent-hover);
  }
  
  .save-btn:disabled {
    background: var(--editor-text-light);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .save-btn:disabled::before {
    display: none;
  }
  
  /* Responsive Design */
  @media (max-width: 1200px) {
    .kpt-function-editor {
      max-width: 95vw;
      height: 95vh;
    }
  }

  @media (max-width: 768px) {
    .kpt-function-editor-overlay {
      padding: 10px;
    }

    .kpt-function-editor {
      max-width: 100vw;
      height: 100vh;
      border-radius: 0;
    }
    
    .editor-content {
      grid-template-columns: 1fr;
      grid-template-rows: 2fr 1fr;
    }

    .code-section {
      border-right: none;
      border-bottom: 1px solid var(--editor-border);
    }

    .metadata-sidebar {
      max-height: 40vh;
    }
    
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .template-section {
      flex-wrap: wrap;
      gap: 4px;
    }

    .editor-actions {
      flex-direction: column;
      gap: 12px;
    }

    .action-info {
      order: 1;
    }

    .action-buttons {
      order: 0;
      width: 100%;
      justify-content: space-between;
    }

    .cancel-btn,
    .save-btn {
      flex: 1;
    }
  }

  @media (max-width: 480px) {
    .editor-header {
      padding: 12px 16px;
    }

    .editor-header h3 {
      font-size: 1rem;
    }

    .metadata-section {
      padding: 16px;
    }

    .code-header {
      padding: 12px 16px;
    }

    .template-btn {
      font-size: 0.7rem;
      padding: 3px 6px;
    }
  }

  /* New component-specific styles */
  .function-status {
    background: var(--editor-surface);
    border: 1px solid var(--editor-border);
    border-radius: var(--editor-radius);
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .status-item:last-child {
    margin-bottom: 0;
  }
  
  .status-label {
    font-weight: 600;
    color: var(--editor-text-muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .status-value {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.85rem;
    padding: 4px 8px;
    border-radius: var(--editor-radius-sm);
  }
  
  .status-value.valid {
    background: var(--editor-success-light);
    color: var(--editor-success);
    border: 1px solid rgba(40, 167, 69, 0.2);
  }
  
  .status-value.invalid {
    background: var(--editor-error-light);
    color: var(--editor-error);
    border: 1px solid rgba(220, 53, 69, 0.2);
  }
  
  .status-value.empty {
    background: var(--editor-surface-hover);
    color: var(--editor-text-light);
    border: 1px solid var(--editor-border);
    font-style: italic;
  }
  
  .help-text {
    background: linear-gradient(135deg, rgba(100, 108, 255, 0.05), rgba(116, 123, 255, 0.05));
    border: 1px solid rgba(100, 108, 255, 0.1);
    border-left: 4px solid var(--editor-accent);
    border-radius: var(--editor-radius);
    padding: 16px;
    margin-top: 16px;
  }
  
  .help-text strong {
    color: var(--editor-accent);
    font-size: 0.85rem;
  }
  
  .help-text ul {
    margin: 8px 0 0 0;
    padding-left: 16px;
    color: var(--editor-text-muted);
  }
  
  .help-text li {
    margin-bottom: 4px;
    font-size: 0.8rem;
    line-height: 1.4;
  }
  
  .help-text code {
    background: rgba(100, 108, 255, 0.1);
    color: var(--editor-accent);
    padding: 1px 4px;
    border-radius: 2px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.75rem;
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    :root {
      --editor-border: #000000;
      --editor-shadow: 0 0 0 2px #000000;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>