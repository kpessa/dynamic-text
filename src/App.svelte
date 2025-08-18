import { logError, logWarn } from '$lib/logger';
<script>
  // Import secure code execution
  import { executeWithTPNContext } from './lib/services/secureCodeExecution';
  
  // Services - temporarily comment out missing imports
  // import { sanitizeHTML, createMockMe, transpileCode, evaluateCode, stripHTML, validateTestOutput, extractStylesFromHTML, runTestCase } from './lib/services/execution/codeExecutionService';
  // import { sectionsToJSON, sectionsToLineObjects, exportAsHTML, exportAsMarkdown, importFromJSON, validateImportData } from './lib/services/export/exportService';
  // import { runSectionTests, createDefaultTestCase, validateTestCase, calculateTestStats, formatTestResults } from './lib/services/testing/testingService';
  // import { createSection, updateSectionContent, deleteSection as deleteSectionService, toggleSectionEditing, convertToDynamic, reorderSections, extractUsedKeys, hasUnsavedChanges as checkUnsavedChanges, migrateSections, countSectionsByType, generatePreviewHTML } from './lib/services/domain/sectionServiceLegacy';
  // import { copyToClipboard, copyJSONToClipboard, copyCodeSnippet } from './lib/services/utilities/clipboardService';
  // import { getIngredientBadgeColor, getPopulationColor, getPopulationName, formatTimestamp, formatFileSize, debounce, throttle, generateId, sortPopulationTypes } from './lib/services/utilities/uiHelpers';
  
  import { transformCode as lazyTranspileCode, preloadBabel } from './lib/utils/lazyBabel';
  import DOMPurify from 'dompurify';
  import { onMount } from 'svelte';
  
  // Preload Babel after component mounts
  onMount(() => {
    setTimeout(() => preloadBabel(), 1000);
  });
  
  // Temporary placeholder functions for missing services
  const sanitizeHTML = (html) => DOMPurify.sanitize(html, { ADD_TAGS: ['style'], ADD_ATTR: ['style'] });
  const stripHTML = (html) => { const tmp = document.createElement('div'); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ''; };
  const createMockMe = () => ({ getValue: () => 0, ingredients: {} });
  const transpileCode = async (code) => lazyTranspileCode(code);
  const evaluateCode = (code) => { try { return new Function('return ' + code)(); } catch (e) { return 'Error: ' + e.message; } };
  const validateTestOutput = (actual, expected) => actual === expected;
  const extractStylesFromHTML = (html) => ({});
  const runTestCase = (section, testCase) => ({ passed: false, actual: '', error: 'Not implemented' });
  const sectionsToJSON = (sections) => JSON.stringify(sections, null, 2);
  const sectionsToLineObjects = (sections) => sections.map(s => ({ type: s.type, content: s.content }));
  const exportAsHTML = (sections) => sections.map(s => s.content).join('\n');
  const exportAsMarkdown = (sections) => sections.map(s => s.content).join('\n\n');
  const importFromJSON = (json) => JSON.parse(json);
  const validateImportData = (data) => ({ isValid: true, errors: [] });
  const runSectionTests = (sections) => ({ passed: 0, failed: 0, total: 0 });
  const createDefaultTestCase = () => ({ name: 'Test', variables: {}, expectedOutput: '' });
  const validateTestCase = (testCase) => ({ isValid: true, errors: [] });
  const calculateTestStats = (results) => ({ passed: 0, failed: 0, total: 0 });
  const formatTestResults = (results) => 'Test results';
  const createSection = (type) => ({ id: Date.now(), type, name: '', content: '', testCases: [] });
  const updateSectionContent = (section, content) => ({ ...section, content });
  const deleteSectionService = (id) => {};
  const toggleSectionEditing = (section) => ({ ...section, editing: !section.editing });
  const convertToDynamic = (section) => ({ ...section, type: 'dynamic' });
  const reorderSections = (sections, from, to) => sections;
  const extractUsedKeys = (code) => [];
  const checkUnsavedChanges = () => false;
  const migrateSections = (sections) => sections;
  const countSectionsByType = (sections) => ({ static: 0, dynamic: 0 });
  const generatePreviewHTML = (sections) => sections.map(s => s.content).join('');
  const copyToClipboard = (text) => navigator.clipboard.writeText(text);
  const copyJSONToClipboard = (json) => navigator.clipboard.writeText(JSON.stringify(json, null, 2));
  const copyCodeSnippet = (code) => navigator.clipboard.writeText(code);
  const getIngredientBadgeColor = (type) => 'gray';
  const getPopulationColor = (type) => 'blue';
  const getPopulationName = (type) => type;
  const formatTimestamp = (ts) => new Date(ts).toLocaleString();
  const formatFileSize = (size) => size + ' bytes';
  const debounce = (fn, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), delay); }; };
  const throttle = (fn, delay) => { let last = 0; return (...args) => { const now = Date.now(); if (now - last >= delay) { last = now; fn(...args); } }; };
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
  const sortPopulationTypes = (types) => types.sort();
  
  // Components
  import CodeEditor from './lib/CodeEditor.svelte';
  // import SidebarRefactored from './lib/SidebarRefactored.svelte';
  import TPNTestPanel from './lib/TPNTestPanel.svelte';
  // import TPNKeyReference from './lib/TPNKeyReference.svelte';
  import IngredientInputPanel from './lib/IngredientInputPanel.svelte';
  import TestGeneratorButton from './lib/TestGeneratorButton.svelte';
  import TestGeneratorModal from './lib/TestGeneratorModal.svelte';
  import AIWorkflowInspector from './lib/AIWorkflowInspector.svelte';
  // import NavbarRefactored from './lib/NavbarRefactored.svelte';
  // import IngredientManager from './lib/IngredientManagerRefactored.svelte';
  import IngredientDiffViewer from './lib/IngredientDiffViewer.svelte';
  // import DataMigrationTool from './lib/DataMigrationTool.svelte';
  import CommitMessageDialog from './lib/CommitMessageDialog.svelte';
  // import ExportModal from './lib/ExportModalRefactored.svelte';
  // import ValidationStatus from './lib/ValidationStatus.svelte';
  // import SelectiveApply from './lib/SelectiveApply.svelte';
  // import PreferencesModal from './lib/PreferencesModalRefactored.svelte';
  // import KPTReference from './lib/KPTReferenceRefactored.svelte';
  import KPTManager from './lib/KPTManager.svelte';
  import { initializeKPTCustomFunctions, createKPTNamespace } from './lib/kptNamespace.ts';
  import { TPNLegacySupport, LegacyElementWrapper, extractKeysFromCode, extractDirectKeysFromCode, isValidKey, getKeyCategory, isCalculatedValue, getCanonicalKey } from './lib/tpnLegacy.js';
  import { isFirebaseConfigured, signInAnonymouslyUser, onAuthStateChange } from './lib/firebase.js';
  import { POPULATION_TYPES } from './lib/firebaseDataService.js';
  
  // New refactored components
  // AppContainer removed - not being used in template
  // import StatusBar from './components/StatusBar.svelte';
  // import TestSummaryModal from './components/TestSummaryModal.svelte';
  // import IngredientContextBar from './components/IngredientContextBar.svelte';
  // import EditorWorkspace from './components/EditorWorkspace.svelte';
  // import PreviewPanel from './components/PreviewPanel.svelte';
  // import SectionList from './components/SectionList.svelte';
  // import TestCaseManager from './components/TestCaseManager.svelte';
  
  // Import stores
  import { sectionStore } from './stores/sectionStore.svelte.ts';
  import { testStore } from './stores/testStore.svelte.ts';
  import { workspaceStore } from './stores/workspaceStore.svelte.ts';
  
  // Use section store for section management
  const sections = $derived(sectionStore.sections);
  const dynamicSections = $derived(sectionStore.dynamicSections);
  const activeTestCase = $derived(sectionStore.activeTestCase);
  const expandedTestCases = $derived(sectionStore.expandedTestCases);
  const draggedSection = $derived(sectionStore.draggedSection);
  const hasUnsavedChanges = $derived(sectionStore.hasUnsavedChanges);
  
  // Local UI state
  let copied = $state(false);
  let previewMode = $state('preview'); // 'preview' or 'output'
  let testSummary = $state(null); // Track overall test results
  let showTestSummary = $state(false); // Show/hide test summary modal
  
  // Use workspace store for work context
  const currentIngredient = $derived(workspaceStore.currentIngredient);
  const currentReferenceName = $derived(workspaceStore.currentReferenceName);
  const lastSavedTime = $derived(workspaceStore.lastSavedTime);
  const loadedReferenceId = $derived(workspaceStore.loadedReferenceId);
  const loadedIngredient = $derived(workspaceStore.loadedIngredient);
  const loadedReference = $derived(workspaceStore.loadedReference);
  const currentHealthSystem = $derived(workspaceStore.currentHealthSystem);
  const currentValidationStatus = $derived(workspaceStore.currentValidationStatus);
  const currentValidationNotes = $derived(workspaceStore.currentValidationNotes);
  const currentValidatedBy = $derived(workspaceStore.currentValidatedBy);
  const currentValidatedAt = $derived(workspaceStore.currentValidatedAt);
  const currentTestResults = $derived(workspaceStore.currentTestResults);
  
  // Local UI state
  let editingSection = $state(null); // Currently editing section ID
  let currentTPNInstance = $state(null); // Current TPN instance from test panel
  let tpnPanelExpanded = $state(true); // Track TPN panel expansion state
  let previewCollapsed = $state(false); // Track preview panel collapse state
  let currentIngredientValues = $state({}); // Track ingredient values for quick input
  
  // Test generation state
  let showTestGeneratorModal = $state(false);
  let currentGeneratedTests = $state(null);
  let targetSectionId = $state(null);
  
  // AI Workflow Inspector state
  let showAIWorkflowInspector = $state(false);
  let inspectorCurrentSection = $state(null);
  
  // Firebase and new component states
  // Use workspace store for shared state
  const currentPopulationType = $derived(workspaceStore.currentPopulationType);
  const firebaseEnabled = $derived(workspaceStore.firebaseEnabled);
  const pendingReferenceData = $derived(workspaceStore.pendingReferenceData);
  const activeConfigId = $derived(workspaceStore.activeConfigId);
  const activeConfigIngredients = $derived(workspaceStore.activeConfigIngredients);
  const selectedIngredientForDiff = $derived(workspaceStore.selectedIngredientForDiff);
  const availablePopulations = $derived(workspaceStore.availablePopulations);
  const pendingSaveData = $derived(workspaceStore.pendingSaveData);
  
  // UI modal states
  let showIngredientManager = $state(false);
  let showDiffViewer = $state(false);
  let showMigrationTool = $state(false);
  let showPreferences = $state(false);
  let showCommitMessageDialog = $state(false);
  let showExportModal = $state(false);
  let showSelectiveApply = $state(false);
  let showKPTManager = $state(false);
  let showPopulationDropdown = $state(false);
  let loadingPopulations = $state(false);
  
  // Organized state for refactored Navbar
  let navbarUiState = $state({
    showSidebar: false,
    tpnMode: false,
    showOutput: false,
    outputMode: 'json',
    showKeyReference: false,
    showKPTReference: false
  });
  
  // Use navbarUiState as single source of truth - no circular sync needed
  
  // Initialize KPT custom functions on app start
  $effect(() => {
    initializeKPTCustomFunctions();
  });
  
  // Initialize Firebase authentication
  $effect(() => {
    if (firebaseEnabled) {
      // Sign in anonymously when the app loads
      signInAnonymouslyUser().catch(error => {
        // logError('Failed to sign in anonymously:', error);
      });
      
      // Listen for auth state changes
      const unsubscribe = onAuthStateChange((user) => {
        if (user) {
          // console.log('User authenticated:', user.uid);
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
  
  
  // Removed - now using imported sanitizeHTML from services
  
  // Enhanced wrapper that adds TPN-specific functionality
  function createMockMeWithTPN(variables = {}) {
    if (navbarUiState.tpnMode && currentTPNInstance) {
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
  
  // Removed - now using imported transpileCode
  function transpileCodeOld(code) {
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
      // logError('Transpilation error:', error);
      return code; // Return original if transpilation fails
    }
  }
  
  // Enhanced wrapper that adds KPT namespace support - NOW USING SECURE WEB WORKER
  async function evaluateCodeWithKPT(code, testVariables = null) {
    try {
      // Prepare TPN values and ingredient values for the worker
      const tpnValues = testVariables || {};
      const ingredientValues = currentIngredientValues || {};
      
      // Execute code securely in Web Worker
      const result = await executeWithTPNContext(code, tpnValues, ingredientValues);
      return result;
    } catch (error) {
      return `<span style="color: red;">Error: ${error.message}</span>`;
    }
  }
  
  // OLD - Remove duplicate function
  function sectionsToJSONOld() {
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
        const transpiledCode = transpileCodeOld(section.content);
        const lines = transpiledCode.split('\n');
        lines.forEach(line => {
          result.push({ TEXT: line });
        });
        result.push({ TEXT: ')]' });
      }
    });
    
    return result;
  }
  
  // OLD - Remove duplicate function
  function sectionsToLineObjectsOld() {
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
  let previewHTML = $state('');
  
  // Update preview when sections or values change
  $effect(async () => {
    // Access currentIngredientValues to create a dependency
    const ingredientVals = { ...currentIngredientValues };
    
    const htmlParts = await Promise.all(sections.map(async section => {
      if (section.type === 'static') {
        // Replace newlines with <br> for proper line break rendering
        return sanitizeHTML(section.content.replace(/\n/g, '<br>'));
      } else if (section.type === 'dynamic') {
        const testCase = activeTestCase[section.id];
        const evaluated = await evaluateCodeWithKPT(section.content, testCase?.variables);
        // Also handle line breaks in dynamic content
        const evalString = evaluated || '';
        return sanitizeHTML(evalString.replace(/\n/g, '<br>'));
      }
      return '';
    }));
    
    previewHTML = htmlParts.join('<br>');
  });
  
  let jsonOutput = $derived(sectionsToJSON(sections));
  let lineObjects = $derived(sectionsToLineObjects(sections));
  
  // Helper to set sections using the store
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
    
    sectionStore.setSections(migratedSections);
  }

  // Clear editor for new work
  function clearEditor() {
    sectionStore.clearSections();
    workspaceStore.clearWorkspace();
  }
  
  // Section management delegated to store
  function addSection(type) {
    sectionStore.addSection(type);
  }
  
  function deleteSection(id) {
    sectionStore.deleteSection(id);
  }
  
  // Wrapper to update using the store
  function updateSectionContentWrapper(id, content) {
    sectionStore.updateSectionContent(id, content);
  }
  
  function handleConvertToDynamic(sectionId, content) {
    // Find the position of "[f(" in the content
    const bracketIndex = content.indexOf('[f(');
    
    if (bracketIndex === -1) return; // Safety check
    
    // Extract HTML before "[f(" and the beginning of the dynamic expression
    const htmlBefore = content.substring(0, bracketIndex).trim();
    const dynamicStart = content.substring(bracketIndex + 3); // Skip "[f("
    
    // Create the dynamic content
    let dynamicContent = '';
    
    if (htmlBefore) {
      // If there was HTML before [f(, include it as a return statement
      dynamicContent = `// Converted from static HTML\nlet html = \`${htmlBefore}\`;\n\n// Your dynamic expression here\n${dynamicStart ? dynamicStart : '// Start typing your JavaScript expression...'}`;
    } else {
      // No HTML before, just start with the dynamic expression
      dynamicContent = `// Your dynamic expression here\n${dynamicStart ? dynamicStart : '// Start typing your JavaScript expression...'}`;
    }
    sectionStore.convertToDynamic(sectionId, dynamicContent);
  }
  
  // Check for unsaved changes - now handled by the store
  function checkForChanges() {
    sectionStore.checkForChanges();
  }
  
  // Test case management - delegated to store
  function addTestCase(sectionId) {
    sectionStore.addTestCase(sectionId);
  }
  
  function updateTestCase(sectionId, index, updates) {
    sectionStore.updateTestCase(sectionId, index, updates);
  }
  
  function deleteTestCase(sectionId, index) {
    sectionStore.deleteTestCase(sectionId, index);
  }
  
  function setActiveTestCase(sectionId, testCase) {
    sectionStore.setActiveTestCase(sectionId, testCase);
    
    // Run test if it has expectations
    if (testCase && (testCase.expectedOutput !== undefined || testCase.expectedStyles)) {
      runSingleTest(sectionId, testCase);
    }
  }
  
  // Extract styles from HTML string
  // OLD - Remove duplicate function
  function extractStylesFromHTMLOld(htmlString) {
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
  // OLD - Remove duplicate function
  function stripHTMLOld(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  
  // Validate test output against expectations
  // OLD - Remove duplicate function
  function validateTestOutputOld(actual, expected, matchType = 'contains') {
    const actualText = stripHTML(actual).trim();
    const expectedText = (expected || '').trim();
    
    if (expected === undefined || expected === null) return true; // No expectation means pass
    
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
  async function runSingleTest(sectionId, testCase) {
    const section = sections.find(s => s.id === sectionId);
    if (!section || section.type !== 'dynamic') return;
    
    // Evaluate the code with test variables
    const output = await evaluateCodeWithKPT(section.content, testCase.variables);
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
  // OLD - Remove duplicate function
  function runSectionTestsOld(sectionId) {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.testCases) return;
    
    const results = [];
    section.testCases.forEach(testCase => {
      if (testCase.expectedOutput !== undefined || testCase.expectedStyles) {
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
    
    testStore.setTestSummary(summary);
    testStore.setShowTestSummary(true);
    
    return summary;
  }
  
  function toggleTestCases(sectionId) {
    sectionStore.toggleTestCases(sectionId);
  }
  
  // Drag and drop handlers - delegated to store
  function handleSectionDragStart(e, section) {
    sectionStore.setDraggedSection(section);
    e.dataTransfer.effectAllowed = 'move';
  }
  
  function handleSectionDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  function handleSectionDrop(e, targetSection) {
    e.preventDefault();
    const currentDraggedSection = sectionStore.draggedSection;
    if (currentDraggedSection && currentDraggedSection.id !== targetSection.id) {
      sectionStore.reorderSections(currentDraggedSection.id, targetSection.id);
    }
  }
  
  function handleSectionDragEnd() {
    sectionStore.setDraggedSection(null);
  }
  
  // Clipboard
  // OLD - Remove duplicate function
  async function copyToClipboardOld() {
    try {
      const jsonString = JSON.stringify(jsonOutput, null, 2);
      await navigator.clipboard.writeText(jsonString);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (err) {
      // logError('Failed to copy:', err);
    }
  }
  
  // Sidebar handlers
  function handleLoadReference(reference, ingredient = null) {
    if (reference && reference.sections) {
      setSections(reference.sections);
      // Update work context
      workspaceStore.setCurrentIngredient(reference.ingredient || '');
      workspaceStore.setCurrentReferenceName(reference.name || '');
      workspaceStore.setLoadedReferenceId(reference.id || null);
      workspaceStore.setLastSavedTime(reference.updatedAt || null);
      // Store marks sections as saved internally
      
      // Set loadedIngredient if provided
      if (ingredient) {
        workspaceStore.setLoadedIngredient({
          id: ingredient.KEYNAME || ingredient.keyname,
          name: ingredient.KEYNAME || ingredient.keyname,
          display: ingredient.DISPLAY || ingredient.display,
          type: ingredient.TYPE || ingredient.type,
          unit: ingredient.Unit || ingredient.unit
        });
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
    // console.log('Raw ingredients received:', ingredients);
    // console.log('Ingredients type:', typeof ingredients);
    
    // Handle both array and object formats
    let ingredientsArray = [];
    if (Array.isArray(ingredients)) {
      ingredientsArray = ingredients;
    } else if (ingredients && typeof ingredients === 'object') {
      // Convert object to array, adding the key as ingredient name
      ingredientsArray = Object.entries(ingredients).map(([key, data]) => ({
        ...data,
        KEYNAME: key,
        keyname: key
      }));
    }
    
    workspaceStore.setActiveConfigId(configId);
    workspaceStore.setActiveConfigIngredients(ingredientsArray);
    // console.log(`Config activated: ${configId} with ${ingredientsArray.length} ingredients`);
    // console.log('Sample ingredient:', activeConfigIngredients[0]);
    // console.log('All ingredient keys:', activeConfigIngredients[0] ? Object.keys(activeConfigIngredients[0]) : 'No ingredients');
  }
  // Handle TPN value changes
  function handleTPNValuesChange(tpnInstance) {
    currentTPNInstance = tpnInstance;
  }
  
  // dynamicSections is already provided by the sectionStore
  
  // Handle key insert from reference panel
  function handleKeyInsert(key) {
    // Insert me.getValue('key') at cursor position in active editor
    const snippet = `me.getValue('${key}')`;
    // For now, just copy to clipboard
    navigator.clipboard.writeText(snippet).then(() => {
      // Could show a toast notification here
      // console.log(`Copied: ${snippet}`);
    });
  }
  
  // Handle ingredient value changes from input panel
  function handleIngredientChange(key, value) {
    // Create a new object to ensure reactivity in Svelte 5
    currentIngredientValues = { ...currentIngredientValues, [key]: value };
  }
  
  // Get badge color for ingredient category
  // OLD - Remove duplicate function
  function getIngredientBadgeColorOld(key) {
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
    const section = sectionStore.getSectionById(sectionId);
    if (section && section.testCases) {
      // Add new tests to existing test cases
      testsToImport.forEach(test => {
        sectionStore.addTestCase(sectionId);
        const newIndex = section.testCases.length;
        sectionStore.updateTestCase(sectionId, newIndex, test);
      });
    }
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
    // // console.log('App: handleIngredientSelection called', { // ingredient: ingredient.name, // action: 'Opening diff viewer' // });
    workspaceStore.setSelectedIngredientForDiff(ingredient);
    showDiffViewer = true;
  }
  
  function handleCreateReference(ingredient, populationType) {
    // Set up for creating a new reference
    workspaceStore.setCurrentIngredient(ingredient.name);
    workspaceStore.setCurrentPopulationType(populationType);
    workspaceStore.setCurrentReferenceName(`${ingredient.name} - ${populationType}`);
    setSections([]);
    addSection('static');
    showIngredientManager = false;
    
    // Store ingredient details for context display
    workspaceStore.setLoadedIngredient(ingredient);
    workspaceStore.setLoadedReference({
      name: workspaceStore.currentReferenceName,
      populationType: populationType,
      healthSystem: null, // Will be set when saving
      version: null
    });
    workspaceStore.setCurrentHealthSystem(null);
    workspaceStore.setLoadedReferenceId(null);
    // hasUnsavedChanges handled by store
    // originalSections handled by store
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
        workspaceStore.setPendingReferenceData({ ...referenceData, commitMessage });
        showSelectiveApply = true;
      } else {
        // Save normally
        await referenceService.saveReference(loadedIngredient.id, referenceData, commitMessage);
        
        // Update state
        workspaceStore.setLastSavedTime(new Date());
        sectionStore.markAsSaved();
        
        // console.log('Reference saved successfully with commit message:', commitMessage);
      }
    } catch (error) {
      // logError('Error saving reference:', error);
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
      testStore.setShowTestSummary(false);
    }
  }
  
  function handleEditReference(ingredient, reference) {
    // console.log('App: handleEditReference called', {
      // ingredient: ingredient.name,
      // reference: reference?.name,
      // hasSections: !!(reference?.sections),
      // fullReference: reference
      // });
    
    // Load the reference for editing
    if (reference) {
      // Check if sections exist and have content
      if (!reference.sections || reference.sections.length === 0) {
        // logWarn('Reference has empty sections! User needs to run "Fix Empty Sections" in Ingredient Manager.');
        // Show a warning to the user
        alert(`This reference has no content sections. Please run "Fix Empty Sections" in the Ingredient Manager to populate the clinical notes.`);
        return;
      }
      
      setSections(reference.sections);
      workspaceStore.setCurrentIngredient(ingredient.name);
      workspaceStore.setCurrentReferenceName(reference.name);
      workspaceStore.setCurrentPopulationType(reference.populationType);
      workspaceStore.setLoadedReferenceId(reference.id);
      workspaceStore.setLastSavedTime(reference.updatedAt);
      // originalSections handled by store
      
      // Load validation data
      workspaceStore.updateValidation({
        status: reference.validationStatus || 'untested',
        notes: reference.validationNotes || '',
        validatedBy: reference.validatedBy || null,
        validatedAt: reference.validatedAt || null
      });
      workspaceStore.setTestResults(reference.testResults || null);
      
      // Close all other views to ensure Dynamic Text Editor is visible
      showIngredientManager = false;
      // Don't close diff viewer - allow it to stay open for comparison
      showMigrationTool = false;
      showAIWorkflowInspector = false;
      showTestGeneratorModal = false;
      navbarUiState.showSidebar = false;
      
      // Ensure preview panel is visible
      previewCollapsed = false;
      previewMode = 'preview';
      
      // Store full ingredient and reference details
      workspaceStore.setLoadedIngredient(ingredient);
      workspaceStore.setLoadedReference(reference);
      workspaceStore.setCurrentHealthSystem(reference.healthSystem);
      
      // // console.log('App: Reference loaded successfully', { // sectionsCount: sections.length, // viewsClosed: true, // previewVisible: !previewCollapsed // });
      
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
  // OLD - Remove duplicate function
  function getPopulationColorOld(populationType) {
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
  
  // OLD - Remove duplicate function
  function getPopulationNameOld(populationType) {
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
      workspaceStore.setAvailablePopulations(Array.from(populationMap.entries()).map(([popType, refs]) => ({
        populationType: popType,
        references: refs,
        isActive: popType === currentPopulationType
      })));
      
      // Sort by population type order
      const order = [POPULATION_TYPES.NEONATAL, POPULATION_TYPES.PEDIATRIC, POPULATION_TYPES.ADOLESCENT, POPULATION_TYPES.ADULT];
      const sortedPopulations = availablePopulations.sort((a, b) => order.indexOf(a.populationType) - order.indexOf(b.populationType));
      workspaceStore.setAvailablePopulations(sortedPopulations);
      
      showPopulationDropdown = true;
    } catch (error) {
      // logError('Error loading population types:', error);
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

<!-- Main App Container with proper component structure -->
<div class="app-container {navbarUiState.showSidebar ? 'app-container--with-sidebar' : ''}" onkeydown={handleKeyDown}>
  {#if navbarUiState.showSidebar}
    <SidebarRefactored 
      onLoadReference={handleLoadReference}
      onSaveReference={handleSaveReference}
      onConfigActivate={handleConfigActivate}
      onClose={() => navbarUiState.showSidebar = false}
      currentSections={sections}
      activeConfigId={activeConfigId}
      activeConfigIngredients={activeConfigIngredients}
    />
  {/if}
  
  <main>
    <NavbarRefactored
      bind:uiState={navbarUiState}
      documentState={{
        currentReferenceName,
        currentIngredient,
        hasUnsavedChanges,
        lastSavedTime,
        copied
      }}
      actions={{
        onNewDocument: () => {
          if (hasUnsavedChanges && !confirm('You have unsaved changes. Start new anyway?')) {
            return;
          }
          clearEditor();
        },
        onSave: handleSaveWithCommit,
        onExport: () => {
          // Show export modal with format options
          showExportModal = true;
        },
        onOpenKPTManager: () => showKPTManager = true,
        onOpenIngredientManager: () => showIngredientManager = true,
        onOpenMigrationTool: () => showMigrationTool = true,
        onOpenPreferences: () => showPreferences = true,
        onOpenDiffViewer: async () => {
          // console.log('Compare button clicked', { loadedIngredient, showIngredientManager, showDiffViewer });
          
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
                  // console.log('Found ingredient:', foundIngredient);
                  workspaceStore.setSelectedIngredientForDiff(foundIngredient);
                  showDiffViewer = true;
                  showIngredientManager = false; // Ensure it's closed
                } else {
                  alert(`Cannot find ingredient "${loadedIngredient.name}" in Firebase. Make sure it has been properly imported.`);
                }
              } catch (error) {
                // logError('Error finding ingredient:', error);
                alert('Error loading ingredient data. Please try again.');
              }
            } else {
              // We already have a proper ingredient object
              // console.log('Using existing ingredient:', loadedIngredient);
              workspaceStore.setSelectedIngredientForDiff(loadedIngredient);
              showDiffViewer = true;
              showIngredientManager = false; // Ensure it's closed
            }
          }
        }
      }}
      config={{
        firebaseEnabled
      }}
    />
    
    <!-- Status Bar -->
    <StatusBar 
      documentName={currentReferenceName || 'Untitled Reference'}
      saveStatus={hasUnsavedChanges ? 'unsaved' : 'saved'}
      lastSaveTime={lastSavedTime}
      testsPassed={testSummary?.summary?.passed || 0}
      testsTotal={testSummary?.summary?.total || 0}
      showTestStatus={testSummary !== null}
    />
    
    <!-- Main Editor Workspace using refactored components -->
    <EditorWorkspace
      sections={sections}
      editingSection={editingSection}
      expandedTestCases={expandedTestCases}
      activeTestCase={activeTestCase}
      navbarUiState={navbarUiState}
      previewMode={previewMode}
      previewHTML={previewHTML}
      jsonOutput={jsonOutput}
      lineObjects={lineObjects}
      referencedIngredients={referencedIngredients}
      currentIngredientValues={currentIngredientValues}
      calculationTPNInstance={calculationTPNInstance}
      ingredientsBySection={ingredientsBySection}
      loadedIngredient={loadedIngredient}
      loadedReference={loadedReference}
      currentPopulationType={currentPopulationType}
      currentHealthSystem={currentHealthSystem}
      availablePopulations={availablePopulations}
      currentValidationStatus={currentValidationStatus}
      currentValidatedBy={currentValidatedBy}
      currentValidatedAt={currentValidatedAt}
      currentTestResults={currentTestResults}
      currentValidationNotes={currentValidationNotes}
      previewCollapsed={previewCollapsed}
      draggedSection={draggedSection}
      onEditingSectionChange={(val) => editingSection = val}
      onAddSection={addSection}
      onDeleteSection={deleteSection}
      onUpdateSectionContent={updateSectionContentWrapper}
      onConvertToDynamic={handleConvertToDynamic}
      onToggleTestCases={toggleTestCases}
      onAddTestCase={addTestCase}
      onDeleteTestCase={deleteTestCase}
      onUpdateTestCase={updateTestCase}
      onSetActiveTestCase={setActiveTestCase}
      onRunAllTests={runAllTests}
      onTestsGenerated={handleTestsGenerated}
      onOpenAIWorkflowInspector={openAIWorkflowInspector}
      onIngredientChange={handleIngredientChange}
      onSectionDragStart={handleSectionDragStart}
      onSectionDragOver={handleSectionDragOver}
      onSectionDrop={handleSectionDrop}
      onSectionDragEnd={handleSectionDragEnd}
      onSwitchToPopulation={switchToPopulation}
      onShowIngredientManager={() => showIngredientManager = true}
      onPreviewModeChange={(mode) => {
        previewMode = mode;
        if (mode === 'output') {
          navbarUiState.showOutput = true;
        }
      }}
      onPreviewCollapsedChange={(val) => previewCollapsed = val}
      onOutputModeChange={(mode) => navbarUiState.outputMode = mode}
    />
    
    {#if navbarUiState.tpnMode}
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
  
  <!-- TPN Key Reference Panel - Always available -->
  <TPNKeyReference 
    bind:isExpanded={navbarUiState.showKeyReference}
    onKeySelect={handleKeyInsert}
    onClose={() => {
      navbarUiState.showKeyReference = false;
    }}
  />
  
  <!-- KPT Reference Panel -->
  <KPTReference 
    bind:isOpen={navbarUiState.showKPTReference}
    onClose={() => {
      navbarUiState.showKPTReference = false;
    }}
  />
  
  <!-- KPT Manager Modal -->
  <KPTManager 
    bind:isVisible={showKPTManager}
    onClose={() => showKPTManager = false}
  />
  
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
          currentIngredient={currentIngredient}
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
        workspaceStore.setSelectedIngredientForDiff(null);
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
            workspaceStore.setLastSavedTime(new Date());
            sectionStore.markAsSaved();
            // console.log('Changes applied to configurations:', results);
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
  <TestSummaryModal 
    isOpen={showTestSummary}
    testResults={testSummary ? testSummary.sections.map((section, idx) => ({
      index: idx,
      type: section.type || 'dynamic',
      tests: section.results.map(result => ({
        name: result.testCase.name,
        passed: result.passed,
        error: result.error
      }))
    })) : []}
    onClose={() => testStore.setShowTestSummary(false)}
  />
</div>

