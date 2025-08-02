import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db, COLLECTIONS, getCurrentUser, signInAnonymouslyUser } from './firebase.js';
import { getKeyCategory } from './tpnLegacy.js';

// Population types
export const POPULATION_TYPES = {
  NEONATAL: 'neonatal',
  PEDIATRIC: 'pediatric',
  ADOLESCENT: 'adolescent',
  ADULT: 'adult'
};

// Helper functions for ID normalization
// Validate if a string is a valid Firestore document ID
function isValidFirestoreId(id) {
  if (!id || typeof id !== 'string') return false;
  
  // Firebase document ID restrictions:
  // - Must be 1-1500 characters
  // - Cannot contain forward slashes
  // - Cannot be . or ..
  // - Cannot match __.*__
  return id.length > 0 && 
         id.length <= 1500 && 
         !id.includes('/') &&
         id !== '.' &&
         id !== '..' &&
         !/^__.*__$/.test(id);
}

export function normalizeIngredientId(name) {
  if (!name) {
    console.warn('normalizeIngredientId called with empty name');
    return '';
  }
  
  // Log for debugging parentheses issues
  if (name.includes('(') || name.includes(')')) {
    console.log(`Normalizing ingredient with parentheses: "${name}"`);
  }
  
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
  
  // Validate the normalized ID
  if (!isValidFirestoreId(normalized)) {
    console.error(`Invalid Firebase ID generated: "${normalized}" from name: "${name}"`);
    // Fallback: ensure it's valid by truncating if needed
    if (normalized.length > 1500) {
      return normalized.substring(0, 1500).replace(/-+$/g, '');
    }
  }
  
  // Log the result for debugging
  if (name.includes('(') || name.includes(')')) {
    console.log(`Normalized to: "${normalized}"`);
  }
  
  return normalized;
}

