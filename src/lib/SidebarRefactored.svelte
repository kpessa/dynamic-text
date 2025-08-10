<script>
  import { onMount } from 'svelte';
  import { isFirebaseConfigured } from './firebase.js';
  import { configService, normalizeConfigId } from './firebaseDataService.ts';
  import DuplicateReportModal from './DuplicateReportModal.svelte';
  
  let { 
    onLoadReference = () => {}, 
    onSaveReference = () => {},
    onConfigActivate = () => {},
    onClose = () => {},
    currentSections = [],
    activeConfigId = null,
    activeConfigIngredients = []
  } = $props();
  
  // Core reference data
  let referenceTexts = $state({});
  let folders = $state({});
  let expandedFolders = $state({});
  let selectedReference = $state(null);
  let showSaveDialog = $state(false);
  let searchQuery = $state('');
  let configSearchQuery = $state('');
  let lastImportReport = $state(null);
  let showDuplicateReport = $state(false);
  
  // Filter states
  let filters = $state({
    healthSystem: '',
    domain: '',
    subdomain: '',
    version: '',
    ingredient: ''
  });
  
  // Save dialog states
  let saveData = $state({
    name: '',
    ingredient: '',
    healthSystem: 'UHS',
    domain: 'west',
    subdomain: 'prod',
    version: 'adult',
    tags: ''
  });
  
  // Available options - now editable
  let healthSystems = $state(['UHS', 'Other']);
  let domains = $state(['west', 'central', 'east']);
  let subdomains = $state(['build', 'cert', 'mock', 'prod']);
  let versions = $state(['neonatal', 'child', 'adolescent', 'adult']);
  
  // Management dialogs
  let showHealthSystemDialog = $state(false);
  let showDomainDialog = $state(false);
  let showSubdomainDialog = $state(false);
  let showIngredientDialog = $state(false);
  let showImportDialog = $state(false);
  let showManageDropdown = $state(false);
  let newItemName = $state('');
  
  // TPN Config Management
  let tpnConfigs = $state({});
  let firebaseConfigs = $state([]);
  let showConfigDialog = $state(false);
  let showLocalConfigs = $state(true);
  let showFirebaseConfigs = $state(false);
  
  // Ingredient type configuration
  const ingredientTypeConfig = {
    'Diluent': { icon: '💧', color: '#3182ce', name: 'Diluent' },
    'Macronutrient': { icon: '🥩', color: '#059669', name: 'Macronutrient' },
    'Micronutrient': { icon: '💊', color: '#7c3aed', name: 'Micronutrient' },
    'Salt': { icon: '🧂', color: '#ea580c', name: 'Salt' },
    'Additive': { icon: '➕', color: '#ec4899', name: 'Additive' },
    'Other': { icon: '📦', color: '#6b7280', name: 'Other' }
  };
  
  function getIngredientTypeInfo(type) {
    return ingredientTypeConfig[type] || ingredientTypeConfig['Other'];
  }
  
  // Group active config ingredients by type
  let groupedConfigIngredients = $derived.by(() => {
    console.log('Grouping ingredients:', { activeConfigId, ingredientsLength: activeConfigIngredients?.length });
    if (!activeConfigId || !activeConfigIngredients || activeConfigIngredients.length === 0) {
      console.log('No active config or ingredients, returning empty array');
      return [];
    }
    
    // Filter ingredients based on search query
    let filteredIngredients = activeConfigIngredients;
    if (configSearchQuery) {
      const query = configSearchQuery.toLowerCase();
      filteredIngredients = activeConfigIngredients.filter(ingredient => {
        const name = (ingredient.DISPLAY || ingredient.display || ingredient.KEYNAME || ingredient.keyname || '').toLowerCase();
        const keyname = (ingredient.KEYNAME || ingredient.keyname || '').toLowerCase();
        return name.includes(query) || keyname.includes(query);
      });
    }
    
    const groups = {};
    const typeOrder = ['Diluent', 'Macronutrient', 'Micronutrient', 'Salt', 'Additive', 'Other'];
    
    // Group ingredients by type
    filteredIngredients.forEach(ingredient => {
      const type = ingredient.TYPE || ingredient.type || 'Other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(ingredient);
    });
    
    // Convert to ordered array
    const result = typeOrder
      .filter(type => groups[type]?.length > 0)
      .map(type => ({
        type,
        info: getIngredientTypeInfo(type),
        ingredients: groups[type].sort((a, b) => {
          const nameA = (a.DISPLAY || a.display || a.KEYNAME || a.keyname || '').toLowerCase();
          const nameB = (b.DISPLAY || b.display || b.KEYNAME || b.keyname || '').toLowerCase();
          return nameA.localeCompare(nameB);
        })
      }));
    
    console.log('Grouped ingredients result:', result);
    return result;
  });
  
  // Load default sample configs if none exist
  async function loadDefaultConfigs() {
    console.log('Loading default configs...');
    
    // Try to load from test-import.json
    try {
      const response = await fetch('/test-import.json');
      if (response.ok) {
        const data = await response.json();
        console.log('Found test-import.json, importing...');
        await handleImportJSON(JSON.stringify(data));
        return;
      }
    } catch (error) {
      console.log('Could not load test-import.json:', error.message);
    }
    
    // Fallback to built-in sample config
    const sampleConfig = {
      id: 'sample-config-1',
      name: 'Sample TPN Config',
      INGREDIENTS: {
        'ACETATE': {
          KEYNAME: 'ACETATE',
          DISPLAY: 'Acetate',
          TYPE: 'Salt',
          NOTES: '<h3>Acetate Information</h3><p>This is a sample acetate ingredient.</p>[f(var total = me.getValue("acetateTotal"); return total > 0 ? "Acetate present: " + total + " mmol" : "No acetate detected";)]'
        },
        'CALCIUM': {
          KEYNAME: 'CALCIUM',
          DISPLAY: 'Calcium',
          TYPE: 'Micronutrient', 
          NOTES: '<p><strong>Calcium dosing information:</strong></p>[f(var calcium = me.getValue("calciumAmount"); return "Calcium dose: " + me.maxP(calcium, 1) + " mg";)]'
        },
        'DEXTROSE': {
          KEYNAME: 'DEXTROSE',
          DISPLAY: 'Dextrose',
          TYPE: 'Macronutrient',
          NOTES: '<h4>Carbohydrate Source</h4><p>Primary energy source in TPN.</p>[f(var glucose = me.getValue("dextroseRate"); return glucose > 0 ? "Glucose rate: " + glucose + " mg/kg/min" : "No dextrose";)]'
        }
      },
      createdAt: new Date().toISOString()
    };
    
    tpnConfigs[sampleConfig.id] = sampleConfig;
    console.log('Loaded built-in sample config:', sampleConfig.name);
    saveToLocalStorage();
  }

  // Create config from current sections
  function createConfigFromCurrentSections() {
    if (!currentSections || currentSections.length === 0) {
      alert('No sections available to create a config from');
      return;
    }

    const configName = prompt('Enter a name for this configuration:');
    if (!configName) return;

    const configId = `config-${Date.now()}`;
    const ingredients = {};

    // Try to extract ingredient information from sections
    // This is a basic implementation - could be enhanced
    currentSections.forEach((section, index) => {
      const ingredientKey = `SECTION_${index + 1}`;
      ingredients[ingredientKey] = {
        KEYNAME: ingredientKey,
        DISPLAY: `Section ${index + 1}`,
        TYPE: 'Other',
        NOTES: section.type === 'html' ? section.content : `[f(${section.content})]`
      };
    });

    tpnConfigs[configId] = {
      id: configId,
      name: configName,
      INGREDIENTS: ingredients,
      createdAt: new Date().toISOString(),
      createdFromSections: true
    };

    saveToLocalStorage();
    alert(`Created config "${configName}" with ${Object.keys(ingredients).length} ingredients`);
  }

  // Initialize folders
  function initializeFolders() {
    // Create default folder structure if empty
    if (Object.keys(folders).length === 0) {
      folders = {
        'uhs-root': {
          id: 'uhs-root',
          name: 'UHS',
          type: 'healthSystem',
          value: 'UHS',
          parentId: null
        }
      };
      
      // Add default domains
      domains.forEach(domain => {
        const domainId = `uhs-${domain}`;
        folders[domainId] = {
          id: domainId,
          name: domain,
          type: 'domain',
          value: domain,
          parentId: 'uhs-root'
        };
        
        // Add default subdomains
        subdomains.forEach(subdomain => {
          const subdomainId = `uhs-${domain}-${subdomain}`;
          folders[subdomainId] = {
            id: subdomainId,
            name: subdomain,
            type: 'subdomain',
            value: subdomain,
            parentId: domainId
          };
          
          // Add default versions
          versions.forEach(version => {
            const versionId = `uhs-${domain}-${subdomain}-${version}`;
            folders[versionId] = {
              id: versionId,
              name: version,
              type: 'version',
              value: version,
              parentId: subdomainId
            };
          });
        });
      });
    }
  }
  
  // Load from localStorage
  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('ingredientReferences');
      if (saved) {
        const data = JSON.parse(saved);
        referenceTexts = data.references || {};
        folders = data.folders || {};
        healthSystems = data.healthSystems || ['UHS', 'Other'];
        domains = data.domains || ['west', 'central', 'east'];
        subdomains = data.subdomains || ['build', 'cert', 'mock', 'prod'];
        versions = data.versions || ['neonatal', 'child', 'adolescent', 'adult'];
        expandedFolders = data.expandedFolders || {};
      }
      
      // Load TPN configs
      const savedConfigs = localStorage.getItem('tpnConfigs');
      console.log('Loading configs from localStorage:', savedConfigs);
      if (savedConfigs) {
        tpnConfigs = JSON.parse(savedConfigs);
        console.log('[snapshot] Parsed tpnConfigs:', $state.snapshot(tpnConfigs));
      } else {
        console.log('No tpnConfigs found in localStorage');
        // Check for other possible keys
        console.log('All localStorage keys:', Object.keys(localStorage));
        
        // Load default sample configs if none exist (async)
        loadDefaultConfigs().catch(err => console.error('Error loading default configs:', err));
      }
      
      initializeFolders();
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      initializeFolders();
    }
  }
  
  // Save to localStorage
  function saveToLocalStorage() {
    try {
      const data = {
        references: referenceTexts,
        folders,
        healthSystems,
        domains,
        subdomains,
        versions,
        expandedFolders
      };
      localStorage.setItem('ingredientReferences', JSON.stringify(data));
      
      // Save TPN configs separately
      localStorage.setItem('tpnConfigs', JSON.stringify(tpnConfigs));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  // Toggle folder expansion
  function toggleFolder(folderId) {
    expandedFolders[folderId] = !expandedFolders[folderId];
    saveToLocalStorage();
  }
  
  // Get child folders
  function getChildFolders(parentId) {
    return Object.values(folders).filter(f => f.parentId === parentId);
  }
  
  // Get references in folder
  function getReferencesInFolder(folderId) {
    const folder = folders[folderId];
    if (!folder) return [];
    
    return Object.values(referenceTexts).filter(ref => {
      if (folder.type === 'healthSystem') {
        return ref.healthSystem === folder.value;
      }
      if (folder.type === 'domain') {
        const parent = folders[folder.parentId];
        return ref.healthSystem === parent.value && ref.domain === folder.value;
      }
      if (folder.type === 'subdomain') {
        const parent = folders[folder.parentId];
        const grandparent = folders[parent.parentId];
        return ref.healthSystem === grandparent.value && 
               ref.domain === parent.value && 
               ref.subdomain === folder.value;
      }
      if (folder.type === 'version') {
        const parent = folders[folder.parentId];
        const grandparent = folders[parent.parentId];
        const greatGrandparent = folders[grandparent.parentId];
        return ref.healthSystem === greatGrandparent.value && 
               ref.domain === grandparent.value && 
               ref.subdomain === parent.value && 
               ref.version === folder.value;
      }
      return false;
    });
  }
  
  // Load reference
  function loadReference(ref, ingredient = null) {
    selectedReference = ref;
    onLoadReference(ref, ingredient);
  }
  
  // Handle save reference
  function handleSaveReference() {
    showSaveDialog = true;
  }
  
  async function confirmSaveReference() {
    const id = `ref-${Date.now()}`;
    const reference = {
      id,
      ...saveData,
      sections: currentSections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    referenceTexts[id] = reference;
    saveToLocalStorage();
    
    // Call parent's save handler if provided
    if (onSaveReference) {
      await onSaveReference(reference);
    }
    
    showSaveDialog = false;
    // Reset save data
    saveData = {
      name: '',
      ingredient: '',
      healthSystem: 'UHS',
      domain: 'west',
      subdomain: 'prod',
      version: 'adult',
      tags: ''
    };
  }
  
  // Delete reference
  function deleteReference(id) {
    if (confirm('Are you sure you want to delete this reference?')) {
      delete referenceTexts[id];
      if (selectedReference?.id === id) {
        selectedReference = null;
      }
      saveToLocalStorage();
    }
  }
  
  // Duplicate reference
  function duplicateReference(ref) {
    const newId = `ref-${Date.now()}`;
    const newRef = {
      ...ref,
      id: newId,
      name: `${ref.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    referenceTexts[newId] = newRef;
    saveToLocalStorage();
  }
  
  // Import JSON
  function handleImportDialog() {
    showImportDialog = true;
  }
  
  async function handleImportJSON(jsonText) {
    try {
      const data = JSON.parse(jsonText);
      
      // Handle different import formats
      if (data.INGREDIENTS) {
        // TPN Config format (object-based)
        await importTPNConfig(data);
      } else if (data.INGREDIENT && Array.isArray(data.INGREDIENT)) {
        // TPN Config format (array-based) - convert to object format
        const convertedData = {
          ...data,
          INGREDIENTS: {}
        };
        
        // Convert array to object keyed by keyname
        data.INGREDIENT.forEach(ingredient => {
          const keyname = ingredient.keyname || ingredient.KEYNAME;
          if (keyname) {
            convertedData.INGREDIENTS[keyname] = {
              ...ingredient,
              KEYNAME: keyname,
              DISPLAY: ingredient.display || ingredient.displayname || keyname,
              NOTES: ingredient.notes?.map(note => note.notetext).join('') || ''
            };
          }
        });
        
        await importTPNConfig(convertedData);
      } else if (data.sections) {
        // Direct reference format
        await importReference(data);
      } else {
        throw new Error('Unrecognized import format. Expected INGREDIENTS object, INGREDIENT array, or sections array.');
      }
      
      showImportDialog = false;
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing: ' + error.message);
    }
  }
  
  async function importTPNConfig(data) {
    // Store the config AND convert to references
    const ingredients = data.INGREDIENTS || {};
    const configId = `config-${Date.now()}`;
    const configName = data.name || data.NAME || `Imported Config ${new Date().toLocaleDateString()}`;
    
    // Store the complete config
    tpnConfigs[configId] = {
      id: configId,
      name: configName,
      INGREDIENTS: ingredients,
      importedAt: new Date().toISOString(),
      ...data // Include any other metadata
    };
    
    // Convert TPN config to references
    let importCount = 0;
    
    for (const [key, ingredient] of Object.entries(ingredients)) {
      if (ingredient.NOTES || ingredient.notes) {
        const sections = convertNotesToSections(ingredient.NOTES || ingredient.notes);
        const id = `ref-${Date.now()}-${importCount++}`;
        
        referenceTexts[id] = {
          id,
          name: ingredient.DISPLAY || ingredient.display || key,
          ingredient: key,
          healthSystem: 'UHS',
          domain: 'west',
          subdomain: 'prod',
          version: 'adult',
          sections,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }
    
    saveToLocalStorage();
    alert(`Imported config "${configName}" with ${Object.keys(ingredients).length} ingredients and ${importCount} references`);
  }
  
  async function importReference(data) {
    const id = `ref-${Date.now()}`;
    referenceTexts[id] = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveToLocalStorage();
    alert('Reference imported successfully');
  }
  
  // Convert notes to sections (for TPN import)
  function convertNotesToSections(notes) {
    const sections = [];
    let currentPos = 0;
    const dynamicPattern = /\[f\(([\s\S]*?)\)\]/g;
    let match;
    
    while ((match = dynamicPattern.exec(notes)) !== null) {
      // Add static HTML before the dynamic section
      if (match.index > currentPos) {
        const htmlContent = notes.substring(currentPos, match.index).trim();
        if (htmlContent) {
          sections.push({
            id: Date.now() + Math.random(),
            type: 'html',
            content: htmlContent
          });
        }
      }
      
      // Add dynamic JavaScript section
      sections.push({
        id: Date.now() + Math.random(),
        type: 'javascript',
        content: match[1].trim()
      });
      
      currentPos = match.index + match[0].length;
    }
    
    // Add remaining HTML after last dynamic section
    if (currentPos < notes.length) {
      const htmlContent = notes.substring(currentPos).trim();
      if (htmlContent) {
        sections.push({
          id: Date.now() + Math.random(),
          type: 'html',
          content: htmlContent
        });
      }
    }
    
    return sections;
  }
  
  // Handle ingredient click from active config
  function handleIngredientClick(ingredient) {
    // Try to find existing reference for this ingredient
    const refs = Object.values(referenceTexts).filter(ref => 
      ref.ingredient === (ingredient.KEYNAME || ingredient.keyname)
    );
    
    if (refs.length > 0) {
      // Load the first matching reference
      loadReference(refs[0], ingredient.KEYNAME || ingredient.keyname);
    } else if (ingredient.NOTES || ingredient.notes) {
      // Convert notes to sections and load
      const sections = convertNotesToSections(ingredient.NOTES || ingredient.notes);
      onLoadReference({
        sections,
        ingredient: ingredient.KEYNAME || ingredient.keyname,
        name: ingredient.DISPLAY || ingredient.display || ingredient.KEYNAME || ingredient.keyname
      }, ingredient.KEYNAME || ingredient.keyname);
    }
  }
  
  // Load Firebase configs
  async function loadFirebaseConfigs() {
    if (!isFirebaseConfigured()) {
      console.log('Firebase not configured');
      return;
    }
    
    try {
      const configs = await configService.getAllConfigs();
      firebaseConfigs = configs || [];
    } catch (error) {
      console.error('Error loading Firebase configs:', error);
      firebaseConfigs = [];
    }
  }
  
  // Filtered references based on search and filters
  let filteredReferences = $derived.by(() => {
    let refs = Object.values(referenceTexts);
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      refs = refs.filter(ref => 
        ref.name?.toLowerCase().includes(query) ||
        ref.ingredient?.toLowerCase().includes(query) ||
        ref.tags?.toLowerCase().includes(query)
      );
    }
    
    // Apply other filters
    if (filters.healthSystem) {
      refs = refs.filter(ref => ref.healthSystem === filters.healthSystem);
    }
    if (filters.domain) {
      refs = refs.filter(ref => ref.domain === filters.domain);
    }
    if (filters.subdomain) {
      refs = refs.filter(ref => ref.subdomain === filters.subdomain);
    }
    if (filters.version) {
      refs = refs.filter(ref => ref.version === filters.version);
    }
    if (filters.ingredient) {
      refs = refs.filter(ref => ref.ingredient === filters.ingredient);
    }
    
    return refs;
  });
  
  onMount(() => {
    loadFromLocalStorage();
  });
  
  // Auto-save when references change
  $effect(() => {
    if (Object.keys(referenceTexts).length > 0) {
      saveToLocalStorage();
    }
  });
</script>

<aside class="sidebar-refactored">
  <header class="sidebar__header">
    <div class="header-top">
      <h2>References</h2>
      {#if activeConfigId}
        <span class="active-config-badge">Config Active</span>
      {/if}
      <button class="close-btn" onclick={onClose} title="Close sidebar" aria-label="Close sidebar">
        ✕
      </button>
    </div>
    
    <div class="header-actions">
      <button class="btn btn--save" onclick={handleSaveReference}>
        💾 Save
      </button>
      <button class="btn btn--import" onclick={handleImportDialog}>
        📥 Import
      </button>
      <button class="btn btn--config" onclick={() => { console.log('Config button clicked'); showConfigDialog = true; console.log('showConfigDialog set to:', showConfigDialog); }}>
        ⚙️ Config
      </button>
    </div>
  </header>
  
  <!-- Main content area -->
  {#if activeConfigId && activeConfigIngredients.length > 0}
    <!-- Active Config View -->
    <div class="config-view">
      <div class="config-search">
        <input 
          type="search"
          placeholder="Search ingredients..."
          bind:value={configSearchQuery}
          class="search-input"
        />
      </div>
      
      <div class="config-ingredients">
        {#each groupedConfigIngredients as group}
          <div class="ingredient-group">
            <h3 class="group-header" style="color: {group.info.color}">
              <span class="group-icon">{group.info.icon}</span>
              {group.info.name}
              <span class="group-count">({group.ingredients.length})</span>
            </h3>
            
            <div class="ingredient-list">
              {#each group.ingredients as ingredient}
                <button 
                  class="ingredient-item"
                  onclick={() => handleIngredientClick(ingredient)}
                >
                  <span class="ingredient-name">
                    {ingredient.DISPLAY || ingredient.display || ingredient.KEYNAME || ingredient.keyname}
                  </span>
                  <span class="ingredient-key">
                    {ingredient.KEYNAME || ingredient.keyname}
                  </span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Reference Management View -->
    <div class="reference-view">
      <div class="search-section">
        <input 
          type="search"
          placeholder="Search references..."
          bind:value={searchQuery}
          class="search-input"
        />
      </div>
      
      <div class="folder-tree">
        {#each Object.values(folders).filter(f => !f.parentId) as rootFolder}
          <div class="folder-item">
            <button 
              class="folder-header"
              onclick={() => toggleFolder(rootFolder.id)}
            >
              <span class="folder-icon">
                {expandedFolders[rootFolder.id] ? '📂' : '📁'}
              </span>
              <span class="folder-name">{rootFolder.name}</span>
              <span class="folder-count">
                ({getReferencesInFolder(rootFolder.id).length})
              </span>
            </button>
            
            {#if expandedFolders[rootFolder.id]}
              <div class="folder-content">
                <!-- Child folders -->
                {#each getChildFolders(rootFolder.id) as childFolder}
                  <div class="folder-item nested">
                    <button 
                      class="folder-header"
                      onclick={() => toggleFolder(childFolder.id)}
                    >
                      <span class="folder-icon">
                        {expandedFolders[childFolder.id] ? '📂' : '📁'}
                      </span>
                      <span class="folder-name">{childFolder.name}</span>
                      <span class="folder-count">
                        ({getReferencesInFolder(childFolder.id).length})
                      </span>
                    </button>
                    
                    {#if expandedFolders[childFolder.id]}
                      <div class="folder-content">
                        <!-- References in this folder -->
                        {#each getReferencesInFolder(childFolder.id) as ref}
                          <div 
                            class="reference-item {selectedReference?.id === ref.id ? 'selected' : ''}"
                            onclick={() => loadReference(ref)}
                          >
                            <span class="ref-name">{ref.name}</span>
                            <div class="ref-actions">
                              <button onclick={(e) => { e.stopPropagation(); duplicateReference(ref); }}>📋</button>
                              <button onclick={(e) => { e.stopPropagation(); deleteReference(ref.id); }}>🗑️</button>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
                
                <!-- References in root folder -->
                {#each getReferencesInFolder(rootFolder.id) as ref}
                  <div 
                    class="reference-item {selectedReference?.id === ref.id ? 'selected' : ''}"
                    onclick={() => loadReference(ref)}
                  >
                    <span class="ref-name">{ref.name}</span>
                    <div class="ref-actions">
                      <button onclick={(e) => { e.stopPropagation(); duplicateReference(ref); }}>📋</button>
                      <button onclick={(e) => { e.stopPropagation(); deleteReference(ref.id); }}>🗑️</button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- Save Dialog -->
  {#if showSaveDialog}
    <div class="dialog-overlay" onclick={() => showSaveDialog = false}>
      <div class="dialog" onclick={(e) => e.stopPropagation()}>
        <h3>Save Reference</h3>
        
        <div class="form-group">
          <label>Name</label>
          <input bind:value={saveData.name} placeholder="Reference name..." />
        </div>
        
        <div class="form-group">
          <label>Ingredient</label>
          <input bind:value={saveData.ingredient} placeholder="Ingredient key..." />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Health System</label>
            <select bind:value={saveData.healthSystem}>
              {#each healthSystems as hs}
                <option value={hs}>{hs}</option>
              {/each}
            </select>
          </div>
          
          <div class="form-group">
            <label>Domain</label>
            <select bind:value={saveData.domain}>
              {#each domains as d}
                <option value={d}>{d}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Subdomain</label>
            <select bind:value={saveData.subdomain}>
              {#each subdomains as sd}
                <option value={sd}>{sd}</option>
              {/each}
            </select>
          </div>
          
          <div class="form-group">
            <label>Version</label>
            <select bind:value={saveData.version}>
              {#each versions as v}
                <option value={v}>{v}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>Tags</label>
          <input bind:value={saveData.tags} placeholder="Optional tags..." />
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn--cancel" onclick={() => showSaveDialog = false}>
            Cancel
          </button>
          <button 
            class="btn btn--primary" 
            onclick={confirmSaveReference}
            disabled={!saveData.name || !saveData.ingredient}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Import Dialog -->
  {#if showImportDialog}
    <div class="dialog-overlay" onclick={() => showImportDialog = false}>
      <div class="dialog large" onclick={(e) => e.stopPropagation()}>
        <h3>Import JSON</h3>
        
        <div class="form-group">
          <label>Paste your JSON data:</label>
          <textarea 
            placeholder="Paste TPN config JSON or reference JSON..."
            rows="10"
            onpaste={(e) => {
              setTimeout(() => {
                handleImportJSON(e.target.value);
              }, 100);
            }}
          ></textarea>
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn--cancel" onclick={() => showImportDialog = false}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Config Dialog -->
  {#if showConfigDialog}
    {(() => { console.log('Config dialog is rendering!'); return ''; })()}
    <div class="dialog-overlay" onclick={() => showConfigDialog = false}>
      <div class="dialog" onclick={(e) => e.stopPropagation()}>
        <h3>TPN Configurations</h3>
        
        <div class="config-tabs">
          <button 
            class="tab {showLocalConfigs ? 'active' : ''}"
            onclick={() => { showLocalConfigs = true; showFirebaseConfigs = false; }}
          >
            Local
          </button>
          <button 
            class="tab {showFirebaseConfigs ? 'active' : ''}"
            onclick={() => { showFirebaseConfigs = true; showLocalConfigs = false; loadFirebaseConfigs(); }}
          >
            Cloud
          </button>
        </div>
        
        {#if showLocalConfigs}
          <div class="config-section">
            <div class="config-actions">
              <button class="btn btn--create-config" onclick={createConfigFromCurrentSections}>
                📄 Create from Current Sections
              </button>
              {#if currentSections && currentSections.length > 0}
                <span class="sections-count">{currentSections.length} sections</span>
              {:else}
                <span class="sections-count-empty">No sections to create from</span>
              {/if}
            </div>
            
            <div class="config-list">
              {(() => { console.log('[snapshot] tpnConfigs object:', $state.snapshot(tpnConfigs)); console.log('Config entries:', Object.entries($state.snapshot(tpnConfigs))); return ''; })()}
              {#each Object.entries(tpnConfigs) as [id, config]}
                <div class="config-item">
                  <div class="config-info">
                    <span class="config-name">{config.name || id}</span>
                    <span class="config-details">
                      {Object.keys(config.INGREDIENTS || {}).length} ingredients
                      {#if config.createdFromSections}• Created from sections{/if}
                    </span>
                  </div>
                  <button 
                    class="btn btn--activate"
                    onclick={() => { console.log('Config being activated:', id, config); console.log('Config keys:', Object.keys(config)); onConfigActivate(id, config.INGREDIENTS || config.ingredients || {}); showConfigDialog = false; }}
                  >
                    Activate
                  </button>
                </div>
              {:else}
                <p class="empty-message">No local configurations found</p>
                <p class="empty-hint">Import a TPN config JSON or create one from your current sections</p>
              {/each}
            </div>
          </div>
        {/if}
        
        {#if showFirebaseConfigs}
          <div class="config-list">
            {#each firebaseConfigs as config}
              <div class="config-item">
                <span>{config.name}</span>
                <button onclick={() => onConfigActivate(config.id, config.ingredients)}>
                  Activate
                </button>
              </div>
            {:else}
              <p class="empty-message">No cloud configurations</p>
            {/each}
          </div>
        {/if}
        
        <div class="dialog-actions">
          <button class="btn btn--cancel" onclick={() => showConfigDialog = false}>
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
</aside>

<!-- Duplicate Report Modal -->
{#if showDuplicateReport}
  <DuplicateReportModal 
    report={lastImportReport}
    onClose={() => showDuplicateReport = false}
    onProceed={() => showDuplicateReport = false}
  />
{/if}

<style lang="scss">
  @use '../styles/abstracts/variables' as *;
  @use '../styles/abstracts/mixins' as *;
  
  .sidebar-refactored {
    width: 350px;
    height: 100%;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    @include mobile {
      width: 100%;
      position: fixed;
      top: 60px; /* Account for navbar height */
      left: 0;
      right: 0;
      bottom: 0;
      z-index: map-get($z-indices, sticky); /* Below navbar overlay */
    }
  }
  
  .sidebar__header {
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-background);
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-3);
      
      h2 {
        margin: 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-primary);
      }
    }
    
    .active-config-badge {
      font-size: var(--font-size-xs);
      padding: var(--space-1) var(--space-2);
      background: var(--color-info-alpha-10);
      border: 1px solid var(--color-info);
      border-radius: var(--radius-sm);
      color: var(--color-info);
    }
    
    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-size-md);
      color: var(--color-text-muted);
      transition: all var(--transition-fast);
      
      &:hover {
        background: var(--color-surface-hover);
        color: var(--color-text);
        border-color: var(--color-primary);
      }
    }
    
    .header-actions {
      display: flex;
      gap: var(--space-2);
      
      .btn {
        padding: var(--space-2) var(--space-3);
        border: none;
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        cursor: pointer;
        transition: all var(--transition-fast);
        
        &--save {
          background: var(--color-success);
          color: white;
          
          &:hover {
            background: var(--color-success-dark);
          }
        }
        
        &--import {
          background: var(--color-primary);
          color: white;
          
          &:hover {
            background: var(--color-primary-dark);
          }
        }
        
        &--config {
          background: var(--color-surface-alt);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          
          &:hover {
            background: var(--color-surface-hover);
          }
        }
      }
    }
  }
  
  // Config View
  .config-view {
    flex: 1;
    overflow-y: auto;
    
    .config-search {
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }
    
    .config-ingredients {
      padding: var(--space-3);
    }
    
    .ingredient-group {
      margin-bottom: var(--space-4);
      
      .group-header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        margin-bottom: var(--space-2);
      }
      
      .group-icon {
        font-size: var(--font-size-lg);
      }
      
      .group-count {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
      }
    }
    
    .ingredient-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    
    .ingredient-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-2) var(--space-3);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      width: 100%;
      transition: all var(--transition-fast);
      
      &:hover {
        background: var(--color-surface-hover);
        border-color: var(--color-primary);
        transform: translateX(2px);
      }
      
      .ingredient-name {
        font-size: var(--font-size-sm);
        color: var(--color-text);
      }
      
      .ingredient-key {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        font-family: var(--font-mono);
      }
    }
  }
  
  // Reference View
  .reference-view {
    flex: 1;
    overflow-y: auto;
    
    .search-section {
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }
    
    .folder-tree {
      padding: var(--space-3);
    }
    
    .folder-item {
      margin-bottom: var(--space-2);
      
      &.nested {
        margin-left: var(--space-4);
      }
      
      .folder-header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        width: 100%;
        padding: var(--space-2);
        background: var(--color-surface-alt);
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        text-align: left;
        transition: all var(--transition-fast);
        
        &:hover {
          background: var(--color-surface-hover);
        }
        
        .folder-icon {
          font-size: var(--font-size-md);
        }
        
        .folder-name {
          flex: 1;
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
        }
        
        .folder-count {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }
      }
      
      .folder-content {
        margin-top: var(--space-2);
        margin-left: var(--space-4);
      }
    }
    
    .reference-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-2) var(--space-3);
      margin-bottom: var(--space-1);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      
      &:hover {
        background: var(--color-surface-hover);
        border-color: var(--color-primary);
      }
      
      &.selected {
        background: var(--color-primary-alpha-10);
        border-color: var(--color-primary);
        border-left-width: 3px;
      }
      
      .ref-name {
        font-size: var(--font-size-sm);
        color: var(--color-text);
      }
      
      .ref-actions {
        display: flex;
        gap: var(--space-1);
        
        button {
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity var(--transition-fast);
          
          &:hover {
            opacity: 1;
          }
        }
      }
    }
  }
  
  // Common styles
  .search-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-background);
    font-size: var(--font-size-sm);
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-alpha-20);
    }
  }
  
  // Dialogs
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: map-get($z-indices, modal);
  }
  
  .dialog {
    background: var(--color-surface, white); /* Fallback to white */
    border-radius: var(--radius-lg, 8px); /* Fallback to 8px */
    padding: var(--space-6, 24px); /* Fallback to 24px */
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)); /* Fallback shadow */
    border: 1px solid var(--color-border, #e5e7eb); /* Add border for visibility */
    
    &.large {
      max-width: 700px;
    }
    
    h3 {
      margin: 0 0 var(--space-4) 0;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
    }
    
    .form-group {
      margin-bottom: var(--space-3);
      
      label {
        display: block;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--space-1);
      }
      
      input, select, textarea {
        width: 100%;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-background);
        font-size: var(--font-size-sm);
        
        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-alpha-20);
        }
      }
      
      textarea {
        resize: vertical;
        font-family: var(--font-mono);
      }
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-4);
      
      .btn {
        padding: var(--space-2) var(--space-4);
        border: none;
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all var(--transition-fast);
        
        &--cancel {
          background: var(--color-surface-alt);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          
          &:hover {
            background: var(--color-surface-hover);
          }
        }
        
        &--primary {
          background: var(--color-primary);
          color: white;
          
          &:hover:not(:disabled) {
            background: var(--color-primary-dark);
          }
          
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }
    }
  }
  
  // Config dialog specific
  .config-tabs {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    
    .tab {
      flex: 1;
      padding: var(--space-2);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
      
      &.active {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
      }
      
      &:not(.active):hover {
        background: var(--color-surface-hover);
      }
    }
  }
  
  .config-section {
    .config-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-3);
      padding: var(--space-2);
      background: var(--color-surface-alt);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      
      .btn--create-config {
        padding: var(--space-1) var(--space-2);
        background: var(--color-success);
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        cursor: pointer;
        transition: background var(--transition-fast);
        
        &:hover {
          background: var(--color-success-dark);
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
      
      .sections-count {
        font-size: var(--font-size-xs);
        color: var(--color-success);
        font-weight: var(--font-weight-medium);
      }
      
      .sections-count-empty {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
      }
    }
  }
  
  .config-list {
    max-height: 300px;
    overflow-y: auto;
    
    .config-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-border);
      transition: background var(--transition-fast);
      
      &:hover {
        background: var(--color-surface-hover);
      }
      
      .config-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        
        .config-name {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text);
        }
        
        .config-details {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }
      }
      
      .btn--activate {
        padding: var(--space-1) var(--space-2);
        background: var(--color-primary);
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        cursor: pointer;
        transition: background var(--transition-fast);
        
        &:hover {
          background: var(--color-primary-dark);
        }
      }
    }
    
    .empty-message {
      text-align: center;
      color: var(--color-text-muted);
      padding: var(--space-4);
      font-size: var(--font-size-sm);
      margin: 0;
    }
    
    .empty-hint {
      text-align: center;
      color: var(--color-text-muted);
      padding: 0 var(--space-4) var(--space-4);
      font-size: var(--font-size-xs);
      margin: 0;
      font-style: italic;
    }
  }
  
  // Scrollbar styling
  .config-view, .reference-view {
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background: var(--color-border);
      border-radius: var(--radius-sm);
      
      &:hover {
        background: var(--color-border-hover);
      }
    }
  }
</style>