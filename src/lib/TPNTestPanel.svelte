<script>
  import { TPNLegacySupport, extractKeysFromCode, isValidKey, getKeyUnit, getDefaultValues, getKeyCategory } from './tpnLegacy.js';
  import TPNIngredientInput from './TPNIngredientInput.svelte';
  
  let { 
    dynamicSections = [],
    onValuesChange = () => {},
    isExpanded = $bindable(),
    activeTestCase = {}
  } = $props();
  
  // Create TPN instance
  let tpn = $state(new TPNLegacySupport());
  
  // Set default for isExpanded if not provided
  if (isExpanded === undefined) {
    isExpanded = true;
  }
  
  // Extract all keys from dynamic sections
  let referencedKeys = $derived.by(() => {
    const keys = new Set();
    dynamicSections.forEach(section => {
      if (section.type === 'dynamic') {
        const extractedKeys = extractKeysFromCode(section.content);
        extractedKeys.forEach(key => keys.add(key));
      }
    });
    return Array.from(keys);
  });
  
  // Separate valid and invalid keys
  let validKeys = $derived(referencedKeys.filter(key => isValidKey(key)));
  let invalidKeys = $derived(referencedKeys.filter(key => !isValidKey(key)));
  
  // Track input values
  let inputValues = $state({});
  
  // Initialize default values for valid keys
  $effect(() => {
    const defaults = getDefaultValues();
    validKeys.forEach(key => {
      if (inputValues[key] === undefined) {
        inputValues[key] = defaults[key] !== undefined ? defaults[key] : 0;
      }
    });
    updateTPNValues();
  });
  
  // Watch for active test case changes from parent
  $effect(() => {
    // Check if any test cases have been activated
    Object.entries(activeTestCase).forEach(([sectionId, testCase]) => {
      if (testCase && testCase.variables) {
        // Update input values with test case variables
        Object.entries(testCase.variables).forEach(([key, value]) => {
          if (isValidKey(key)) {
            inputValues[key] = value;
          }
        });
        updateTPNValues();
      }
    });
  });
  
  // Calculated values to display
  let calculatedValues = $state({});
  
  function updateTPNValues() {
    // Update TPN instance with all values
    tpn.setValues(inputValues);
    
    // Get calculated values
    calculatedValues = {
      TotalVolume: tpn.getValue('TotalVolume'),
      LipidVolTotal: tpn.getValue('LipidVolTotal'),
      NonLipidVolTotal: tpn.getValue('NonLipidVolTotal'),
      DexPercent: tpn.getValue('DexPercent'),
      OsmoValue: tpn.getValue('OsmoValue')
    };
    
    // Notify parent of value changes
    onValuesChange(tpn);
  }
  
  function handleInputChange(key, value) {
    // Convert to number if numeric
    const numValue = parseFloat(value);
    inputValues[key] = isNaN(numValue) ? value : numValue;
    updateTPNValues();
  }
  
  function getInputType(key) {
    // Special cases for specific keys
    if (key === 'IVAdminSite') return 'select';
    if (key === 'prefKNa') return 'select';
    if (key === 'ratioCLAc') return 'select';
    if (key.includes('Comments') || key === 'OtherAdditives') return 'textarea';
    if (key.includes('checkbox')) return 'checkbox';
    
    return 'number';
  }
  
  function groupKeysByCategory(keys) {
    const grouped = {};
    keys.forEach(key => {
      const category = getKeyCategory(key) || 'OTHER';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(key);
    });
    return grouped;
  }
  
  let groupedKeys = $derived(groupKeysByCategory(validKeys));
  
  function getCategoryLabel(category) {
    const labels = {
      'BASIC_PARAMETERS': 'Basic Parameters',
      'MACRONUTRIENTS': 'Macronutrients',
      'ELECTROLYTES': 'Electrolytes',
      'ADDITIVES': 'Additives',
      'PREFERENCES': 'Preferences',
      'ORDER_COMMENTS': 'Comments',
      'ROUTE': 'Administration Route',
      'OTHER': 'Other'
    };
    return labels[category] || category;
  }
  
  function loadTestScenario(scenario) {
    if (scenario === 'adult') {
      inputValues = {
        ...inputValues,
        DoseWeightKG: 70,
        VolumePerKG: 30,
        Protein: 1.5,
        Carbohydrates: 4,
        Fat: 1,
        Sodium: 1,
        Potassium: 1,
        Calcium: 0.2,
        Magnesium: 0.2,
        Phosphate: 0.5,
        MultiVitamin: 5,
        InfuseOver: 24,
        IVAdminSite: 'Central'
      };
    } else if (scenario === 'pediatric') {
      inputValues = {
        ...inputValues,
        DoseWeightKG: 10,
        VolumePerKG: 120,
        Protein: 2.5,
        Carbohydrates: 12,
        Fat: 3,
        Sodium: 3,
        Potassium: 2,
        Calcium: 0.5,
        Magnesium: 0.3,
        Phosphate: 1,
        MultiVitamin: 5,
        InfuseOver: 24,
        IVAdminSite: 'Central'
      };
    } else if (scenario === 'peripheral') {
      inputValues = {
        ...inputValues,
        DoseWeightKG: 70,
        VolumePerKG: 35,
        Protein: 1.0,
        Carbohydrates: 3,
        Fat: 0.5,
        Sodium: 1,
        Potassium: 1,
        Calcium: 0.1,
        Magnesium: 0.1,
        Phosphate: 0.3,
        MultiVitamin: 5,
        InfuseOver: 24,
        IVAdminSite: 'Peripheral'
      };
    } else if (scenario === 'critical') {
      inputValues = {
        ...inputValues,
        DoseWeightKG: 70,
        VolumePerKG: 25,
        Protein: 2.5,
        Carbohydrates: 2,
        Fat: 1.5,
        Sodium: 2,
        Potassium: 2,
        Calcium: 0.3,
        Magnesium: 0.3,
        Phosphate: 0.8,
        MultiVitamin: 5,
        InfuseOver: 24,
        IVAdminSite: 'Central'
      };
    }
    updateTPNValues();
  }
