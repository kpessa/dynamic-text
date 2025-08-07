<script>
  import * as Babel from '@babel/standalone';
  import DOMPurify from 'dompurify';
  import CodeEditor from './lib/CodeEditor.svelte';
  import Sidebar from './lib/Sidebar.svelte';
  import TPNTestPanel from './lib/TPNTestPanel.svelte';
  import TPNKeyReference from './lib/TPNKeyReference.svelte';
  import IngredientInputPanel from './lib/IngredientInputPanel.svelte';
  import TestGeneratorButton from './lib/TestGeneratorButton.svelte';
  import TestGeneratorModal from './lib/TestGeneratorModal.svelte';
  import AIWorkflowInspector from './lib/AIWorkflowInspector.svelte';
  import Navbar from './lib/Navbar.svelte';
  import IngredientManager from './lib/IngredientManager.svelte';
  import IngredientDiffViewer from './lib/IngredientDiffViewer.svelte';
  import DataMigrationTool from './lib/DataMigrationTool.svelte';
  import CommitMessageDialog from './lib/CommitMessageDialog.svelte';
  import ExportModal from './lib/ExportModal.svelte';
  import ValidationStatus from './lib/ValidationStatus.svelte';
  import SelectiveApply from './lib/SelectiveApply.svelte';
  import PreferencesModal from './lib/PreferencesModal.svelte';
  import { TPNLegacySupport, LegacyElementWrapper, extractKeysFromCode, extractDirectKeysFromCode, isValidKey, getKeyCategory, isCalculatedValue, getCanonicalKey } from './lib/tpnLegacy.js';
  import { isFirebaseConfigured, signInAnonymouslyUser, onAuthStateChange } from './lib/firebase.js';
  import { POPULATION_TYPES } from './lib/firebaseDataService.js';
  
  let showSidebar = $state(false);
  let sections = $state([]);
  
  let nextSectionId = $state(1);
  let copied = $state(false);
  let showOutput = $state(false);
  let outputMode = $state('json'); // 'json' or 'configurator'
  let previewMode = $state('preview'); // 'preview' or 'output'
  let draggedSection = $state(null);
  let activeTestCase = $state({}); // Track active test case per section
  let expandedTestCases = $state({}); // Track which sections have expanded test cases
  let testSummary = $state(null); // Track overall test results
  let showTestSummary = $state(false); // Show/hide test summary modal
  
  // Work context tracking
  let currentIngredient = $state('');
  let currentReferenceName = $state('');
  let hasUnsavedChanges = $state(false);
  let lastSavedTime = $state(null);
  let loadedReferenceId = $state(null);
  let originalSections = $state(null); // To compare for changes
  let tpnMode = $state(false); // Toggle TPN mode
  let currentTPNInstance = $state(null); // Current TPN instance from test panel
  let showKeyReference = $state(false); // Show key reference panel
  let tpnPanelExpanded = $state(true); // Track TPN panel expansion state
  let previewCollapsed = $state(false); // Track preview panel collapse state
  let currentIngredientValues = $state({}); // Track ingredient values for quick input
  let editingSection = $state(null); // Track which section is being edited
  
  // Track loaded ingredient and reference details
  let loadedIngredient = $state(null);
  let loadedReference = $state(null);
  let currentHealthSystem = $state(null);
  
  // Validation tracking state
  let currentValidationStatus = $state('untested');
  let currentValidationNotes = $state('');
  let currentValidatedBy = $state(null);
  let currentValidatedAt = $state(null);
  let currentTestResults = $state(null);
  
  // Test generation state
  let showTestGeneratorModal = $state(false);
  let currentGeneratedTests = $state(null);
  let targetSectionId = $state(null);
  
  // AI Workflow Inspector state
  let showAIWorkflowInspector = $state(false);
  let inspectorCurrentSection = $state(null);
  
  // Firebase and new component states
  let showIngredientManager = $state(false);
  let showDiffViewer = $state(false);
  let showMigrationTool = $state(false);
  let showPreferences = $state(false);
  let selectedIngredientForDiff = $state(null);
  let currentPopulationType = $state(POPULATION_TYPES.ADULT);
  let firebaseEnabled = $state(isFirebaseConfigured());
  let showCommitMessageDialog = $state(false);
  let pendingSaveData = $state(null);
  let showExportModal = $state(false);
  let showSelectiveApply = $state(false);
  let pendingReferenceData = $state(null);
  
  // Active config state
  let activeConfigId = $state(null);
  let activeConfigIngredients = $state([]);
  
  // Population type switching
  let showPopulationDropdown = $state(false);
  let availablePopulations = $state([]);
  let loadingPopulations = $state(false);
  
  // Initialize Firebase authentication
  $effect(() => {
    if (firebaseEnabled) {
      // Sign in anonymously when the app loads
      signInAnonymouslyUser().catch(error => {
        console.error('Failed to sign in anonymously:', error);
      });
      
      // Listen for auth state changes
      const unsubscribe = onAuthStateChange((user) => {
        if (user) {
          console.log('User authenticated:', user.uid);
        }
      });
      
      return () => {
        unsubscribe();
      };
    }
  });
  
  // Extract all referenced ingredients from sections
  let referencedIngredients = $derived.by(() => {
    const allKeys = new Set();
    
    // Extract from dynamic sections
    sections.forEach(section => {
      if (section.type === 'dynamic') {
        const keys = extractKeysFromCode(section.content);
        keys.forEach(key => {
          if (isValidKey(key)) {
            allKeys.add(key);
          }
        });
      }
    });
    
    // Also check test case variables
    sections.forEach(section => {
      if (section.testCases) {
        section.testCases.forEach(tc => {
          Object.keys(tc.variables || {}).forEach(key => {
            if (isValidKey(key)) {
              allKeys.add(key);
            }
          });
        });
      }
    });
    
    const result = Array.from(allKeys).sort();
    return result;
  });
  
  // Extract ingredients per section for badge display
  let ingredientsBySection = $derived.by(() => {
    const result = {};
    
    sections.forEach(section => {
      if (section.type === 'dynamic') {
        const keys = extractDirectKeysFromCode(section.content); // Use direct keys only for badges
        const validKeys = keys.filter(key => isValidKey(key) && !isCalculatedValue(key));
        const calculatedKeys = keys.filter(key => isCalculatedValue(key));
        const nonTpnKeys = keys.filter(key => !isValidKey(key));
        
        if (validKeys.length > 0 || nonTpnKeys.length > 0 || calculatedKeys.length > 0) {
          result[section.id] = {
            tpnKeys: validKeys,
            calculatedKeys: calculatedKeys,
            customKeys: nonTpnKeys,
            allKeys: keys
          };
        }
      }
    });
    
    return result;
  });
  
  
  // Sanitize HTML to prevent XSS
  function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'em', 'u', 'i', 'b', 
                     'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'code', 'pre', 'blockquote', 'table', 
                     'thead', 'tbody', 'tr', 'th', 'td', 'style'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'id', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  }
  
  // Create mock 'me' object for test cases
  function createMockMe(variables = {}) {
    if (tpnMode && currentTPNInstance) {
      // In TPN mode, return the actual TPN instance
      return currentTPNInstance;
    }
    
    // Merge test case variables with ingredient panel values
    const allValues = { ...currentIngredientValues, ...variables };
    
    // Enhanced mock object with full TPN API
    const mockMe = {
      // Core value methods
      getValue: (key) => allValues[key] !== undefined ? allValues[key] : 0,
      
      // Number formatting
      maxP: (value, precision = 2) => {
        if (typeof value !== 'number') return String(value);
        let rv = value.toFixed(precision);
        if (rv.includes('.')) {
          rv = rv.replace(/\.?0+$/, '').replace(/\.$/, '');
        }
        return rv;
      },
      
      // Element wrapper for jQuery-like API
      getObject: (selector) => new LegacyElementWrapper(selector, allValues),
      
      // Preferences with defaults
      pref: (key, defaultValue) => {
        const prefs = {
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
  function transpileCode(code) {
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
  function evaluateCode(code, testVariables = null) {
    try {
      const transpiledCode = transpileCode(code);
      
      // Always create the me object for consistent API
      const me = createMockMe(testVariables);
      
      // Create function with 'me' in scope
      const func = new Function('me', transpiledCode);
      const result = func(me);
      
      return result !== undefined ? String(result) : '';
    } catch (error) {
      return `<span style="color: red;">Error: ${error.message}</span>`;
    }
  }
  
  // Convert sections to JSON format
  function sectionsToJSON() {
    const result = [];
    
    sections.forEach(section => {
      if (section.type === 'static') {
        // Static text: each line becomes a TEXT object
        const lines = section.content.split('\n');
        lines.forEach(line => {
          result.push({ TEXT: line });
        });
      } else if (section.type === 'dynamic') {
        // Dynamic text: wrap with [f( and )]
        result.push({ TEXT: '[f(' });
        const transpiledCode = transpileCode(section.content);
        const lines = transpiledCode.split('\n');
        lines.forEach(line => {
          result.push({ TEXT: line });
        });
        result.push({ TEXT: ')]' });
      }
    });
    
    return result;
  }
  
  // Convert sections to line objects for configurator
  function sectionsToLineObjects() {
    const objects = [];
    let lineId = 1;
    
    sections.forEach(section => {
      if (section.type === 'static') {
        const lines = section.content.split('\n');
        lines.forEach(line => {
          objects.push({
            id: `line-${lineId++}`,
            text: line,
            editable: true,
            deletable: true,
            sectionId: section.id,
            sectionType: 'static'
          });
        });
      } else if (section.type === 'dynamic') {
        objects.push({
          id: `line-${lineId++}`,
          text: '[f(',
          editable: false,
          deletable: false,
          sectionId: section.id,
          sectionType: 'dynamic'
        });
        
        const transpiledCode = transpileCode(section.content);
        const lines = transpiledCode.split('\n');
        lines.forEach(line => {
          objects.push({
            id: `line-${lineId++}`,
            text: line,
            editable: true,
            deletable: true,
            sectionId: section.id,
            sectionType: 'dynamic'
          });
        });
        
        objects.push({
          id: `line-${lineId++}`,
          text: ')]',
          editable: false,
          deletable: false,
          sectionId: section.id,
          sectionType: 'dynamic'
        });
      }
    });
    
    return objects;
  }
  
  // Generate preview HTML combining all sections
  let previewHTML = $derived.by(() => {
    // Access currentIngredientValues to create a dependency
    const ingredientVals = { ...currentIngredientValues };
    
    return sections.map(section => {
      if (section.type === 'static') {
        // Replace newlines with <br> for proper line break rendering
        return sanitizeHTML(section.content.replace(/\n/g, '<br>'));
      } else if (section.type === 'dynamic') {
        const testCase = activeTestCase[section.id];
        const evaluated = evaluateCode(section.content, testCase?.variables);
        // Also handle line breaks in dynamic content
        const evalString = evaluated || '';
        return sanitizeHTML(evalString.replace(/\n/g, '<br>'));
      }
      return '';
    }).join('<br>');
  });
  
  let jsonOutput = $derived(sectionsToJSON());
  let lineObjects = $derived(sectionsToLineObjects());
  
  // Helper to set sections and update nextSectionId
  function setSections(newSections) {
    // Ensure dynamic sections have testCases for backward compatibility
    const migratedSections = newSections.map(section => {
      // If it's a dynamic section without testCases, add a default one
      if (section.type === 'dynamic' && !section.testCases) {
        return {
          ...section,
          testCases: [{ name: 'Default', variables: {} }]
        };
      }
      return section;
    });
    
    sections = migratedSections;
    
    // Update nextSectionId to be higher than any existing ID
    if (migratedSections && migratedSections.length > 0) {
      const maxId = Math.max(...migratedSections.map(s => {
        const id = typeof s.id === 'number' ? s.id : parseInt(s.id) || 0;
        return id;
      }));
      nextSectionId = maxId + 1;
    } else {
      nextSectionId = 1;
    }
  }

  // Clear editor for new work
  function clearEditor() {
    setSections([]);
    currentIngredient = '';
    currentReferenceName = '';
    hasUnsavedChanges = false;
    lastSavedTime = null;
    loadedReferenceId = null;
    originalSections = null;
    activeTestCase = {};
    expandedTestCases = {};
  }
  
  // Section management
  function addSection(type) {
    // Ensure nextSectionId is higher than any existing section ID
    const maxId = Math.max(0, ...sections.map(s => typeof s.id === 'number' ? s.id : parseInt(s.id) || 0));
    nextSectionId = Math.max(nextSectionId, maxId + 1);
    
    const newSection = {
      id: nextSectionId++,
      type: type,
      content: type === 'static' 
        ? '' 
        : '// Write JavaScript that returns HTML\nreturn ""'
    };
    
    if (type === 'dynamic') {
      newSection.testCases = [
        { name: 'Default', variables: {} }
      ];
    }
    
    sections = [...sections, newSection];
    checkForChanges();
  }
  
  function deleteSection(id) {
    sections = sections.filter(s => s.id !== id);
    delete activeTestCase[id];
    delete expandedTestCases[id];
    checkForChanges();
  }
  
  function updateSectionContent(id, content) {
    sections = sections.map(s => 
      s.id === id ? { ...s, content } : s
    );
    checkForChanges();
  }
  
  function handleConvertToDynamic(sectionId, content) {
    // Find the position of "[f(" in the content
    const bracketIndex = content.indexOf('[f(');
    
    if (bracketIndex === -1) return; // Safety check
    
    // Extract HTML before "[f(" and the beginning of the dynamic expression
    const htmlBefore = content.substring(0, bracketIndex).trim();
    const dynamicStart = content.substring(bracketIndex + 3); // Skip "[f("
    
    // Convert the section to dynamic type
    sections = sections.map(section => {
      if (section.id === sectionId && section.type === 'static') {
        // Create the dynamic content
        let dynamicContent = '';
        
        if (htmlBefore) {
          // If there was HTML before [f(, include it as a return statement
          dynamicContent = `// Converted from static HTML\nlet html = \`${htmlBefore}\`;\n\n// Your dynamic expression here\n${dynamicStart ? dynamicStart : '// Start typing your JavaScript expression...'}`;
        } else {
          // No HTML before, just start with the dynamic expression
          dynamicContent = `// Your dynamic expression here\n${dynamicStart ? dynamicStart : '// Start typing your JavaScript expression...'}`;
        }
        
        return {
          ...section,
          type: 'dynamic',
          content: dynamicContent,
          testCases: [
            { name: 'Default', variables: {} }
          ]
        };
      }
      return section;
    });
    
    checkForChanges();
  }
  
  // Check if content has changed from original
  function checkForChanges() {
    if (originalSections) {
      const currentSectionsStr = JSON.stringify(sections);
      hasUnsavedChanges = currentSectionsStr !== originalSections;
    } else {
      // If no original sections, we have unsaved changes if there's any content
      hasUnsavedChanges = sections.length > 0;
    }
  }
  
  // Test case management
  function addTestCase(sectionId) {
    sections = sections.map(section => {
      if (section.id === sectionId && section.testCases) {
        const newTestCase = {
          name: `Test Case ${section.testCases.length + 1}`,
          variables: {}
        };
        return {
          ...section,
          testCases: [...section.testCases, newTestCase]
        };
      }
      return section;
    });
  }
  
  function updateTestCase(sectionId, index, updates) {
    sections = sections.map(section => {
      if (section.id === sectionId && section.testCases) {
        const newTestCases = [...section.testCases];
        newTestCases[index] = { ...newTestCases[index], ...updates };
        return { ...section, testCases: newTestCases };
      }
      return section;
    });
  }
  
  function deleteTestCase(sectionId, index) {
    sections = sections.map(section => {
      if (section.id === sectionId && section.testCases) {
        const newTestCases = section.testCases.filter((_, i) => i !== index);
        return { ...section, testCases: newTestCases };
      }
      return section;
    });
  }
  
  function setActiveTestCase(sectionId, testCase) {
    activeTestCase[sectionId] = testCase;
    activeTestCase = { ...activeTestCase }; // Trigger reactivity
    
    // In TPN mode, the preview automatically updates via reactive statements
    // The previewHTML derived value will re-evaluate when activeTestCase changes
    
    // Run test if it has expectations
    if (testCase && (testCase.expectedOutput || testCase.expectedStyles)) {
      runSingleTest(sectionId, testCase);
    }
  }
  
  // Extract styles from HTML string
  function extractStylesFromHTML(htmlString) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    const styles = {};
    
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
  function stripHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  
  // Validate test output against expectations
  function validateTestOutput(actual, expected, matchType = 'contains') {
    const actualText = stripHTML(actual).trim();
    const expectedText = (expected || '').trim();
    
    if (!expectedText) return true; // No expectation means pass
    
    switch (matchType) {
      case 'exact':
        return actualText === expectedText;
      case 'contains':
        return actualText.includes(expectedText);
      case 'regex':
        try {
          const regex = new RegExp(expectedText);
          return regex.test(actualText);
        } catch (e) {
          return false;
        }
      default:
        return actualText.includes(expectedText);
    }
  }
  
  // Validate styles against expectations
  function validateStyles(actualStyles, expectedStyles) {
    if (!expectedStyles || Object.keys(expectedStyles).length === 0) {
      return { passed: true };
    }
    
    const errors = [];
    for (const [prop, expectedValue] of Object.entries(expectedStyles)) {
      const actualValue = actualStyles[prop];
      if (actualValue !== expectedValue) {
        errors.push(`${prop}: expected "${expectedValue}", got "${actualValue || 'undefined'}"`);
      }
    }
    
    return {
      passed: errors.length === 0,
      errors
    };
  }
  
  // Run a single test case
  function runSingleTest(sectionId, testCase) {
    const section = sections.find(s => s.id === sectionId);
    if (!section || section.type !== 'dynamic') return;
    
    // Evaluate the code with test variables
    const output = evaluateCode(section.content, testCase.variables);
    const actualText = stripHTML(output);
    const actualStyles = extractStylesFromHTML(output);
    
    // Validate output
    const outputPassed = validateTestOutput(output, testCase.expectedOutput, testCase.matchType);
    
    // Validate styles
    const styleValidation = validateStyles(actualStyles, testCase.expectedStyles);
    
    // Combine results
    const passed = outputPassed && styleValidation.passed;
    
    let error = '';
    if (!outputPassed) {
      error = `Output mismatch: expected "${testCase.expectedOutput}", got "${actualText}"`;
    }
    if (!styleValidation.passed && styleValidation.errors) {
      error += (error ? '\n' : '') + 'Style mismatches: ' + styleValidation.errors.join(', ');
    }
    
    // Update test result
    const testIndex = section.testCases.findIndex(tc => tc === testCase);
    if (testIndex !== -1) {
      updateTestCase(sectionId, testIndex, {
        testResult: {
          passed,
          actualOutput: actualText,
          actualStyles,
          error: error || undefined,
          timestamp: Date.now()
        }
      });
    }
    
    return { passed, error };
  }
  
  // Run all tests for a section
  function runSectionTests(sectionId) {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.testCases) return;
    
    const results = [];
    section.testCases.forEach(testCase => {
      if (testCase.expectedOutput || testCase.expectedStyles) {
        const result = runSingleTest(sectionId, testCase);
        results.push({ testCase, ...result });
      }
    });
    
    return results;
  }
  
  // Run all tests across all sections
  function runAllTests() {
    const allResults = [];
    sections.forEach(section => {
      if (section.type === 'dynamic' && section.testCases) {
        const sectionResults = runSectionTests(section.id);
        if (sectionResults && sectionResults.length > 0) {
          allResults.push({
            sectionId: section.id,
            sectionName: `Section ${section.id}`,
            results: sectionResults
          });
        }
      }
    });
    
    // Calculate summary
    const totalTests = allResults.reduce((sum, sr) => sum + sr.results.length, 0);
    const passedTests = allResults.reduce((sum, sr) => 
      sum + sr.results.filter(r => r.passed).length, 0);
    
    const summary = {
      sections: allResults,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        timestamp: Date.now()
      }
    };
    
    testSummary = summary;
    showTestSummary = true;
    
    return summary;
  }
  
  function toggleTestCases(sectionId) {
    expandedTestCases[sectionId] = !expandedTestCases[sectionId];
    expandedTestCases = { ...expandedTestCases }; // Trigger reactivity
  }
  
  // Drag and drop for sections
  function handleSectionDragStart(e, section) {
    draggedSection = section;
    e.dataTransfer.effectAllowed = 'move';
  }
  
  function handleSectionDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  function handleSectionDrop(e, targetSection) {
    e.preventDefault();
    if (!draggedSection || draggedSection.id === targetSection.id) return;
    
    const draggedIndex = sections.findIndex(s => s.id === draggedSection.id);
    const targetIndex = sections.findIndex(s => s.id === targetSection.id);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newSections = [...sections];
      const [removed] = newSections.splice(draggedIndex, 1);
      newSections.splice(targetIndex, 0, removed);
      sections = newSections;
      checkForChanges();
    }
    
    draggedSection = null;
  }
  
  function handleSectionDragEnd() {
    draggedSection = null;
  }
  
  // Clipboard
  async function copyToClipboard() {
    try {
      const jsonString = JSON.stringify(jsonOutput, null, 2);
      await navigator.clipboard.writeText(jsonString);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
  
  // Sidebar handlers
  function handleLoadReference(reference, ingredient = null) {
    if (reference && reference.sections) {
      setSections(reference.sections);
      // Update work context
      currentIngredient = reference.ingredient || '';
      currentReferenceName = reference.name || '';
      loadedReferenceId = reference.id || null;
      hasUnsavedChanges = false;
      lastSavedTime = reference.updatedAt || null;
      // Store original sections for comparison
      originalSections = JSON.stringify(reference.sections);
      
      // Set loadedIngredient if provided
      if (ingredient) {
        loadedIngredient = {
          id: ingredient.KEYNAME || ingredient.keyname,
          name: ingredient.KEYNAME || ingredient.keyname,
          display: ingredient.DISPLAY || ingredient.display,
          type: ingredient.TYPE || ingredient.type,
          unit: ingredient.Unit || ingredient.unit
        };
      }
    }
  }
  
  function handleSaveReference() {
    // The sidebar will handle the actual saving
    // Just return the current sections
    return sections;
  }
  
  // Handle config activation from sidebar
  function handleConfigActivate(configId, ingredients) {
    activeConfigId = configId;
    activeConfigIngredients = ingredients || [];
    console.log(`Config activated: ${configId} with ${activeConfigIngredients.length} ingredients`);
  }
  
  // Handle TPN value changes
  function handleTPNValuesChange(tpnInstance) {
    currentTPNInstance = tpnInstance;
  }
  
  // Filter only dynamic sections for TPN panel
  let dynamicSections = $derived(sections.filter(s => s.type === 'dynamic'));
  
  // Handle key insert from reference panel
  function handleKeyInsert(key) {
    // Insert me.getValue('key') at cursor position in active editor
    const snippet = `me.getValue('${key}')`;
    // For now, just copy to clipboard
    navigator.clipboard.writeText(snippet).then(() => {
      // Could show a toast notification here
      console.log(`Copied: ${snippet}`);
    });
  }
  
  // Handle ingredient value changes from input panel
  function handleIngredientChange(key, value) {
    // Create a new object to ensure reactivity in Svelte 5
    currentIngredientValues = { ...currentIngredientValues, [key]: value };
  }
  
  // Get badge color for ingredient category
  function getIngredientBadgeColor(key) {
    const category = getKeyCategory(key);
    const colors = {
      'BASIC_PARAMETERS': '#007bff',
      'MACRONUTRIENTS': '#28a745',
      'ELECTROLYTES': '#ffc107',
      'ADDITIVES': '#6c757d',
      'PREFERENCES': '#17a2b8',
      'CALCULATED_VOLUMES': '#e83e8c',
      'CLINICAL_CALCULATIONS': '#fd7e14',
      'WEIGHT_CALCULATIONS': '#6f42c1',
      'OTHER': '#333'
    };
    return colors[category] || colors.OTHER;
  }
  
  // Handle test generation
  function handleTestsGenerated(sectionId, generatedTests) {
    currentGeneratedTests = generatedTests;
    targetSectionId = sectionId;
    showTestGeneratorModal = true;
  }
  
  // Handle AI workflow inspector
  function openAIWorkflowInspector(sectionId) {
    const section = sections.find(s => s.id === sectionId);
    if (section && section.type === 'dynamic') {
      inspectorCurrentSection = section;
      showAIWorkflowInspector = true;
    }
  }
  
  function handleAITestsGenerated(sectionId, testsToImport) {
    // Use the same import logic as the existing test generator
    handleImportTests(sectionId, testsToImport);
  }
  
  function handleImportTests(sectionId, testsToImport) {
    sections = sections.map(section => {
      if (section.id === sectionId && section.testCases) {
        // Add new tests to existing test cases
        const newTestCases = [...section.testCases, ...testsToImport];
        return { ...section, testCases: newTestCases };
      }
      return section;
    });
    checkForChanges();
  }
  
  // Create calculation TPN instance once
  let calculationTPNInstance = new TPNLegacySupport();

  // Auto-populate test cases with extracted ingredients
  $effect(() => {
    Object.entries(ingredientsBySection).forEach(([sectionId, { allKeys }]) => {
      const section = sections.find(s => s.id === parseInt(sectionId));
      if (section && section.testCases) {
        section.testCases.forEach(testCase => {
          // Add any new keys that aren't already in the test case
          allKeys.forEach(key => {
            // Skip calculated values - they don't need to be in test variables
            if (isCalculatedValue(key)) {
              return;
            }
            
            if (testCase.variables[key] === undefined) {
              // Set default value based on whether it's a TPN key or custom
              if (isValidKey(key)) {
                // For TPN keys, use appropriate defaults
                testCase.variables[key] = 0;
              } else {
                // For custom keys, use empty string
                testCase.variables[key] = '';
              }
            }
          });
          
          // Remove variables that are no longer referenced in the code
          // But keep calculated values out of the variables
          Object.keys(testCase.variables).forEach(key => {
            if (!allKeys.includes(key) || isCalculatedValue(key)) {
              delete testCase.variables[key];
            }
          });
        });
      }
    });
  });
  
  // Handlers for new components
  function handleIngredientSelection(ingredient) {
    console.log('App: handleIngredientSelection called', {
      ingredient: ingredient.name,
      action: 'Opening diff viewer'
    });
    selectedIngredientForDiff = ingredient;
    showDiffViewer = true;
  }
  
  function handleCreateReference(ingredient, populationType) {
    // Set up for creating a new reference
    currentIngredient = ingredient.name;
    currentPopulationType = populationType;
    currentReferenceName = `${ingredient.name} - ${populationType}`;
    setSections([]);
    addSection('static');
    showIngredientManager = false;
    
    // Store ingredient details for context display
    loadedIngredient = ingredient;
    loadedReference = {
      name: currentReferenceName,
      populationType: populationType,
      healthSystem: null, // Will be set when saving
      version: null
    };
    currentHealthSystem = null;
    loadedReferenceId = null;
    hasUnsavedChanges = false;
    originalSections = '[]';
  }
  
  // Save current work with commit message
  async function saveCurrentWork(commitMessage = null) {
    if (!loadedIngredient || !loadedReferenceId) {
      alert('No reference loaded to save');
      return;
    }
    
    try {
      const { referenceService } = await import('./lib/firebaseDataService.js');
      const { isIngredientShared } = await import('./lib/sharedIngredientService.js');
      
      // Prepare the reference data
      const referenceData = {
        id: loadedReferenceId,
        name: currentReferenceName,
        sections: sections,
        populationType: currentPopulationType,
        healthSystem: currentHealthSystem,
        // Include validation data
        validationStatus: currentValidationStatus,
        validationNotes: currentValidationNotes,
        validatedBy: currentValidatedBy,
        validatedAt: currentValidatedAt,
        testResults: currentTestResults
      };
      
      // Check if this ingredient is shared
      const sharedStatus = await isIngredientShared(loadedIngredient.id);
      
      if (sharedStatus.isShared && sharedStatus.sharedCount > 1) {
        // Show selective apply dialog
        pendingReferenceData = { ...referenceData, commitMessage };
        showSelectiveApply = true;
      } else {
        // Save normally
        await referenceService.saveReference(loadedIngredient.id, referenceData, commitMessage);
        
        // Update state
        hasUnsavedChanges = false;
        lastSavedTime = new Date();
        originalSections = JSON.stringify(sections);
        
        console.log('Reference saved successfully with commit message:', commitMessage);
      }
    } catch (error) {
      console.error('Error saving reference:', error);
      alert('Failed to save reference. Please try again.');
    }
  }
  
  // Handle save with commit message dialog
  function handleSaveWithCommit() {
    if (!hasUnsavedChanges) {
      return;
    }
    
    showCommitMessageDialog = true;
  }
  
  // Handle commit message confirmation
  function handleCommitMessageConfirm(commitMessage) {
    saveCurrentWork(commitMessage);
    showCommitMessageDialog = false;
  }
  
  // Handle keyboard shortcuts
  function handleKeyDown(e) {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (hasUnsavedChanges) {
        handleSaveWithCommit();
      }
    }
    
    // Ctrl+T or Cmd+T to run all tests
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      runAllTests();
    }
    
    // Ctrl+Shift+T or Cmd+Shift+T to run current section's tests
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      // Find the currently active or focused section
      const activeSectionId = Object.keys(activeTestCase)[0];
      if (activeSectionId) {
        runSectionTests(activeSectionId);
      }
    }
    
    // Escape to close test summary modal
    if (e.key === 'Escape' && showTestSummary) {
      showTestSummary = false;
    }
  }
  
  function handleEditReference(ingredient, reference) {
    console.log('App: handleEditReference called', {
      ingredient: ingredient.name,
      reference: reference?.name,
      hasSections: !!(reference?.sections),
      fullReference: reference
    });
    
    // Load the reference for editing
    if (reference) {
      // Check if sections exist and have content
      if (!reference.sections || reference.sections.length === 0) {
        console.warn('Reference has empty sections! User needs to run "Fix Empty Sections" in Ingredient Manager.');
        // Show a warning to the user
        alert(`This reference has no content sections. Please run "Fix Empty Sections" in the Ingredient Manager to populate the clinical notes.`);
        return;
      }
      
      setSections(reference.sections);
      currentIngredient = ingredient.name;
      currentReferenceName = reference.name;
      currentPopulationType = reference.populationType;
      loadedReferenceId = reference.id;
      hasUnsavedChanges = false;
      lastSavedTime = reference.updatedAt;
      originalSections = JSON.stringify(reference.sections);
      
      // Load validation data
      currentValidationStatus = reference.validationStatus || 'untested';
      currentValidationNotes = reference.validationNotes || '';
      currentValidatedBy = reference.validatedBy || null;
      currentValidatedAt = reference.validatedAt || null;
      currentTestResults = reference.testResults || null;
      
      // Close all other views to ensure Dynamic Text Editor is visible
      showIngredientManager = false;
      // Don't close diff viewer - allow it to stay open for comparison
      showMigrationTool = false;
      showAIWorkflowInspector = false;
      showTestGeneratorModal = false;
      showSidebar = false;
      
      // Ensure preview panel is visible
      previewCollapsed = false;
      previewMode = 'preview';
      
      // Store full ingredient and reference details
      loadedIngredient = ingredient;
      loadedReference = reference;
      currentHealthSystem = reference.healthSystem;
      
      console.log('App: Reference loaded successfully', {
        sectionsCount: sections.length,
        viewsClosed: true,
        previewVisible: !previewCollapsed
      });
      
      // Scroll to top of the editor to show the loaded content
      // Also flash a visual indicator
      setTimeout(() => {
        const editorElement = document.querySelector('.editor');
        if (editorElement) {
          editorElement.scrollTop = 0;
          // Add a brief highlight animation
          editorElement.style.transition = 'background-color 0.3s ease';
          editorElement.style.backgroundColor = '#e8f4fd';
          setTimeout(() => {
            editorElement.style.backgroundColor = '';
          }, 300);
        }
      }, 100);
    }
  }
  
  function handleMigrationComplete(result) {
    showMigrationTool = false;
    // Optionally refresh the ingredient manager
    if (showIngredientManager) {
      // The manager will auto-refresh due to Firebase listeners
    }
  }
  
  // Helper functions for population types
  function getPopulationColor(populationType) {
    const colors = {
      [POPULATION_TYPES.NEONATAL]: '#ff6b6b',
      [POPULATION_TYPES.PEDIATRIC]: '#4ecdc4',
      [POPULATION_TYPES.ADOLESCENT]: '#45b7d1',
      [POPULATION_TYPES.ADULT]: '#5f27cd',
      // Handle legacy values from Firebase
      'pediatric': '#4ecdc4',
      'child': '#4ecdc4',
      'neonatal': '#ff6b6b',
      'adolescent': '#45b7d1',
      'adult': '#5f27cd'
    };
    return colors[populationType] || '#666';
  }
  
  function getPopulationName(populationType) {
    const names = {
      [POPULATION_TYPES.NEONATAL]: 'Neonatal',
      [POPULATION_TYPES.PEDIATRIC]: 'Child',
      [POPULATION_TYPES.ADOLESCENT]: 'Adolescent',
      [POPULATION_TYPES.ADULT]: 'Adult',
      // Handle legacy values from Firebase
      'pediatric': 'Child',
      'child': 'Child',
      'neonatal': 'Neonatal',
      'adolescent': 'Adolescent',
      'adult': 'Adult'
    };
    return names[populationType] || populationType;
  }
  
  // Handle population type pill click
  async function handlePopulationClick() {
    if (!loadedIngredient || loadingPopulations) return;
    
    loadingPopulations = true;
    try {
      // Import the reference service
      const { referenceService } = await import('./lib/firebaseDataService.js');
      
      // Get all references for the current ingredient
      const allReferences = await referenceService.getReferencesForIngredient(loadedIngredient.id);
      
      // Group by population type and filter by health system if applicable
      const populationMap = new Map();
      
      allReferences.forEach(ref => {
        // If we have a current health system, only show references from that system
        if (!currentHealthSystem || ref.healthSystem === currentHealthSystem) {
          if (!populationMap.has(ref.populationType)) {
            populationMap.set(ref.populationType, []);
          }
          populationMap.get(ref.populationType).push(ref);
        }
      });
      
      // Convert to array format for display
      availablePopulations = Array.from(populationMap.entries()).map(([popType, refs]) => ({
        populationType: popType,
        references: refs,
        isActive: popType === currentPopulationType
      }));
      
      // Sort by population type order
      const order = [POPULATION_TYPES.NEONATAL, POPULATION_TYPES.PEDIATRIC, POPULATION_TYPES.ADOLESCENT, POPULATION_TYPES.ADULT];
      availablePopulations.sort((a, b) => order.indexOf(a.populationType) - order.indexOf(b.populationType));
      
      showPopulationDropdown = true;
    } catch (error) {
      console.error('Error loading population types:', error);
    } finally {
      loadingPopulations = false;
    }
  }
  
  // Switch to a different population type
  function switchToPopulation(populationType, reference) {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to switch to a different population type?')) {
        return;
      }
    }
    
    showPopulationDropdown = false;
    handleEditReference(loadedIngredient, reference);
  }
  
