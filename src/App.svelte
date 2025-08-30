<script>
  import { logError, logWarn } from '$lib/logger';
  // Import secure code execution
  import { executeWithTPNContext } from './lib/services/secureCodeExecution';
  
  // Skeleton UI - v3 doesn't provide these as JS components, only CSS
  // We'll need to implement modal/toast/drawer functionality ourselves
  import { modalRegistry } from './lib/modalRegistry.js';
  import SkeletonProvider from './lib/SkeletonProvider.svelte';
  
  // Create mock stores for now to prevent errors
  const modalStore = { trigger: () => {}, close: () => {} };
  const toastStore = { trigger: () => {} };
  
  // Feature flag to enable Skeleton UI components
  const USE_SKELETON_UI = true; // Set to true to use Skeleton components
  
  // Services
  import { sanitizeHTML, createMockMe, evaluateCode, stripHTML, validateTestOutput, extractStylesFromHTML, runTestCase } from './lib/services/codeExecutionService';
  import { sectionsToJSON, sectionsToLineObjects, exportAsHTML, exportAsMarkdown, importFromJSON, validateImportData } from './lib/services/exportService';
  import { runSectionTests, createDefaultTestCase, validateTestCase, calculateTestStats, formatTestResults } from './lib/services/testingService';
  import { createSection, updateSectionContent, deleteSection as deleteSectionService, toggleSectionEditing, convertToDynamic, reorderSections, extractUsedKeys, hasUnsavedChanges as checkUnsavedChanges, migrateSections, countSectionsByType, generatePreviewHTML } from './lib/services/sectionService';
  import { copyToClipboard, copyJSONToClipboard, copyCodeSnippet } from './lib/services/clipboardService';
  import { getIngredientBadgeColor, getPopulationColor, getPopulationName, formatTimestamp, formatFileSize, debounce, throttle, generateId, sortPopulationTypes } from './lib/services/uiHelpers';
  
  
  
  

  
  // Components
  import CodeEditor from './lib/CodeEditor.svelte';
  import DrawerSidebar from './lib/components/DrawerSidebar.svelte';
  // Use Skeleton versions of components
  import SidebarSkeleton from './lib/SidebarSkeleton.svelte';
  import IngredientManagerSkeleton from './lib/IngredientManagerSkeleton.svelte';
  // Keep legacy imports as fallback
  import Sidebar from './lib/Sidebar.svelte';
  import IngredientManager from './lib/IngredientManager.svelte';
  // Temporarily create simple stub components until we fix the missing ones
  import TPNTestPanel from './lib/TPNTestPanel.svelte';
  import IngredientInputPanel from './lib/IngredientInputPanel.svelte';
  import TestGeneratorButton from './lib/TestGeneratorButton.svelte';
  // Import Skeleton modals
  import TestGeneratorModalSkeleton from './lib/TestGeneratorModalSkeleton.svelte';
  import ExportModalSkeleton from './lib/ExportModalSkeleton.svelte';
  import PreferencesModalSkeleton from './lib/PreferencesModalSkeleton.svelte';
  import DuplicateReportModalSkeleton from './lib/DuplicateReportModalSkeleton.svelte';
  // Keep legacy modals as fallback
  import TestGeneratorModal from './lib/TestGeneratorModal.svelte';
  import ExportModal from './lib/ExportModal.svelte';
  import PreferencesModal from './lib/PreferencesModal.svelte';
  import DuplicateReportModal from './lib/DuplicateReportModal.svelte';
  // Other components
  import AIWorkflowInspector from './lib/AIWorkflowInspector.svelte';
  import IngredientDiffViewer from './lib/IngredientDiffViewer.svelte';
  import CommitMessageDialog from './lib/CommitMessageDialog.svelte';
  import DataMigrationTool from './lib/DataMigrationTool.svelte';
  import KPTManager from './lib/KPTManager.svelte';
  
  // Import the simple navbar actions component we have
  import NavbarActions from './lib/NavbarActions.svelte';
  import TPNKeyReference from './lib/TPNKeyReference.svelte';
  import { initializeKPTCustomFunctions, createKPTNamespace } from './lib/kptNamespace.ts';
  import { TPNLegacySupport, LegacyElementWrapper, extractKeysFromCode, extractDirectKeysFromCode, isValidKey, getKeyCategory, isCalculatedValue, getCanonicalKey } from './lib/tpnLegacy.js';
  import { isFirebaseConfigured, signInAnonymouslyUser, onAuthStateChange } from './lib/firebase.js';
  import { POPULATION_TYPES } from './lib/firebaseDataService.js';
  
  // New refactored components
  // AppContainer removed - not being used in template
  // import StatusBar from './components/StatusBar.svelte';
  import TestSummaryModal from './components/TestSummaryModal.svelte';
  import SelectiveApply from './lib/SelectiveApply.svelte';
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
  let currentReferenceName = $state(workspaceStore.currentReferenceName);
  const lastSavedTime = $derived(workspaceStore.lastSavedTime);
  let loadedReferenceId = $state(workspaceStore.loadedReferenceId);
  const loadedIngredient = $derived(workspaceStore.loadedIngredient);
  
  // Sync loadedReferenceId with store
  $effect(() => {
    loadedReferenceId = workspaceStore.loadedReferenceId;
  });
  const loadedReference = $derived(workspaceStore.loadedReference);
  const currentHealthSystem = $derived(workspaceStore.currentHealthSystem);
  const currentValidationStatus = $derived(workspaceStore.currentValidationStatus);
  const currentValidationNotes = $derived(workspaceStore.currentValidationNotes);
  
  // Sync currentReferenceName with store
  $effect(() => {
    currentReferenceName = workspaceStore.currentReferenceName;
  });
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
  let showImportConfirmation = $state(false);
  let pendingImport = $state(null);
  let showCacheStatus = $state(false);
  let showDataMigration = $state(false);
  let showIngredientInputPanel = $state(false);
  let duplicateReport = $state(null);
  let showDuplicateReport = $state(false);
  let showSelectiveApply = $state(false);
  let showKPTManager = $state(false);
  let showPopulationDropdown = $state(false);
  let loadingPopulations = $state(false);
  let isSavingDocument = $state(false);
  let isLoadingDocument = $state(false);
  
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
      
      // Extract only primitive values from currentIngredientValues to avoid serialization issues
      const ingredientValues = extractPrimitiveValues(currentIngredientValues || {});
      
      // Execute code securely in Web Worker
      const result = await executeWithTPNContext(code, tpnValues, ingredientValues);
      return result;
    } catch (error) {
      return `<span style="color: red;">Error: ${error.message}</span>`;
    }
  }

  // Helper function to extract only primitive values from objects
  function extractPrimitiveValues(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => extractPrimitiveValues(item));
    }
    
    if (typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip functions and complex objects
        if (typeof value !== 'function' && value !== null && value !== undefined) {
          if (typeof value === 'object' && value.constructor !== Object) {
            // Skip class instances, but try to extract primitive properties
            try {
              const serialized = JSON.parse(JSON.stringify(value));
              result[key] = serialized;
            } catch {
              // Skip this property if it can't be serialized
              continue;
            }
          } else {
            result[key] = extractPrimitiveValues(value);
          }
        }
      }
      return result;
    }
    
    return undefined;
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
        
        const processedCode = section.content;
        const lines = processedCode.split('\n');
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
  let isPreviewUpdating = $state(false);
  
  // Create the preview update function
  async function updatePreview() {
    isPreviewUpdating = true;
    try {
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
    } finally {
      isPreviewUpdating = false;
    }
  }
  
  // Create debounced version for typing updates (300ms)
  const debouncedPreviewUpdate = debounce(updatePreview, 300);
  
  // Update preview when sections or values change
  $effect(() => {
    // Access currentIngredientValues to create a dependency
    const ingredientVals = { ...currentIngredientValues };
    const sectionContents = sections.map(s => s.content).join('');
    const testCases = JSON.stringify(activeTestCase);
    
    // Use debounced update for smooth typing experience
    debouncedPreviewUpdate();
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
    
    if (configId) {
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
      
      workspaceStore.setActiveConfig(configId, ingredientsArray);
      // Don't automatically open the ingredient manager - let the user interact with sidebar directly
      // showIngredientManager = true;
      // console.log(`Config activated: ${configId} with ${ingredientsArray.length} ingredients`);
    } else {
      // Deactivate config
      workspaceStore.clearActiveConfig();
    }
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
    
    if (USE_SKELETON_UI) {
      // Use Skeleton modal system
      modalStore.trigger({
        type: 'component',
        component: 'testGeneratorModal',
        meta: {
          generatedTests: currentGeneratedTests,
          sectionId: targetSectionId,
          onImport: (tests) => handleImportTests(targetSectionId, tests)
        }
      });
    } else {
      showTestGeneratorModal = true;
    }
  }
  
  // Helper functions for Skeleton UI notifications
  function showToast(message, type = 'success') {
    if (USE_SKELETON_UI) {
      toastStore.trigger({
        message,
        background: type === 'error' ? 'variant-filled-error' : 
                   type === 'warning' ? 'variant-filled-warning' : 
                   'variant-filled-success',
        timeout: 3000
      });
    } else {
      // Fallback to console for legacy mode
      console.log(`[${type.toUpperCase()}]`, message);
    }
  }
  
  // Modal trigger functions for Skeleton UI
  function openExportModal() {
    if (USE_SKELETON_UI) {
      modalStore.trigger({
        type: 'component',
        component: 'exportModal',
        meta: {
          sections: sections,
          currentIngredient: currentIngredient,
          ingredientName: ingredientName
        }
      });
    } else {
      showExportModal = true;
    }
  }
  
  function openPreferencesModal() {
    if (USE_SKELETON_UI) {
      modalStore.trigger({
        type: 'component',
        component: 'preferencesModal',
        meta: {
          preferences: navbarUiState.preferences,
          onSave: (newPrefs) => {
            navbarUiState.preferences = newPrefs;
            localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
          }
        }
      });
    } else {
      navbarUiState.showPreferences = true;
    }
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

  // Save document to Firebase (sections only, no TPN reference)
  async function saveDocumentToFirebase(name = null) {
    if (isSavingDocument) return;
    
    try {
      isSavingDocument = true;
      const { sectionFirebaseService } = await import('./lib/services/sectionService.js');
      
      // Save the document
      const documentId = await sectionFirebaseService.saveDocument(sections, name);
      
      // Update state
      workspaceStore.setLastSavedTime(new Date());
      sectionStore.markAsSaved();
      
      toastStore.trigger({
        message: `Document saved successfully`,
        background: 'variant-filled-success'
      });
      
      return documentId;
    } catch (error) {
      logError('Error saving document:', error);
      toastStore.trigger({
        message: 'Failed to save document. Please try again.',
        background: 'variant-filled-error'
      });
      throw error;
    } finally {
      isSavingDocument = false;
    }
  }

  // Load document from Firebase
  async function loadDocumentFromFirebase(documentId) {
    if (isLoadingDocument) return;
    
    try {
      isLoadingDocument = true;
      const { sectionFirebaseService } = await import('./lib/services/sectionService.js');
      
      // Load the document
      const document = await sectionFirebaseService.loadDocument(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      // Set sections
      sectionStore.setSections(document.sections);
      
      // Update state
      workspaceStore.setLastSavedTime(document.modifiedAt ? new Date(document.modifiedAt.seconds * 1000) : null);
      sectionStore.markAsSaved();
      
      toastStore.trigger({
        message: `Document "${document.name}" loaded successfully`,
        background: 'variant-filled-success'
      });
      
      return document;
    } catch (error) {
      logError('Error loading document:', error);
      toastStore.trigger({
        message: 'Failed to load document. Please try again.',
        background: 'variant-filled-error'
      });
      throw error;
    } finally {
      isLoadingDocument = false;
    }
  }

  // List available documents
  async function listDocuments() {
    try {
      const { sectionFirebaseService } = await import('./lib/services/sectionService.js');
      return await sectionFirebaseService.listDocuments();
    } catch (error) {
      logError('Error listing documents:', error);
      return [];
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
    // Escape to close sidebar
    if (e.key === 'Escape' && navbarUiState.showSidebar) {
      e.preventDefault();
      navbarUiState.showSidebar = false;
      return;
    }
    
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
  
  // Handler functions for Sidebar
  function clearAllSections() {
    sectionStore.clearAllSections();
  }

  function loadReference(reference, ingredient) {
    // Handle both event-based and direct function calls
    if (reference && reference.detail) {
      // Called as an event handler
      const { ingredient: ing, reference: ref } = reference.detail;
      handleEditReference(ing, ref);
    } else {
      // Called directly as a function
      // Extract ingredient name from the ingredient object
      const ingredientName = ingredient?.DISPLAY || ingredient?.display || 
                           ingredient?.KEYNAME || ingredient?.keyname || 
                           ingredient?.name || '';
      handleEditReference(ingredientName, reference);
    }
  }

  function handleImportConfirmation(event) {
    // Handle import confirmation
    if (pendingImport) {
      sectionStore.importSections(pendingImport);
      pendingImport = null;
      showImportConfirmation = false;
    }
  }

  function handleJsonUpload(event) {
    const file = event.detail;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          pendingImport = data;
          showImportConfirmation = true;
        } catch (error) {
          logError('Failed to parse JSON file', error);
        }
      };
      reader.readAsText(file);
    }
  }

  function handleNewReference() {
    // Clear current state for new reference
    sectionStore.clearAllSections();
    workspaceStore.clearWorkspace();
    workspaceStore.setCurrentReferenceName('Untitled Reference');
  }

  function handleEditReference(ingredientName, reference) {
    // console.log('App: handleEditReference called', {
      // ingredient: ingredientName,
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
      workspaceStore.setCurrentIngredient(ingredientName);
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
      workspaceStore.setLoadedIngredient({ name: ingredientName });
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

<!-- Wrap entire app with SkeletonProvider for Skeleton UI components -->
<SkeletonProvider>
  <!-- Main App Container with proper component structure -->
  <div class="app-container" onkeydown={handleKeyDown}>
  
  <!-- Drawer Sidebar -->
  <DrawerSidebar bind:isOpen={navbarUiState.showSidebar} position="left" width="350px">
    {#snippet children()}
      {#if USE_SKELETON_UI}
      <SidebarSkeleton
        bind:sections={sectionStore.sections}
        bind:currentReferenceName
        bind:showExportModal
        bind:showImportConfirmation
        bind:pendingImport
        bind:showCacheStatus
        bind:showDataMigration
        bind:showIngredientInputPanel
        bind:duplicateReport
        bind:showDuplicateReport
        bind:showIngredientManager
        bind:loadedReferenceId
        onConfigActivate={handleConfigActivate}
        activeConfigId={workspaceStore.activeConfigId}
        activeConfigIngredients={workspaceStore.activeConfigIngredients}
        onLoadReference={loadReference}
        onSaveReference={handleSaveReference}
        currentSections={sectionStore.sections}
        on:clearAll={clearAllSections}
        on:handleImport={handleImportConfirmation}
        on:handleJsonUpload={handleJsonUpload}
        onCloseSidebar={() => navbarUiState.showSidebar = false}
      />
      {:else}
        <Sidebar
        bind:sections={sectionStore.sections}
        bind:currentReferenceName
        bind:showExportModal
        bind:showImportConfirmation
        bind:pendingImport
        bind:showCacheStatus
        bind:showDataMigration
        bind:showIngredientInputPanel
        bind:duplicateReport
        bind:showDuplicateReport
        bind:showIngredientManager
        bind:loadedReferenceId
        onConfigActivate={handleConfigActivate}
        activeConfigId={workspaceStore.activeConfigId}
        activeConfigIngredients={workspaceStore.activeConfigIngredients}
        on:clearAll={clearAllSections}
        on:loadReference={loadReference}
        on:handleImport={handleImportConfirmation}
        on:handleJsonUpload={handleJsonUpload}
        onCloseSidebar={() => navbarUiState.showSidebar = false}
      />
      {/if}
    {/snippet}
  </DrawerSidebar>
  
  <main>
    <!-- Header Row with Title and Buttons -->
    <div class="header-row">
      <button 
        class="sidebar-toggle"
        onclick={() => navbarUiState.showSidebar = !navbarUiState.showSidebar}
        title="Toggle sidebar"
      >
        {navbarUiState.showSidebar ? '◀' : '☰'} Sidebar
      </button>
      <h1>TPN Dynamic Text Editor</h1>
        {#if currentIngredient}
          <span class="current-ingredient">| {currentIngredient}</span>
        {/if}
      
      <div class="header-buttons">
        <button 
          class="btn-primary"
          onclick={() => {
            if (hasUnsavedChanges && !confirm('You have unsaved changes. Start new anyway?')) {
              return;
            }
            clearEditor();
          }}
        >
          ➕ New Document
        </button>
        <button 
          class="btn-success"
          onclick={() => saveDocumentToFirebase()}
          disabled={!hasUnsavedChanges || isSavingDocument}
        >
          {isSavingDocument ? '⏳ Saving...' : '💾 Save'}
        </button>
        <button 
          class="btn-primary"
          onclick={async () => {
            const docs = await listDocuments();
            if (docs.length > 0) {
              // For now, load the most recent document
              // In production, you'd show a dialog to select
              await loadDocumentFromFirebase(docs[0].id);
            } else {
              toastStore.trigger({
                message: 'No saved documents found',
                background: 'variant-filled-warning'
              });
            }
          }}
          disabled={isLoadingDocument}
        >
          {isLoadingDocument ? '⏳ Loading...' : '📂 Load'}
        </button>
        <button 
          class="btn-info"
          onclick={openExportModal}
        >
          📤 Export
        </button>
      </div>
    </div>
    
    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-item">
        <span class="status-icon">📝</span>
        <span class="status-text">Sections:</span>
        <span class="status-value">{sections.length}</span>
      </div>
      
      <div class="status-item">
        <span class="status-icon">{hasUnsavedChanges ? '⚠️' : '✅'}</span>
        <span class="status-text">{hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}</span>
        {#if lastSavedTime}
          <span class="status-time">({formatTimestamp(lastSavedTime)})</span>
        {/if}
      </div>
      
      <div class="status-item">
        <span class="status-icon">🧪</span>
        <span class="status-text">TPN Mode:</span>
        <span class="status-value">{navbarUiState.tpnMode ? 'ON' : 'OFF'}</span>
      </div>
      
      <div class="status-item">
        <button 
          class="btn-info"
          onclick={() => navbarUiState.tpnMode = !navbarUiState.tpnMode}
          title="Toggle TPN test panel"
        >
          {navbarUiState.tpnMode ? '🔬 Hide TPN' : '🧪 Show TPN'}
        </button>
        <button 
          class="nav-btn"
          onclick={() => showKPTManager = true}
          title="KPT Manager"
        >
          KPT
        </button>
      </div>
    </div>
    
    <!-- Editor Container with Grid Layout -->
    <div class="editor-container {previewCollapsed ? 'preview-collapsed' : ''}">
      <!-- Editor Panel -->
      <div class="editor-panel">
        <div class="panel-header">
          <h2>Editor</h2>
          <div class="add-section-buttons">
            <button onclick={() => addSection('static')} class="add-btn">+ HTML</button>
            <button onclick={() => addSection('dynamic')} class="add-btn">+ JavaScript</button>
          </div>
        </div>
        
        <div class="sections">
          {#each sections as section, index}
            <div class="section {draggedSection === section.id ? 'dragging' : ''}">
              <div class="section-header">
                <span class="section-type {section.type}">{section.type === 'dynamic' ? 'JS' : 'HTML'}</span>
                <input 
                  type="text" 
                  bind:value={section.name} 
                  placeholder="Section name..."
                  class="section-name-input"
                />
                <button onclick={() => deleteSection(section.id)} class="delete-btn">×</button>
              </div>
              
              <CodeEditor
                value={section.content}
                onChange={(value) => updateSectionContentWrapper(section.id, value)}
                language={section.type === 'dynamic' ? 'javascript' : 'html'}
              />
            
            {#if section.type === 'dynamic'}
              <div class="test-controls">
                <button 
                  onclick={() => toggleTestCases(section.id)}
                  class="toggle-tests-btn"
                >
                  {expandedTestCases[section.id] ? 'Hide' : 'Show'} Tests
                </button>
                
                <TestGeneratorButton
                  sectionId={section.id}
                  sectionContent={section.content}
                  onTestsGenerated={handleTestsGenerated}
                />
              </div>
              
              {#if expandedTestCases[section.id]}
                <div class="test-cases">
                  <button onclick={() => addTestCase(section.id)} class="add-test-btn">+ Add Test Case</button>
                  
                  {#each section.testCases || [] as testCase}
                    <div class="test-case">
                      <input 
                        type="text"
                        bind:value={testCase.name}
                        placeholder="Test name..."
                        class="test-name-input"
                      />
                      <input 
                        type="text"
                        bind:value={testCase.expected}
                        placeholder="Expected output..."
                        class="test-expected-input"
                      />
                      <button 
                        onclick={() => setActiveTestCase(section.id, testCase.id)}
                        class="run-test-btn"
                      >
                        Run
                      </button>
                      <button 
                        onclick={() => deleteTestCase(section.id, testCase.id)}
                        class="delete-test-btn"
                      >
                        ×
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
            {/if}
            </div>
          {/each}
        </div>
      </div>
      
      <!-- Preview Panel -->
      <div class="preview-panel">
        <div class="panel-header">
          <h2>{previewMode === 'preview' ? 'Preview' : 'Output'}</h2>
          <div class="output-controls">
            <button 
              class="btn-secondary"
              onclick={() => previewMode = previewMode === 'preview' ? 'output' : 'preview'}
            >
              {previewMode === 'preview' ? '📤 Output' : '👁️ Preview'}
            </button>
            <button 
              class="btn-primary"
              onclick={openExportModal}
            >
              💾 Export
            </button>
            <button 
              onclick={() => previewCollapsed = !previewCollapsed}
              class="btn-outline"
              title="{previewCollapsed ? 'Expand' : 'Collapse'} preview"
            >
              {previewCollapsed ? '◀' : '▶'}
            </button>
          </div>
        </div>
        
        <div class="preview-content">
          {#if previewMode === 'preview'}
            {@html previewHTML}
          {:else}
            <pre class="output-text">{outputText}</pre>
          {/if}
        </div>
      </div>
    </div>
    
    {#if navbarUiState.tpnMode}
      <TPNTestPanel 
        {dynamicSections}
        onValuesChange={handleTPNValuesChange}
        {activeTestCase}
        bind:isExpanded={tpnPanelExpanded}
      />
    {/if}
  
  </main>
  
  <!-- Test Generator Modal (Legacy - only shown when not using Skeleton UI) -->
  {#if !USE_SKELETON_UI}
    <TestGeneratorModal
      bind:isOpen={showTestGeneratorModal}
      generatedTests={currentGeneratedTests}
      onImportTests={handleImportTests}
      sectionId={targetSectionId}
    />
  {/if}
  
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
  
  <!-- KPT Reference Panel temporarily disabled - missing component -->
  {#if navbarUiState.showKPTReference}
    <div class="modal-overlay" onclick={() => navbarUiState.showKPTReference = false}>
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => navbarUiState.showKPTReference = false}>×</button>
        <h2>KPT Reference</h2>
        <p>KPT reference documentation would appear here.</p>
      </div>
    </div>
  {/if}
  
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
        <!-- IngredientManager temporarily simplified -->
        <div class="ingredient-manager-simple">
          <h2>Ingredient Manager</h2>
          <p>Current Ingredient: {currentIngredient?.name || 'None selected'}</p>
          <p>Health System: {currentHealthSystem || 'Default'}</p>
                      <p>Population Type: {currentPopulationType || 'Adult'}</p>
          <div class="ingredient-actions">
            <button onclick={() => handleNewReference()} class="btn-primary">New Reference</button>
            <button onclick={() => showIngredientManager = false} class="btn-secondary">Close</button>
          </div>
        </div>
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
  
  <!-- Export Modal (Legacy - only shown when not using Skeleton UI) -->
  {#if !USE_SKELETON_UI}
    <ExportModal
      bind:isOpen={showExportModal}
      sections={sections}
      currentIngredient={currentIngredient}
      currentReferenceName={currentReferenceName}
      healthSystem={currentHealthSystem}
      populationType={currentPopulationType}
      onClose={() => showExportModal = false}
    />
  {/if}
  
  <!-- Ingredient Manager Modal -->
  {#if showIngredientManager}
    {#if USE_SKELETON_UI}
      <IngredientManagerSkeleton
        bind:isOpen={showIngredientManager}
        currentIngredient={currentIngredient}
        currentReferenceName={currentReferenceName}
        activeConfigId={workspaceStore.activeConfigId}
        activeConfigIngredients={workspaceStore.activeConfigIngredients}
        on:editReference={(e) => handleEditReference(e.detail.ingredient, e.detail.reference)}
        on:close={() => showIngredientManager = false}
      />
    {:else}
      <IngredientManager
        bind:isOpen={showIngredientManager}
        currentIngredient={currentIngredient}
        currentReferenceName={currentReferenceName}
        activeConfigId={workspaceStore.activeConfigId}
        activeConfigIngredients={workspaceStore.activeConfigIngredients}
        on:editReference={(e) => handleEditReference(e.detail.ingredient, e.detail.reference)}
        on:close={() => showIngredientManager = false}
      />
    {/if}
  {/if}
  
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
  
  <!-- Preferences Modal (Legacy - only shown when not using Skeleton UI) -->
  {#if !USE_SKELETON_UI}
    <PreferencesModal 
      isOpen={showPreferences}
      onClose={() => showPreferences = false}
    />
  {/if}
  
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
  
  <!-- Skeleton UI Components (Modal, Toast, Drawer) -->
  {#if USE_SKELETON_UI}
    <!-- Skeleton v3 doesn't provide these components
    <Modal components={modalRegistry} />
    <Toast />
    <Drawer /> -->
  {/if}
</SkeletonProvider>

<style>
  /* App Container Layout */
  .app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background-color: var(--bg-primary);
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
    background-color: var(--bg-primary);
  }
  
  /* Header Row with Title and Buttons */
  .header-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.5rem 1rem;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }
  
  .header-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .sidebar-toggle {
    padding: 0.5rem 0.75rem;
    background-color: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 1rem;
    transition: all var(--transition-normal);
  }
  
  .sidebar-toggle:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--border-secondary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
  
  .new-button {
    padding: 0.5rem 1rem;
    background-color: var(--color-info);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 1rem;
    transition: all var(--transition-normal);
  }
  
  .new-button:hover {
    background-color: var(--color-info-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  h1 {
    flex: 1;
    text-align: center;
    margin: 0;
    font-size: 2rem;
    color: var(--color-primary);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .current-ingredient {
    color: var(--color-info);
    font-size: 1.2rem;
    font-weight: 500;
    margin-left: 1rem;
  }
  
  /* Status Bar */
  .status-bar {
    display: flex;
    gap: 2rem;
    padding: 0.5rem 1rem;
    background-color: var(--bg-card);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    margin-bottom: 1rem;
    align-items: center;
    font-size: 0.9rem;
    box-shadow: var(--shadow-sm);
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
    color: var(--text-secondary);
  }
  
  .status-time {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-left: 0.25rem;
  }

  /* Editor Container Grid Layout */
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

  /* Editor and Preview Panels */
  .editor-panel, .preview-panel {
    display: flex;
    flex-direction: column;
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    background-color: var(--bg-secondary);
    overflow: hidden;
    box-shadow: var(--shadow-md);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-primary);
    background-color: var(--bg-tertiary);
  }

  h2 {
    font-size: 1.25rem;
    margin: 0;
    color: var(--color-primary);
  }

  .add-section-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .add-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    background-color: var(--color-success);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .add-btn:hover {
    background-color: var(--color-success-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  /* Sections Container */
  .sections {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .section {
    margin-bottom: 1rem;
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background-color: var(--bg-card);
    transition: all var(--transition-normal);
    box-shadow: var(--shadow-sm);
  }
  
  .section:hover {
    border-color: var(--border-secondary);
    box-shadow: var(--shadow-md);
  }

  .section.dragging {
    opacity: 0.5;
  }

  .section-header {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-primary);
    flex-wrap: wrap;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  }
  
  /* Section Controls */
  .section-type {
    padding: 0.25rem 0.5rem;
    background: linear-gradient(135deg, var(--color-info) 0%, var(--color-info-hover) 100%);
    color: white;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: var(--shadow-sm);
  }
  
  .section-type.static {
    background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-hover) 100%);
  }
  
  .section-type.dynamic {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  }
  
  .section-name-input {
    flex: 1;
    padding: 0.25rem 0.5rem;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    transition: all var(--transition-normal);
  }
  
  .section-name-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.2);
  }
  
  .delete-btn {
    background: var(--color-danger);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    width: 28px;
    height: 28px;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-normal);
  }
  
  .delete-btn:hover {
    background: var(--color-danger-hover);
    transform: scale(1.1);
    box-shadow: var(--shadow-md);
  }
  
  /* Test Controls */
  .test-controls {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.5rem;
  }
  
  .toggle-tests-btn {
    padding: 0.25rem 0.75rem;
    background: var(--color-secondary);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all var(--transition-normal);
  }
  
  .toggle-tests-btn:hover {
    background: var(--color-secondary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
  
  .test-cases {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .add-test-btn {
    padding: 0.25rem 0.5rem;
    background: var(--color-info);
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  .test-case {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .test-name-input,
  .test-expected-input {
    flex: 1;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: 3px;
    font-size: 0.875rem;
  }
  
  .run-test-btn {
    padding: 0.25rem 0.5rem;
    background: var(--color-success, #28a745);
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .delete-test-btn {
    background: var(--color-danger, #dc3545);
    color: white;
    border: none;
    border-radius: 3px;
    width: 24px;
    height: 24px;
    cursor: pointer;
  }
  
  /* Preview Panel Styles */
  .preview-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    background-color: var(--bg-primary);
  }
  
  .output-text {
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    padding: 1rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .output-controls {
    display: flex;
    gap: 0.5rem;
  }
  
  /* Ingredient Badges */
  .ingredient-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    margin: 0.2rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: var(--shadow-sm);
  }
  
  .ingredient-badge.tpn-badge {
    background: linear-gradient(135deg, var(--color-info) 0%, var(--color-info-hover) 100%);
  }
  
  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  
  .modal-content {
    background-color: var(--bg-card);
    border: 2px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: 2rem;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: var(--shadow-xl);
    animation: fadeIn var(--transition-slow) ease-out;
  }
  
  .modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: var(--color-danger);
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-normal);
  }
  
  .modal-close:hover {
    background: var(--color-danger-hover);
    transform: scale(1.1);
  }
  
  .collapse-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .preview-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }
  
  /* Modal styles */
  .modal-overlay {
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
    border-radius: 8px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    position: relative;
  }
  
  .modal-content.large-modal {
    max-width: 800px;
  }
  
  .modal-close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text-secondary, #666);
  }
  
  /* Ingredient manager styles */
  .ingredient-manager-simple {
    text-align: center;
  }
  
  .ingredient-manager-simple h2 {
    margin-bottom: 1rem;
  }
  
  .ingredient-manager-simple p {
    margin: 0.5rem 0;
    color: var(--color-text-secondary, #666);
  }
  
  .ingredient-actions {
    margin-top: 1.5rem;
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }
  
  .btn-primary {
    padding: 0.5rem 1rem;
    background: var(--color-primary, #007bff);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn-secondary {
    padding: 0.5rem 1rem;
    background: var(--color-secondary, #6c757d);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn-primary:hover,
  .btn-secondary:hover {
    opacity: 0.9;
  }
</style>

