<script>
  import { getIngredientConfig, getIngredientNotes, processDynamicNote } from './tpnIngredientConfig.js';
  import { tpnValidator } from './tpnReferenceRanges.js';
  
  let { 
    keyname,
    value = $bindable(),
    tpnInstance = null,
    onchange = () => {}
  } = $props();
  
  // Set default value if not provided
  if (value === undefined) {
    value = 0;
  }
  
  // Get ingredient configuration
  const config = $state(getIngredientConfig(keyname));
  const display = $state(config.DISPLAY || keyname);
  const unit = $state(config.UOM_DISP || '');
  const precision = $state(config.PRECISION || 2);
  
  // Track focus state for validation
  let inputElement = $state(null);
  let wasValue = $state(value);
  let hasWarning = $state(false);
  
  // Process notes (including dynamic ones)
  let processedNotes = $derived.by(() => {
    if (!config.NOTE || config.NOTE.length === 0) {
      return '<em>No additional information</em>';
    }
    
    // First, reconstruct any multi-line dynamic blocks
    const reconstructedNotes = [];
    let i = 0;
    
    while (i < config.NOTE.length) {
      const text = config.NOTE[i].TEXT || '';
      
      // Check if this starts a dynamic block that doesn't close on the same line
      if (text.includes('[f(') && !text.includes(')]')) {
        // Collect all parts until we find the closing
        let dynamicBlock = text;
        i++;
        
        while (i < config.NOTE.length && !dynamicBlock.includes(')]')) {
          const nextText = config.NOTE[i].TEXT || '';
          // Use newline to join JavaScript code lines
          dynamicBlock += '\n' + nextText;
          i++;
        }
        
        reconstructedNotes.push(dynamicBlock);
      } else {
        reconstructedNotes.push(text);
        i++;
      }
    }
    
    // Now process the reconstructed notes
    return reconstructedNotes
      .map(text => {
        if (tpnInstance && text.includes('[f(') && text.includes(')]')) {
          return processDynamicNote(text, tpnInstance);
        }
        return text;
      })
      .filter(text => text.length > 0)
      .join('<br>');
  });
  
  // Handle focus - store original value
  function handleFocus() {
    wasValue = value;
  }
  
  // Handle blur - validate value
  async function handleBlur() {
    const newValue = parseFloat(inputElement.value) || 0;
    
    if (config.REFERENCE_RANGE && config.REFERENCE_RANGE.length > 0) {
      const result = await tpnValidator.handleInputValidation(
        inputElement,
        config,
        wasValue,
        newValue
      );
      
      // Update value based on validation result
      value = result.acceptedValue;
      inputElement.value = tpnValidator.formatValue(value, precision);
      hasWarning = result.validation.severity === 'firm' || result.validation.severity === 'soft';
    } else {
      // No validation needed
      value = newValue;
      hasWarning = false;
    }
    
    // Notify parent
    onchange(value);
  }
  
  // Handle input change
  function handleInput(e) {
    const newValue = parseFloat(e.target.value) || 0;
    value = newValue;
    onchange(value);
  }
  
  // Format value for display
  function formatDisplayValue(val) {
    return tpnValidator.formatValue(val, precision);
  }
  
  // Special handling for certain inputs
  const isSelectInput = keyname === 'IVAdminSite' || keyname === 'prefKNa' || keyname === 'ratioCLAc';
  const isTextArea = keyname.includes('Comments') || keyname === 'OtherAdditives';
</script>

