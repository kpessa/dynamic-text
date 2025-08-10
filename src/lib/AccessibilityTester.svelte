<script>
  import { ColorContrastManager } from './utils/accessibility.js';
  
  let { isOpen = $bindable(false) } = $props();
  
  let testResults = $state({
    colorContrast: [],
    headingHierarchy: [],
    focusableElements: [],
    ariaLabels: [],
    formLabels: [],
    images: []
  });
  
  let isRunning = $state(false);
  
  async function runAccessibilityTests() {
    isRunning = true;
    testResults = {
      colorContrast: [],
      headingHierarchy: [],
      focusableElements: [],
      ariaLabels: [],
      formLabels: [],
      images: []
    };
    
    try {
      // Test 1: Color Contrast
      await testColorContrast();
      
      // Test 2: Heading Hierarchy
      await testHeadingHierarchy();
      
      // Test 3: Focusable Elements
      await testFocusableElements();
      
      // Test 4: ARIA Labels
      await testAriaLabels();
      
      // Test 5: Form Labels
      await testFormLabels();
      
      // Test 6: Images
      await testImages();
      
    } catch (error) {
      console.error('Accessibility testing error:', error);
    } finally {
      isRunning = false;
    }
  }
  
  async function testColorContrast() {
    const elements = document.querySelectorAll('*');
    const results = [];
    
    for (const element of elements) {
      const style = window.getComputedStyle(element);
      const color = style.color;
      const backgroundColor = style.backgroundColor;
      
      if (color && backgroundColor && 
          color !== 'rgba(0, 0, 0, 0)' && 
          backgroundColor !== 'rgba(0, 0, 0, 0)') {
        
        const ratio = ColorContrastManager.getContrastRatio(color, backgroundColor);
        const isLarge = parseInt(style.fontSize) >= 18 || 
                       (parseInt(style.fontSize) >= 14 && style.fontWeight === 'bold');
        
        const passes = ColorContrastManager.meetsWCAGAA(color, backgroundColor, isLarge);
        
        if (!passes) {
          results.push({
            element: element.tagName.toLowerCase() + (element.className ? '.' + element.className : ''),
            color,
            backgroundColor,
            ratio: ratio.toFixed(2),
            required: isLarge ? '3:1' : '4.5:1',
            passes: false
          });
        }
      }
    }
    
    testResults.colorContrast = results;
  }
  
  async function testHeadingHierarchy() {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const results = [];
    let lastLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const text = heading.textContent.trim();
      
      if (index === 0 && level !== 1) {
        results.push({
          element: heading.tagName,
          text,
          issue: 'First heading should be h1',
          severity: 'error'
        });
      }
      
      if (level > lastLevel + 1) {
        results.push({
          element: heading.tagName,
          text,
          issue: `Skipped heading level (from h${lastLevel} to h${level})`,
          severity: 'warning'
        });
      }
      
      if (!text) {
        results.push({
          element: heading.tagName,
          text: '<empty>',
          issue: 'Empty heading',
          severity: 'error'
        });
      }
      
      lastLevel = level;
    });
    
    testResults.headingHierarchy = results;
  }
  
  async function testFocusableElements() {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];
    
    const focusableElements = document.querySelectorAll(focusableSelectors.join(', '));
    const results = [];
    
    focusableElements.forEach(element => {
      const style = window.getComputedStyle(element);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      
      if (!isVisible) return;
      
      // Check for focus indicators
      const hasCustomFocus = style.outline !== 'none' || 
                           element.classList.contains('focus-visible') ||
                           element.getAttribute('data-focus') !== null;
      
      // Check for accessible names
      const hasAccessibleName = element.getAttribute('aria-label') ||
                               element.getAttribute('aria-labelledby') ||
                               element.textContent.trim() ||
                               (element.tagName === 'INPUT' && element.getAttribute('placeholder'));
      
      if (!hasAccessibleName) {
        results.push({
          element: element.tagName + (element.type ? `[${element.type}]` : ''),
          issue: 'Missing accessible name',
          severity: 'error'
        });
      }
    });
    
    testResults.focusableElements = results;
  }
  
  async function testAriaLabels() {
    const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]');
    const results = [];
    
    elementsWithAria.forEach(element => {
      // Check if aria-labelledby references exist
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const ids = labelledBy.split(' ');
        ids.forEach(id => {
          if (!document.getElementById(id)) {
            results.push({
              element: element.tagName,
              issue: `aria-labelledby references non-existent ID: ${id}`,
              severity: 'error'
            });
          }
        });
      }
      
      // Check if aria-describedby references exist
      const describedBy = element.getAttribute('aria-describedby');
      if (describedBy) {
        const ids = describedBy.split(' ');
        ids.forEach(id => {
          if (!document.getElementById(id)) {
            results.push({
              element: element.tagName,
              issue: `aria-describedby references non-existent ID: ${id}`,
              severity: 'error'
            });
          }
        });
      }
      
      // Check for empty aria-labels
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel !== null && !ariaLabel.trim()) {
        results.push({
          element: element.tagName,
          issue: 'Empty aria-label',
          severity: 'warning'
        });
      }
    });
    
    testResults.ariaLabels = results;
  }
  
  async function testFormLabels() {
    const formControls = document.querySelectorAll('input, select, textarea');
    const results = [];
    
    formControls.forEach(control => {
      if (control.type === 'hidden') return;
      
      const hasLabel = control.getAttribute('aria-label') ||
                       control.getAttribute('aria-labelledby') ||
                       document.querySelector(`label[for="${control.id}"]`);
      
      if (!hasLabel && control.id) {
        results.push({
          element: control.tagName + (control.type ? `[${control.type}]` : ''),
          id: control.id,
          issue: 'Form control missing label',
          severity: 'error'
        });
      }
      
      // Check for required field indicators
      if (control.required && !control.getAttribute('aria-required')) {
        results.push({
          element: control.tagName + (control.type ? `[${control.type}]` : ''),
          id: control.id,
          issue: 'Required field missing aria-required',
          severity: 'warning'
        });
      }
    });
    
    testResults.formLabels = results;
  }
  
  async function testImages() {
    const images = document.querySelectorAll('img');
    const results = [];
    
    images.forEach(img => {
      const alt = img.getAttribute('alt');
      
      if (alt === null) {
        results.push({
          src: img.src,
          issue: 'Missing alt attribute',
          severity: 'error'
        });
      } else if (!alt.trim() && !img.getAttribute('role') === 'presentation') {
        results.push({
          src: img.src,
          issue: 'Empty alt text (consider role="presentation" for decorative images)',
          severity: 'warning'
        });
      }
    });
    
    testResults.images = results;
  }
  
  function getSeverityClass(severity) {
    return severity === 'error' ? 'test-error' : 'test-warning';
  }
  
  function getSeverityIcon(severity) {
    return severity === 'error' ? 'L' : '�';
  }
