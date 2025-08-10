<script>
  import { TouchGestureHandler } from './utils/touchGestures.js';
  import { tpnStore } from '../stores/index.js';
  
  let {
    sections = [],
    currentIngredientValues = {},
    onTPNValuesChange = () => {},
    onCollapsePanel = () => {},
    isCollapsed = false
  } = $props();
  
  // Mobile-specific state
  let panelElement;
  let gestureHandler;
  let isExpanded = !isCollapsed;
  let isDragging = false;
  let dragStartY = 0;
  let panelHeight = 300; // Default height
  
  // TPN input groups for mobile organization
  const inputGroups = $derived(() => [
    {
      title: 'Patient Info',
      icon: '=d',
      fields: [
        { key: 'weight', label: 'Weight (kg)', type: 'number', step: '0.1' },
        { key: 'age', label: 'Age', type: 'number' },
        { key: 'height', label: 'Height (cm)', type: 'number' }
      ]
    },
    {
      title: 'Fluid & Energy',
      icon: '=§',
      fields: [
        { key: 'totalVolume', label: 'Total Volume (mL)', type: 'number' },
        { key: 'calories', label: 'Calories (kcal)', type: 'number' },
        { key: 'fluidRate', label: 'Fluid Rate (mL/hr)', type: 'number' }
      ]
    },
    {
      title: 'Macronutrients',
      icon: '>D',
      fields: [
        { key: 'protein', label: 'Protein (g)', type: 'number', step: '0.1' },
        { key: 'carbs', label: 'Carbs (g)', type: 'number', step: '0.1' },
        { key: 'lipids', label: 'Lipids (g)', type: 'number', step: '0.1' }
      ]
    },
    {
      title: 'Electrolytes',
      icon: '¡',
      fields: [
        { key: 'sodium', label: 'Sodium (mEq)', type: 'number', step: '0.1' },
        { key: 'potassium', label: 'Potassium (mEq)', type: 'number', step: '0.1' },
        { key: 'calcium', label: 'Calcium (mEq)', type: 'number', step: '0.1' },
        { key: 'phosphorus', label: 'Phosphorus (mmol)', type: 'number', step: '0.1' },
        { key: 'magnesium', label: 'Magnesium (mEq)', type: 'number', step: '0.1' }
      ]
    }
  ]);
  
  let activeGroup = $state(0);
  
  // Initialize gesture handling
  $effect(() => {
    if (panelElement && !gestureHandler) {
      gestureHandler = new TouchGestureHandler(panelElement, {
        onSwipeUp: () => {
          if (!isExpanded) expandPanel();
        },
        onSwipeDown: () => {
          if (isExpanded) collapsePanel();
        },
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
      });
    }
    
    return () => {
      if (gestureHandler) {
        gestureHandler.destroy();
      }
    };
  });
  
  function handleTouchStart(e) {
    const touch = e.touches[0];
    dragStartY = touch.pageY;
    isDragging = true;
  }
  
  function handleTouchMove(e) {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = dragStartY - touch.pageY;
    
    // Update panel height based on drag
    if (isExpanded) {
      const newHeight = Math.max(150, Math.min(600, panelHeight + deltaY));
      panelHeight = newHeight;
    }
  }
  
  function handleTouchEnd() {
    isDragging = false;
    
    // Snap to reasonable heights
    if (panelHeight < 200) {
      collapsePanel();
    } else if (panelHeight > 500) {
      panelHeight = 600;
    }
  }
  
  function expandPanel() {
    isExpanded = true;
    panelHeight = 400;
  }
  
  function collapsePanel() {
    isExpanded = false;
    panelHeight = 80;
    onCollapsePanel();
  }
  
  function handleInputChange(key, value) {
    const numericValue = parseFloat(value) || 0;
    onTPNValuesChange({
      ...currentIngredientValues,
      [key]: numericValue
    });
    
    // Provide haptic feedback for critical values
    if (navigator.vibrate && (key === 'weight' || key === 'totalVolume')) {
      navigator.vibrate(5);
    }
  }
  
  function switchGroup(index) {
    activeGroup = index;
    
    // Provide haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }
  
  // Quick calculation helpers for mobile
  function calculateCaloriesPerKg() {
    const weight = currentIngredientValues.weight || 0;
    const calories = currentIngredientValues.calories || 0;
    return weight > 0 ? (calories / weight).toFixed(1) : '0';
  }
  
  function calculateProteinPerKg() {
    const weight = currentIngredientValues.weight || 0;
    const protein = currentIngredientValues.protein || 0;
    return weight > 0 ? (protein / weight).toFixed(1) : '0';
  }
</script>

<div 
  class="mobile-tpn-panel {isExpanded ? 'expanded' : 'collapsed'}"
  style="height: {panelHeight}px"
  bind:this={panelElement}
  role="region"
  aria-label="TPN calculation panel"
  aria-expanded={isExpanded}
>
  <!-- Panel Header with Drag Handle -->
  <div class="panel-header" role="button" tabindex="0" aria-label="Drag to resize panel">
    <div class="drag-handle" aria-hidden="true"></div>
    <div class="panel-title">
      <span class="panel-icon">>ê</span>
      <span class="panel-text">TPN Calculator</span>
    </div>
    <button 
      class="expand-btn"
      onclick={() => isExpanded ? collapsePanel() : expandPanel()}
      aria-label={isExpanded ? 'Collapse TPN panel' : 'Expand TPN panel'}
    >
      {isExpanded ? '¼' : '²'}
    </button>
  </div>
  
  {#if isExpanded}
    <!-- Quick Stats Bar -->
    <div class="quick-stats" role="region" aria-label="Quick TPN calculations">
      <div class="stat-item">
        <div class="stat-value">{calculateCaloriesPerKg()}</div>
        <div class="stat-label">kcal/kg</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{calculateProteinPerKg()}</div>
        <div class="stat-label">g protein/kg</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{currentIngredientValues.fluidRate || 0}</div>
        <div class="stat-label">mL/hr</div>
      </div>
    </div>
    
    <!-- Group Tabs -->
    <div class="group-tabs" role="tablist">
      {#each inputGroups as group, index}
        <button
          class="group-tab {activeGroup === index ? 'active' : ''}"
          onclick={() => switchGroup(index)}
          role="tab"
          aria-selected={activeGroup === index}
          aria-controls="group-panel-{index}"
          tabindex={activeGroup === index ? 0 : -1}
        >
          <span class="tab-icon" aria-hidden="true">{group.icon}</span>
          <span class="tab-label">{group.title}</span>
        </button>
      {/each}
    </div>
    
    <!-- Input Groups -->
    <div class="panel-content scrollable-container">
      {#each inputGroups as group, groupIndex}
        <div 
          class="input-group {activeGroup === groupIndex ? 'active' : 'hidden'}"
          id="group-panel-{groupIndex}"
          role="tabpanel"
          aria-labelledby="tab-{groupIndex}"
        >
          {#each group.fields as field}
            <div class="input-row">
              <label for="input-{field.key}" class="input-label">
                {field.label}
              </label>
              <input
                id="input-{field.key}"
                type={field.type}
                step={field.step || '1'}
                value={currentIngredientValues[field.key] || ''}
                oninput={(e) => handleInputChange(field.key, e.target.value)}
                class="input-field touch-target"
                autocomplete="off"
                inputmode={field.type === 'number' ? 'decimal' : 'text'}
                aria-describedby={field.description ? `desc-${field.key}` : undefined}
              />
              {#if field.unit}
                <span class="input-unit" aria-hidden="true">{field.unit}</span>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .mobile-tpn-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-background);
    border-top: 1px solid var(--color-border);
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.1);
    transition: height 0.3s ease;
    z-index: var(--z-sticky);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    /* Safe area support */
    padding-bottom: var(--safe-area-inset-bottom);
    
    /* iOS backdrop blur effect */
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .mobile-tpn-panel.collapsed {
    height: calc(80px + var(--safe-area-inset-bottom));
  }
  
  .mobile-tpn-panel.expanded {
    max-height: 70vh;
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: rgba(248, 249, 250, 0.95);
    position: relative;
    min-height: var(--touch-target-medium);
    cursor: grab;
  }
  
  .panel-header:active {
    cursor: grabbing;
  }
  
  .drag-handle {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    background: var(--color-border-dark);
    border-radius: 2px;
    opacity: 0.5;
  }
  
  .panel-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--color-text);
    margin-top: 8px; /* Account for drag handle */
  }
  
  .panel-icon {
    font-size: 1.2rem;
  }
  
  .expand-btn {
    width: var(--touch-target-medium);
    height: var(--touch-target-medium);
    border: none;
    background: var(--color-primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1rem;
    margin-top: 8px;
  }
  
  .expand-btn:active {
    transform: scale(0.95);
    background: var(--color-primary-hover);
  }
  
  .quick-stats {
    display: flex;
    justify-content: space-around;
    padding: 0.75rem 1rem;
    background: rgba(0, 123, 255, 0.05);
    border-bottom: 1px solid var(--color-border-light);
  }
  
  .stat-item {
    text-align: center;
  }
  
  .stat-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-primary);
    line-height: 1.2;
  }
  
  .stat-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    line-height: 1;
    margin-top: 0.25rem;
  }
  
  .group-tabs {
    display: flex;
    background: var(--color-background);
    border-bottom: 1px solid var(--color-border);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .group-tabs::-webkit-scrollbar {
    display: none;
  }
  
  .group-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 0.5rem;
    min-width: 80px;
    border: none;
    background: none;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-text-muted);
    flex-shrink: 0;
    
    /* Touch optimization */
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  .group-tab.active {
    color: var(--color-primary);
    background: rgba(0, 123, 255, 0.05);
  }
  
  .group-tab:active {
    transform: scale(0.95);
    background: var(--color-border-light);
  }
  
  .tab-icon {
    font-size: 1.2rem;
    line-height: 1;
  }
  
  .tab-label {
    font-size: 0.7rem;
    font-weight: 500;
    line-height: 1;
    text-align: center;
  }
  
  .panel-content {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .input-group {
    padding: 1rem;
    display: none;
  }
  
  .input-group.active {
    display: block;
  }
  
  .input-group.hidden {
    display: none;
  }
  
  .input-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border-light);
    gap: 1rem;
  }
  
  .input-row:last-child {
    border-bottom: none;
  }
  
  .input-label {
    flex: 1;
    font-size: 16px; /* Prevent iOS zoom */
    font-weight: 500;
    color: var(--color-text);
    line-height: 1.3;
  }
  
  .input-field {
    width: 120px;
    min-height: var(--touch-target-medium);
    padding: 0.75rem;
    font-size: 16px; /* Prevent iOS zoom */
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-background);
    color: var(--color-text);
    text-align: right;
    
    /* iOS optimization */
    -webkit-appearance: none;
    appearance: none;
    
    /* Touch optimization */
    touch-action: manipulation;
  }
  
  .input-field:focus {
    outline: none;
    border-color: var(--color-focus);
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
  }
  
  .input-unit {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    margin-left: 0.5rem;
  }
  
  /* Dark mode optimizations */
  @media (prefers-color-scheme: dark) {
    .mobile-tpn-panel {
      background: rgba(26, 26, 26, 0.95);
      border-top-color: rgba(255, 255, 255, 0.1);
    }
    
    .panel-header {
      background: rgba(40, 40, 40, 0.95);
    }
    
    .quick-stats {
      background: rgba(0, 123, 255, 0.1);
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .mobile-tpn-panel {
      transition: none;
    }
    
    .group-tab:active,
    .expand-btn:active {
      transform: none;
    }
  }
  
  /* High contrast support */
  @media (prefers-contrast: high) {
    .mobile-tpn-panel {
      border-top-width: 2px;
    }
    
    .input-field {
      border-width: 2px;
    }
    
    .group-tab.active {
      border: 2px solid var(--color-primary);
    }
  }
</style>