export function normalizeConfigId(healthSystem, domain, subdomain, version) {
  const parts = [healthSystem, domain, subdomain, version]
    .filter(Boolean) // Remove empty values
    .map(part => part.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return parts.join('-');
}

export function generateReferenceId(referenceData) {
  // Generate a meaningful reference ID based on health system and population type
  const parts = [
    referenceData.healthSystem,
    referenceData.domain,
    referenceData.subdomain,
    referenceData.populationType || referenceData.version
  ].filter(Boolean).map(part => part.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  
  return parts.join('-');
}

// Helper function to map version names to population types
export function versionToPopulationType(version) {
  const mapping = {
    'neonatal': POPULATION_TYPES.NEONATAL,
    'child': POPULATION_TYPES.PEDIATRIC,
    'pediatric': POPULATION_TYPES.PEDIATRIC,
    'adolescent': POPULATION_TYPES.ADOLESCENT,
    'adult': POPULATION_TYPES.ADULT
  };
  
  return mapping[version?.toLowerCase()] || POPULATION_TYPES.ADULT;
}

// Convert clinical notes TEXT to sections format
function convertNotesToSections(notes) {
  if (!notes || !Array.isArray(notes)) {
    return [];
  }
  
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
        sections.push({ 
          id: sections.length + 1,
          type: 'static', 
          content: currentStaticContent.trim() 
        });
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
              sections.push({ 
                id: sections.length + 1,
                type: 'static', 
                content: beforeText.trim() 
              });
            }
          }
          
          // Find the matching )]
          let endIdx = remainingText.indexOf(')]', startIdx);
          
          if (endIdx !== -1) {
            // Extract the dynamic code between [f( and )]
            const dynamicText = remainingText.substring(startIdx + 3, endIdx);
            sections.push({ 
              id: sections.length + 1,
              type: 'dynamic', 
              content: dynamicText.trim(),
              testCases: [{ name: 'Default', variables: {} }]
            });
            remainingText = remainingText.substring(endIdx + 2);
          } else {
            // Unmatched [f(, treat rest as static
            if (remainingText.trim()) {
              sections.push({ 
                id: sections.length + 1,
                type: 'static', 
                content: remainingText.trim() 
              });
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
    sections.push({ 
      id: sections.length + 1,
      type: 'static', 
      content: currentStaticContent.trim() 
    });
  }
  
  return sections;
}

// Ingredient service
export const ingredientService = {
  // Create or update an ingredient
  async saveIngredient(ingredientData) {
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      // Use normalized ingredient name as ID
      const ingredientId = ingredientData.id || normalizeIngredientId(ingredientData.name);
      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
      
      const data = {
        ...ingredientData,
        id: ingredientId, // Ensure ID is stored in the document
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      
      if (!ingredientData.id) {
        data.createdAt = serverTimestamp();
        data.createdBy = user.uid;
      }
      
      await setDoc(ingredientRef, data);
      return ingredientId;
    } catch (error) {
      console.error('Error saving ingredient:', error);
      throw error;
    }
  },
  
  // Get all ingredients
  async getAllIngredients() {
    try {
      const q = query(
        collection(db, COLLECTIONS.INGREDIENTS),
        orderBy('name', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      throw error;
    }
  },
  
  // Get ingredients by category
  async getIngredientsByCategory(category) {
    try {
      const q = query(
        collection(db, COLLECTIONS.INGREDIENTS),
        where('category', '==', category),
        orderBy('name', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching ingredients by category:', error);
      throw error;
    }
  },
  
  // Subscribe to ingredient changes
  subscribeToIngredients(callback) {
    const q = query(
      collection(db, COLLECTIONS.INGREDIENTS),
      orderBy('name', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const ingredients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(ingredients);
    });
  }
};

// Reference service (nested under ingredients)
export const referenceService = {
  // Save a reference under an ingredient
  async saveReference(ingredientId, referenceData) {
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      // Generate meaningful reference ID if not provided
      const referenceId = referenceData.id || generateReferenceId(referenceData);
      const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId);
      
      const data = {
        ...referenceData,
        id: referenceId,
        ingredientId,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      
      if (!referenceData.id) {
        data.createdAt = serverTimestamp();
        data.createdBy = user.uid;
      }
      
      await setDoc(referenceRef, data);
      
      // Update ingredient's lastModified
      await updateDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredientId), {
        lastReferenceUpdate: serverTimestamp(),
        referenceCount: increment(referenceData.id ? 0 : 1)
      });
      
      return referenceId;
    } catch (error) {
      console.error('Error saving reference:', error);
      throw error;
    }
  },
  
  // Get all references for an ingredient
  async getReferencesForIngredient(ingredientId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references'),
        orderBy('populationType', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching references:', error);
      throw error;
    }
  },
  
  // Get references by population type
  async getReferencesByPopulation(ingredientId, populationType) {
    try {
      const q = query(
        collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references'),
        where('populationType', '==', populationType)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching references by population:', error);
      throw error;
    }
  },
  
  // Get references across health systems for comparison
  async getReferencesForComparison(ingredientId, healthSystem = null) {
    try {
      let q = collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references');
      
      if (healthSystem) {
        q = query(q, where('healthSystem', '==', healthSystem));
      }
      
      const snapshot = await getDocs(q);
      const references = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Group by population type for easy comparison
      const grouped = {};
      references.forEach(ref => {
        if (!grouped[ref.populationType]) {
          grouped[ref.populationType] = [];
        }
        grouped[ref.populationType].push(ref);
      });
      
      return grouped;
    } catch (error) {
      console.error('Error fetching references for comparison:', error);
      throw error;
    }
  },
  
  // Subscribe to reference changes for an ingredient
  subscribeToReferences(ingredientId, callback) {
    const q = query(
      collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references'),
      orderBy('populationType', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const references = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(references);
    });
  },
  
  // Delete a reference
  async deleteReference(ingredientId, referenceId) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId));
      
      // Update ingredient's reference count
      await updateDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredientId), {
        lastReferenceUpdate: serverTimestamp(),
        referenceCount: increment(-1)
      });
    } catch (error) {
      console.error('Error deleting reference:', error);
      throw error;
    }
  }
};