</script>

{#if isOpen}
  <div 
    class="modal-backdrop" 
    onclick={() => isOpen = false}
    onkeydown={(e) => e.key === 'Enter' && (isOpen = false)}
    role="button"
    tabindex="0"
    aria-label="Close accessibility tester">
    <div 
      class="modal-content accessibility-tester-modal" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true">
      <div class="modal-header">
        <h2>Accessibility Testing</h2>
        <button class="close-btn" onclick={() => isOpen = false} aria-label="Close accessibility tester">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="test-controls">
          <button 
            class="btn btn-primary" 
            onclick={runAccessibilityTests}
            disabled={isRunning}
          >
            {isRunning ? 'Running Tests...' : 'Run Accessibility Tests'}
          </button>
        </div>
        
        {#if isRunning}
          <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Scanning page for accessibility issues...</p>
          </div>
        {/if}
        
        {#if !isRunning && (testResults.colorContrast.length > 0 || testResults.headingHierarchy.length > 0)}
          <div class="test-results">
            
            <!-- Color Contrast Results -->
            {#if testResults.colorContrast.length > 0}
              <div class="test-section">
                <h3>Color Contrast Issues ({testResults.colorContrast.length})</h3>
                <div class="test-items">
                  {#each testResults.colorContrast as result}
                    <div class="test-item test-error">
                      <div class="test-icon">L</div>
                      <div class="test-details">
                        <div class="test-element">{result.element}</div>
                        <div class="test-issue">
                          Contrast ratio {result.ratio}:1 is below required {result.required}
                        </div>
                        <div class="test-colors">
                          <span class="color-sample" style="color: {result.color}; background: {result.backgroundColor};">
                            Sample Text
                          </span>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            
            <!-- Heading Hierarchy Results -->
            {#if testResults.headingHierarchy.length > 0}
              <div class="test-section">
                <h3>Heading Hierarchy Issues ({testResults.headingHierarchy.length})</h3>
                <div class="test-items">
                  {#each testResults.headingHierarchy as result}
                    <div class="test-item {getSeverityClass(result.severity)}">
                      <div class="test-icon">{getSeverityIcon(result.severity)}</div>
                      <div class="test-details">
                        <div class="test-element">{result.element}: "{result.text}"</div>
                        <div class="test-issue">{result.issue}</div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            
            <!-- Focusable Elements Results -->
            {#if testResults.focusableElements.length > 0}
              <div class="test-section">
                <h3>Focusable Elements Issues ({testResults.focusableElements.length})</h3>
                <div class="test-items">
                  {#each testResults.focusableElements as result}
                    <div class="test-item {getSeverityClass(result.severity)}">
                      <div class="test-icon">{getSeverityIcon(result.severity)}</div>
                      <div class="test-details">
                        <div class="test-element">{result.element}</div>
                        <div class="test-issue">{result.issue}</div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            
            <!-- ARIA Labels Results -->
            {#if testResults.ariaLabels.length > 0}
              <div class="test-section">
                <h3>ARIA Labels Issues ({testResults.ariaLabels.length})</h3>
                <div class="test-items">
                  {#each testResults.ariaLabels as result}
                    <div class="test-item {getSeverityClass(result.severity)}">
                      <div class="test-icon">{getSeverityIcon(result.severity)}</div>
                      <div class="test-details">
                        <div class="test-element">{result.element}</div>
                        <div class="test-issue">{result.issue}</div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            
            <!-- Form Labels Results -->
            {#if testResults.formLabels.length > 0}
              <div class="test-section">
                <h3>Form Labels Issues ({testResults.formLabels.length})</h3>
                <div class="test-items">
                  {#each testResults.formLabels as result}
                    <div class="test-item {getSeverityClass(result.severity)}">
                      <div class="test-icon">{getSeverityIcon(result.severity)}</div>
                      <div class="test-details">
                        <div class="test-element">{result.element} #{result.id}</div>
                        <div class="test-issue">{result.issue}</div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            
            <!-- Images Results -->
            {#if testResults.images.length > 0}
              <div class="test-section">
                <h3>Images Issues ({testResults.images.length})</h3>
                <div class="test-items">
                  {#each testResults.images as result}
                    <div class="test-item {getSeverityClass(result.severity)}">
                      <div class="test-icon">{getSeverityIcon(result.severity)}</div>
                      <div class="test-details">
                        <div class="test-element">Image: {result.src}</div>
                        <div class="test-issue">{result.issue}</div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            
            {#if Object.values(testResults).every(arr => arr.length === 0)}
              <div class="no-issues">
                <div class="success-icon"></div>
                <h3>No Accessibility Issues Found!</h3>
                <p>All tested elements meet WCAG 2.1 AA standards.</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={() => isOpen = false}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .accessibility-tester-modal {
    width: 900px;
    max-width: 95vw;
    max-height: 90vh;
  }
  
  .test-controls {
    margin-bottom: var(--spacing-lg);
  }
  
  .loading-indicator {
    text-align: center;
    padding: var(--spacing-xl);
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-border);
    border-top: 4px solid var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-md);
  }
  
  .test-results {
    max-height: 60vh;
    overflow-y: auto;
  }
  
  .test-section {
    margin-bottom: var(--spacing-xl);
  }
  
  .test-section h3 {
    color: var(--color-primary);
    border-bottom: 2px solid var(--color-border);
    padding-bottom: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }
  
  .test-items {
    display: grid;
    gap: var(--spacing-sm);
  }
  
  .test-item {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: 6px;
    align-items: start;
  }
  
  .test-item.test-error {
    background: #ffeaea;
    border-left: 4px solid var(--color-danger);
  }
  
  .test-item.test-warning {
    background: #fff9e6;
    border-left: 4px solid var(--color-warning);
  }
  
  .test-icon {
    font-size: var(--font-size-lg);
  }
  
  .test-element {
    font-weight: 600;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: var(--font-size-sm);
    color: var(--color-primary);
    margin-bottom: var(--spacing-xs);
  }
  
  .test-issue {
    color: var(--color-text);
    line-height: 1.4;
  }
  
  .test-colors {
    margin-top: var(--spacing-sm);
  }
  
  .color-sample {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: 4px;
    font-weight: 600;
    display: inline-block;
  }
  
  .no-issues {
    text-align: center;
    padding: var(--spacing-xxl);
    color: var(--color-success);
  }
  
  .success-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
  }
  
  .no-issues h3 {
    color: var(--color-success);
    margin-bottom: var(--spacing-sm);
  }
  
  .no-issues p {
    color: var(--color-text-muted);
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>