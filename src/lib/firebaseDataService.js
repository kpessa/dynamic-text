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

// Ingredient service
export const ingredientService = {
  // Create or update an ingredient
  async saveIngredient(ingredientData) {
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      const ingredientRef = ingredientData.id 
        ? doc(db, COLLECTIONS.INGREDIENTS, ingredientData.id)
        : doc(collection(db, COLLECTIONS.INGREDIENTS));
      
      const data = {
        ...ingredientData,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      
      if (!ingredientData.id) {
        data.createdAt = serverTimestamp();
        data.createdBy = user.uid;
      }
      
      await setDoc(ingredientRef, data);
      return ingredientRef.id;
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
      
      const referenceRef = referenceData.id
        ? doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceData.id)
        : doc(collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references'));
      
      const data = {
        ...referenceData,
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
      
      return referenceRef.id;
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
          const ingredientId = doc(collection(db, COLLECTIONS.INGREDIENTS)).id;
          ingredientMap.set(reference.ingredient, ingredientId);
          
          batch.set(doc(db, COLLECTIONS.INGREDIENTS, ingredientId), {
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
          const referenceId = doc(collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references')).id;
          
          batch.set(doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId), {
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
      
      // Create the main config document
      const configRef = await addDoc(collection(db, 'importedConfigs'), {
        name: metadata.name || 'Unnamed Config',
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
          const name = ingredientData.KEYNAME || ingredientData.Ingredient || ingredientData.name;
          if (name && !processedIngredients.has(name)) {
            processedIngredients.set(name, {
              name: name,
              category: getKeyCategory(name) || 'OTHER',
              description: ingredientData.DISPLAY || ingredientData.Description || '',
              unit: ingredientData.Unit || '',
              type: ingredientData.TYPE || '',
              configSources: [configRef.id]
            });
          }
        });
        
        console.log(`Processing ${processedIngredients.size} unique ingredients from config ${metadata.name}`);
        
        // Create or update ingredients in the main collection
        for (const [name, ingredientInfo] of processedIngredients) {
          // Check if ingredient already exists
          const ingredientQuery = query(
            collection(db, COLLECTIONS.INGREDIENTS),
            where('name', '==', name)
          );
          const existingIngredients = await getDocs(ingredientQuery);
          
          let ingredientId;
          if (existingIngredients.empty) {
            // Create new ingredient
            const newIngredientRef = doc(collection(db, COLLECTIONS.INGREDIENTS));
            ingredientId = newIngredientRef.id;
            batch.set(newIngredientRef, {
              ...ingredientInfo,
              createdAt: serverTimestamp(),
              createdBy: user.uid,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            });
            console.log(`Creating new ingredient: ${name} (${ingredientInfo.category})`);
          } else {
            // Update existing ingredient
            ingredientId = existingIngredients.docs[0].id;
            const existingData = existingIngredients.docs[0].data();
            batch.update(doc(db, COLLECTIONS.INGREDIENTS, ingredientId), {
              configSources: arrayUnion(configRef.id),
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
              // Update description if it was empty
              description: existingData.description || ingredientInfo.description
            });
          }
          
          // Create a reference under the ingredient for this config
          const referenceRef = doc(collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references'));
          batch.set(referenceRef, {
            name: metadata.name,
            healthSystem: metadata.healthSystem,
            domain: metadata.domain,
            subdomain: metadata.subdomain,
            version: metadata.version,
            populationType: POPULATION_TYPES.ADULT, // Default, can be updated later
            configId: configRef.id,
            sections: [], // Will be populated from the imported data
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid
          });
        }
        
        // Also store in the importedConfigs subcollection for reference
        configData.INGREDIENT.forEach((ingredient, index) => {
          const ingredientRef = doc(collection(db, 'importedConfigs', configRef.id, 'ingredients'));
          batch.set(ingredientRef, {
            ...ingredient,
            index: index, // Preserve original order
            configId: configRef.id
          });
        });
        
        await batch.commit();
      }
      
      // Log the import action
      await auditService.logAction('CONFIG_IMPORTED', {
        configId: configRef.id,
        name: metadata.name,
        healthSystem: metadata.healthSystem,
        ingredientCount: configData.INGREDIENT?.length || 0
      });
      
      return configRef.id;
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
          // Check if ingredient already exists
          const ingredientQuery = query(
            collection(db, COLLECTIONS.INGREDIENTS),
            where('name', '==', name)
          );
          const existingIngredients = await getDocs(ingredientQuery);
          
          let ingredientId;
          if (existingIngredients.empty) {
            // Create new ingredient
            const newIngredientRef = doc(collection(db, COLLECTIONS.INGREDIENTS));
            ingredientId = newIngredientRef.id;
            batch.set(newIngredientRef, {
              ...ingredientInfo,
              createdAt: serverTimestamp(),
              createdBy: user.uid,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            });
            totalIngredients++;
          } else {
            // Update existing ingredient
            ingredientId = existingIngredients.docs[0].id;
            const existingData = existingIngredients.docs[0].data();
            batch.update(doc(db, COLLECTIONS.INGREDIENTS, ingredientId), {
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
            // Create a reference under the ingredient for this config
            const referenceRef = doc(collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references'));
            batch.set(referenceRef, {
              name: config.name,
              healthSystem: config.healthSystem,
              domain: config.domain,
              subdomain: config.subdomain,
              version: config.version,
              populationType: POPULATION_TYPES.ADULT,
              configId: config.id,
              sections: [],
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