// Batch operations for migration
export const migrationService = {
  // Migrate all localStorage data to Firebase
  async migrateFromLocalStorage(localStorageData) {
    try {
      const batch = writeBatch(db);
      const ingredientMap = new Map();
      
      // First pass: Create ingredients from all references
      Object.values(localStorageData.referenceTexts || {}).forEach(reference => {
        if (reference.ingredient && !ingredientMap.has(reference.ingredient)) {
          const ingredientId = normalizeIngredientId(reference.ingredient);
          ingredientMap.set(reference.ingredient, ingredientId);
          
          batch.set(doc(db, COLLECTIONS.INGREDIENTS, ingredientId), {
            id: ingredientId,
            name: reference.ingredient,
            category: 'OTHER', // Default category, can be updated later
            description: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            referenceCount: 0
          });
        }
      });
      
      // Second pass: Add references under their ingredients
      Object.values(localStorageData.referenceTexts || {}).forEach(reference => {
        if (reference.ingredient) {
          const ingredientId = ingredientMap.get(reference.ingredient);
          // Generate meaningful reference ID
          const refId = generateReferenceId({
            healthSystem: reference.healthSystem || 'unknown',
            domain: reference.domain || 'main',
            subdomain: reference.subdomain || '',
            version: reference.version || 'adult'
          });
          
          batch.set(doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', refId), {
            ...reference,
            ingredientId,
            populationType: POPULATION_TYPES.ADULT, // Default, can be updated
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // Increment reference count for ingredient
          batch.update(doc(db, COLLECTIONS.INGREDIENTS, ingredientId), {
            referenceCount: increment(1)
          });
        }
      });
      
      // Commit all changes
      await batch.commit();
      
      return {
        ingredientCount: ingredientMap.size,
        referenceCount: Object.keys(localStorageData.referenceTexts || {}).length
      };
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  }
};

// Health system and domain management
export const organizationService = {
  // Get all health systems
  async getHealthSystems() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.HEALTH_SYSTEMS));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching health systems:', error);
      throw error;
    }
  },
  
  // Add a new health system
  async addHealthSystem(name) {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.HEALTH_SYSTEMS), {
        name,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding health system:', error);
      throw error;
    }
  },
  
  // Get domains for a health system
  async getDomains(healthSystemId) {
    try {
      const snapshot = await getDocs(
        collection(db, COLLECTIONS.HEALTH_SYSTEMS, healthSystemId, 'domains')
      );
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching domains:', error);
      throw error;
    }
  }
};

