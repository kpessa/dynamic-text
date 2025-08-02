<script>
  let { section, onTestsGenerated } = $props();
  
  let isGenerating = $state(false);
  let error = $state(null);
  
  async function generateTests() {
    isGenerating = true;
    error = null;
    
    try {
      // Extract variables from the section
      const variables = [];
      
      // Get variables from test cases
      if (section.testCases && section.testCases.length > 0) {
        const allVars = new Set();
        section.testCases.forEach(tc => {
          Object.keys(tc.variables || {}).forEach(key => allVars.add(key));
        });
        variables.push(...Array.from(allVars));
      }
      
      // Also extract from code using regex
      const codeVars = extractVariablesFromCode(section.content);
      codeVars.forEach(v => {
        if (!variables.includes(v)) variables.push(v);
      });
      
      const response = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dynamicCode: section.content,
          variables: variables,
          sectionName: `Section ${section.id}`,
          notes: null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate tests');
      }
      
      const data = await response.json();
      
      if (data.success && data.tests) {
        onTestsGenerated(data.tests);
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (err) {
      console.error('Test generation error:', err);
      error = err.message;
    } finally {
      isGenerating = false;
    }
  }
  
  function extractVariablesFromCode(code) {
    const variables = new Set();
    
    // Match me.getValue('variable')
    const getValueRegex = /me\.getValue\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = getValueRegex.exec(code)) !== null) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  }
</script>

<button 
  class="generate-tests-btn"
  onclick={generateTests}
  disabled={isGenerating}
  title="Generate test cases using AI"
>
  {#if isGenerating}
    <span class="spinner"></span>
    Generating...
  {:else}
    🤖 Generate Tests
  {/if}
</button>

{#if error}
  <div class="error-message">
    ⚠️ {error}
  </div>
{/if}

<style>
  .generate-tests-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }
  
  .generate-tests-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  .generate-tests-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-message {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: #fee;
    color: #c00;
    border-radius: 4px;
    font-size: 0.85rem;
  }
</style>