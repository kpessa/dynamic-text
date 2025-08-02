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
  import { TPNLegacySupport, LegacyElementWrapper, extractKeysFromCode, isValidKey, getKeyCategory } from './lib/tpnLegacy.js';
  
  let showSidebar = $state(true);
  let sections = $state([
    { id: 1, type: 'static', content: '<h2>Welcome to the Dynamic Text Editor!</h2>\n<p>This editor supports <strong>HTML rendering</strong> and modern JavaScript. Enable <strong>TPN Mode</strong> to test TPN Advisor functions!</p>' },
    { 
      id: 2, 
      type: 'dynamic', 
      content: `// TPN Multivitamin Recommendation Example
const MVI = me.getValue('MultiVitamin');
const dw = me.getValue('DoseWeightKG');

let rv = '';

// Check if multivitamin is missing
if (MVI === 0) {
  rv = '<u><b><span style="color: red;">Consider Adding Multivitamin to TPN</span></b></u>';
} else {
  // Calculate recommended amount
  const max = 5.004;
  let amt = 5 / dw;
  amt = amt > 2 ? 2 : amt;
  
  rv = me.maxP(amt, 3) + ' mL/kg/day (max: 5 mL/day)';
  
  // Check if exceeds maximum
  if (MVI > max) {
    rv += '<br><br><strong style="color: red;">*** Exceeds recommended maximum ***</strong>';
  }
}

return rv;`,
      testCases: [
        { name: 'No Multivitamin', variables: { MultiVitamin: 0, DoseWeightKG: 10 } },
        { name: 'Normal Dose', variables: { MultiVitamin: 3, DoseWeightKG: 10 } },
        { name: 'Exceeds Max', variables: { MultiVitamin: 6, DoseWeightKG: 10 } },
        { name: 'Low Weight', variables: { MultiVitamin: 3, DoseWeightKG: 2 } },
        { name: 'Adult TPN', variables: { 
          MultiVitamin: 5, DoseWeightKG: 70, VolumePerKG: 30,
          Protein: 1.5, Carbohydrates: 4, Fat: 1
        }},
        { name: 'Pediatric TPN', variables: { 
          MultiVitamin: 5, DoseWeightKG: 10, VolumePerKG: 120,
          Protein: 2.5, Carbohydrates: 12, Fat: 3
        }}
      ]
    },
    {
      id: 3,
      type: 'dynamic',
      content: `// TPN Osmolarity Warning
const osmo = me.getValue('OsmoValue');
const route = me.getValue('IVAdminSite');
const maxPeripheral = me.getValue('PeripheralOsmoMax');

if (route === 'Peripheral' && osmo > maxPeripheral) {
  return '<div style="background-color: #ffe6e6; border: 2px solid red; padding: 10px; border-radius: 5px;">' +
    '<strong>⚠️ WARNING:</strong> Osmolarity (' + me.maxP(osmo, 0) + ' mOsm/L) exceeds peripheral limit (' + 
    maxPeripheral + ' mOsm/L)<br>' +
    'Consider central line or adjust formulation.' +
    '</div>';
} else if (route === 'Peripheral' && osmo > maxPeripheral * 0.9) {
  return '<div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px;">' +
    '<strong>⚡ CAUTION:</strong> Osmolarity (' + me.maxP(osmo, 0) + ' mOsm/L) approaching peripheral limit' +
    '</div>';
} else {
  return '<div style="color: green;">✓ Osmolarity: ' + me.maxP(osmo, 0) + ' mOsm/L - Within safe range for ' + route + ' administration</div>';
}`,
      testCases: [
        { name: 'Central Line', variables: { IVAdminSite: 'Central', OsmoValue: 1200, PeripheralOsmoMax: 800 } },
        { name: 'Peripheral OK', variables: { IVAdminSite: 'Peripheral', OsmoValue: 600, PeripheralOsmoMax: 800 } },
        { name: 'Peripheral Warning', variables: { IVAdminSite: 'Peripheral', OsmoValue: 750, PeripheralOsmoMax: 800 } },
        { name: 'Peripheral Exceeded', variables: { IVAdminSite: 'Peripheral', OsmoValue: 900, PeripheralOsmoMax: 800 } },
        { name: 'Full Adult TPN', variables: {
          IVAdminSite: 'Central', DoseWeightKG: 70, VolumePerKG: 30,
          Protein: 1.5, Carbohydrates: 4, Fat: 1,
          Sodium: 1, Potassium: 1, Calcium: 0.2, Magnesium: 0.2, Phosphate: 0.5
        }},
        { name: 'Peripheral Limit Test', variables: {
          IVAdminSite: 'Peripheral', DoseWeightKG: 70, VolumePerKG: 35,
          Protein: 1.0, Carbohydrates: 3, Fat: 0.5,
          Sodium: 1, Potassium: 1, Calcium: 0.1, Magnesium: 0.1, Phosphate: 0.3
        }}
      ]
    },
    { id: 4, type: 'static', content: '<p style="color: #646cff;">Enable TPN Mode above to see automatic input generation and calculations!</p>' },
    {
      id: 5,
      type: 'dynamic',
      content: `// Example using both TPN and custom variables
const weight = me.getValue('Weight') || 70;
const height = me.getValue('Height') || 170;
const name = me.getValue('PatientName') || 'Patient';
const bmi = weight / Math.pow(height/100, 2);

// Store and retrieve values using getObject
me.getObject('#bmiResult').val(me.maxP(bmi, 1));
const storedBMI = me.getObject('#bmiResult').val();

// Determine BMI category
let category = '';
if (bmi < 18.5) category = 'Underweight';
else if (bmi < 25) category = 'Normal weight';
else if (bmi < 30) category = 'Overweight';
else category = 'Obese';

return '<h3>BMI Calculator</h3>' +
  '<p><strong>Patient:</strong> ' + name + '</p>' +
  '<p><strong>Weight:</strong> ' + weight + ' kg</p>' +
  '<p><strong>Height:</strong> ' + height + ' cm</p>' +
  '<p><strong>BMI:</strong> ' + storedBMI + ' kg/m² (' + category + ')</p>' +
  '<p><em>This example uses both TPN variables (Weight, Height) and custom variables (PatientName)!</em></p>';`,
      testCases: [
        { name: 'Default', variables: {} }
      ]
    }
  ]);
  
  let nextSectionId = $state(6);
  let copied = $state(false);
  let showOutput = $state(false);
  let outputMode = $state('json'); // 'json' or 'configurator'
  let draggedSection = $state(null);
  let activeTestCase = $state({}); // Track active test case per section
  let expandedTestCases = $state({}); // Track which sections have expanded test cases
  
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
  
  // Test generation state
  let showTestGeneratorModal = $state(false);
  let currentGeneratedTests = $state(null);
  let targetSectionId = $state(null);
  
  // AI Workflow Inspector state
  let showAIWorkflowInspector = $state(false);
  let inspectorCurrentSection = $state(null);
  
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
    
    return Array.from(allKeys).sort();
  });
  
  // Extract ingredients per section for badge display
  let ingredientsBySection = $derived.by(() => {
    const result = {};
    
    sections.forEach(section => {
      if (section.type === 'dynamic') {
        const keys = extractKeysFromCode(section.content);
        const validKeys = keys.filter(key => isValidKey(key));
        const nonTpnKeys = keys.filter(key => !isValidKey(key));
        
        if (validKeys.length > 0 || nonTpnKeys.length > 0) {
          result[section.id] = {
            tpnKeys: validKeys,
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
  
  // Clear editor for new work
  function clearEditor() {
    sections = [];
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
    const newSection = {
      id: nextSectionId++,
      type: type,
      content: type === 'static' 
        ? '<h3>New Section</h3>\n<p>Enter your HTML content here...</p>' 
        : '// Write JavaScript that returns HTML\nconst message = me.getValue("CustomVariable") || "Hello!";\nreturn `<p>${message}</p>`;'
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
  function handleLoadReference(reference) {
    if (reference && reference.sections) {
      sections = reference.sections;
      // Update work context
      currentIngredient = reference.ingredient || '';
      currentReferenceName = reference.name || '';
      loadedReferenceId = reference.id || null;
      hasUnsavedChanges = false;
      lastSavedTime = reference.updatedAt || null;
      // Store original sections for comparison
      originalSections = JSON.stringify(reference.sections);
    }
  }
  
  function handleSaveReference() {
    // The sidebar will handle the actual saving
    // Just return the current sections
    return sections;
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
    currentIngredientValues[key] = value;
    currentIngredientValues = { ...currentIngredientValues }; // Trigger reactivity
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
  
  // Auto-populate test cases with extracted ingredients
  $effect(() => {
    Object.entries(ingredientsBySection).forEach(([sectionId, { allKeys }]) => {
      const section = sections.find(s => s.id === parseInt(sectionId));
      if (section && section.testCases) {
        section.testCases.forEach(testCase => {
          // Add any new keys that aren't already in the test case
          allKeys.forEach(key => {
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
          Object.keys(testCase.variables).forEach(key => {
            if (!allKeys.includes(key)) {
              delete testCase.variables[key];
            }
          });
        });
      }
    });
  });
  
</script>

<div class="app-container {showSidebar ? 'sidebar-open' : ''}">
  {#if showSidebar}
    <Sidebar 
      onLoadReference={handleLoadReference}
      onSaveReference={handleSaveReference}
      currentSections={sections}
    />
  {/if}
  
  <main>
    <div class="header-row">
      <button 
        class="sidebar-toggle"
        onclick={() => showSidebar = !showSidebar}
        title="{showSidebar ? 'Hide' : 'Show'} Sidebar"
      >
        {showSidebar ? '◀' : '▶'}
      </button>
      <h1>Dynamic Text Editor</h1>
      <button 
        class="new-button"
        onclick={() => {
          if (hasUnsavedChanges && !confirm('You have unsaved changes. Start new anyway?')) {
            return;
          }
          clearEditor();
        }}
        title="Start new document"
      >
        ➕ New
      </button>
      <label class="tpn-toggle">
        <input 
          type="checkbox" 
          bind:checked={tpnMode}
          onchange={() => {
            if (tpnMode && !showKeyReference) {
              showKeyReference = true;
            }
          }}
        />
        <span>TPN Mode</span>
      </label>
    </div>
    
    <div class="status-bar">
      <div class="status-item">
        <span class="status-icon">📄</span>
        <span class="status-text">
          {currentReferenceName || 'Untitled'}
        </span>
      </div>
      
      <div class="status-item">
        <span class="status-icon">🧪</span>
        <span class="status-text">
          {currentIngredient || 'No ingredient set'}
        </span>
      </div>
      
      <div class="status-item">
        <span class="status-icon">{hasUnsavedChanges ? '🔴' : '🟢'}</span>
        <span class="status-text">
          {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
        </span>
        {#if lastSavedTime && !hasUnsavedChanges}
          <span class="status-time">
            ({new Date(lastSavedTime).toLocaleTimeString()})
          </span>
        {/if}
      </div>
    </div>
    
    <div class="editor-container {previewCollapsed ? 'preview-collapsed' : ''}">
    <div class="editor-panel">
      <div class="panel-header">
        <h2>Content Sections</h2>
        <div class="add-section-buttons">
          <button class="add-btn" onclick={() => addSection('static')}>
            + Static HTML
          </button>
          <button class="add-btn" onclick={() => addSection('dynamic')}>
            + Dynamic JS
          </button>
        </div>
      </div>
      
      <div class="sections" role="list">
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
                    </div>
                  {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <div class="preview-panel">
      <div class="panel-header preview-header">
        {#if !previewCollapsed}
          <h2>Live Preview (HTML Rendered)</h2>
        {/if}
        <button 
          class="preview-toggle"
          onclick={() => previewCollapsed = !previewCollapsed}
          title="{previewCollapsed ? 'Show' : 'Hide'} Preview"
        >
          {previewCollapsed ? '◀' : '▶'}
        </button>
      </div>
      
      {#if referencedIngredients.length > 0 && !tpnMode}
        <IngredientInputPanel 
          ingredients={referencedIngredients}
          values={currentIngredientValues}
          onChange={handleIngredientChange}
        />
      {/if}
      
      <div class="preview">
        {@html previewHTML}
      </div>
      
      <div class="output-controls">
        <button 
          class="output-toggle-btn"
          onclick={() => showOutput = !showOutput}
        >
          {showOutput ? 'Hide' : 'Show'} Output
        </button>
        
        {#if showOutput}
          <button 
            class="export-button {copied ? 'copied' : ''}"
            onclick={copyToClipboard}
          >
            {copied ? '✓ Copied!' : 'Export to Clipboard'}
          </button>
        {/if}
      </div>
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
  
  {#if showOutput}
    <div class="output-panel">
      <div class="output-header">
        <h2>Output</h2>
        <div class="view-toggle">
          <button 
            class="toggle-btn {outputMode === 'json' ? 'active' : ''}"
            onclick={() => outputMode = 'json'}
          >
            JSON View
          </button>
          <button 
            class="toggle-btn {outputMode === 'configurator' ? 'active' : ''}"
            onclick={() => outputMode = 'configurator'}
          >
            Configurator View
          </button>
        </div>
      </div>
      
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

  h1 {
    flex: 1;
    text-align: center;
    margin: 0;
    font-size: 2rem;
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
    padding: 0.5rem;
    border-bottom: 1px solid #444;
    flex-wrap: wrap;
    gap: 0.5rem;
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
    gap: 0.25rem;
    align-items: center;
    flex: 1;
  }

  .ingredient-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-weight: 500;
    white-space: nowrap;
  }

  .ingredient-badge.tpn-badge {
    color: white;
  }

  .ingredient-badge.custom-badge {
    background-color: #e9ecef;
    color: #495057;
  }

  .ingredient-count {
    font-size: 0.75rem;
    color: #666;
    padding: 0.125rem 0.5rem;
    background-color: #f0f0f0;
    border-radius: 12px;
    white-space: nowrap;
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

  .variable-row {
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

  .var-delete {
    padding: 0.2rem 0.4rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  /* Rest of styles remain the same... */
  .preview-panel {
    padding: 1rem;
  }

  .preview-panel h2 {
    margin-bottom: 0;
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

  .output-panel {
    margin-top: 1rem;
    padding: 1rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    background-color: #f5f5f5;
    max-height: 400px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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

  .json-output, .configurator {
    flex: 1;
    padding: 1rem;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: auto;
    color: #333;
  }

  .config-line {
    margin-bottom: 0.5rem;
  }

  .line-input {
    width: 100%;
    padding: 0.5rem;
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    color: #333;
  }

  .config-line.non-editable .line-input {
    background-color: #e8e8e8;
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

  .tpn-toggle {
    margin-left: 1rem;
    display: flex;
    align-items: center;
    font-size: 0.9rem;
    cursor: pointer;
  }
  
  .tpn-toggle input {
    margin-right: 0.5rem;
  }
  
  .tpn-toggle span {
    color: #333;
  }
</style>