// Config service for imported TPN configurations
export const configService = {
  // Save an imported config with all ingredient data
  async saveImportedConfig(configData, metadata) {
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      // Generate meaningful config ID
      const configId = normalizeConfigId(
        metadata.healthSystem,
        metadata.domain,
        metadata.subdomain,
        metadata.version
      );
      
      // Create the main config document with custom ID
      const configRef = doc(db, 'importedConfigs', configId);
      await setDoc(configRef, {
        name: metadata.name || configId,
        healthSystem: metadata.healthSystem,
        domain: metadata.domain,
        subdomain: metadata.subdomain,
        version: metadata.version,
        ingredientCount: configData.INGREDIENT?.length || 0,
        importedAt: serverTimestamp(),
        importedBy: user.uid,
        metadata: metadata
      });
      
      // Store each ingredient in a subcollection and create/update main ingredients
      if (configData.INGREDIENT && configData.INGREDIENT.length > 0) {
        const batch = writeBatch(db);
        const processedIngredients = new Map(); // Track unique ingredients
        
        // First, identify unique ingredients and their data
        configData.INGREDIENT.forEach((ingredientData) => {
          // Handle both uppercase and lowercase property names
          const name = ingredientData.KEYNAME || ingredientData.keyname || 
                      ingredientData.Ingredient || ingredientData.ingredient || 
                      ingredientData.name;
          
          if (name && !processedIngredients.has(name)) {
            processedIngredients.set(name, {
              name: name,
              category: getKeyCategory(name) || 'OTHER',
              description: ingredientData.DISPLAY || ingredientData.display || 
                          ingredientData.Description || ingredientData.description || '',
              unit: ingredientData.Unit || ingredientData.unit || '',
              type: ingredientData.TYPE || ingredientData.type || '',
              configSources: [configId]
            });
          }
        });
        
        console.log(`Processing ${processedIngredients.size} unique ingredients from config ${metadata.name}`);
        console.log('DEBUG: Firebase project:', db.app.options.projectId);
        
        // Create or update ingredients in the main collection
        for (const [name, ingredientInfo] of processedIngredients) {
          // Use normalized name as ingredient ID
          const ingredientId = normalizeIngredientId(name);
          console.log(`DEBUG: Processing "${name}" -> normalized ID: "${ingredientId}"`);
          
          const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
          console.log(`DEBUG: Document reference path: ${ingredientRef.path}, ID: ${ingredientRef.id}`);
          
          // Check if ingredient already exists
          const existingIngredient = await getDoc(ingredientRef);
          
          if (!existingIngredient.exists()) {
            // Create new ingredient
            const ingredientData = {
              ...ingredientInfo,
              id: ingredientId,
              createdAt: serverTimestamp(),
              createdBy: user.uid,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            };
            console.log(`DEBUG: Creating new ingredient with ID "${ingredientId}" at path "${ingredientRef.path}"`);
            batch.set(ingredientRef, ingredientData);
          } else {
            // Update existing ingredient
            console.log(`DEBUG: Updating existing ingredient "${ingredientId}"`);
            const existingData = existingIngredient.data();
            batch.update(ingredientRef, {
              configSources: arrayUnion(configId),
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
              // Update description if it was empty
              description: existingData.description || ingredientInfo.description
            });
          }
          
          // Find the matching ingredient data to get its notes
          const matchingIngredientData = configData.INGREDIENT.find(ing => {
            const ingName = ing.KEYNAME || ing.keyname || 
                           ing.Ingredient || ing.ingredient || 
                           ing.name;
            return ingName === name;
          });
          
          // Convert notes to sections if available
          let sections = [];
          const notes = matchingIngredientData?.NOTE || matchingIngredientData?.notes;
          if (notes) {
            sections = convertNotesToSections(notes);
          }
          
          // Create a reference under the ingredient for this config
          // Use config ID as reference ID for uniqueness
          const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', configId);
          batch.set(referenceRef, {
            name: metadata.name,
            healthSystem: metadata.healthSystem,
            domain: metadata.domain,
            subdomain: metadata.subdomain,
            version: metadata.version,
            populationType: versionToPopulationType(metadata.version),
            configId: configId,
            sections: sections, // Populated from the imported data
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid
          });
        }
        
        // Also store in the importedConfigs subcollection for reference
        configData.INGREDIENT.forEach((ingredient, index) => {
          const ingredientRef = doc(collection(db, 'importedConfigs', configId, 'ingredients'));
          batch.set(ingredientRef, {
            ...ingredient,
            index: index, // Preserve original order
            configId: configId
          });
        });
        
        console.log('DEBUG: About to commit batch...');
        await batch.commit();
        console.log('DEBUG: Batch committed successfully');
        
        // Verify what was actually written
        console.log('DEBUG: Verifying ingredients after batch commit...');
        const verifySnapshot = await getDocs(collection(db, COLLECTIONS.INGREDIENTS));
        const ingredientIds = verifySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        console.log('DEBUG: Current ingredients in database:', ingredientIds);
        
        // Check specifically for some of the ingredients we just processed
        console.log('DEBUG: Checking specific ingredients...');
        const testIngredients = ['heparin', 'sodium', 'potassium', 'calcium'];
        for (const testId of testIngredients) {
          const testDoc = await getDoc(doc(db, COLLECTIONS.INGREDIENTS, testId));
          console.log(`DEBUG: Ingredient "${testId}" exists: ${testDoc.exists()}, data:`, testDoc.exists() ? testDoc.data() : 'N/A');
        }
      }
      
      // Log the import action
      await auditService.logAction('CONFIG_IMPORTED', {
        configId: configId,
        name: metadata.name,
        healthSystem: metadata.healthSystem,
        ingredientCount: configData.INGREDIENT?.length || 0
      });
      
      return configId;
    } catch (error) {
      console.error('Error saving imported config:', error);
      throw error;
    }
  },
  
  // Get all imported configs
  async getAllConfigs() {
    try {
      const q = query(
        collection(db, 'importedConfigs'),
        orderBy('importedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching configs:', error);
      throw error;
    }
  },
  
  // Get ingredients for a specific config
  async getConfigIngredients(configId) {
    try {
      const q = query(
        collection(db, 'importedConfigs', configId, 'ingredients'),
        orderBy('index', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching config ingredients:', error);
      throw error;
    }
  },
  
  // Get configs by health system
  async getConfigsByHealthSystem(healthSystem) {
    try {
      const q = query(
        collection(db, 'importedConfigs'),
        where('healthSystem', '==', healthSystem),
        orderBy('importedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching configs by health system:', error);
      throw error;
    }
  },
  
  // Delete a config and all its ingredients
  async deleteConfig(configId) {
    try {
      // First delete all ingredients in the subcollection
      const ingredientsSnapshot = await getDocs(
        collection(db, 'importedConfigs', configId, 'ingredients')
      );
      
      const batch = writeBatch(db);
      ingredientsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the main config document
      batch.delete(doc(db, 'importedConfigs', configId));
      
      await batch.commit();
      
      // Log the deletion
      await auditService.logAction('CONFIG_DELETED', { configId });
    } catch (error) {
      console.error('Error deleting config:', error);
      throw error;
    }
  },
  
  // Migrate existing imported configs to ingredients collection
  async migrateExistingConfigs() {
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const configs = await this.getAllConfigs();
      let totalIngredients = 0;
      let totalReferences = 0;
      
      for (const config of configs) {
        const configIngredients = await this.getConfigIngredients(config.id);
        const batch = writeBatch(db);
        const processedIngredients = new Map();
        
        // Process each ingredient in the config
        configIngredients.forEach((ingredientData) => {
          const name = ingredientData.KEYNAME || ingredientData.Ingredient || ingredientData.name;
          if (name && !processedIngredients.has(name)) {
            processedIngredients.set(name, {
              name: name,
              category: getKeyCategory(name) || 'OTHER',
              description: ingredientData.DISPLAY || ingredientData.Description || '',
              unit: ingredientData.Unit || '',
              type: ingredientData.TYPE || '',
              configSources: [config.id]
            });
          }
        });
        
        // Create or update ingredients in the main collection
        for (const [name, ingredientInfo] of processedIngredients) {
          // Use normalized name as ingredient ID
          const ingredientId = normalizeIngredientId(name);
          const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
          
          // Check if ingredient already exists
          const existingIngredient = await getDoc(ingredientRef);
          
          if (!existingIngredient.exists()) {
            // Create new ingredient
            batch.set(ingredientRef, {
              ...ingredientInfo,
              id: ingredientId,
              createdAt: serverTimestamp(),
              createdBy: user.uid,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            });
            totalIngredients++;
          } else {
            // Update existing ingredient
            const existingData = existingIngredient.data();
            batch.update(ingredientRef, {
              configSources: arrayUnion(config.id),
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
              description: existingData.description || ingredientInfo.description
            });
          }
          
          // Check if reference already exists for this config
          const refQuery = query(
            collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references'),
            where('configId', '==', config.id)
          );
          const existingRefs = await getDocs(refQuery);
          
          if (existingRefs.empty) {
            // Find the matching ingredient data to get its notes
            const matchingIngredientData = configIngredients.find(ing => {
              const ingName = ing.KEYNAME || ing.Ingredient || ing.name;
              return ingName === name;
            });
            
            // Convert notes to sections if available
            let sections = [];
            if (matchingIngredientData && matchingIngredientData.notes) {
              sections = convertNotesToSections(matchingIngredientData.notes);
            }
            
            // Create a reference under the ingredient for this config
            // Use config ID as reference ID for uniqueness and readability
            const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', config.id);
            batch.set(referenceRef, {
              name: config.name,
              healthSystem: config.healthSystem,
              domain: config.domain,
              subdomain: config.subdomain,
              version: config.version,
              populationType: versionToPopulationType(config.version),
              configId: config.id,
              sections: sections, // Populated from the imported data
              createdAt: serverTimestamp(),
              createdBy: user.uid,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            });
            totalReferences++;
          }
        }
        
        await batch.commit();
      }
      
      console.log(`Migration complete: ${totalIngredients} new ingredients, ${totalReferences} new references`);
      return { totalIngredients, totalReferences, totalConfigs: configs.length };
    } catch (error) {
      console.error('Error migrating configs:', error);
      throw error;
    }
  }
};

// Audit logging
export const auditService = {
  async logAction(action, details) {
    try {
      const user = getCurrentUser();
      await addDoc(collection(db, COLLECTIONS.AUDIT_LOG), {
        action,
        details,
        userId: user?.uid || 'anonymous',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  }
};