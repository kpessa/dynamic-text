<script>
  import CodeEditor from '../CodeEditor.svelte';
  import ValidationStatus from '../ValidationStatus.svelte';
  import AITestGenerator from './testing/AITestGenerator.svelte';
  import { workspaceStore } from '../../stores/workspaceStore.svelte.ts';
  import { uiStore } from '../../stores/uiStore.svelte.ts';
  import { ingredientsBySection } from '../../stores/ingredientStore.svelte.ts';
  import { getKeyCategory } from '../tpnLegacy.js';
  import { openModal, closeModal } from '../modalRegistry.ts';
  
  export let sections = [];
  export let firebaseSyncRef = null;
  export let onAddSection = () => {};
  export let onDeleteSection = () => {};
  export let onUpdateSectionContent = () => {};
  export let onConvertToDynamic = () => {};
  export let onSectionDragStart = () => {};
  export let onSectionDragOver = () => {};
  export let onSectionDrop = () => {};
  export let onSectionDragEnd = () => {};
  
  let draggedSection = null;
  
  function onGenerateTests(section) {
    openModal('aiTestGenerator', {
      section,
      onImport: (tests) => {
        // Import the generated tests into the section
        section.testCases = [...(section.testCases || []), ...tests];
        sections = sections; // Trigger reactivity
        closeModal('aiTestGenerator');
      },
      onCancel: () => {
        closeModal('aiTestGenerator');
      }
    });
  }
  
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
  
  function handleSectionDragStart(e, section) {
    draggedSection = section;
    onSectionDragStart(e, section);
  }
  
  function handleSectionDragOver(e) {
    e.preventDefault();
    onSectionDragOver(e);
  }
  
  function handleSectionDrop(e, targetSection) {
    e.preventDefault();
    onSectionDrop(e, targetSection);
    draggedSection = null;
  }
  
  function handleSectionDragEnd(e) {
    draggedSection = null;
    onSectionDragEnd(e);
  }
</script>

<div class="editor-panel">
  <div class="panel-header">
    <h2>Content Sections</h2>
    <div class="header-controls">
      <div class="add-section-buttons">
        <button class="add-btn" onclick={() => onAddSection('static')}>
          + Static HTML
        </button>
        <button class="add-btn" onclick={() => onAddSection('dynamic')}>
          + Dynamic JS
        </button>
      </div>
    </div>
  </div>
  
  {#if workspaceStore.loadedIngredient && workspaceStore.loadedReference}
    <div class="ingredient-context-bar">
      <span class="context-label">Editing:</span>
      <button 
        class="ingredient-pill"
        onclick={() => uiStore.setShowIngredientManager(true)}
        title="Click to open ingredient manager"
      >
        📦 {workspaceStore.loadedIngredient.name}
      </button>
      <span class="context-separator">→</span>
      <button 
        class="population-pill clickable"
        style="background-color: {firebaseSyncRef?.getPopulationColor(workspaceStore.currentPopulationType)}"
        onclick={() => firebaseSyncRef?.handlePopulationClick()}
        disabled={!firebaseSyncRef}
        title="Click to switch population type"
      >
        {firebaseSyncRef?.getPopulationName(workspaceStore.currentPopulationType)}
        <span class="dropdown-indicator">▼</span>
      </button>
      
      {#if uiStore.showPopulationDropdown}
        <div class="population-dropdown-backdrop" onclick={() => uiStore.setShowPopulationDropdown(false)}></div>
        <div class="population-dropdown">
          <div class="dropdown-header">Switch Population Type</div>
          {#if firebaseSyncRef?.availablePopulations?.length === 0}
            <div class="dropdown-empty">No other population types available</div>
          {:else}
            {#each firebaseSyncRef?.availablePopulations || [] as popOption}
              <div class="population-option {popOption.isActive ? 'active' : ''}">
                <div 
                  class="population-option-header"
                  style="border-left-color: {firebaseSyncRef?.getPopulationColor(popOption.populationType)}"
                >
                  <span class="population-name">{firebaseSyncRef?.getPopulationName(popOption.populationType)}</span>
                  {#if popOption.isActive}
                    <span class="active-badge">Current</span>
                  {/if}
                </div>
                {#if popOption.references.length > 0}
                  <div class="reference-list">
                    {#each popOption.references as ref}
                      <button 
                        class="reference-option"
                        onclick={() => firebaseSyncRef?.switchToPopulation(popOption.populationType, ref)}
                        disabled={popOption.isActive && ref.id === workspaceStore.loadedReferenceId}
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
      {#if workspaceStore.currentHealthSystem}
        <span class="context-separator">→</span>
        <span class="health-system-pill">
          🏥 {workspaceStore.currentHealthSystem}
        </span>
      {/if}
      {#if workspaceStore.loadedReference?.version}
        <span class="version-badge">v{workspaceStore.loadedReference.version}</span>
      {/if}
    </div>
    
    <!-- Validation Status Section -->
    <div class="validation-section">
      <ValidationStatus 
        status={workspaceStore.currentValidationStatus}
        validatedBy={workspaceStore.currentValidatedBy}
        validatedAt={workspaceStore.currentValidatedAt}
        testResults={workspaceStore.currentTestResults}
        notes={workspaceStore.currentValidationNotes}
        compact={false}
        onUpdate={(validationData) => {
          workspaceStore.setCurrentValidationStatus(validationData.status);
          workspaceStore.setCurrentValidationNotes(validationData.notes);
          workspaceStore.setCurrentValidatedBy(validationData.validatedBy);
          workspaceStore.setCurrentValidatedAt(validationData.validatedAt);
          workspaceStore.setHasUnsavedChanges(true);
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
          <button class="empty-state-btn static" onclick={() => onAddSection('static')}>
            <span class="btn-icon">📝</span>
            <span class="btn-label">Add Static HTML</span>
            <span class="btn-hint">For fixed content and formatting</span>
          </button>
          <button class="empty-state-btn dynamic" onclick={() => onAddSection('dynamic')}>
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
            
            {#if section.type === 'dynamic'}
              <button 
                class="generate-tests-btn"
                onclick={() => onGenerateTests(section)}
                title="Generate tests with AI"
              >
                🤖 Generate Tests
              </button>
            {/if}
            
            <button 
              class="delete-section-btn"
              onclick={() => onDeleteSection(section.id)}
              title="Delete section"
            >
              ×
            </button>
          </div>
          
          {#if workspaceStore.editingSection === section.id}
            <div class="editor-wrapper">
              <CodeEditor
                value={section.content}
                language={section.type === 'static' ? 'html' : 'javascript'}
                onChange={(content) => onUpdateSectionContent(section.id, content)}
                on:convertToDynamic={(e) => onConvertToDynamic(section.id, e.detail.content)}
              />
              <button 
                class="done-editing-btn"
                onclick={() => workspaceStore.setEditingSection(null)}
              >
                Done Editing
              </button>
            </div>
          {:else}
            <div 
              class="content-preview"
              ondblclick={() => workspaceStore.setEditingSection(section.id)}
              onkeydown={(e) => e.key === 'Enter' && workspaceStore.setEditingSection(section.id)}
              role="button"
              tabindex="0"
              title="Double-click to edit"
            >
              <pre>{section.content}</pre>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>