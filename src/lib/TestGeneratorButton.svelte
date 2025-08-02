<script>
  import { getKeyUnit, isValidKey } from './tpnLegacy.js';
  
  let { section, onTestsGenerated, tpnMode = false } = $props();
  
  let isGenerating = $state(false);
  let error = $state(null);
  let showCategoryMenu = $state(false);
  let selectedCategory = $state('all');
  
  const categoryOptions = [
    { value: 'all', label: '🎯 All Categories', description: 'Generate all test types' },
    { value: 'basicFunctionality', label: '✅ Basic Tests', description: 'Normal use cases' },
    { value: 'edgeCases', label: '⚡ Edge Cases', description: 'Boundary conditions' },
    { value: 'qaBreaking', label: '🔨 QA/Breaking', description: 'Security & edge cases' }
  ];

  async function generateTests(category = selectedCategory) {
    isGenerating = true;
    error = null;
    showCategoryMenu = false;
    
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
      
      // Build variable metadata if in TPN mode
      const variableMetadata = tpnMode ? buildVariableMetadata(variables) : {};
      
      const response = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dynamicCode: section.content,
          variables: variables,
          sectionName: `Section ${section.id}`,
          notes: null,
          testCategory: category,
          tpnMode: tpnMode,
          patientType: 'neonatal', // Default to neonatal since we have that data
          variableMetadata: variableMetadata
        })
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Server error' };
        }
        
        // Provide specific error message based on the error
        if (errorData.details?.includes('GEMINI_API_KEY')) {
          throw new Error('AI service not configured. Please ensure GEMINI_API_KEY is set in environment variables.');
        } else if (errorData.details?.includes('parse')) {
          throw new Error('AI response parsing failed. Try again or simplify your code.');
        } else {
          throw new Error(errorData.error || 'Failed to generate tests');
        }
      }
      
      const data = await response.json();
      
      if (data.success && data.tests) {
        // Handle the response based on whether it's all categories or single category
        if (data.metadata?.testCategory && data.metadata.testCategory !== 'all') {
          // For single category, we might want to merge with existing tests
          // For now, just pass the full tests object
          onTestsGenerated(data.tests);
        } else {
          onTestsGenerated(data.tests);
        }
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (err) {
      console.error('Test generation error:', err);
      
      // Provide helpful error messages based on the error type
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        error = 'AI test generation requires running with "pnpm run dev:vercel" instead of "pnpm dev". The API endpoint is not available in frontend-only mode.';
      } else if (err.message.includes('404')) {
        error = 'API endpoint not found. Make sure you\'re running "pnpm run dev:vercel" for full functionality.';
      } else {
        error = err.message;
      }
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

  function buildVariableMetadata(variables) {
    const metadata = {};
    
    variables.forEach(varName => {
      if (isValidKey(varName)) {
        metadata[varName] = {
          unit: getKeyUnit(varName),
          isTPN: true,
          // TODO: Add reference ranges when available
        };
      } else {
        metadata[varName] = {
          unit: '',
          isTPN: false
        };
      }
    });
    
    return metadata;
  }
</script>

<div class="test-generator-container">
  <button 
    class="generate-tests-btn"
    onclick={() => showCategoryMenu = !showCategoryMenu}
    disabled={isGenerating}
    title="Generate test cases using AI"
  >
    {#if isGenerating}
      <span class="spinner"></span>
      Generating...
    {:else}
      🤖 Generate Tests
      <span class="dropdown-arrow">▼</span>
    {/if}
  </button>
  
  {#if showCategoryMenu && !isGenerating}
    <div class="category-menu">
      {#each categoryOptions as option}
        <button 
          class="category-option"
          onclick={() => generateTests(option.value)}
          title={option.description}
        >
          <span class="option-label">{option.label}</span>
          <span class="option-description">{option.description}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

{#if error}
  <div class="error-message">
    ⚠️ {error}
  </div>
{/if}

<style>
  .test-generator-container {
    position: relative;
    display: inline-block;
  }

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
  
  .dropdown-arrow {
    font-size: 0.7rem;
    margin-left: 0.2rem;
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
  
  .category-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.25rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 200px;
  }
  
  .category-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s;
    text-align: left;
    border-bottom: 1px solid #f1f5f9;
  }
  
  .category-option:last-child {
    border-bottom: none;
  }
  
  .category-option:hover {
    background-color: #f8fafc;
  }
  
  .category-option:first-child {
    border-radius: 8px 8px 0 0;
  }
  
  .category-option:last-child {
    border-radius: 0 0 8px 8px;
  }
  
  .option-label {
    font-weight: 500;
    font-size: 0.9rem;
    color: #1a202c;
  }
  
  .option-description {
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 0.2rem;
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