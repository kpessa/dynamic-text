<script>
  import { onMount } from 'svelte';
  import { isFirebaseConfigured } from './firebase.js';
  import { configService, normalizeConfigId } from './firebaseDataService.js';
  
  let { 
    onLoadReference = () => {}, 
    onSaveReference = () => {},
    currentSections = []
  } = $props();
  
  let referenceTexts = $state({});
  let folders = $state({});
  let expandedFolders = $state({});
  let selectedReference = $state(null);
  let showSaveDialog = $state(false);
  let searchQuery = $state('');
  
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
  let newItemName = $state('');
  
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
  
  // Import state
  let importData = $state({
    jsonText: '',
    healthSystem: 'UHS',
    domain: 'west',
    subdomain: 'prod',
    version: 'adult',
    parseError: '',
    parsedIngredients: [],
    parsedConfig: null,
    isImporting: false,
    importProgress: 0
  });
  
  // Resize state
  let isResizing = $state(false);
  let sidebarWidth = $state(300); // Default width
  let minWidth = 200;
  let maxWidth = 600;
  
  // Edit state
  let editingFolderId = $state(null);
  let editingFolderName = $state('');
  let editingReferenceId = $state(null);
  let editingIngredientName = $state('');
  
  // Context menu state
  let contextMenu = $state(null);
  
  // Drag state
  let draggedReference = $state(null);
  let dragOverFolderId = $state(null);
  
  // Breadcrumb navigation state
  let navigationPath = $state([]);
  let expandedTypeGroups = $state({});
  
  // Config management state
  let tpnConfigs = $state({});
  let activeConfigId = $state(null);
  let showConfigDialog = $state(false);
  
  onMount(() => {
    loadFromLocalStorage();
  });
  
  // Auto-set domain to 'main' for non-UHS health systems
  $effect(() => {
    if (importData.healthSystem && importData.healthSystem !== 'UHS') {
      importData.domain = 'main';
    }
  });
  
  // Auto-set domain for save dialog
  $effect(() => {
    if (saveData.healthSystem && saveData.healthSystem !== 'UHS') {
      saveData.domain = 'main';
    }
  });
  
  // Auto-expand folders when searching
  let previousSearchQuery = '';
  
  $effect(() => {
    if (searchQuery !== previousSearchQuery) {
      previousSearchQuery = searchQuery;
      
      if (searchQuery) {
        // Expand all folders that contain matches
        const newExpandedFolders = { ...expandedFolders };
        foldersWithMatches.forEach(folderId => {
          newExpandedFolders[folderId] = true;
        });
        expandedFolders = newExpandedFolders;
      }
    }
  });
  
  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('referenceTexts');
      if (saved) {
        const data = JSON.parse(saved);
        referenceTexts = data.referenceTexts || {};
        folders = data.folders || initializeFolders();
        // Load custom lists if they exist
        if (data.healthSystems) healthSystems = data.healthSystems;
        if (data.domains) domains = data.domains;
        if (data.subdomains) subdomains = data.subdomains;
        if (data.versions) versions = data.versions;
        // Load sidebar width
        if (data.sidebarWidth) sidebarWidth = data.sidebarWidth;
        // Load TPN configs
        if (data.tpnConfigs) tpnConfigs = data.tpnConfigs;
        if (data.activeConfigId) activeConfigId = data.activeConfigId;
        
        // Discover any missing health systems from existing references
        Object.values(referenceTexts).forEach(ref => {
          if (ref.healthSystem && !healthSystems.includes(ref.healthSystem)) {
            addHealthSystem(ref.healthSystem);
          }
        });
      } else {
        folders = initializeFolders();
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      folders = initializeFolders();
    }
  }
  
  function saveToLocalStorage() {
    try {
      localStorage.setItem('referenceTexts', JSON.stringify({
        referenceTexts,
        folders,
        healthSystems,
        domains,
        subdomains,
        versions,
        sidebarWidth,
        tpnConfigs,
        activeConfigId
      }));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }
  
  function initializeFolders() {
    const rootFolders = {};
    
    // Create UHS folder structure
    const uhsId = 'uhs-root';
    rootFolders[uhsId] = {
      id: uhsId,
      name: 'UHS',
      parentId: null,
      type: 'healthSystem',
      value: 'UHS'
    };
    
    // Create domain folders under UHS
    domains.forEach(domain => {
      const domainId = `uhs-${domain}`;
      rootFolders[domainId] = {
        id: domainId,
        name: domain.charAt(0).toUpperCase() + domain.slice(1),
        parentId: uhsId,
        type: 'domain',
        value: domain
      };
      
      // Create subdomain folders under each domain
      subdomains.forEach(subdomain => {
        const subdomainId = `uhs-${domain}-${subdomain}`;
        rootFolders[subdomainId] = {
          id: subdomainId,
          name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
          parentId: domainId,
          type: 'subdomain',
          value: subdomain
        };
        
        // Create version folders under each subdomain
        versions.forEach(version => {
          const versionId = `uhs-${domain}-${subdomain}-${version}`;
          rootFolders[versionId] = {
            id: versionId,
            name: version.charAt(0).toUpperCase() + version.slice(1),
            parentId: subdomainId,
            type: 'version',
            value: version
          };
        });
      });
    });
    
    // Create Other folder
    rootFolders['other-root'] = {
      id: 'other-root',
      name: 'Other Health Systems',
      parentId: null,
      type: 'healthSystem',
      value: 'Other'
    };
    
    // Create main domain for Other
    rootFolders['other-main'] = {
      id: 'other-main',
      name: 'Main',
      parentId: 'other-root',
      type: 'domain',
      value: 'main'
    };
    
    // Create subdomain folders under Other/main
    subdomains.forEach(subdomain => {
      const subdomainId = `other-main-${subdomain}`;
      rootFolders[subdomainId] = {
        id: subdomainId,
        name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
        parentId: 'other-main',
        type: 'subdomain',
        value: subdomain
      };
      
      // Create version folders
      versions.forEach(version => {
        const versionId = `other-main-${subdomain}-${version}`;
        rootFolders[versionId] = {
          id: versionId,
          name: version.charAt(0).toUpperCase() + version.slice(1),
          parentId: subdomainId,
          type: 'version',
          value: version
        };
      });
    });
    
    return rootFolders;
  }
  
  function toggleFolder(folderId) {
    expandedFolders[folderId] = !expandedFolders[folderId];
    
    // Update navigation path if expanding
    if (expandedFolders[folderId]) {
      const folder = folders[folderId];
      if (folder) {
        navigationPath = buildPathToFolder(folder);
      }
    }
  }
  
  // Toggle type group expansion
  function toggleTypeGroup(folderId, type) {
    const key = `${folderId}-${type}`;
    expandedTypeGroups[key] = !expandedTypeGroups[key];
    expandedTypeGroups = { ...expandedTypeGroups };
  }
  
  function getFilteredReferences() {
    return Object.values(referenceTexts).filter(ref => {
      if (searchQuery && !ref.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !ref.ingredient.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (filters.healthSystem && ref.healthSystem !== filters.healthSystem) return false;
      if (filters.domain && ref.domain !== filters.domain) return false;
      if (filters.subdomain && ref.subdomain !== filters.subdomain) return false;
      if (filters.version && ref.version !== filters.version) return false;
      if (filters.ingredient && ref.ingredient !== filters.ingredient) return false;
      
      return true;
    });
  }
  
  function getReferencesForFolder(folder) {
    return getFilteredReferences().filter(ref => {
      if (folder.type === 'healthSystem') {
        return ref.healthSystem === folder.value;
      } else if (folder.type === 'domain') {
        const parent = folders[folder.parentId];
        return ref.healthSystem === parent.value && ref.domain === folder.value;
      } else if (folder.type === 'subdomain') {
        const parent = folders[folder.parentId];
        const grandparent = folders[parent.parentId];
        return ref.healthSystem === grandparent.value && 
               ref.domain === parent.value && 
               ref.subdomain === folder.value;
      } else if (folder.type === 'version') {
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
  
  function groupReferencesByType(references) {
    const groups = {};
    const typeOrder = ['Diluent', 'Macronutrient', 'Micronutrient', 'Salt', 'Additive', 'Other'];
    
    // Initialize groups in order
    typeOrder.forEach(type => {
      groups[type] = [];
    });
    
    // Group references
    references.forEach(ref => {
      const type = ref.ingredientType || 'Other';
      if (groups[type]) {
        groups[type].push(ref);
      } else {
        groups['Other'].push(ref);
      }
    });
    
    // Remove empty groups
    return Object.entries(groups)
      .filter(([type, refs]) => refs.length > 0)
      .map(([type, refs]) => ({ type, refs }));
  }
  
  function handleSaveReference() {
    const id = Date.now().toString();
    const newReference = {
      id,
      name: saveData.name,
      ingredient: saveData.ingredient,
      healthSystem: saveData.healthSystem,
      domain: saveData.domain,
      subdomain: saveData.subdomain,
      version: saveData.version,
      sections: currentSections.map(section => ({
        ...section,
        // Include testCases for dynamic sections
        ...(section.type === 'dynamic' && section.testCases ? { testCases: section.testCases } : {})
      })),
      tags: saveData.tags.split(',').map(t => t.trim()).filter(t => t),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    referenceTexts[id] = newReference;
    referenceTexts = { ...referenceTexts };
    saveToLocalStorage();
    showSaveDialog = false;
    
    // Notify parent that save is complete by loading the saved reference
    loadReference(newReference);
    
    // Reset save form
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
  
  function loadReference(ref) {
    selectedReference = ref;
    onLoadReference(ref);
  }
  
  function deleteReference(id) {
    if (confirm('Delete this reference text?')) {
      delete referenceTexts[id];
      referenceTexts = { ...referenceTexts };
      saveToLocalStorage();
    }
  }
  
  function duplicateReference(ref) {
    const id = Date.now().toString();
    const duplicate = {
      ...ref,
      id,
      name: ref.name + ' (Copy)',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    referenceTexts[id] = duplicate;
    referenceTexts = { ...referenceTexts };
    saveToLocalStorage();
  }
  
  function renderFolder(folder, level = 0) {
    const children = Object.values(folders).filter(f => f.parentId === folder.id);
    const references = getReferencesForFolder(folder);
    const hasContent = children.length > 0 || references.length > 0;
    
    return {
      folder,
      children,
      references,
      hasContent,
      level
    };
  }
  
  function getRootFolders() {
    return Object.values(folders).filter(f => f.parentId === null);
  }
  
  // Build navigation path to a folder
  function buildPathToFolder(folder) {
    const path = [];
    let current = folder;
    
    while (current) {
      path.unshift(current);
      current = current.parentId ? folders[current.parentId] : null;
    }
    
    return path;
  }
  
  // Navigate to a specific folder
  function navigateToFolder(folder) {
    navigationPath = buildPathToFolder(folder);
    
    // Expand all folders in the path
    navigationPath.forEach(f => {
      expandedFolders[f.id] = true;
    });
    
    // Collapse all folders not in the path
    Object.keys(expandedFolders).forEach(id => {
      if (!navigationPath.find(f => f.id === id)) {
        expandedFolders[id] = false;
      }
    });
    
    expandedFolders = { ...expandedFolders };
  }
  
  // Get unique ingredients for filter dropdown
  let uniqueIngredients = $derived(
    [...new Set(Object.values(referenceTexts).map(r => r.ingredient))].sort()
  );
  
  // Track folders that contain search matches
  let foldersWithMatches = $derived((() => {
    if (!searchQuery) return new Set();
    
    const matchingFolders = new Set();
    const filteredRefs = getFilteredReferences();
    
    filteredRefs.forEach(ref => {
      // Find all parent folders for this reference
      Object.values(folders).forEach(folder => {
        const refs = getReferencesForFolder(folder);
        if (refs.some(r => r.id === ref.id)) {
          // Add this folder and all its parents
          let currentFolder = folder;
          while (currentFolder) {
            matchingFolders.add(currentFolder.id);
            currentFolder = currentFolder.parentId ? folders[currentFolder.parentId] : null;
          }
        }
      });
    });
    
    return matchingFolders;
  })());
  
  // List management functions
  function addHealthSystem(systemName = null) {
    const nameToAdd = systemName || newItemName;
    if (nameToAdd && !healthSystems.includes(nameToAdd)) {
      healthSystems = [...healthSystems, nameToAdd];
      // Create folder structure for new health system
      const rootId = `${nameToAdd.toLowerCase().replace(/\s+/g, '-')}-root`;
      folders[rootId] = {
        id: rootId,
        name: nameToAdd,
        parentId: null,
        type: 'healthSystem',
        value: nameToAdd
      };
      folders = { ...folders };
      saveToLocalStorage();
      newItemName = '';
      showHealthSystemDialog = false;
    }
  }
  
  function removeHealthSystem(system) {
    if (confirm(`Delete health system "${system}" and all its references?`)) {
      healthSystems = healthSystems.filter(s => s !== system);
      // Remove associated folders
      const systemFolders = Object.values(folders).filter(f => 
        f.type === 'healthSystem' && f.value === system
      );
      systemFolders.forEach(folder => {
        removeFolder(folder.id);
      });
      // Remove associated references
      Object.keys(referenceTexts).forEach(id => {
        if (referenceTexts[id].healthSystem === system) {
          delete referenceTexts[id];
        }
      });
      referenceTexts = { ...referenceTexts };
      saveToLocalStorage();
    }
  }
  
  function addDomain() {
    if (newItemName && !domains.includes(newItemName)) {
      domains = [...domains, newItemName];
      // Update folders for all health systems with new domain
      regenerateFolders();
      saveToLocalStorage();
      newItemName = '';
      showDomainDialog = false;
    }
  }
  
  function removeDomain(domain) {
    if (confirm(`Delete domain "${domain}" and all its references?`)) {
      domains = domains.filter(d => d !== domain);
      // Remove associated references
      Object.keys(referenceTexts).forEach(id => {
        if (referenceTexts[id].domain === domain) {
          delete referenceTexts[id];
        }
      });
      referenceTexts = { ...referenceTexts };
      regenerateFolders();
      saveToLocalStorage();
    }
  }
  
  function addSubdomain() {
    if (newItemName && !subdomains.includes(newItemName)) {
      subdomains = [...subdomains, newItemName];
      regenerateFolders();
      saveToLocalStorage();
      newItemName = '';
      showSubdomainDialog = false;
    }
  }
  
  function removeSubdomain(subdomain) {
    if (confirm(`Delete subdomain "${subdomain}" and all its references?`)) {
      subdomains = subdomains.filter(s => s !== subdomain);
      // Remove associated references
      Object.keys(referenceTexts).forEach(id => {
        if (referenceTexts[id].subdomain === subdomain) {
          delete referenceTexts[id];
        }
      });
      referenceTexts = { ...referenceTexts };
      regenerateFolders();
      saveToLocalStorage();
    }
  }
  
  function removeFolder(folderId) {
    // Remove folder and all children
    const childFolders = Object.values(folders).filter(f => f.parentId === folderId);
    childFolders.forEach(child => removeFolder(child.id));
    delete folders[folderId];
    folders = { ...folders };
  }
  
  function regenerateFolders() {
    // Preserve existing custom health systems
    const existingHealthSystems = Object.values(folders)
      .filter(f => f.type === 'healthSystem')
      .map(f => ({ name: f.name, value: f.value, id: f.id }));
    
    folders = {};
    
    // Recreate all folders with current lists
    existingHealthSystems.forEach(({ name, value, id }) => {
      folders[id] = {
        id,
        name,
        parentId: null,
        type: 'healthSystem',
        value
      };
      
      // Create domain folders
      if (value === 'UHS') {
        domains.forEach(domain => {
          const domainId = `uhs-${domain}`;
          folders[domainId] = {
            id: domainId,
            name: domain.charAt(0).toUpperCase() + domain.slice(1),
            parentId: id,
            type: 'domain',
            value: domain
          };
          
          // Create subdomain folders
          subdomains.forEach(subdomain => {
            const subdomainId = `uhs-${domain}-${subdomain}`;
            folders[subdomainId] = {
              id: subdomainId,
              name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
              parentId: domainId,
              type: 'subdomain',
              value: subdomain
            };
            
            // Create version folders
            versions.forEach(version => {
              const versionId = `uhs-${domain}-${subdomain}-${version}`;
              folders[versionId] = {
                id: versionId,
                name: version.charAt(0).toUpperCase() + version.slice(1),
                parentId: subdomainId,
                type: 'version',
                value: version
              };
            });
          });
        });
      } else {
        // For non-UHS health systems, create a single 'main' domain
        const domainId = `${value.toLowerCase().replace(/\s+/g, '-')}-main`;
        folders[domainId] = {
          id: domainId,
          name: 'Main',
          parentId: id,
          type: 'domain',
          value: 'main'
        };
        
        // Create subdomain folders under main
        subdomains.forEach(subdomain => {
          const subdomainId = `${value.toLowerCase().replace(/\s+/g, '-')}-main-${subdomain}`;
          folders[subdomainId] = {
            id: subdomainId,
            name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
            parentId: domainId,
            type: 'subdomain',
            value: subdomain
          };
          
          // Create version folders
          versions.forEach(version => {
            const versionId = `${value.toLowerCase().replace(/\s+/g, '-')}-main-${subdomain}-${version}`;
            folders[versionId] = {
              id: versionId,
              name: version.charAt(0).toUpperCase() + version.slice(1),
              parentId: subdomainId,
              type: 'version',
              value: version
            };
          });
        });
      }
    });
    
    folders = { ...folders };
  }
  
  // Import functions
  function parseIngredientJSON(jsonText) {
    try {
      const data = JSON.parse(jsonText);
      
      // Validate structure
      if (!data.INGREDIENT || !Array.isArray(data.INGREDIENT)) {
        throw new Error('Invalid JSON structure: INGREDIENT array not found');
      }
      
      const ingredients = [];
      
      data.INGREDIENT.forEach((ingredient, index) => {
        if (!ingredient.KEYNAME || !ingredient.NOTE) {
          console.warn(`Skipping ingredient ${index}: missing KEYNAME or NOTE`);
          return;
        }
        
        ingredients.push({
          keyname: ingredient.KEYNAME,
          display: ingredient.DISPLAY || ingredient.KEYNAME,
          type: ingredient.TYPE || 'Other',
          notes: ingredient.NOTE || [],
          raw: ingredient
        });
      });
      
      // Return both ingredients and the full config data
      return { success: true, ingredients, config: data, error: null };
    } catch (error) {
      return { success: false, ingredients: [], config: null, error: error.message };
    }
  }
  
  function hasValidContent(sections) {
    return sections.length > 0 && 
           sections.some(s => s.content.trim().length > 0);
  }
  
  function convertNotesToSections(notes) {
    const sections = [];
    let currentStaticContent = '';
    let inDynamicBlock = false;
    let dynamicContent = '';
    let dynamicStarted = false;
    
    notes.forEach(note => {
      if (!note.TEXT) return;
      
      const text = note.TEXT;
      
      // Check if this is the start of a dynamic block
      if (text.includes('[f(')) {
        // First, save any accumulated static content as a single section
        if (currentStaticContent.trim() && !dynamicStarted) {
          sections.push({ type: 'static', content: currentStaticContent.trim() });
          currentStaticContent = '';
        }
        
        dynamicStarted = true;
        inDynamicBlock = true;
        dynamicContent = text;
      } else if (inDynamicBlock) {
        // Continue accumulating dynamic content until we find the end marker
        dynamicContent += '\n' + text;
        
        // Check if this line contains the end of dynamic block
        if (text.includes(')]')) {
          // Process the complete dynamic block
          let remainingText = dynamicContent;
          
          while (remainingText.includes('[f(')) {
            const startIdx = remainingText.indexOf('[f(');
            
            // Add any text before [f( as static
            if (startIdx > 0) {
              const beforeText = remainingText.substring(0, startIdx);
              if (beforeText.trim()) {
                sections.push({ type: 'static', content: beforeText.trim() });
              }
            }
            
            // Find the matching )]
            let endIdx = remainingText.indexOf(')]', startIdx);
            
            if (endIdx !== -1) {
              // Extract the dynamic code between [f( and )]
              const dynamicText = remainingText.substring(startIdx + 3, endIdx);
              sections.push({ type: 'dynamic', content: dynamicText.trim() });
              remainingText = remainingText.substring(endIdx + 2);
            } else {
              // Unmatched [f(, treat rest as static
              if (remainingText.trim()) {
                sections.push({ type: 'static', content: remainingText.trim() });
              }
              break;
            }
          }
          
          // Add any remaining text as static
          if (remainingText.trim()) {
            currentStaticContent = remainingText;
          }
          
          inDynamicBlock = false;
          dynamicContent = '';
        }
      } else {
        // Regular static text - accumulate it
        currentStaticContent += (currentStaticContent ? '\n' : '') + text;
      }
    });
    
    // Don't forget any remaining static content
    if (currentStaticContent.trim()) {
      sections.push({ type: 'static', content: currentStaticContent.trim() });
    }
    
    return sections;
  }
  
  async function handleImportJSON() {
    importData.parseError = '';
    importData.parsedIngredients = [];
    
    const result = parseIngredientJSON(importData.jsonText);
    
    if (!result.success) {
      importData.parseError = result.error;
      return;
    }
    
    importData.parsedIngredients = result.ingredients;
    
    // Auto-add new health system if it doesn't exist
    if (importData.healthSystem && !healthSystems.includes(importData.healthSystem)) {
      addHealthSystem(importData.healthSystem);
    }
    
    // Store the parsed config for later use when importing
    if (result.config) {
      importData.parsedConfig = result.config;
    }
  }
  
  function importIngredient(ingredient) {
    const sections = convertNotesToSections(ingredient.notes);
    
    // Skip if no valid content
    if (!hasValidContent(sections)) {
      alert(`Skipped "${ingredient.display}" - no valid content found`);
      return;
    }
    
    // Generate unique ID
    const id = Date.now().toString();
    
    const newReference = {
      id,
      name: ingredient.display,
      ingredient: ingredient.keyname,
      ingredientType: ingredient.type,
      healthSystem: importData.healthSystem,
      domain: importData.domain,
      subdomain: importData.subdomain,
      version: importData.version,
      sections: sections.map((s, idx) => ({
        id: idx + 1,
        type: s.type,
        content: s.content,
        ...(s.type === 'dynamic' ? { testCases: [{ name: 'Default', variables: {} }] } : {})
      })),
      tags: ['imported', ingredient.keyname, ingredient.type],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      importSource: 'json'
    };
    
    referenceTexts[id] = newReference;
    referenceTexts = { ...referenceTexts };
    saveToLocalStorage();
    
    // Load it into editor
    loadReference(newReference);
    showImportDialog = false;
    
    // Reset import data
    importData = {
      jsonText: '',
      healthSystem: 'UHS',
      domain: 'west',
      subdomain: 'prod',
      version: 'adult',
      parseError: '',
      parsedIngredients: [],
      parsedConfig: null,
      isImporting: false,
      importProgress: 0
    };
  }
  
  async function importAllIngredients() {
    const total = importData.parsedIngredients.length;
    if (!confirm(`Import all ${total} ingredients to ${importData.healthSystem} > ${importData.domain} > ${importData.subdomain} > ${importData.version}?`)) {
      return;
    }
    
    importData.isImporting = true;
    importData.importProgress = 0;
    let firstReference = null;
    let skippedCount = 0;
    
    // Save the config to Firebase first if configured
    if (importData.parsedConfig) {
      const configId = normalizeConfigId(
        importData.healthSystem,
        importData.domain,
        importData.subdomain,
        importData.version
      );
      
      // Save to Firebase if configured
      if (isFirebaseConfigured()) {
        try {
          const metadata = {
            name: configId,
            healthSystem: importData.healthSystem,
            domain: importData.domain,
            subdomain: importData.subdomain,
            version: importData.version
          };
          
          const firebaseConfigId = await configService.saveImportedConfig(importData.parsedConfig, metadata);
          console.log('Config saved to Firebase with ID:', firebaseConfigId);
          
          // Store Firebase ID reference in local config
          tpnConfigs[configId] = {
            ...importData.parsedConfig,
            metadata: {
              ...metadata,
              importedAt: Date.now(),
              firebaseId: firebaseConfigId
            }
          };
        } catch (error) {
          console.error('Failed to save config to Firebase:', error);
          // Still save to localStorage even if Firebase fails
          tpnConfigs[configId] = {
            ...importData.parsedConfig,
            metadata: {
              healthSystem: importData.healthSystem,
              domain: importData.domain,
              subdomain: importData.subdomain,
              version: importData.version,
              importedAt: Date.now()
            }
          };
        }
      } else {
        // Save to localStorage only if Firebase is not configured
        tpnConfigs[configId] = {
          ...importData.parsedConfig,
          metadata: {
            healthSystem: importData.healthSystem,
            domain: importData.domain,
            subdomain: importData.subdomain,
            version: importData.version,
            importedAt: Date.now()
          }
        };
      }
      
      tpnConfigs = { ...tpnConfigs };
      // Set as active config if no config is active
      if (!activeConfigId) {
        activeConfigId = configId;
      }
      saveToLocalStorage();
    }
    
    // Process all ingredients with a small delay between each
    importData.parsedIngredients.forEach((ingredient, index) => {
      setTimeout(() => {
        const sections = convertNotesToSections(ingredient.notes);
        
        // Skip if no valid content
        if (!hasValidContent(sections)) {
          skippedCount++;
          importData.importProgress = index + 1;
          
          // If this is the last ingredient, show summary
          if (index === total - 1) {
            const importedCount = total - skippedCount;
            alert(`Import complete!\n\nImported: ${importedCount} ingredients\nSkipped: ${skippedCount} ingredients (no valid content)`);
            
            referenceTexts = { ...referenceTexts };
            saveToLocalStorage();
            importData.isImporting = false;
            showImportDialog = false;
            
            // Load first reference if any were imported
            if (firstReference) {
              loadReference(firstReference);
            }
            
            // Reset import data after delay
            setTimeout(() => {
              importData = {
                jsonText: '',
                healthSystem: 'UHS',
                domain: 'west',
                subdomain: 'prod',
                version: 'adult',
                parseError: '',
                parsedIngredients: [],
                parsedConfig: null,
                isImporting: false,
                importProgress: 0
              };
            }, 500);
          }
          return;
        }
        
        // Generate unique ID with index offset to avoid collisions
        const id = (Date.now() + index).toString();
        
        const newReference = {
          id,
          name: ingredient.display,
          ingredient: ingredient.keyname,
          ingredientType: ingredient.type,
          healthSystem: importData.healthSystem,
          domain: importData.domain,
          subdomain: importData.subdomain,
          version: importData.version,
          sections: sections.map((s, idx) => ({
            id: idx + 1,
            type: s.type,
            content: s.content,
            ...(s.type === 'dynamic' ? { testCases: [{ name: 'Default', variables: {} }] } : {})
          })),
          tags: ['imported', ingredient.keyname, ingredient.type, 'bulk-import'],
          createdAt: Date.now() + index,
          updatedAt: Date.now() + index,
          importSource: 'json-bulk'
        };
        
        referenceTexts[id] = newReference;
        
        // Save first reference to load after import
        if (index === 0) {
          firstReference = newReference;
        }
        
        importData.importProgress = index + 1;
        
        // When done, save and load first reference
        if (index === total - 1) {
          referenceTexts = { ...referenceTexts };
          saveToLocalStorage();
          
          if (firstReference) {
            loadReference(firstReference);
          }
          
          setTimeout(() => {
            importData.isImporting = false;
            showImportDialog = false;
            
            // Reset import data
            importData = {
              jsonText: '',
              healthSystem: 'UHS',
              domain: 'west',
              subdomain: 'prod',
              version: 'adult',
              parseError: '',
              parsedIngredients: [],
              isImporting: false,
              importProgress: 0
            };
          }, 500);
        }
      }, index * 50); // 50ms delay between each import
    });
  }
  
  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      importData.jsonText = text;
      handleImportJSON();
    } catch (error) {
      importData.parseError = `Failed to read file: ${error.message}`;
    }
  }
  
  // Resize handlers
  function handleResizeStart(e) {
    isResizing = true;
    e.preventDefault();
    
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        sidebarWidth = newWidth;
      }
    };
    
    const handleMouseUp = () => {
      isResizing = false;
      saveToLocalStorage();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  
  // Folder editing
  function startEditingFolder(folder) {
    editingFolderId = folder.id;
    editingFolderName = folder.name;
  }
  
  function saveEditedFolder() {
    if (editingFolderId && editingFolderName.trim()) {
      folders[editingFolderId].name = editingFolderName.trim();
      folders = { ...folders };
      saveToLocalStorage();
    }
    cancelEditingFolder();
  }
  
  function cancelEditingFolder() {
    editingFolderId = null;
    editingFolderName = '';
  }
  
  function handleFolderKeydown(e) {
    if (e.key === 'Enter') {
      saveEditedFolder();
    } else if (e.key === 'Escape') {
      cancelEditingFolder();
    }
  }
  
  function startEditingIngredient(ref, event) {
    event.stopPropagation();
    editingReferenceId = ref.id;
    editingIngredientName = ref.ingredient;
  }
  
  function saveEditedIngredient() {
    if (editingReferenceId && editingIngredientName.trim()) {
      referenceTexts[editingReferenceId].ingredient = editingIngredientName.trim();
      referenceTexts = { ...referenceTexts };
      saveToLocalStorage();
      
      // Update current ingredient if this is the loaded reference
      if (loadedReferenceId === editingReferenceId) {
        onSaveReference({ 
          sections: currentSections,
          ingredient: editingIngredientName.trim()
        });
      }
    }
    editingReferenceId = null;
    editingIngredientName = '';
  }
  
  function handleIngredientKeydown(event) {
    if (event.key === 'Enter') {
      saveEditedIngredient();
    } else if (event.key === 'Escape') {
      editingReferenceId = null;
      editingIngredientName = '';
    }
  }
  
  // Context menu handlers
  function showContextMenu(e, type, data) {
    e.preventDefault();
    e.stopPropagation();
    
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      type,
      data
    };
  }
  
  function hideContextMenu() {
    contextMenu = null;
  }
  
  // Global click handler to hide context menu
  function handleGlobalClick() {
    if (contextMenu) hideContextMenu();
  }
  
  // Drag and drop handlers
  function handleReferenceDragStart(e, ref, folder) {
    draggedReference = { ref, folder };
    e.dataTransfer.effectAllowed = 'move';
  }
  
  function handleReferenceDragEnd() {
    draggedReference = null;
    dragOverFolderId = null;
  }
  
  function handleFolderDragOver(e, folder) {
    e.preventDefault();
    if (!draggedReference) return;
    
    // Check if this is a valid drop target
    if (canDropInFolder(draggedReference.ref, folder)) {
      e.dataTransfer.dropEffect = 'move';
      dragOverFolderId = folder.id;
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }
  
  function handleFolderDragLeave() {
    dragOverFolderId = null;
  }
  
  function handleFolderDrop(e, folder) {
    e.preventDefault();
    if (!draggedReference || !canDropInFolder(draggedReference.ref, folder)) return;
    
    const ref = draggedReference.ref;
    
    // Update reference location based on folder type
    if (folder.type === 'subdomain') {
      const parent = folders[folder.parentId];
      const grandparent = folders[parent.parentId];
      ref.healthSystem = grandparent.value;
      ref.domain = parent.value;
      ref.subdomain = folder.value;
      // Keep existing version
    } else if (folder.type === 'version') {
      const parent = folders[folder.parentId];
      const grandparent = folders[parent.parentId];
      const greatGrandparent = folders[grandparent.parentId];
      ref.healthSystem = greatGrandparent.value;
      ref.domain = grandparent.value;
      ref.subdomain = parent.value;
      ref.version = folder.value;
    }
    
    referenceTexts[ref.id] = { ...ref, updatedAt: Date.now() };
    referenceTexts = { ...referenceTexts };
    saveToLocalStorage();
    
    draggedReference = null;
    dragOverFolderId = null;
  }
  
  function canDropInFolder(ref, folder) {
    // Can only drop into version folders or subdomain folders
    return folder.type === 'version' || folder.type === 'subdomain';
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="sidebar" style="width: {sidebarWidth}px" onclick={handleGlobalClick}>
  <div class="sidebar-header">
    <div class="header-top">
      <h2>Reference Texts</h2>
      {#if activeConfigId}
        <div class="active-config-badge" title="Active TPN Config">
          ⚙️ {activeConfigId}
        </div>
      {/if}
    </div>
    <div class="header-buttons">
      <button class="save-btn" onclick={() => showSaveDialog = true}>
        💾 Save Current
      </button>
      <button class="import-btn" onclick={() => showImportDialog = true}>
        📥 Import
      </button>
      <button class="config-btn" onclick={() => showConfigDialog = true} title="Manage TPN Configs">
        🔧 Configs
      </button>
      <div class="manage-dropdown">
        <button class="manage-btn">⚙️</button>
        <div class="dropdown-content">
          <button onclick={() => showHealthSystemDialog = true}>Manage Health Systems</button>
          <button onclick={() => showDomainDialog = true}>Manage Domains</button>
          <button onclick={() => showSubdomainDialog = true}>Manage Subdomains</button>
        </div>
      </div>
    </div>
  </div>
  
  <div class="search-box">
    <input 
      type="text" 
      placeholder="Search references..."
      bind:value={searchQuery}
      class="search-input"
    />
  </div>
  
  <div class="filters">
    <select bind:value={filters.healthSystem} class="filter-select">
      <option value="">All Systems</option>
      {#each healthSystems as system}
        <option value={system}>{system}</option>
      {/each}
    </select>
    
    <select bind:value={filters.domain} class="filter-select">
      <option value="">All Domains</option>
      {#each domains as domain}
        <option value={domain}>{domain.charAt(0).toUpperCase() + domain.slice(1)}</option>
      {/each}
    </select>
    
    <select bind:value={filters.subdomain} class="filter-select">
      <option value="">All Subdomains</option>
      {#each subdomains as subdomain}
        <option value={subdomain}>{subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}</option>
      {/each}
    </select>
    
    <select bind:value={filters.version} class="filter-select">
      <option value="">All Versions</option>
      {#each versions as version}
        <option value={version}>{version.charAt(0).toUpperCase() + version.slice(1)}</option>
      {/each}
    </select>
    
    <select bind:value={filters.ingredient} class="filter-select">
      <option value="">All Ingredients</option>
      {#each uniqueIngredients as ingredient}
        <option value={ingredient}>{ingredient}</option>
      {/each}
    </select>
  </div>
  
  {#if navigationPath.length > 0}
    <div class="breadcrumb-nav">
      {#each navigationPath as folder, i}
        <button 
          class="breadcrumb-item"
          onclick={() => navigateToFolder(folder)}
        >
          {folder.name}
        </button>
        {#if i < navigationPath.length - 1}
          <span class="breadcrumb-separator">›</span>
        {/if}
      {/each}
    </div>
  {/if}
  
  <div class="tree-view">
    {#each getRootFolders() as rootFolder}
      {@const root = renderFolder(rootFolder)}
      {#if root.hasContent}
        <div 
          class="folder-item folder-level-{root.level} {dragOverFolderId === root.folder.id ? 'drag-over' : ''}"
          ondragover={(e) => handleFolderDragOver(e, root.folder)}
          ondragleave={handleFolderDragLeave}
          ondrop={(e) => handleFolderDrop(e, root.folder)}
        >
          <button 
            class="folder-header"
            onclick={() => toggleFolder(root.folder.id)}
            oncontextmenu={(e) => showContextMenu(e, 'folder', root.folder)}
            ondblclick={() => startEditingFolder(root.folder)}
          >
            <span class="folder-icon">
              {expandedFolders[root.folder.id] ? '📂' : '📁'}
            </span>
            {#if editingFolderId === root.folder.id}
              <input 
                type="text"
                bind:value={editingFolderName}
                onblur={saveEditedFolder}
                onkeydown={handleFolderKeydown}
                onclick={(e) => e.stopPropagation()}
                class="folder-name-input"
                autofocus
              />
            {:else}
              {root.folder.name}
            {/if}
          </button>
          
          {#if expandedFolders[root.folder.id]}
            <div class="folder-content">
              {#each root.children as childFolder}
                {@const child = renderFolder(childFolder, 1)}
                {#if child.hasContent}
                  <div 
                    class="folder-item folder-level-{child.level} {dragOverFolderId === child.folder.id ? 'drag-over' : ''}"
                    ondragover={(e) => handleFolderDragOver(e, child.folder)}
                    ondragleave={handleFolderDragLeave}
                    ondrop={(e) => handleFolderDrop(e, child.folder)}
                  >
                    <button 
                      class="folder-header"
                      onclick={() => toggleFolder(child.folder.id)}
                      oncontextmenu={(e) => showContextMenu(e, 'folder', child.folder)}
                      ondblclick={() => startEditingFolder(child.folder)}
                    >
                      <span class="folder-icon">
                        {expandedFolders[child.folder.id] ? '📂' : '📁'}
                      </span>
                      {#if editingFolderId === child.folder.id}
                        <input 
                          type="text"
                          bind:value={editingFolderName}
                          onblur={saveEditedFolder}
                          onkeydown={handleFolderKeydown}
                          onclick={(e) => e.stopPropagation()}
                          class="folder-name-input"
                          autofocus
                        />
                      {:else}
                        {child.folder.name}
                      {/if}
                    </button>
                    
                    {#if expandedFolders[child.folder.id]}
                      <div class="folder-content">
                        {#each child.children as grandchildFolder}
                          {@const grandchild = renderFolder(grandchildFolder, 2)}
                          {#if grandchild.hasContent}
                            <div 
                              class="folder-item folder-level-{grandchild.level} {dragOverFolderId === grandchild.folder.id ? 'drag-over' : ''}"
                              ondragover={(e) => handleFolderDragOver(e, grandchild.folder)}
                              ondragleave={handleFolderDragLeave}
                              ondrop={(e) => handleFolderDrop(e, grandchild.folder)}
                            >
                              <button 
                                class="folder-header"
                                onclick={() => toggleFolder(grandchild.folder.id)}
                                oncontextmenu={(e) => showContextMenu(e, 'folder', grandchild.folder)}
                                ondblclick={() => startEditingFolder(grandchild.folder)}
                              >
                                <span class="folder-icon">
                                  {expandedFolders[grandchild.folder.id] ? '📂' : '📁'}
                                </span>
                                {#if editingFolderId === grandchild.folder.id}
                                  <input 
                                    type="text"
                                    bind:value={editingFolderName}
                                    onblur={saveEditedFolder}
                                    onkeydown={handleFolderKeydown}
                                    onclick={(e) => e.stopPropagation()}
                                    class="folder-name-input"
                                    autofocus
                                  />
                                {:else}
                                  {grandchild.folder.name}
                                {/if}
                              </button>
                              
                              {#if expandedFolders[grandchild.folder.id]}
                                <div class="folder-content">
                                  {#each grandchild.children as greatGrandchildFolder}
                                    {@const greatGrandchild = renderFolder(greatGrandchildFolder, 3)}
                                    {#if greatGrandchild.hasContent}
                                      <div 
                                        class="folder-item folder-level-{greatGrandchild.level} {dragOverFolderId === greatGrandchild.folder.id ? 'drag-over' : ''}"
                                        ondragover={(e) => handleFolderDragOver(e, greatGrandchild.folder)}
                                        ondragleave={handleFolderDragLeave}
                                        ondrop={(e) => handleFolderDrop(e, greatGrandchild.folder)}
                                      >
                                        <button 
                                          class="folder-header"
                                          onclick={() => toggleFolder(greatGrandchild.folder.id)}
                                          oncontextmenu={(e) => showContextMenu(e, 'folder', greatGrandchild.folder)}
                                          ondblclick={() => startEditingFolder(greatGrandchild.folder)}
                                        >
                                          <span class="folder-icon">
                                            {expandedFolders[greatGrandchild.folder.id] ? '📂' : '📁'}
                                          </span>
                                          {#if editingFolderId === greatGrandchild.folder.id}
                                            <input 
                                              type="text"
                                              bind:value={editingFolderName}
                                              onblur={saveEditedFolder}
                                              onkeydown={handleFolderKeydown}
                                              onclick={(e) => e.stopPropagation()}
                                              class="folder-name-input"
                                              autofocus
                                            />
                                          {:else}
                                            {greatGrandchild.folder.name}
                                          {/if}
                                        </button>
                                        
                                        {#if expandedFolders[greatGrandchild.folder.id]}
                                          {@const groupedRefs = groupReferencesByType(greatGrandchild.references)}
                                          <div class="folder-content">
                                            {#each groupedRefs as group}
                                              {@const groupTypeInfo = getIngredientTypeInfo(group.type)}
                                              <div class="type-group">
                                                <button 
                                                  class="type-group-header"
                                                  style="border-left-color: {groupTypeInfo.color}"
                                                  onclick={() => toggleTypeGroup(greatGrandchild.folder.id, group.type)}
                                                >
                                                  <span class="toggle-icon">{expandedTypeGroups[`${greatGrandchild.folder.id}-${group.type}`] ? '▼' : '▶'}</span>
                                                  <span class="type-icon" style="color: {groupTypeInfo.color}">{groupTypeInfo.icon}</span>
                                                  {groupTypeInfo.name}
                                                  <span class="type-count">({group.refs.length})</span>
                                                </button>
                                                {#if expandedTypeGroups[`${greatGrandchild.folder.id}-${group.type}`]}
                                                  <div class="type-group-content">
                                                  {#each group.refs as ref}
                                                    <div 
                                                      class="reference-item {selectedReference?.id === ref.id ? 'selected' : ''} {searchQuery && (ref.name.toLowerCase().includes(searchQuery.toLowerCase()) || ref.ingredient.toLowerCase().includes(searchQuery.toLowerCase())) ? 'search-match' : ''}"
                                                      draggable="true"
                                                      ondragstart={(e) => handleReferenceDragStart(e, ref, greatGrandchild.folder)}
                                                      ondragend={handleReferenceDragEnd}
                                                    >
                                                      <button 
                                                        class="reference-name"
                                                        onclick={() => loadReference(ref)}
                                                        oncontextmenu={(e) => showContextMenu(e, 'reference', ref)}
                                                      >
                                                        {ref.name}
                                                        {#if editingReferenceId === ref.id}
                                                          <input 
                                                            type="text"
                                                            bind:value={editingIngredientName}
                                                            onblur={saveEditedIngredient}
                                                            onkeydown={handleIngredientKeydown}
                                                            onclick={(e) => e.stopPropagation()}
                                                            class="ingredient-edit-input"
                                                            autofocus
                                                          />
                                                        {:else}
                                                          <span 
                                                            class="ingredient-badge"
                                                            ondblclick={(e) => startEditingIngredient(ref, e)}
                                                            title="Double-click to edit"
                                                          >
                                                            {ref.ingredient}
                                                          </span>
                                                        {/if}
                                                      </button>
                                                      <div class="reference-actions">
                                                        <button 
                                                          onclick={() => duplicateReference(ref)}
                                                          title="Duplicate"
                                                        >
                                                          📋
                                                        </button>
                                                        <button 
                                                          onclick={() => deleteReference(ref.id)}
                                                          title="Delete"
                                                        >
                                                          🗑️
                                                        </button>
                                                      </div>
                                                    </div>
                                                  {/each}
                                                </div>
                                                {/if}
                                              </div>
                                            {/each}
                                          </div>
                                        {/if}
                                      </div>
                                    {/if}
                                  {/each}
                                </div>
                              {/if}
                            </div>
                          {/if}
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
  
  {#if showSaveDialog}
    <div 
      class="save-dialog-overlay" 
      onclick={() => showSaveDialog = false}
      onkeydown={(e) => e.key === 'Escape' && (showSaveDialog = false)}
      role="button"
      tabindex="-1"
      aria-label="Close save dialog overlay"
    >
      <div 
        class="save-dialog" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Save Reference Text"
        tabindex="-1"
      >
        <h3>Save Reference Text</h3>
        
        <label>
          Name:
          <input 
            type="text" 
            bind:value={saveData.name}
            placeholder="e.g., Multivitamin Dosing"
          />
        </label>
        
        <label>
          Ingredient:
          <input 
            type="text" 
            bind:value={saveData.ingredient}
            placeholder="e.g., MultiVitamin"
          />
        </label>
        
        <label>
          Health System:
          <select bind:value={saveData.healthSystem}>
            {#each healthSystems as system}
              <option value={system}>{system}</option>
            {/each}
          </select>
        </label>
        
        <label>
          Domain:
          {#if saveData.healthSystem === 'UHS'}
            <select bind:value={saveData.domain}>
              {#each domains as domain}
                <option value={domain}>{domain.charAt(0).toUpperCase() + domain.slice(1)}</option>
              {/each}
            </select>
          {:else}
            <select disabled value="main">
              <option value="main">Main (default)</option>
            </select>
          {/if}
        </label>
        
        <label>
          Subdomain:
          <select bind:value={saveData.subdomain}>
            {#each subdomains as subdomain}
              <option value={subdomain}>{subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}</option>
            {/each}
          </select>
        </label>
        
        <label>
          Version:
          <select bind:value={saveData.version}>
            {#each versions as version}
              <option value={version}>{version.charAt(0).toUpperCase() + version.slice(1)}</option>
            {/each}
          </select>
        </label>
        
        <label>
          Tags (comma-separated):
          <input 
            type="text" 
            bind:value={saveData.tags}
            placeholder="e.g., vitamin, dosing"
          />
        </label>
        
        <div class="dialog-actions">
          <button 
            onclick={handleSaveReference}
            disabled={!saveData.name || !saveData.ingredient}
            class="save-confirm-btn"
          >
            Save
          </button>
          <button onclick={() => showSaveDialog = false}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  {#if showHealthSystemDialog}
    <div 
      class="save-dialog-overlay" 
      onclick={() => showHealthSystemDialog = false}
      onkeydown={(e) => e.key === 'Escape' && (showHealthSystemDialog = false)}
      role="button"
      tabindex="-1"
      aria-label="Close health system dialog overlay"
    >
      <div 
        class="save-dialog" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select Health System"
        tabindex="-1"
      >
        <h3>Manage Health Systems</h3>
        
        <div class="list-management">
          <div class="add-item">
            <input 
              type="text" 
              bind:value={newItemName}
              placeholder="New health system name"
              onkeydown={(e) => e.key === 'Enter' && addHealthSystem()}
            />
            <button onclick={addHealthSystem}>Add</button>
          </div>
          
          <div class="existing-items">
            {#each healthSystems as system}
              <div class="list-item">
                <span>{system}</span>
                {#if system !== 'UHS'}
                  <button 
                    class="remove-btn"
                    onclick={() => removeHealthSystem(system)}
                  >
                    ×
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </div>
        
        <div class="dialog-actions">
          <button onclick={() => showHealthSystemDialog = false}>
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  {#if showDomainDialog}
    <div 
      class="save-dialog-overlay" 
      onclick={() => showDomainDialog = false}
      onkeydown={(e) => e.key === 'Escape' && (showDomainDialog = false)}
      role="button"
      tabindex="-1"
      aria-label="Close domain dialog overlay"
    >
      <div 
        class="save-dialog" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select Domain"
        tabindex="-1"
      >
        <h3>Manage Domains</h3>
        
        <div class="list-management">
          <div class="add-item">
            <input 
              type="text" 
              bind:value={newItemName}
              placeholder="New domain name"
              onkeydown={(e) => e.key === 'Enter' && addDomain()}
            />
            <button onclick={addDomain}>Add</button>
          </div>
          
          <div class="existing-items">
            {#each domains as domain}
              <div class="list-item">
                <span>{domain.charAt(0).toUpperCase() + domain.slice(1)}</span>
                <button 
                  class="remove-btn"
                  onclick={() => removeDomain(domain)}
                >
                  ×
                </button>
              </div>
            {/each}
          </div>
        </div>
        
        <div class="dialog-actions">
          <button onclick={() => showDomainDialog = false}>
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  {#if showSubdomainDialog}
    <div 
      class="save-dialog-overlay" 
      onclick={() => showSubdomainDialog = false}
      onkeydown={(e) => e.key === 'Escape' && (showSubdomainDialog = false)}
      role="button"
      tabindex="-1"
      aria-label="Close subdomain dialog overlay"
    >
      <div 
        class="save-dialog" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select Subdomain"
        tabindex="-1"
      >
        <h3>Manage Subdomains</h3>
        
        <div class="list-management">
          <div class="add-item">
            <input 
              type="text" 
              bind:value={newItemName}
              placeholder="New subdomain name"
              onkeydown={(e) => e.key === 'Enter' && addSubdomain()}
            />
            <button onclick={addSubdomain}>Add</button>
          </div>
          
          <div class="existing-items">
            {#each subdomains as subdomain}
              <div class="list-item">
                <span>{subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}</span>
                <button 
                  class="remove-btn"
                  onclick={() => removeSubdomain(subdomain)}
                >
                  ×
                </button>
              </div>
            {/each}
          </div>
        </div>
        
        <div class="dialog-actions">
          <button onclick={() => showSubdomainDialog = false}>
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  {#if showImportDialog}
    <div 
      class="save-dialog-overlay" 
      onclick={() => showImportDialog = false}
      onkeydown={(e) => e.key === 'Escape' && (showImportDialog = false)}
      role="button"
      tabindex="-1"
      aria-label="Close import dialog overlay"
    >
      <div 
        class="save-dialog import-dialog" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Import Data"
        tabindex="-1"
      >
        <h3>Import Ingredient JSON</h3>
        
        <div class="import-options">
          <label>
            Paste JSON or upload file:
            <textarea 
              bind:value={importData.jsonText}
              placeholder={'{"INGREDIENT": [...]}'}
              class="json-input"
              rows="10"
            ></textarea>
          </label>
          
          <div class="file-upload">
            <input 
              type="file" 
              accept=".json,application/json"
              onchange={handleFileUpload}
              id="json-file-input"
              style="display: none"
            />
            <label for="json-file-input" class="file-upload-btn">
              📁 Choose JSON File
            </label>
          </div>
        </div>
        
        {#if importData.parseError}
          <div class="error-message">
            ❌ {importData.parseError}
          </div>
        {/if}
        
        <div class="import-settings">
          <label>
            Health System:
            <select bind:value={importData.healthSystem}>
              {#each healthSystems as system}
                <option value={system}>{system}</option>
              {/each}
            </select>
          </label>
          
          <label>
            Domain:
            {#if importData.healthSystem === 'UHS'}
              <select bind:value={importData.domain}>
                {#each domains as domain}
                  <option value={domain}>{domain.charAt(0).toUpperCase() + domain.slice(1)}</option>
                {/each}
              </select>
            {:else}
              <select disabled value="main">
                <option value="main">Main (default)</option>
              </select>
            {/if}
          </label>
          
          <label>
            Subdomain:
            <select bind:value={importData.subdomain}>
              {#each subdomains as subdomain}
                <option value={subdomain}>{subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}</option>
              {/each}
            </select>
          </label>
          
          <label>
            Version:
            <select bind:value={importData.version}>
              {#each versions as version}
                <option value={version}>{version.charAt(0).toUpperCase() + version.slice(1)}</option>
              {/each}
            </select>
          </label>
        </div>
        
        <div class="dialog-actions">
          <button 
            onclick={handleImportJSON}
            disabled={!importData.jsonText}
            class="parse-btn"
          >
            Parse JSON
          </button>
        </div>
        
        {#if importData.parsedIngredients.length > 0}
          <div class="parsed-results">
            <div class="parsed-header">
              <h4>Found {importData.parsedIngredients.length} ingredient(s):</h4>
              <button 
                class="import-all-btn"
                onclick={importAllIngredients}
                disabled={importData.isImporting}
              >
                {#if importData.isImporting}
                  Importing {importData.importProgress}/{importData.parsedIngredients.length}...
                {:else}
                  📥 Import All
                {/if}
              </button>
            </div>
            <div class="ingredient-list">
              {#each importData.parsedIngredients as ingredient}
                {@const typeInfo = getIngredientTypeInfo(ingredient.type)}
                <div class="ingredient-item">
                  <div class="ingredient-info">
                    <span class="type-icon" style="color: {typeInfo.color}">{typeInfo.icon}</span>
                    <strong>{ingredient.display}</strong>
                    <span class="keyname">({ingredient.keyname})</span>
                    <span 
                      class="type-badge inline"
                      style="background-color: {typeInfo.color}"
                    >
                      {typeInfo.name}
                    </span>
                    <span class="note-count">{ingredient.notes.length} notes</span>
                  </div>
                  <button 
                    class="import-ingredient-btn"
                    onclick={() => importIngredient(ingredient)}
                    disabled={importData.isImporting}
                  >
                    Import
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <div class="dialog-actions">
          <button onclick={() => showImportDialog = false}>
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Resize handle -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="resize-handle"
    onmousedown={handleResizeStart}
    onkeydown={(e) => {
      if (e.key === 'ArrowLeft') {
        sidebarWidth = Math.max(300, sidebarWidth - 10);
      } else if (e.key === 'ArrowRight') {
        sidebarWidth = Math.min(800, sidebarWidth + 10);
      }
    }}
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize sidebar"
    tabindex="0"
  ></div>
  
  <!-- Context menu -->
  {#if contextMenu}
    <div 
      class="context-menu"
      style="left: {contextMenu.x}px; top: {contextMenu.y}px"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.key === 'Escape' && hideContextMenu()}
      role="menu"
      tabindex="-1"
    >
      {#if contextMenu.type === 'folder'}
        <button onclick={() => { startEditingFolder(contextMenu.data); hideContextMenu(); }}>
          ✏️ Rename
        </button>
        {#if contextMenu.data.type === 'domain' || contextMenu.data.type === 'version'}
          <button onclick={() => { /* TODO: Add subfolder */ hideContextMenu(); }}>
            ➕ Add Subfolder
          </button>
        {/if}
        <button onclick={() => { /* TODO: Delete folder */ hideContextMenu(); }}>
          🗑️ Delete
        </button>
        <hr />
        <button onclick={() => { /* TODO: Expand all */ hideContextMenu(); }}>
          📂 Expand All
        </button>
      {:else if contextMenu.type === 'reference'}
        <button onclick={() => { loadReference(contextMenu.data); hideContextMenu(); }}>
          📝 Edit
        </button>
        <button onclick={() => { duplicateReference(contextMenu.data); hideContextMenu(); }}>
          📋 Duplicate
        </button>
        <button onclick={() => { deleteReference(contextMenu.data.id); hideContextMenu(); }}>
          🗑️ Delete
        </button>
        <hr />
        <button onclick={() => { /* TODO: Export */ hideContextMenu(); }}>
          📤 Export as JSON
        </button>
      {/if}
    </div>
  {/if}
  
  <!-- Config Manager Dialog -->
  {#if showConfigDialog}
    <div 
      class="save-dialog-overlay" 
      onclick={() => showConfigDialog = false}
      onkeydown={(e) => e.key === 'Escape' && (showConfigDialog = false)}
      role="button"
      tabindex="-1"
      aria-label="Close config dialog overlay"
    >
      <div 
        class="save-dialog config-dialog" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="TPN Config Manager"
        tabindex="-1"
      >
        <h3>TPN Config Manager</h3>
        
        {#if activeConfigId}
          <div class="active-config-info">
            <strong>Active Config:</strong> {activeConfigId}
          </div>
        {/if}
        
        <div class="config-list">
          <h4>Loaded Configs:</h4>
          {#if Object.keys(tpnConfigs).length === 0}
            <p class="no-configs">No configs loaded. Import a TPN JSON file to get started.</p>
          {:else}
            <div class="config-items">
              {#each Object.entries(tpnConfigs) as [configId, config]}
                <div class="config-item {activeConfigId === configId ? 'active' : ''}">
                  <div class="config-info">
                    <strong>{configId}</strong>
                    {#if config.metadata}
                      <div class="config-metadata">
                        {config.metadata.healthSystem} / {config.metadata.domain} / {config.metadata.subdomain} / {config.metadata.version}
                      </div>
                      <div class="config-date">
                        Imported: {new Date(config.metadata.importedAt).toLocaleDateString()}
                      </div>
                    {/if}
                  </div>
                  <div class="config-actions">
                    {#if activeConfigId !== configId}
                      <button 
                        class="activate-btn"
                        onclick={() => { activeConfigId = configId; saveToLocalStorage(); }}
                      >
                        Activate
                      </button>
                    {/if}
                    <button 
                      class="delete-btn"
                      onclick={() => {
                        if (confirm(`Delete config "${configId}"?`)) {
                          delete tpnConfigs[configId];
                          if (activeConfigId === configId) {
                            activeConfigId = null;
                          }
                          tpnConfigs = { ...tpnConfigs };
                          saveToLocalStorage();
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        
        <div class="dialog-actions">
          <button onclick={() => showConfigDialog = false}>
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .sidebar {
    position: relative;
    height: 100%;
    background-color: #1e1e1e;
    border-right: 2px solid #444;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid #444;
  }
  
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .sidebar-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #646cff;
  }
  
  .active-config-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background-color: rgba(23, 162, 184, 0.2);
    border: 1px solid #17a2b8;
    border-radius: 4px;
    color: #17a2b8;
  }
  
  .header-buttons {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .save-btn {
    padding: 0.5rem 1rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .save-btn:hover {
    background-color: #218838;
  }
  
  .import-btn {
    padding: 0.5rem 1rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .import-btn:hover {
    background-color: #5a6268;
  }
  
  .config-btn {
    padding: 0.5rem 1rem;
    background-color: #17a2b8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .config-btn:hover {
    background-color: #138496;
  }
  
  .manage-dropdown {
    position: relative;
  }
  
  .manage-btn {
    padding: 0.5rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .manage-btn:hover {
    background-color: #5a6268;
  }
  
  .dropdown-content {
    display: none;
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.25rem;
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    min-width: 160px;
    z-index: 100;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
  
  .manage-dropdown:hover .dropdown-content {
    display: block;
  }
  
  .dropdown-content button {
    width: 100%;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    color: #d4d4d4;
    cursor: pointer;
    text-align: left;
    font-size: 0.9rem;
  }
  
  .dropdown-content button:hover {
    background-color: #3a3a3a;
  }
  
  .search-box {
    padding: 0.5rem 1rem;
  }
  
  .search-input {
    width: 100%;
    padding: 0.5rem;
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #d4d4d4;
  }
  
  .filters {
    padding: 0.5rem 1rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  
  @media (min-width: 400px) {
    .filters {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  
  .filter-select {
    padding: 0.25rem;
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #d4d4d4;
    font-size: 0.85rem;
  }
  
  .tree-view {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }
  
  .folder-item {
    margin-bottom: 0.25rem;
    border-radius: 4px;
  }
  
  /* Level-based visual differentiation */
  .folder-level-0 {
    background-color: rgba(66, 153, 225, 0.1);
    border-left: 4px solid #4299e1;
  }
  
  .folder-level-0 .folder-header {
    font-weight: 600;
    font-size: 1.1rem;
  }
  
  .folder-level-1 {
    background-color: rgba(72, 187, 120, 0.1);
    border-left: 4px solid #48bb78;
    margin-top: 0.125rem;
  }
  
  .folder-level-1 .folder-header {
    font-weight: 500;
    font-size: 1rem;
  }
  
  .folder-level-2 {
    background-color: rgba(237, 137, 54, 0.1);
    border-left: 4px solid #ed8936;
  }
  
  .folder-level-2 .folder-header {
    font-size: 0.95rem;
  }
  
  .folder-level-3 {
    background-color: rgba(159, 122, 234, 0.1);
    border-left: 4px solid #9f7aea;
  }
  
  .folder-level-3 .folder-header {
    font-size: 0.9rem;
  }
  
  .folder-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: none;
    border: none;
    color: #d4d4d4;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .folder-header:hover {
    background-color: #2a2a2a;
  }
  
  .folder-icon {
    font-size: 1.1rem;
  }
  
  .folder-content {
    margin-top: 0.25rem;
  }
  
  .reference-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s;
    background-color: rgba(255, 255, 255, 0.02);
    border-left: 3px solid #718096;
    margin-bottom: 0.125rem;
  }
  
  .reference-item:hover {
    background-color: #2a2a2a;
  }
  
  .reference-item.selected {
    background-color: #3a3a3a;
  }
  
  .reference-item.search-match {
    background-color: rgba(100, 108, 255, 0.1);
    border-left-color: #646cff;
  }
  
  .reference-item.search-match:hover {
    background-color: rgba(100, 108, 255, 0.2);
  }
  
  .reference-name {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: #d4d4d4;
    cursor: pointer;
    text-align: left;
    font-size: 0.9rem;
  }
  
  .ingredient-badge {
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    background-color: #17a2b8;
    color: white;
    border-radius: 10px;
    cursor: pointer;
  }
  
  .ingredient-badge:hover {
    background-color: #138496;
  }
  
  .ingredient-edit-input {
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    background-color: #17a2b8;
    color: white;
    border: none;
    border-radius: 10px;
    outline: none;
    width: 100px;
  }
  
  .type-icon {
    font-size: 1rem;
    margin-right: 0.25rem;
  }
  
  .type-badge {
    font-size: 0.65rem;
    padding: 0.1rem 0.3rem;
    color: white;
    border-radius: 8px;
    margin-left: 0.5rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }
  
  .reference-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .reference-item:hover .reference-actions {
    opacity: 1;
  }
  
  .reference-actions button {
    padding: 0.2rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .reference-actions button:hover {
    transform: scale(1.1);
  }
  
  /* Save Dialog */
  .save-dialog-overlay {
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
  
  .save-dialog {
    background-color: #2a2a2a;
    border: 2px solid #444;
    border-radius: 8px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
  }
  
  .save-dialog h3 {
    margin: 0 0 1rem 0;
    color: #646cff;
  }
  
  .save-dialog label {
    display: block;
    margin-bottom: 1rem;
    color: #d4d4d4;
  }
  
  .save-dialog input,
  .save-dialog select {
    width: 100%;
    padding: 0.5rem;
    margin-top: 0.25rem;
    background-color: #1e1e1e;
    border: 1px solid #444;
    border-radius: 4px;
    color: #d4d4d4;
  }
  
  .dialog-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }
  
  .save-confirm-btn {
    padding: 0.5rem 1rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .save-confirm-btn:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  
  .save-confirm-btn:not(:disabled):hover {
    background-color: #218838;
  }
  
  /* List Management Styles */
  .list-management {
    margin: 1rem 0;
  }
  
  .add-item {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .add-item input {
    flex: 1;
  }
  
  .add-item button {
    padding: 0.5rem 1rem;
    background-color: #17a2b8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .add-item button:hover {
    background-color: #138496;
  }
  
  .existing-items {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 0.5rem;
  }
  
  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.25rem;
  }
  
  .list-item:hover {
    background-color: #3a3a3a;
  }
  
  .remove-btn {
    padding: 0.25rem 0.5rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .remove-btn:hover {
    background-color: #c82333;
  }
  
  /* Import Dialog Styles */
  .import-dialog {
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .import-options {
    margin-bottom: 1rem;
  }
  
  .json-input {
    width: 100%;
    padding: 0.5rem;
    margin-top: 0.5rem;
    background-color: #1e1e1e;
    border: 1px solid #444;
    border-radius: 4px;
    color: #d4d4d4;
    font-family: monospace;
    font-size: 0.85rem;
    resize: vertical;
  }
  
  .file-upload {
    margin-top: 1rem;
  }
  
  .file-upload-btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    background-color: #17a2b8;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .file-upload-btn:hover {
    background-color: #138496;
  }
  
  .error-message {
    padding: 0.5rem;
    background-color: #dc3545;
    color: white;
    border-radius: 4px;
    margin: 1rem 0;
  }
  
  .import-settings {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin: 1rem 0;
  }
  
  .parse-btn {
    padding: 0.5rem 1rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .parse-btn:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  
  .parse-btn:not(:disabled):hover {
    background-color: #218838;
  }
  
  .parsed-results {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #444;
  }
  
  .parsed-results h4 {
    margin: 0;
    color: #646cff;
  }
  
  .parsed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .import-all-btn {
    padding: 0.5rem 1rem;
    background-color: #17a2b8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .import-all-btn:hover:not(:disabled) {
    background-color: #138496;
  }
  
  .import-all-btn:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  
  .ingredient-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 0.5rem;
  }
  
  .ingredient-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    background-color: #2a2a2a;
  }
  
  .ingredient-item:hover {
    background-color: #3a3a3a;
  }
  
  .ingredient-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .type-badge.inline {
    display: inline-flex;
    margin-left: 0;
  }
  
  .keyname {
    font-size: 0.85rem;
    color: #999;
  }
  
  .note-count {
    font-size: 0.8rem;
    color: #17a2b8;
  }
  
  .import-ingredient-btn {
    padding: 0.25rem 0.5rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  
  .import-ingredient-btn:hover:not(:disabled) {
    background-color: #218838;
  }
  
  .import-ingredient-btn:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  
  /* Resize handle */
  .resize-handle {
    position: absolute;
    top: 0;
    right: -3px;
    width: 6px;
    height: 100%;
    background-color: transparent;
    cursor: col-resize;
    z-index: 10;
  }
  
  .resize-handle:hover {
    background-color: #646cff;
  }
  
  /* Drag and drop */
  .folder-item.drag-over {
    outline: 2px dashed #646cff;
    outline-offset: -2px;
  }
  
  .folder-level-0.drag-over {
    background-color: rgba(66, 153, 225, 0.3);
  }
  
  .folder-level-1.drag-over {
    background-color: rgba(72, 187, 120, 0.3);
  }
  
  .folder-level-2.drag-over {
    background-color: rgba(237, 137, 54, 0.3);
  }
  
  .folder-level-3.drag-over {
    background-color: rgba(159, 122, 234, 0.3);
  }
  
  .reference-item[draggable="true"] {
    cursor: move;
  }
  
  /* Inline editing */
  .folder-name-input {
    flex: 1;
    padding: 0.2rem;
    background-color: #1e1e1e;
    border: 1px solid #646cff;
    border-radius: 2px;
    color: #d4d4d4;
    font-size: inherit;
    font-family: inherit;
    outline: none;
  }
  
  /* Context menu */
  .context-menu {
    position: fixed;
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 0.25rem 0;
    min-width: 150px;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .context-menu button {
    display: block;
    width: 100%;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    color: #d4d4d4;
    text-align: left;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .context-menu button:hover {
    background-color: #3a3a3a;
  }
  
  .context-menu hr {
    margin: 0.25rem 0;
    border: none;
    border-top: 1px solid #444;
  }
  
  /* Config dialog styles */
  .config-dialog {
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .active-config-info {
    padding: 0.75rem;
    background-color: #17a2b8;
    color: white;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  
  .config-list {
    margin: 1rem 0;
  }
  
  .config-list h4 {
    margin: 0 0 0.5rem 0;
    color: #646cff;
  }
  
  .no-configs {
    text-align: center;
    color: #999;
    padding: 2rem;
  }
  
  .config-items {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 0.5rem;
  }
  
  .config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    background-color: #2a2a2a;
  }
  
  .config-item:hover {
    background-color: #3a3a3a;
  }
  
  .config-item.active {
    background-color: rgba(23, 162, 184, 0.2);
    border: 1px solid #17a2b8;
  }
  
  .config-info strong {
    display: block;
    margin-bottom: 0.25rem;
    color: #d4d4d4;
  }
  
  .config-metadata {
    font-size: 0.85rem;
    color: #999;
  }
  
  .config-date {
    font-size: 0.8rem;
    color: #777;
    margin-top: 0.25rem;
  }
  
  .config-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .activate-btn {
    padding: 0.25rem 0.75rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  
  .activate-btn:hover {
    background-color: #218838;
  }
  
  .delete-btn {
    padding: 0.25rem 0.5rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .delete-btn:hover {
    background-color: #c82333;
  }
  
  @media (prefers-color-scheme: light) {
    .sidebar {
      background-color: #f5f5f5;
      border-color: #ddd;
    }
    
    .sidebar-header h2 {
      color: #535bf2;
    }
    
    .search-input,
    .filter-select {
      background-color: #fff;
      border-color: #ddd;
      color: #333;
    }
    
    .folder-header,
    .reference-name {
      color: #333;
    }
    
    .folder-header:hover,
    .reference-item:hover {
      background-color: #e9ecef;
    }
    
    .reference-item.selected {
      background-color: #dee2e6;
    }
    
    .save-dialog {
      background-color: #fff;
      border-color: #ddd;
    }
    
    .save-dialog input,
    .save-dialog select {
      background-color: #f5f5f5;
      border-color: #ddd;
      color: #333;
    }
    
    .dropdown-content {
      background-color: #fff;
      border-color: #ddd;
    }
    
    .dropdown-content button {
      color: #333;
    }
    
    .dropdown-content button:hover {
      background-color: #f5f5f5;
    }
    
    .existing-items {
      border-color: #ddd;
    }
    
    .list-item:hover {
      background-color: #f5f5f5;
    }
    
    .json-input {
      background-color: #f5f5f5;
      border-color: #ddd;
      color: #333;
    }
    
    .parsed-results h4 {
      color: #535bf2;
    }
    
    .ingredient-list {
      border-color: #ddd;
    }
    
    .ingredient-item {
      background-color: #fff;
    }
    
    .ingredient-item:hover {
      background-color: #f5f5f5;
    }
    
    .resize-handle:hover {
      background-color: #535bf2;
    }
    
    .folder-item.drag-over {
      background-color: #e9ecef;
      outline-color: #535bf2;
    }
    
    .folder-name-input {
      background-color: #fff;
      border-color: #535bf2;
      color: #333;
    }
    
    .context-menu {
      background-color: #fff;
      border-color: #ddd;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    
    .context-menu button {
      color: #333;
    }
    
    .context-menu button:hover {
      background-color: #f5f5f5;
    }
    
    .context-menu hr {
      border-color: #ddd;
    }
  }
  
  /* Type group styles */
  .type-group {
    margin-bottom: 12px;
  }
  
  .type-group-header {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    margin-bottom: 4px;
    border: none;
    border-left: 3px solid;
    background-color: rgba(255, 255, 255, 0.03);
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .type-group-header:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .type-group-header .toggle-icon {
    font-size: 0.75rem;
    margin-right: 0.5rem;
    transition: transform 0.2s;
    color: #666;
  }
  
  .type-icon {
    margin-right: 6px;
    font-size: 1rem;
  }
  
  .type-count {
    margin-left: auto;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: normal;
  }
  
  /* Individual type badge styles */
  .type-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-left: 4px;
  }
  
  .type-badge .type-icon {
    margin-right: 4px;
    font-size: 0.875rem;
  }
  
  /* Breadcrumb navigation */
  .breadcrumb-nav {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    background-color: #2a2a2a;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    overflow-x: auto;
    white-space: nowrap;
  }
  
  .breadcrumb-item {
    padding: 0.25rem 0.5rem;
    background: none;
    border: none;
    color: #d4d4d4;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
    border-radius: 3px;
  }
  
  .breadcrumb-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  .breadcrumb-separator {
    margin: 0 0.25rem;
    color: #666;
    font-size: 0.9rem;
  }
  
  @media (prefers-color-scheme: light) {
    .type-group-header {
      background-color: rgba(0, 0, 0, 0.03);
      color: rgba(0, 0, 0, 0.8);
    }
    
    .type-group-header:hover {
      background-color: rgba(0, 0, 0, 0.06);
    }
    
    .type-count {
      color: rgba(0, 0, 0, 0.5);
    }
    
    .breadcrumb-nav {
      background-color: #f0f0f0;
    }
    
    .breadcrumb-item {
      color: #333;
    }
    
    .breadcrumb-item:hover {
      background-color: rgba(0, 0, 0, 0.1);
      color: #000;
    }
    
    .breadcrumb-separator {
      color: #999;
    }
  }
</style>