<div class="ingredient-container">
  <!-- Box 0: Name and Notes -->
  <dl class="box b0">
    <dt>{display}</dt>
    <dd>
      {@html processedNotes}
    </dd>
  </dl>
  
  <!-- Box 1: New Values (Input) -->
  <dl class="box b1">
    <dt>New Order</dt>
    <dd>
      {#if isSelectInput}
        {#if keyname === 'IVAdminSite'}
          <select 
            bind:value={value}
            onchange={() => onchange(value)}
            class="ingredient-input"
          >
            <option value="Central">Central</option>
            <option value="Peripheral">Peripheral</option>
          </select>
        {:else if keyname === 'prefKNa'}
          <select 
            bind:value={value}
            onchange={() => onchange(value)}
            class="ingredient-input"
          >
            <option value="Potassium">Potassium</option>
            <option value="Sodium">Sodium</option>
          </select>
        {:else if keyname === 'ratioCLAc'}
          <select 
            bind:value={value}
            onchange={() => onchange(value)}
            class="ingredient-input"
          >
            <option value="1ac:1ch">1:1</option>
            <option value="2ac:1ch">2:1</option>
            <option value="1ac:2ch">1:2</option>
          </select>
        {/if}
      {:else if isTextArea}
        <textarea
          bind:value={value}
          onchange={() => onchange(value)}
          class="ingredient-input"
          rows="2"
        />
      {:else}
        <input
          type="number"
          bind:this={inputElement}
          value={formatDisplayValue(value)}
          step={precision > 0 ? '0.' + '0'.repeat(precision-1) + '1' : '1'}
          onfocus={handleFocus}
          onblur={handleBlur}
          oninput={handleInput}
          class="ingredient-input {hasWarning ? 'tpn-range-warning' : ''}"
          data-keyname={keyname}
          data-precision={precision}
          data-uom={unit}
        />
        <span class="uom">{unit}</span>
      {/if}
    </dd>
  </dl>
</div>

<style>
  .ingredient-container {
    display: flex;
    gap: 10px;
    margin: 8px 0;
    background: white;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    overflow: hidden;
  }

  .box {
    border: 1px solid #ddd;
    background: white;
    min-height: 80px;
    display: flex;
    flex-direction: column;
  }

  /* Box 0: Name and Notes */
  .b0 {
    flex: 3;
    background: #f8f9fa;
    border-right: 2px solid #007bff;
  }

  .b0 dt {
    background: #007bff;
    color: white;
    padding: 6px 12px;
    margin: 0;
    font-weight: bold;
    font-size: 0.9rem;
  }

  .b0 dd {
    padding: 8px 12px;
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: #666;
    flex: 1;
  }

  /* Box 1: New Values (Input) */
  .b1 {
    flex: 2;
    background: #fff8dc;
    border-right: 1px solid #ddd;
  }

  .b1 dt {
    background: #28a745;
    color: white;
    padding: 6px 12px;
    margin: 0;
    font-weight: bold;
    font-size: 0.9rem;
  }

  .b1 dd {
    padding: 8px 12px;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .ingredient-input {
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    background: white;
    color: #333;
  }
  
  input.ingredient-input[type="number"] {
    width: 100px;
  }
  
  select.ingredient-input {
    width: auto;
    min-width: 120px;
  }
  
  textarea.ingredient-input {
    width: 100%;
    resize: vertical;
  }

  .ingredient-input:focus {
    outline: none;
    border-color: #4169e1;
    box-shadow: 0 0 5px rgba(65, 105, 225, 0.3);
  }

  /* Validation warning styles */
  .tpn-range-warning {
    border-color: #ff6b6b !important;
    background-color: #fff5f5 !important;
    box-shadow: 0 0 5px rgba(255, 107, 107, 0.3);
  }

  .tpn-range-warning:focus {
    outline: 2px solid #ff6b6b;
    outline-offset: 2px;
  }

  .uom {
    color: #666;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  /* Dynamic note styles */
  :global(.b0 dd strong) {
    font-weight: 600;
  }
  
  :global(.b0 dd em) {
    font-style: italic;
    color: #999;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .ingredient-container {
      flex-direction: column;
    }
    
    .b0, .b1 {
      border-right: none;
      border-bottom: 1px solid #ddd;
    }
  }
  
  /* Light theme adjustments */
  @media (prefers-color-scheme: light) {
    .ingredient-container {
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    
    .box {
      border-color: #e0e0e0;
    }
    
    .b0 {
      background: #f5f7fa;
    }
    
    .b1 {
      background: #fffbf0;
    }
  }
</style>