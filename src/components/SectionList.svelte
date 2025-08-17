<script>
  import { getIngredientBadgeColor } from '../services/uiHelpers';
  import TestCaseManager from './TestCaseManager.svelte';
  import CodeMirror from './CodeMirror.svelte';
  
  let {
    sections = [],
    dynamicKeys = [],
    tpnKeysCategories = {},
    onAddSection = () => {},
    onDeleteSection = () => {},
    onUpdateContent = () => {},
    onConvertToDynamic = () => {},
    onToggleEditing = () => {},
    onTestCaseUpdate = () => {},
    onRunTests = () => {},
    onGenerateTests = () => {},
    onDragStart = () => {},
    onDragOver = () => {},
    onDragDrop = () => {},
    onDragEnd = () => {}
  } = $props();
  
  // Get badge info for a key
  function getKeyBadgeInfo(key) {
    const category = tpnKeysCategories[key];
    if (category) {
      return {
        color: getIngredientBadgeColor(category),
        isCalculated: category === 'CALCULATED'
      };
    }
    return {
      color: getIngredientBadgeColor('CUSTOM'),
      isCalculated: false
    };
  }
  
  // Get all ingredient badges for a section
  function getSectionIngredients(section) {
    const keys = [];
    
    if (section.type === 'dynamic') {
      // Extract keys from code
      const codeKeys = extractKeysFromCode(section.content);
      keys.push(...codeKeys);
      
      // Extract keys from test cases
      if (section.testCases) {
        section.testCases.forEach(testCase => {
          if (testCase.variables) {
            keys.push(...Object.keys(testCase.variables));
          }
        });
      }
    }
    
    return [...new Set(keys)]; // Remove duplicates
  }
  
  function extractKeysFromCode(code) {
    const keys = [];
    const getValueRegex = /me\.getValue\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = getValueRegex.exec(code)) !== null) {
      keys.add(match[1]);
    }
    return keys;
  }
</script>

<div class="sections-container">
  <div class="sections-header">
    <h2>Sections</h2>
    <div class="add-section-buttons">
      <button class="add-btn" onclick={() => onAddSection('static')}>
        + Static HTML
      </button>
      <button class="add-btn" onclick={() => onAddSection('dynamic')}>
        + Dynamic JS
      </button>
    </div>
  </div>
  
  <div class="sections-list">
    {#each sections as section, index}
      <div 
        class="section"
        draggable="true"
        ondragstart={(e) => onDragStart(e, section)}
        ondragover={onDragOver}
        ondrop={(e) => onDragDrop(e, section)}
        ondragend={onDragEnd}
      >
        <div class="section-header">
          <div class="section-type" class:static={section.type === 'static'} class:dynamic={section.type === 'dynamic'}>
            {section.type === 'static' ? '📝' : '⚡'} {section.type}
          </div>
          
          <div class="ingredient-badges">
            {#each getSectionIngredients(section) as key}
              {@const badgeInfo = getKeyBadgeInfo(key)}
              <span 
                class="ingredient-badge" 
                class:tpn-badge={tpnKeysCategories[key]}
                class:calculated-badge={badgeInfo.isCalculated}
                class:custom-badge={!tpnKeysCategories[key]}
                style={tpnKeysCategories[key] ? `background-color: ${badgeInfo.color}` : ''}
              >
                {key}
              </span>
            {/each}
            {#if getSectionIngredients(section).length > 0}
              <span class="ingredient-count">
                {getSectionIngredients(section).length} keys
              </span>
            {/if}
          </div>
          
          <button 
            class="delete-section-btn" 
            onclick={() => onDeleteSection(section.id)}
            title="Delete section"
          >
            🗑️
          </button>
        </div>
        
        <div class="section-content">
          {#if section.isEditing}
            <div class="editor-wrapper">
              <CodeMirror
                value={section.content}
                onChange={(value) => onUpdateContent(section.id, value)}
                language={section.type === 'static' ? 'html' : 'javascript'}
                theme="dark"
              />
              <button 
                class="done-editing-btn"
                onclick={() => onToggleEditing(section.id, false)}
              >
                Done Editing
              </button>
            </div>
          {:else}
            <div 
              class="content-preview"
              ondblclick={() => onToggleEditing(section.id, true)}
            >
              <pre>{section.content.slice(0, 200)}{section.content.length > 200 ? '...' : ''}</pre>
            </div>
          {/if}
        </div>
        
        {#if section.type === 'dynamic'}
          <TestCaseManager
            section={section}
            onAddTestCase={() => onTestCaseUpdate(section.id, 'add')}
            onUpdateTestCase={(index, updates) => onTestCaseUpdate(section.id, 'update', index, updates)}
            onDeleteTestCase={(index) => onTestCaseUpdate(section.id, 'delete', index)}
            onSetActiveTestCase={(testCase) => onTestCaseUpdate(section.id, 'setActive', null, testCase)}
            onRunTest={(testCase) => onRunTests(section.id, testCase)}
            onRunAllTests={() => onRunTests(section.id)}
            onGenerateTests={() => onGenerateTests(section.id)}
            onToggleTests={() => onTestCaseUpdate(section.id, 'toggle')}
          />
        {/if}
        
        {#if section.type === 'static'}
          <div class="convert-section">
            <button 
              class="convert-btn"
              onclick={() => onConvertToDynamic(section.id, section.content)}
            >
              Convert to Dynamic
            </button>
          </div>
        {/if}
      </div>
    {/each}
    
    {#if sections.length === 0}
      <div class="empty-state">
        <p>No sections yet. Add a static HTML or dynamic JavaScript section to get started.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .sections-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  
  .sections-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #2a2a2a;
    border-bottom: 1px solid #444;
  }
  
  .sections-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #646cff;
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
  
  .sections-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }
  
  .section {
    margin-bottom: 1rem;
    padding: 1rem;
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    transition: all 0.2s;
  }
  
  .section:hover {
    border-color: #646cff;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .section-type {
    padding: 0.25rem 0.75rem;
    border-radius: 16px;
    font-size: 0.85rem;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .section-type.static {
    background-color: #17a2b8;
    color: white;
  }
  
  .section-type.dynamic {
    background-color: #ffc107;
    color: #000;
  }
  
  .ingredient-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
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
    color: #999;
    padding: 0.1rem 0.35rem;
    background-color: rgba(255, 255, 255, 0.1);
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
  
  .section-content {
    margin-bottom: 1rem;
  }
  
  .editor-wrapper {
    position: relative;
    max-height: 500px;
    resize: vertical;
    overflow: auto;
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
  
  .content-preview {
    padding: 1rem;
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px dashed #444;
    border-radius: 4px;
    transition: all 0.2s;
    position: relative;
  }
  
  .content-preview:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: #646cff;
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
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: #ccc;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .convert-section {
    margin-top: 0.5rem;
  }
  
  .convert-btn {
    padding: 0.5rem 1rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }
  
  .convert-btn:hover {
    background-color: #5a6268;
  }
  
  .empty-state {
    padding: 3rem;
    text-align: center;
    color: #999;
    font-style: italic;
  }
</style>