</script>

<div class="tpn-test-panel {isExpanded ? 'expanded' : 'collapsed'}">
  <div class="panel-header">
    <button 
      class="expand-toggle"
      onclick={() => isExpanded = !isExpanded}
      aria-expanded={isExpanded}
    >
      <span class="toggle-icon">{isExpanded ? '▼' : '◀'}</span>
      <h3>TPN Test Values</h3>
    </button>
    {#if referencedKeys.length > 0}
      <span class="key-count">{referencedKeys.length} keys</span>
    {/if}
  </div>
  
  {#if isExpanded}
    <div class="panel-content">
      {#if invalidKeys.length > 0}
        <div class="validation-warnings">
          <h4>⚠️ Invalid Keys Found</h4>
          <ul>
            {#each invalidKeys as key}
              <li class="invalid-key">{key}</li>
            {/each}
          </ul>
          <p class="warning-hint">These keys are not recognized by the TPN system.</p>
        </div>
      {/if}
      
      {#if validKeys.length === 0 && invalidKeys.length === 0}
        <div class="no-keys-message">
          <p>No TPN keys found in dynamic sections.</p>
          <p class="hint">Use <code>me.getValue('DoseWeightKG')</code> in your JavaScript code to reference TPN values.</p>
        </div>
      {/if}
      
      {#if validKeys.length > 0}
        <div class="test-scenarios">
          <label>Quick Load:</label>
          <button onclick={() => loadTestScenario('adult')}>Adult Standard</button>
          <button onclick={() => loadTestScenario('pediatric')}>Pediatric</button>
          <button onclick={() => loadTestScenario('peripheral')}>Peripheral</button>
          <button onclick={() => loadTestScenario('critical')}>Critical Care</button>
        </div>
        
        <div class="input-sections">
          {#each Object.entries(groupedKeys) as [category, keys]}
            <div class="input-category">
              <h4>{getCategoryLabel(category)}</h4>
              <div class="ingredient-list">
                {#each keys as key}
                  <TPNIngredientInput
                    keyname={key}
                    bind:value={inputValues[key]}
                    tpnInstance={tpn}
                    onchange={(value) => handleInputChange(key, value)}
                  />
                {/each}
              </div>
            </div>
          {/each}
        </div>
        
        <div class="calculated-values">
          <h4>Calculated Values</h4>
          <div class="calc-grid">
            <div class="calc-item">
              <span class="calc-label">Total Volume:</span>
              <span class="calc-value">{tpn.maxP(calculatedValues.TotalVolume, 0)} mL</span>
            </div>
            <div class="calc-item">
              <span class="calc-label">Lipid Volume:</span>
              <span class="calc-value">{tpn.maxP(calculatedValues.LipidVolTotal, 2)} mL</span>
            </div>
            <div class="calc-item">
              <span class="calc-label">Non-Lipid Volume:</span>
              <span class="calc-value">{tpn.maxP(calculatedValues.NonLipidVolTotal, 2)} mL</span>
            </div>
            <div class="calc-item">
              <span class="calc-label">Dextrose %:</span>
              <span class="calc-value">{tpn.maxP(calculatedValues.DexPercent, 1)}%</span>
            </div>
            <div class="calc-item {calculatedValues.OsmoValue > 800 && inputValues.IVAdminSite === 'Peripheral' ? 'warning' : ''}">
              <span class="calc-label">Osmolarity:</span>
              <span class="calc-value">
                {tpn.maxP(calculatedValues.OsmoValue, 0)} mOsm/L
                {#if calculatedValues.OsmoValue > 800 && inputValues.IVAdminSite === 'Peripheral'}
                  <span class="osmo-warning" title="Exceeds peripheral limit">⚠️</span>
                {/if}
              </span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tpn-test-panel {
    background-color: #f5f5f5;
    border: 2px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #ddd;
    background-color: #fff;
  }
  
  .expand-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
  }
  
  .expand-toggle:hover {
    color: #535bf2;
  }
  
  .toggle-icon {
    font-size: 0.8rem;
    transition: transform 0.2s;
  }
  
  .expand-toggle h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #28a745;
  }
  
  .key-count {
    font-size: 0.9rem;
    color: #666;
    padding: 0.25rem 0.5rem;
    background-color: #f0f0f0;
    border-radius: 12px;
  }
  
  .panel-content {
    padding: 1rem;
    max-height: 600px;
    overflow-y: auto;
  }
  
  .validation-warnings {
    background-color: #fee;
    border: 1px solid #dc3545;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .validation-warnings h4 {
    margin: 0 0 0.5rem 0;
    color: #dc3545;
    font-size: 1rem;
  }
  
  .validation-warnings ul {
    margin: 0;
    padding-left: 1.5rem;
  }
  
  .invalid-key {
    color: #ff6b6b;
    font-family: monospace;
    font-size: 0.9rem;
  }
  
  .warning-hint {
    margin: 0.5rem 0 0 0;
    font-size: 0.85rem;
    color: #999;
  }
  
  .no-keys-message {
    text-align: center;
    padding: 2rem;
    color: #666;
  }
  
  .hint {
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }
  
  .hint code {
    background-color: #f0f0f0;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
    color: #0066cc;
  }
  
  .test-scenarios {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background-color: #f9f9f9;
    border-radius: 4px;
  }
  
  .test-scenarios label {
    font-size: 0.9rem;
    color: #666;
  }
  
  .test-scenarios button {
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .test-scenarios button:hover {
    background-color: #5a6268;
  }
  
  .input-sections {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .input-category h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #17a2b8;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #333;
  }
  
  .ingredient-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  
  .input-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .input-field label {
    font-size: 0.85rem;
    color: #d4d4d4;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  
  .unit {
    font-size: 0.75rem;
    color: #999;
  }
  
  .input-field input[type="number"],
  .input-field input[type="text"],
  .input-field select,
  .input-field textarea {
    padding: 0.5rem;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    color: #333;
    font-size: 0.9rem;
    width: 100%;
  }
  
  .input-field input[type="checkbox"] {
    width: auto;
    margin-top: 0.25rem;
  }
  
  .input-field input:focus,
  .input-field select:focus,
  .input-field textarea:focus {
    outline: none;
    border-color: #646cff;
  }
  
  .calculated-values {
    margin-top: 1.5rem;
    padding: 1rem;
    background-color: #fff;
    border-radius: 4px;
  }
  
  .calculated-values h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #ffc107;
  }
  
  .calc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  .calc-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background-color: #f9f9f9;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .calc-item.warning {
    border: 1px solid #dc3545;
    background-color: #fee;
  }
  
  .calc-label {
    color: #666;
  }
  
  .calc-value {
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .osmo-warning {
    color: #dc3545;
    font-size: 1rem;
    cursor: help;
  }
  
  .collapsed .panel-content {
    display: none;
  }
  
</style>