</script>

<div class="app-container {showSidebar ? 'sidebar-open' : ''}" onkeydown={handleKeyDown}>
  {#if showSidebar}
    <Sidebar 
      onLoadReference={handleLoadReference}
      onSaveReference={handleSaveReference}
      onConfigActivate={handleConfigActivate}
      currentSections={sections}
      activeConfigId={activeConfigId}
      activeConfigIngredients={activeConfigIngredients}
    />
  {/if}
  
  <main>
    <Navbar
      bind:showSidebar
      bind:tpnMode
      bind:showOutput
      bind:outputMode
      bind:showKeyReference
      currentReferenceName={currentReferenceName}
      currentIngredient={currentIngredient}
      hasUnsavedChanges={hasUnsavedChanges}
      lastSavedTime={lastSavedTime}
      firebaseEnabled={firebaseEnabled}
      onSave={handleSaveWithCommit}
      onNewDocument={() => {
        if (hasUnsavedChanges && !confirm('You have unsaved changes. Start new anyway?')) {
          return;
        }
        clearEditor();
      }}
      onExport={() => {
        // Show export modal with format options
        showExportModal = true;
      }}
      onOpenIngredientManager={() => showIngredientManager = true}
      onOpenMigrationTool={() => showMigrationTool = true}
      onOpenPreferences={() => showPreferences = true}
      onOpenDiffViewer={async () => {
        console.log('Compare button clicked', { loadedIngredient, showIngredientManager, showDiffViewer });
        
        // Make sure to close ingredient manager if it's open
        showIngredientManager = false;
        
        if (loadedIngredient) {
          // If we don't have a proper Firebase ID, try to find the ingredient
          if (!loadedIngredient.id || loadedIngredient.id === loadedIngredient.name) {
            try {
              // Import the ingredient service to search for the ingredient
              const { ingredientService } = await import('./lib/firebaseDataService.js');
              const ingredients = await ingredientService.getAllIngredients();
              
              // Find the ingredient by name
              const foundIngredient = ingredients.find(ing => 
                ing.name === loadedIngredient.name || 
                ing.name === loadedIngredient.id
              );
              
              if (foundIngredient) {
                console.log('Found ingredient:', foundIngredient);
                selectedIngredientForDiff = foundIngredient;
                showDiffViewer = true;
                showIngredientManager = false; // Ensure it's closed
              } else {
                alert(`Cannot find ingredient "${loadedIngredient.name}" in Firebase. Make sure it has been properly imported.`);
              }
            } catch (error) {
              console.error('Error finding ingredient:', error);
              alert('Error loading ingredient data. Please try again.');
            }
          } else {
            // We already have a proper ingredient object
            console.log('Using existing ingredient:', loadedIngredient);
            selectedIngredientForDiff = loadedIngredient;
            showDiffViewer = true;
            showIngredientManager = false; // Ensure it's closed
          }
        }
      }}
      copied={copied}
    />
    
    <div class="editor-container {previewCollapsed ? 'preview-collapsed' : ''}">
    <div class="editor-panel">
      <div class="panel-header">
        <h2>Content Sections</h2>
        <div class="header-controls">
          <button 
            class="run-all-tests-btn"
            onclick={runAllTests}
            title="Run all test cases with expectations (Ctrl/Cmd+T)"
          >
            🧪 Run All Tests
          </button>
          <div class="add-section-buttons">
            <button class="add-btn" onclick={() => addSection('static')}>
              + Static HTML
            </button>
            <button class="add-btn" onclick={() => addSection('dynamic')}>
              + Dynamic JS
            </button>
          </div>
        </div>
      </div>
      
      {#if loadedIngredient && loadedReference}
        <div class="ingredient-context-bar">
          <span class="context-label">Editing:</span>
          <button 
            class="ingredient-pill"
            onclick={() => showIngredientManager = true}
            title="Click to open ingredient manager"
          >
            📦 {loadedIngredient.name}
          </button>
          <span class="context-separator">→</span>
          <button 
            class="population-pill clickable"
            style="background-color: {getPopulationColor(currentPopulationType)}"
            onclick={handlePopulationClick}
            disabled={loadingPopulations}
            title="Click to switch population type"
          >
            {getPopulationName(currentPopulationType)}
            <span class="dropdown-indicator">▼</span>
          </button>
          
          {#if showPopulationDropdown}
            <div class="population-dropdown-backdrop" onclick={() => showPopulationDropdown = false}></div>
            <div class="population-dropdown">
              <div class="dropdown-header">Switch Population Type</div>
              {#if availablePopulations.length === 0}
                <div class="dropdown-empty">No other population types available</div>
              {:else}
                {#each availablePopulations as popOption}
                  <div class="population-option {popOption.isActive ? 'active' : ''}">
                    <div 
                      class="population-option-header"
                      style="border-left-color: {getPopulationColor(popOption.populationType)}"
                    >
                      <span class="population-name">{getPopulationName(popOption.populationType)}</span>
                      {#if popOption.isActive}
                        <span class="active-badge">Current</span>
                      {/if}
                    </div>
                    {#if popOption.references.length > 0}
                      <div class="reference-list">
                        {#each popOption.references as ref}
                          <button 
                            class="reference-option"
                            onclick={() => switchToPopulation(popOption.populationType, ref)}
                            disabled={popOption.isActive && ref.id === loadedReferenceId}
                          >
                            <span class="ref-health-system">🏥 {ref.healthSystem}</span>
                            {#if ref.version}
                              <span class="ref-version">v{ref.version}</span>
                            {/if}
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
          {#if currentHealthSystem}
            <span class="context-separator">→</span>
            <span class="health-system-pill">
              🏥 {currentHealthSystem}
            </span>
          {/if}
          {#if loadedReference.version}
            <span class="version-badge">v{loadedReference.version}</span>
          {/if}
        </div>
        
        <!-- Validation Status Section -->
        <div class="validation-section">
          <ValidationStatus 
            status={currentValidationStatus}
            validatedBy={currentValidatedBy}
            validatedAt={currentValidatedAt}
            testResults={currentTestResults}
            notes={currentValidationNotes}
            compact={false}
            onUpdate={(validationData) => {
              currentValidationStatus = validationData.status;
              currentValidationNotes = validationData.notes;
              currentValidatedBy = validationData.validatedBy;
              currentValidatedAt = validationData.validatedAt;
              hasUnsavedChanges = true;
            }}
          />
        </div>
      {/if}
      
      <div class="sections" role="list">
        {#if sections.length === 0}
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>
            <h3 class="empty-state-title">Start Creating Your Reference Text</h3>
            <p class="empty-state-description">
              Add sections to build your dynamic text content
            </p>
            <div class="empty-state-actions">
              <button class="empty-state-btn static" onclick={() => addSection('static')}>
                <span class="btn-icon">📝</span>
                <span class="btn-label">Add Static HTML</span>
                <span class="btn-hint">For fixed content and formatting</span>
              </button>
              <button class="empty-state-btn dynamic" onclick={() => addSection('dynamic')}>
                <span class="btn-icon">⚡</span>
                <span class="btn-label">Add Dynamic JavaScript</span>
                <span class="btn-hint">For calculations and logic</span>
              </button>
            </div>
          </div>
        {:else}
          {#each sections as section (section.id)}
            <div 
              class="section {draggedSection?.id === section.id ? 'dragging' : ''}"
              role="listitem"
              draggable="true"
              ondragstart={(e) => handleSectionDragStart(e, section)}
              ondragover={handleSectionDragOver}
              ondrop={(e) => handleSectionDrop(e, section)}
              ondragend={handleSectionDragEnd}
            >
            <div class="section-header">
              <span class="drag-handle">≡</span>
              <span class="section-type {section.type}">
                {section.type === 'static' ? '📝 HTML' : '⚡ JavaScript'}
              </span>
              
              {#if section.type === 'dynamic' && ingredientsBySection[section.id]}
                <div class="ingredient-badges">
                  {#each ingredientsBySection[section.id].tpnKeys as key}
                    <span 
                      class="ingredient-badge tpn-badge" 
                      style="background-color: {getIngredientBadgeColor(key)}"
                      title="TPN: {key}"
                    >
                      {key}
                    </span>
                  {/each}
                  {#each ingredientsBySection[section.id].calculatedKeys as key}
                    <span 
                      class="ingredient-badge calculated-badge" 
                      style="background-color: {getIngredientBadgeColor(key)}"
                      title="Calculated: {key}"
                    >
                      {key} 📊
                    </span>
                  {/each}
                  {#each ingredientsBySection[section.id].customKeys as key}
                    <span 
                      class="ingredient-badge custom-badge"
                      title="Custom: {key}"
                    >
                      {key}
                    </span>
                  {/each}
                  {#if ingredientsBySection[section.id].allKeys.length > 0}
                    <span class="ingredient-count">
                      {ingredientsBySection[section.id].allKeys.length} vars
                    </span>
                  {/if}
                </div>
              {/if}
              
              <button 
                class="delete-section-btn"
                onclick={() => deleteSection(section.id)}
                title="Delete section"
              >
                ×
              </button>
            </div>
            
            {#if editingSection === section.id}
              <div class="editor-wrapper">
                <CodeEditor
                  value={section.content}
                  language={section.type === 'static' ? 'html' : 'javascript'}
                  onChange={(content) => updateSectionContent(section.id, content)}
                  on:convertToDynamic={(e) => handleConvertToDynamic(section.id, e.detail.content)}
                />
                <button 
                  class="done-editing-btn"
                  onclick={() => editingSection = null}
                >
                  Done Editing
                </button>
              </div>
            {:else}
              <div 
                class="content-preview"
                ondblclick={() => editingSection = section.id}
                onkeydown={(e) => e.key === 'Enter' && (editingSection = section.id)}
                role="button"
                tabindex="0"
                title="Double-click to edit"
              >
                <pre>{section.content}</pre>
              </div>
            {/if}
            
            {#if section.type === 'dynamic' && section.testCases}
              <div class="test-cases">
                <div class="test-cases-header">
                  <button 
                    class="test-cases-toggle" 
                    onclick={() => toggleTestCases(section.id)}
                    type="button"
                    aria-expanded={expandedTestCases[section.id] ? 'true' : 'false'}
                    aria-controls={`test-cases-${section.id}`}
                  >
                    <span class="collapse-icon">{expandedTestCases[section.id] ? '▼' : '▶'}</span>
                    <h4>Test Cases</h4>
                    {#if activeTestCase[section.id]}
                      <span class="active-test-badge">{activeTestCase[section.id].name}</span>
                    {/if}
                  </button>
                  <div class="test-actions">
                    <button 
                      class="add-test-btn" 
                      onclick={() => {
                        addTestCase(section.id);
                        expandedTestCases[section.id] = true;
                        expandedTestCases = { ...expandedTestCases };
                      }}
                    >
                      + Add Test
                    </button>
                    <TestGeneratorButton 
                      section={section}
                      tpnMode={tpnMode}
                      onTestsGenerated={(tests) => handleTestsGenerated(section.id, tests)}
                    />
                    <button 
                      class="ai-inspector-btn"
                      onclick={() => openAIWorkflowInspector(section.id)}
                      title="Open AI Workflow Inspector"
                    >
                      🔍 AI Inspector
                    </button>
                  </div>
                </div>
                
                {#if expandedTestCases[section.id]}
                  <div class="test-case-list" id={`test-cases-${section.id}`}>
                  {#each section.testCases as testCase, index}
                    <div class="test-case {activeTestCase[section.id] === testCase ? 'active' : ''}">
                      <div class="test-case-header">
                        <input 
                          type="text" 
                          value={testCase.name}
                          class="test-case-name"
                          oninput={(e) => updateTestCase(section.id, index, { name: e.target.value })}
                        />
                        <button 
                          class="test-case-run {activeTestCase[section.id] === testCase ? 'running' : ''}"
                          onclick={() => setActiveTestCase(section.id, testCase)}
                          title="Run this test case"
                        >
                          {activeTestCase[section.id] === testCase ? '■' : '▶'}
                        </button>
                        {#if section.testCases.length > 1}
                          <button 
                            class="test-case-delete"
                            onclick={() => deleteTestCase(section.id, index)}
                            title="Delete test case"
                          >
                            ×
                          </button>
                        {/if}
                      </div>
                      
                      <div class="test-variables">
                        <div class="variable-header">
                          <span>Variables:</span>
                          <button 
                            class="add-var-btn"
                            onclick={() => {
                              const varName = prompt('Variable name:');
                              if (varName) {
                                const vars = { ...testCase.variables, [varName]: 0 };
                                updateTestCase(section.id, index, { variables: vars });
                              }
                            }}
                          >
                            + Add
                          </button>
                        </div>
                        
                        {#each Object.entries(testCase.variables || {}) as [key, value]}
                          <div class="variable-row">
                            <span class="var-name">{key}:</span>
                            <input 
                              type="text"
                              value={value}
                              class="var-value"
                              oninput={(e) => {
                                const vars = { ...testCase.variables };
                                // Try to parse as number, otherwise keep as string
                                const val = e.target.value;
                                vars[key] = !isNaN(val) && val !== '' ? Number(val) : val;
                                updateTestCase(section.id, index, { variables: vars });
                              }}
                            />
                            <button 
                              class="var-delete"
                              onclick={() => {
                                const vars = { ...testCase.variables };
                                delete vars[key];
                                updateTestCase(section.id, index, { variables: vars });
                              }}
                            >
                              ×
                            </button>
                          </div>
                        {/each}
                      </div>
                      
                      <!-- Test Expectations -->
                      <div class="test-expectations">
                        <div class="expectation-header">
                          <span>Expected Output:</span>
                          <select 
                            class="match-type-select"
                            value={testCase.matchType || 'contains'}
                            onchange={(e) => updateTestCase(section.id, index, { matchType: e.target.value })}
                          >
                            <option value="exact">Exact Match</option>
                            <option value="contains">Contains</option>
                            <option value="regex">Regex</option>
                          </select>
                        </div>
                        <textarea
                          class="expected-output"
                          value={testCase.expectedOutput || ''}
                          placeholder="Enter expected output text..."
                          oninput={(e) => updateTestCase(section.id, index, { expectedOutput: e.target.value })}
                        />
                        
                        <div class="expectation-header">
                          <span>Expected Styles:</span>
                          <button 
                            class="add-style-btn"
                            onclick={() => {
                              const styleProp = prompt('CSS property (e.g., color, font-weight):');
                              if (styleProp) {
                                const styleValue = prompt(`Value for ${styleProp}:`);
                                if (styleValue) {
                                  const styles = { ...(testCase.expectedStyles || {}), [styleProp]: styleValue };
                                  updateTestCase(section.id, index, { expectedStyles: styles });
                                }
                              }
                            }}
                          >
                            + Add Style
                          </button>
                        </div>
                        
                        {#if testCase.expectedStyles}
                          {#each Object.entries(testCase.expectedStyles) as [prop, value]}
                            <div class="style-row">
                              <span class="style-prop">{prop}:</span>
                              <input 
                                type="text"
                                value={value}
                                class="style-value"
                                oninput={(e) => {
                                  const styles = { ...testCase.expectedStyles };
                                  styles[prop] = e.target.value;
                                  updateTestCase(section.id, index, { expectedStyles: styles });
                                }}
                              />
                              <button 
                                class="style-delete"
                                onclick={() => {
                                  const styles = { ...testCase.expectedStyles };
                                  delete styles[prop];
                                  updateTestCase(section.id, index, { expectedStyles: Object.keys(styles).length > 0 ? styles : undefined });
                                }}
                              >
                                ×
                              </button>
                            </div>
                          {/each}
                        {/if}
                      </div>
                      
                      <!-- Test Result Display -->
                      {#if testCase.testResult}
                        <div class="test-result {testCase.testResult.passed ? 'passed' : 'failed'}">
                          <div class="result-header">
                            {testCase.testResult.passed ? '✅ Passed' : '❌ Failed'}
                          </div>
                          {#if !testCase.testResult.passed && testCase.testResult.error}
                            <div class="result-error">{testCase.testResult.error}</div>
                          {/if}
                          {#if testCase.testResult.actualOutput}
                            <div class="result-detail">
                              <strong>Actual Output:</strong> {testCase.testResult.actualOutput}
                            </div>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
        {/if}
      </div>
    </div>
    
    <div class="preview-panel">
      <div class="panel-header preview-header">
        {#if !previewCollapsed}
          <div class="preview-header-content">
            <div class="view-tabs">
              <button 
                class="view-tab {previewMode === 'preview' ? 'active' : ''}"
                onclick={() => previewMode = 'preview'}
              >
                👁️ Preview
              </button>
              <button 
                class="view-tab {previewMode === 'output' ? 'active' : ''}"
                onclick={() => {
                  previewMode = 'output';
                  showOutput = true;
                }}
              >
                📊 Output
              </button>
            </div>
            {#if previewMode === 'output'}
              <div class="output-format-selector">
                <button 
                  class="format-btn {outputMode === 'json' ? 'active' : ''}"
                  onclick={() => outputMode = 'json'}
                >
                  JSON
                </button>
                <button 
                  class="format-btn {outputMode === 'configurator' ? 'active' : ''}"
                  onclick={() => outputMode = 'configurator'}
                >
                  Configurator
                </button>
              </div>
            {/if}
          </div>
        {/if}
        <button 
          class="preview-toggle"
          onclick={() => previewCollapsed = !previewCollapsed}
          title="{previewCollapsed ? 'Show' : 'Hide'} Panel"
        >
          {previewCollapsed ? '◀' : '▶'}
        </button>
      </div>
      
      {#if referencedIngredients.length > 0 && !tpnMode && previewMode === 'preview'}
        <IngredientInputPanel 
          ingredients={referencedIngredients}
          values={currentIngredientValues}
          onChange={handleIngredientChange}
          tpnInstance={calculationTPNInstance}
        />
      {/if}
      
      {#if previewMode === 'preview'}
        <div class="preview">
          {@html previewHTML}
        </div>
      {:else if previewMode === 'output'}
        <div class="output-view">
          {#if outputMode === 'json'}
            <div class="json-output">
              <pre>{JSON.stringify(jsonOutput, null, 2)}</pre>
            </div>
          {:else}
            <div class="configurator">
              {#each lineObjects as item (item.id)}
                <div class="config-line {!item.editable ? 'non-editable' : ''}">
                  <input 
                    type="text" 
                    value={item.text}
                    readonly={true}
                    class="line-input"
                  />
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      
    </div>
  </div>
  
  {#if tpnMode}
    <TPNTestPanel 
      {dynamicSections}
      onValuesChange={handleTPNValuesChange}
      {activeTestCase}
      bind:isExpanded={tpnPanelExpanded}
    />
  {/if}
  
  </main>
  
  <!-- Test Generator Modal -->
  <TestGeneratorModal
    bind:isOpen={showTestGeneratorModal}
    generatedTests={currentGeneratedTests}
    onImportTests={handleImportTests}
    sectionId={targetSectionId}
  />
  
  <!-- AI Workflow Inspector -->
  <AIWorkflowInspector
    bind:isOpen={showAIWorkflowInspector}
    currentSection={inspectorCurrentSection}
    allSections={sections}
    onTestsGenerated={handleAITestsGenerated}
  />
  
  {#if tpnMode}
    <TPNKeyReference 
      bind:isExpanded={showKeyReference}
      onKeySelect={handleKeyInsert}
    />
  {/if}
  
  <!-- Firebase components -->
  {#if showIngredientManager}
    <div 
      class="modal-overlay" 
      onclick={() => showIngredientManager = false}
      onkeydown={(e) => e.key === 'Escape' && (showIngredientManager = false)}
      role="button"
      tabindex="-1"
      aria-label="Close modal overlay"
    >
      <div 
        class="modal-content large-modal" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ingredient Manager"
        tabindex="-1"
      >
        <button 
          class="modal-close"
          onclick={() => showIngredientManager = false}
        >
          ×
        </button>
        <IngredientManager
          bind:currentIngredient
          onSelectIngredient={handleIngredientSelection}
          onCreateReference={handleCreateReference}
          onEditReference={handleEditReference}
          activeConfigId={activeConfigId}
          activeConfigIngredients={activeConfigIngredients}
        />
      </div>
    </div>
  {/if}
  
  <!-- Ingredient Diff Viewer -->
  {#if showDiffViewer && selectedIngredientForDiff}
    <IngredientDiffViewer
      ingredient={selectedIngredientForDiff}
      healthSystem={null}
      onClose={() => {
        showDiffViewer = false;
        selectedIngredientForDiff = null;
      }}
    />
  {/if}
  
  <!-- Data Migration Tool -->
  <DataMigrationTool
    bind:isOpen={showMigrationTool}
    onMigrationComplete={handleMigrationComplete}
  />
  <!-- Commit Message Dialog -->
  <CommitMessageDialog
    bind:isOpen={showCommitMessageDialog}
    onConfirm={handleCommitMessageConfirm}
    onCancel={() => showCommitMessageDialog = false}
    title="Save Changes"
    defaultMessage=""
    showOptionalNote={true}
  />
  
  <!-- Export Modal -->
  <ExportModal
    bind:isOpen={showExportModal}
    sections={sections}
    currentIngredient={currentIngredient}
    currentReferenceName={currentReferenceName}
    healthSystem={currentHealthSystem}
    populationType={currentPopulationType}
    onClose={() => showExportModal = false}
  />
  
  <!-- Selective Apply Modal -->
  {#if showSelectiveApply && loadedIngredient && pendingReferenceData}
    <div class="modal-backdrop" onclick={() => showSelectiveApply = false}>
      <div class="modal-content selective-apply-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>Apply Changes to Shared Configurations</h2>
          <button class="close-btn" onclick={() => showSelectiveApply = false}>✕</button>
        </div>
        <SelectiveApply 
          ingredientId={loadedIngredient.id}
          referenceData={pendingReferenceData}
          onApply={async (results) => {
            showSelectiveApply = false;
            hasUnsavedChanges = false;
            lastSavedTime = new Date();
            originalSections = JSON.stringify(sections);
            console.log('Changes applied to configurations:', results);
            alert(`Changes applied to ${results.filter(r => r.status === 'success').length} configurations successfully.`);
          }}
          onCancel={() => showSelectiveApply = false}
        />
      </div>
    </div>
  {/if}
  
  <!-- Preferences Modal -->
  <PreferencesModal 
    isOpen={showPreferences}
    onClose={() => showPreferences = false}
  />
  
  <!-- Test Summary Modal -->
  {#if showTestSummary && testSummary}
    <div class="modal-overlay" onclick={() => showTestSummary = false}>
      <div class="modal-content test-summary-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>Test Results Summary</h2>
          <button class="close-btn" onclick={() => showTestSummary = false}>✕</button>
        </div>
        
        <div class="summary-overview">
          <div class="summary-stat {testSummary.summary.failed === 0 ? 'all-passed' : 'has-failures'}">
            <div class="stat-label">Total Tests</div>
            <div class="stat-value">{testSummary.summary.total}</div>
          </div>
          <div class="summary-stat passed">
            <div class="stat-label">Passed</div>
            <div class="stat-value">{testSummary.summary.passed}</div>
          </div>
          <div class="summary-stat failed">
            <div class="stat-label">Failed</div>
            <div class="stat-value">{testSummary.summary.failed}</div>
          </div>
          <div class="summary-stat">
            <div class="stat-label">Success Rate</div>
            <div class="stat-value">
              {testSummary.summary.total > 0 
                ? Math.round((testSummary.summary.passed / testSummary.summary.total) * 100) 
                : 0}%
            </div>
          </div>
        </div>
        
        <div class="test-details">
          {#each testSummary.sections as section}
            <div class="section-results">
              <h3>{section.sectionName}</h3>
              {#each section.results as result}
                <div class="test-result-item {result.passed ? 'passed' : 'failed'}">
                  <div class="test-name">
                    {result.passed ? '✅' : '❌'} {result.testCase.name}
                  </div>
                  {#if !result.passed && result.error}
                    <div class="test-error">{result.error}</div>
                  {/if}
                </div>
              {/each}
            </div>
          {/each}
        </div>
        
        <div class="modal-footer">
          <button class="btn-primary" onclick={() => showTestSummary = false}>Close</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }
  
  .app-container.sidebar-open main {
    margin-left: 0;
  }
  
  main {
    flex: 1;
    padding: 1rem;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  
  .header-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .sidebar-toggle {
    padding: 0.5rem 0.75rem;
    background-color: #fff;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .sidebar-toggle:hover {
    background-color: #f5f5f5;
  }
  
  .new-button {
    padding: 0.5rem 1rem;
    background-color: #17a2b8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .new-button:hover {
    background-color: #138496;
  }

  
  .status-bar {
    display: flex;
    gap: 2rem;
    padding: 0.5rem 1rem;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 1rem;
    align-items: center;
    font-size: 0.9rem;
  }
  
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .status-icon {
    font-size: 1rem;
  }
  
  .status-text {
    color: #333;
  }
  
  .status-time {
    color: #666;
    font-size: 0.85rem;
    margin-left: 0.25rem;
  }

  .editor-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    flex: 1;
    min-height: 0;
    transition: grid-template-columns 0.3s ease;
  }
  
  .editor-container.preview-collapsed {
    grid-template-columns: 1fr 150px;
  }
  
  .editor-container.preview-collapsed .preview-panel {
    width: auto;
    min-width: 150px;
  }
  
  .editor-container.preview-collapsed .preview-header {
    justify-content: center;
    padding: 0.5rem;
  }
  
  .editor-container.preview-collapsed .output-controls {
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
  }
  
  .editor-container.preview-collapsed .output-toggle-btn,
  .editor-container.preview-collapsed .export-button {
    width: 100%;
    font-size: 0.85rem;
    padding: 0.5rem;
  }

  .editor-panel, .preview-panel {
    display: flex;
    flex-direction: column;
    border: 2px solid #ddd;
    border-radius: 8px;
    background-color: #f5f5f5;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #444;
  }
  
  .header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .run-all-tests-btn {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .run-all-tests-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  .ingredient-context-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background-color: #e8f4fd;
    border-bottom: 1px solid #b3d9f2;
    flex-wrap: wrap;
    position: relative;
  }
  
  .context-label {
    font-size: 0.875rem;
    color: #666;
    font-weight: 500;
  }
  
  .ingredient-pill {
    padding: 0.375rem 0.75rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 16px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }
  
  .ingredient-pill:hover {
    background-color: #0056b3;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .population-pill {
    padding: 0.375rem 0.75rem;
    color: white;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 500;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    position: relative;
  }
  
  .population-pill.clickable {
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .population-pill.clickable:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    filter: brightness(1.1);
  }
  
  .population-pill:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .dropdown-indicator {
    font-size: 0.75rem;
    opacity: 0.8;
    margin-left: 0.25rem;
  }
  
  .population-dropdown-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
  }
  
  .population-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 280px;
    max-width: 400px;
    z-index: 1000;
    overflow: hidden;
  }
  
  .dropdown-header {
    padding: 0.75rem 1rem;
    font-weight: 600;
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    color: #495057;
  }
  
  .dropdown-empty {
    padding: 1.5rem;
    text-align: center;
    color: #6c757d;
    font-style: italic;
  }
  
  .population-option {
    border-bottom: 1px solid #e9ecef;
  }
  
  .population-option:last-child {
    border-bottom: none;
  }
  
  .population-option.active {
    background-color: #f8f9fa;
  }
  
  .population-option-header {
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-left: 4px solid transparent;
  }
  
  .population-name {
    font-weight: 500;
    color: #212529;
  }
  
  .active-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background-color: #28a745;
    color: white;
    border-radius: 12px;
  }
  
  .reference-list {
    padding: 0.5rem;
    background-color: #fafbfc;
  }
  
  .reference-option {
    width: 100%;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.25rem;
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }
  
  .reference-option:last-child {
    margin-bottom: 0;
  }
  
  .reference-option:hover:not(:disabled) {
    border-color: #0366d6;
    background-color: #f6f8fa;
  }
  
  .reference-option:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #f1f3f5;
  }
  
  .ref-health-system {
    font-size: 0.875rem;
    color: #586069;
  }
  
  .ref-version {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background-color: #e1e4e8;
    color: #586069;
    border-radius: 10px;
  }
  
  .health-system-pill {
    padding: 0.375rem 0.75rem;
    background-color: #6c757d;
    color: white;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .context-separator {
    color: #999;
    font-size: 0.875rem;
  }
  
  .version-badge {
    padding: 0.25rem 0.5rem;
    background-color: #28a745;
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  h2 {
    font-size: 1.25rem;
    margin: 0;
    color: #535bf2;
  }

  .add-section-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .add-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-btn:hover {
    background-color: #218838;
  }

  .sections {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .section {
    margin-bottom: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #fff;
    transition: all 0.2s;
  }

  .section.dragging {
    opacity: 0.5;
  }

  .section-header {
    display: flex;
    align-items: center;
    padding: 0.4rem 0.5rem;
    border-bottom: 1px solid #444;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .drag-handle {
    cursor: move;
    color: #666;
    font-size: 1.2rem;
    margin-right: 0.5rem;
    user-select: none;
  }

  .section-type {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .section-type.static {
    color: #17a2b8;
  }

  .section-type.dynamic {
    color: #ffc107;
  }

  .ingredient-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem;
    align-items: center;
    flex: 1;
  }

  .ingredient-badge {
    font-size: 0.65rem;
    padding: 0.1rem 0.35rem;
    border-radius: 10px;
    font-weight: 500;
    white-space: nowrap;
    line-height: 1.2;
  }

  .ingredient-badge.tpn-badge {
    color: white;
  }

  .ingredient-badge.calculated-badge {
    color: white;
    opacity: 0.85;
    border: 1px dashed rgba(255, 255, 255, 0.5);
  }

  .ingredient-badge.custom-badge {
    background-color: #e9ecef;
    color: #495057;
  }

  .ingredient-count {
    font-size: 0.65rem;
    color: #666;
    padding: 0.1rem 0.35rem;
    background-color: #f0f0f0;
    border-radius: 10px;
    white-space: nowrap;
    line-height: 1.2;
  }

  .delete-section-btn {
    padding: 0.25rem 0.5rem;
    font-size: 1.2rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .delete-section-btn:hover {
    background-color: #c82333;
  }

  .editor-wrapper {
    max-height: 500px;
    resize: vertical;
    overflow: auto;
    position: relative;
  }
  
  .content-preview {
    padding: 1rem;
    cursor: pointer;
    background-color: #f9f9f9;
    border: 1px dashed #ddd;
    border-radius: 4px;
    transition: all 0.2s;
    position: relative;
  }
  
  .content-preview:hover {
    background-color: #f0f0f0;
    border-color: #bbb;
  }
  
  .content-preview::after {
    content: "Double-click to edit";
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 0.75rem;
    color: #999;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .content-preview:hover::after {
    opacity: 1;
  }
  
  .content-preview pre {
    margin: 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: #333;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .done-editing-btn {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.75rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    z-index: 10;
  }
  
  .done-editing-btn:hover {
    background-color: #218838;
  }

  /* Test Cases Styles */
  .test-cases {
    padding: 0.5rem;
    border-top: 1px solid #ddd;
    background-color: #f9f9f9;
  }

  .test-cases-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .test-cases-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;
    text-align: left;
  }
  
  .test-cases-toggle:hover {
    background-color: #2a2a2a;
  }
  
  .collapse-icon {
    font-size: 0.8rem;
    color: #666;
    transition: transform 0.2s;
  }
  
  .active-test-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    background-color: #ffc107;
    color: #000;
    border-radius: 12px;
    font-weight: 500;
  }

  .test-cases-toggle h4 {
    margin: 0;
    font-size: 0.9rem;
    color: #ffc107;
  }
  
  .test-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .add-test-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .add-test-btn:hover {
    background-color: #5a6268;
  }
  
  .ai-inspector-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
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
  
  .ai-inspector-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  }

  .test-case-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .test-case {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #fff;
  }

  .test-case.active {
    border-color: #ffc107;
    background-color: #fffbf0;
  }

  .test-case-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .test-case-name {
    flex: 1;
    padding: 0.25rem;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    color: #333;
    font-size: 0.9rem;
  }

  .test-case-run {
    padding: 0.25rem 0.5rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .test-case-run:hover {
    background-color: #218838;
  }
  
  .test-case-run.running {
    background-color: #dc3545;
  }
  
  .test-case-run.running:hover {
    background-color: #c82333;
  }

  .test-case-delete {
    padding: 0.25rem 0.5rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .test-variables {
    font-size: 0.85rem;
  }

  .variable-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    color: #999;
  }

  .add-var-btn {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
    background-color: #17a2b8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .variable-row, .style-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .var-name {
    color: #17a2b8;
    min-width: 100px;
  }

  .var-value {
    flex: 1;
    padding: 0.2rem;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    color: #333;
    font-size: 0.85rem;
  }

  .var-delete, .style-delete {
    padding: 0.2rem 0.4rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  /* Test expectations styles */
  .test-expectations {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }

  .expectation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    color: #666;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .match-type-select {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
  }

  .expected-output {
    width: 100%;
    min-height: 60px;
    padding: 0.5rem;
    font-size: 0.85rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #f9f9f9;
    resize: vertical;
    margin-bottom: 1rem;
  }

  .add-style-btn {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .style-prop {
    color: #6c757d;
    min-width: 100px;
    font-size: 0.85rem;
  }

  .style-value {
    flex: 1;
    padding: 0.2rem;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    color: #333;
    font-size: 0.85rem;
  }

  /* Test result styles */
  .test-result {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .test-result.passed {
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
  }

  .test-result.failed {
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
  }

  .result-header {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .result-error {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 3px;
  }

  .result-detail {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 3px;
    word-break: break-word;
  }

  /* Rest of styles remain the same... */
  .preview-panel {
    display: flex;
    flex-direction: column;
  }

  
  .preview-header-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }
  
  .view-tabs {
    display: flex;
    gap: 0.25rem;
    background-color: #e9ecef;
    padding: 0.25rem;
    border-radius: 6px;
  }
  
  .view-tab {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    background-color: transparent;
    color: #495057;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .view-tab:hover {
    background-color: #dee2e6;
    color: #333;
  }
  
  .view-tab.active {
    background-color: #646cff;
    color: white;
  }
  
  .output-format-selector {
    display: flex;
    gap: 0.25rem;
    background-color: #fff;
    padding: 0.25rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
  }
  
  .format-btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    background-color: transparent;
    color: #495057;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .format-btn:hover {
    background-color: #f8f9fa;
    color: #333;
  }
  
  .format-btn.active {
    background-color: #646cff;
    color: white;
  }
  
  .preview-header {
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  
  .preview-toggle {
    padding: 0.25rem 0.5rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .preview-toggle:hover {
    background-color: #5a6268;
  }
  
  .editor-container.preview-collapsed .preview-panel {
    overflow: hidden;
    gap: 0;
  }
  
  .editor-container.preview-collapsed .preview,
  .editor-container.preview-collapsed .output-view,
  .editor-container.preview-collapsed .ingredient-input-panel {
    display: none;
  }

  .preview {
    flex: 1;
    padding: 1rem;
    background-color: #fff;
    border: 1px solid #444;
    border-radius: 4px;
    overflow: auto;
    margin-bottom: 1rem;
    color: #333;
  }
  
  /* Force light theme for preview content */
  .preview :global(*) {
    color: #333;
  }
  
  .preview :global(a) {
    color: #0066cc;
  }
  
  .preview :global(a:hover) {
    color: #0052a3;
  }

  .output-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .output-toggle-btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .output-toggle-btn:hover {
    background-color: #5a6268;
  }

  .output-view {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    background-color: #f8f9fa;
  }

  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .view-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .toggle-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    border: 1px solid #ddd;
    background-color: #fff;
    color: #333;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    background-color: #f5f5f5;
  }

  .toggle-btn.active {
    background-color: #646cff;
    color: white;
    border-color: #646cff;
  }

  .json-output {
    flex: 1;
    background-color: #fff;
    border-radius: 6px;
    padding: 1rem;
    border: 1px solid #dee2e6;
    overflow: auto;
  }
  
  .json-output pre {
    margin: 0;
    color: #212529;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .configurator {
    flex: 1;
    padding: 1rem;
    background-color: #fff;
    border-radius: 6px;
    overflow: auto;
    border: 1px solid #dee2e6;
  }

  .config-line {
    margin-bottom: 0.5rem;
  }

  .line-input {
    width: 100%;
    padding: 0.5rem;
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    color: #212529;
  }

  .config-line.non-editable .line-input {
    background-color: #e9ecef;
    opacity: 0.7;
  }

  .export-button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background-color: #646cff;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .export-button:hover {
    background-color: #535bf2;
  }

  .export-button.copied {
    background-color: #4caf50;
  }

  @media (max-width: 1024px) {
    .editor-container {
      grid-template-columns: 1fr;
    }
  }
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background-color: #fff;
    border-radius: 12px;
    max-width: 90%;
    max-height: 90%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    position: relative;
  }
  
  .modal-content.large-modal {
    width: 1200px;
    height: 800px;
  }
  
  .modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
    border: none;
    background-color: #f8f9fa;
    color: #333;
    font-size: 1.5rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: all 0.2s;
  }
  
  .modal-close:hover {
    background-color: #e9ecef;
    color: #000;
  }

  .tpn-toggle {
    margin-left: 1rem;
    display: flex;
    align-items: center;
    font-size: 0.9rem;
    cursor: pointer;
  }
  
  
  /* Empty state styles */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    min-height: 400px;
  }
  
  .empty-state-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  .empty-state-title {
    font-size: 1.5rem;
    color: #333;
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }
  
  .empty-state-description {
    font-size: 1rem;
    color: #666;
    margin: 0 0 2rem 0;
  }
  
  .empty-state-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .empty-state-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 2rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 200px;
  }
  
  .empty-state-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .empty-state-btn.static {
    border-color: #17a2b8;
  }
  
  .empty-state-btn.static:hover {
    background-color: #e6f7ff;
    border-color: #0d7a8c;
  }
  
  .empty-state-btn.dynamic {
    border-color: #ffc107;
  }
  
  .empty-state-btn.dynamic:hover {
    background-color: #fff8e1;
    border-color: #dda000;
  }
  
  .empty-state-btn .btn-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  .empty-state-btn .btn-label {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }
  
  .empty-state-btn .btn-hint {
    font-size: 0.85rem;
    color: #666;
  }
  /* Validation section styles */
  .validation-section {
    margin: 0.75rem 1rem;
    margin-top: 0;
  }
  
  /* Selective Apply Modal */
  .selective-apply-modal {
    max-width: 700px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    position: relative;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    color: #333;
  }
  
  /* Test Summary Modal Styles */
  .test-summary-modal {
    max-width: 700px;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .summary-overview {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    padding: 1.5rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    margin: 1rem 1.5rem;
  }
  
  .summary-stat {
    text-align: center;
    padding: 1rem;
    background: white;
    border-radius: 6px;
    border: 2px solid #e0e0e0;
  }
  
  .summary-stat.all-passed {
    border-color: #28a745;
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  }
  
  .summary-stat.has-failures {
    border-color: #ffc107;
  }
  
  .summary-stat.passed {
    border-color: #28a745;
  }
  
  .summary-stat.failed {
    border-color: #dc3545;
  }
  
  .stat-label {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .stat-value {
    font-size: 1.75rem;
    font-weight: bold;
    color: #333;
  }
  
  .test-details {
    padding: 0 1.5rem 1rem;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .section-results {
    margin-bottom: 1.5rem;
  }
  
  .section-results h3 {
    font-size: 1rem;
    color: #666;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .test-result-item {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border-radius: 4px;
    background: white;
    border: 1px solid #e0e0e0;
  }
  
  .test-result-item.passed {
    border-left: 3px solid #28a745;
  }
  
  .test-result-item.failed {
    border-left: 3px solid #dc3545;
    background-color: #fff5f5;
  }
  
  .test-name {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .test-error {
    color: #dc3545;
    font-size: 0.85rem;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: #ffe0e0;
    border-radius: 3px;
    white-space: pre-wrap;
  }
  
  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: flex-end;
  }
  
  .btn-primary {
    padding: 0.5rem 1.5rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .btn-primary:hover {
    background-color: #0056b3;
  }
</style>