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
  increment,
} from 'firebase/firestore';
import { db, COLLECTIONS, getCurrentUser, signInAnonymouslyUser } from './firebase';
import { getKeyCategory } from './tpnLegacy.js';
import { generateIngredientHash, findDuplicates } from './contentHashing';
import { getPreferences } from './preferencesService.js';
import { getSharedIngredientByHash } from './sharedIngredientService.js';
import type {
  PopulationType,
  IngredientData,
  ReferenceData,
  FirebaseTimestamp,
  Section,
  NoteItem
} from './types.js';

// Import and re-export population types from types.js
import { POPULATION_TYPES } from './types.js';
export { POPULATION_TYPES };

// Helper functions for ID normalization
// Convert camelCase or PascalCase to proper spaced name
export function formatIngredientName(name: string): string {
  if (!name) return '';
  
  // First, check if it contains known patterns that need special handling
  const namePatterns = [
    // Pediatric variations
    { pattern: /^Pediatric(.+)$/i, replacement: 'Pediatric $1' },
    { pattern: /^Ped(.+)$/i, replacement: 'Ped $1' },
    { pattern: /^Adult(.+)$/i, replacement: 'Adult $1' },
    { pattern: /^Neonatal(.+)$/i, replacement: 'Neonatal $1' },
    
    // Common compound patterns
    { pattern: /(.+)Chloride$/i, replacement: '$1 Chloride' },
    { pattern: /(.+)Acetate$/i, replacement: '$1 Acetate' },
    { pattern: /(.+)Phosphate$/i, replacement: '$1 Phosphate' },
    { pattern: /(.+)Gluconate$/i, replacement: '$1 Gluconate' },
    { pattern: /(.+)Sulfate$/i, replacement: '$1 Sulfate' },
    
    // Vitamin patterns
    { pattern: /^Multi[-]?Vitamin$/i, replacement: 'Multi Vitamin' },
    { pattern: /^Vitamin(.+)$/i, replacement: 'Vitamin $1' },
    
    // Trace patterns
    { pattern: /^Trace[-]?Elements?$/i, replacement: 'Trace Elements' },
    { pattern: /^Trace[-]?(\d+[A-Z]?)$/i, replacement: 'Trace $1' },
  ];
  
  // Apply patterns
  let formatted = name;
  for (const { pattern, replacement } of namePatterns) {
    if (pattern.test(name)) {
      formatted = name.replace(pattern, replacement);
      break; // Use first matching pattern
    }
  }
  
  // Handle specific patterns that weren't caught by regex
  const specialCases = {
    // Brand names and special items
    'Multrys': 'Multrys',
    'Tralement': 'Tralement',
    'PedTE': 'PedTE',
    'MVI': 'MVI',
    'TPN': 'TPN',
    
    // Common abbreviations
    'AscorbicAcid': 'Ascorbic Acid',
    'AminoAcids': 'Amino Acids',
    'FolicAcid': 'Folic Acid',
    
    // Already handled by patterns but kept for backward compatibility
    'PotassiumChloride': 'Potassium Chloride',
    'CalciumGluconate': 'Calcium Gluconate',
    'MagnesiumSulfate': 'Magnesium Sulfate',
  };
  
  // Check if it's a special case (check original name)
  if (name in specialCases) {
    return specialCases[name as keyof typeof specialCases];
  }
  
  // If no pattern matched, try camelCase conversion
  if (formatted === name) {
    // Convert camelCase/PascalCase to spaced format
    formatted = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  
  return formatted;
}

// Validate if a string is a valid Firestore document ID
function isValidFirestoreId(id: string): boolean {
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

export function normalizeIngredientId(name: string): string {
  if (!name || typeof name !== 'string') {
    console.warn('normalizeIngredientId called with invalid name:', name);
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

export function normalizeConfigId(healthSystem: string, domain: string, subdomain: string, version: string): string {
  const parts = [healthSystem, domain, subdomain, version]
    .filter(Boolean) // Remove empty values
    .map(part => part.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return parts.join('-');
}

export function generateReferenceId(referenceData: Partial<ReferenceData>): string {
  // Generate a meaningful reference ID based on health system and population type
  const parts = [
    referenceData.healthSystem,
    referenceData.domain,
    referenceData.subdomain,
    referenceData.populationType || referenceData.version
  ].filter(Boolean).map(part => part!.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  
  return parts.join('-');
}

// Helper function to map version names to population types
export function versionToPopulationType(version?: string): PopulationType {
  const mapping: Record<string, PopulationType> = {
    'neonatal': POPULATION_TYPES.NEO,
    'child': POPULATION_TYPES.CHILD,
    'pediatric': POPULATION_TYPES.CHILD,
    'adolescent': POPULATION_TYPES.ADOLESCENT,
    'adult': POPULATION_TYPES.ADULT
  };
  
  return mapping[version?.toLowerCase() || ''] || POPULATION_TYPES.ADULT;
}

// Convert clinical notes TEXT to sections format
function convertNotesToSections(notes?: NoteItem[]): Section[] {
  if (!notes || !Array.isArray(notes)) {
    return [];
  }
  
  const sections: Section[] = [];
  let currentStaticContent = '';
  let inDynamicBlock = false;
  let dynamicContent = '';
  let dynamicStarted = false;
  let sectionId = 1;
  
  notes.forEach(note => {
    if (!note.TEXT) return;
    
    const text = note.TEXT;
    
    // Check if this is the start of a dynamic block
    if (text.includes('[f(')) {
      // First, save any accumulated static content as a single section
      if (currentStaticContent.trim() && !dynamicStarted) {
        sections.push({ 
          id: sectionId++,
          type: 'static', 
          content: currentStaticContent.trim(),
          testCases: [] 
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
                content: beforeText.trim(),
                testCases: [] 
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
                content: remainingText.trim(),
                testCases: [] 
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
      content: currentStaticContent.trim(),
      testCases: [] 
    });
  }
  
  return sections;
}

// Ingredient service
export const ingredientService = {
  // Create or update an ingredient with version tracking
  async saveIngredient(ingredientData: IngredientData, commitMessage: string | null = null): Promise<string> {
    try {
      if (!db) throw new Error('Firebase not initialized');
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      // Use normalized ingredient name as ID
      const ingredientId = ingredientData.id || normalizeIngredientId(ingredientData.name);
      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
      
      // Get current document to check version
      const currentDoc = await getDoc(ingredientRef);
      const currentVersion = currentDoc.exists() ? (currentDoc.data()?.['version'] || 0) : 0;
      
      const data: IngredientData = {
        ...ingredientData,
        name: ingredientData.name, // IMPORTANT: Explicitly preserve original name with parentheses
        id: ingredientId, // Ensure ID is stored in the document
        version: currentVersion + 1,
        lastModified: serverTimestamp() as unknown as FirebaseTimestamp,
        modifiedBy: user.uid,
        contentHash: generateIngredientHash(ingredientData), // Add content hash
        commitMessage: commitMessage || null, // Store commit message if provided
        // Keep legacy fields for compatibility
        updatedAt: serverTimestamp() as unknown as FirebaseTimestamp,
        updatedBy: user.uid
      };
      
      if (!ingredientData.id || !currentDoc.exists()) {
        data.createdAt = serverTimestamp() as unknown as FirebaseTimestamp;
        data.createdBy = user.uid;
        data.version = 1;
      }
      
      // Save current version to history before updating
      if (currentDoc.exists() && currentDoc.data()) {
        await this.saveVersionHistory(ingredientId, {
          ...currentDoc.data() as IngredientData,
          commitMessage: (currentDoc.data() as IngredientData).commitMessage || null
        });
      }
      
      await setDoc(ingredientRef, data);
      return ingredientId;
    } catch (error) {
      console.error('Error saving ingredient:', error);
      throw error;
    }
  },
  
  // Save version history
  async saveVersionHistory(ingredientId: string, versionData: IngredientData): Promise<void> {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const versionRef = doc(
        collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'versions')
      );
      
      await setDoc(versionRef, {
        ...versionData,
        versionNumber: versionData.version || 1,
        archivedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving version history:', error);
      // Don't throw - version history is not critical
    }
  },
  
  // Get version history for an ingredient
  async getVersionHistory(ingredientId: string): Promise<IngredientData[]> {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const q = query(
        collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'versions'),
        orderBy('versionNumber', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as IngredientData[];
    } catch (error) {
      console.error('Error fetching version history:', error);
      return [];
    }
  },
  
  // Get all ingredients
  async getAllIngredients() {
    if (!db) throw new Error('Firebase not initialized');
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
  async getIngredientsByCategory(category: string) {
    if (!db) throw new Error('Firebase not initialized');
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
  subscribeToIngredients(callback: (ingredients: any[]) => void) {
    if (!db) throw new Error('Firebase not initialized');
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
  },

  // Clear all ingredients (use with caution!)
  async clearAllIngredients() {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.INGREDIENTS));
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted ${snapshot.docs.length} ingredients`);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error clearing ingredients:', error);
      throw error;
    }
  },

  // Fix ingredient categories
  async fixIngredientCategories() {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const ingredients = await this.getAllIngredients();
      const batch = writeBatch(db);
      let fixedCount = 0;
      
      for (const ingredient of ingredients) {
        const correctCategory = getKeyCategory(ingredient.name);
        if (correctCategory && ingredient.category !== correctCategory) {
          const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredient.id);
          batch.update(ingredientRef, {
            category: correctCategory,
            lastModified: serverTimestamp(),
            modifiedBy: user.uid
          });
          fixedCount++;
          console.log(`Fixed category for ${ingredient.name}: ${ingredient.category} -> ${correctCategory}`);
        }
      }
      
      if (fixedCount > 0) {
        await batch.commit();
        console.log(`Fixed categories for ${fixedCount} ingredients`);
      }
      
      return fixedCount;
    } catch (error) {
      console.error('Error fixing ingredient categories:', error);
      throw error;
    }
  },

  // Fix ingredients that have lost their parentheses
  async fixIngredientsWithParentheses() {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const batch = writeBatch(db);
      let fixedCount = 0;
      
      // Common ingredient patterns that should have parentheses
      const parenthesesPatterns = [
        { id: 'amino-acids-trophamine', name: 'Amino Acids (Trophamine)' },
        { id: 'amino-acids-premasol', name: 'Amino Acids (Premasol)' },
        { id: 'trace-elements-pedte', name: 'Trace Elements (PedTE)' },
        { id: 'trace-elements-ped', name: 'Trace Elements (Ped)' },
        { id: 'vitamins-mv-ped', name: 'Vitamins (MV Ped)' },
        { id: 'lipids-intralipid', name: 'Lipids (Intralipid)' },
        { id: 'lipids-smof', name: 'Lipids (SMOF)' },
        { id: 'calcium-gluconate', name: 'Calcium (Gluconate)' },
        { id: 'magnesium-sulfate', name: 'Magnesium (Sulfate)' },
        { id: 'sodium-chloride', name: 'Sodium (Chloride)' },
        { id: 'sodium-phosphate', name: 'Sodium (Phosphate)' },
        { id: 'potassium-chloride', name: 'Potassium (Chloride)' },
        { id: 'potassium-phosphate', name: 'Potassium (Phosphate)' }
      ];
      
      for (const pattern of parenthesesPatterns) {
        const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, pattern.id);
        const ingredientDoc = await getDoc(ingredientRef);
        
        if (ingredientDoc.exists()) {
          const data = ingredientDoc.data();
          // Only fix if the name doesn't already have parentheses
          if (data.name && !data.name.includes('(')) {
            batch.update(ingredientRef, {
              name: pattern.name,
              lastModified: serverTimestamp(),
              modifiedBy: user.uid
            });
            fixedCount++;
            console.log(`Fixed ingredient: ${pattern.id} -> ${pattern.name}`);
          }
        }
      }
      
      if (fixedCount > 0) {
        await batch.commit();
        console.log(`Fixed ${fixedCount} ingredients with missing parentheses`);
      }
      
      return fixedCount;
    } catch (error) {
      console.error('Error fixing ingredients:', error);
      throw error;
    }
  }
};

// Reference service (nested under ingredients)
export const referenceService = {
  // Save a reference under an ingredient with version tracking
  async saveReference(ingredientId: string, referenceData: any, commitMessage: string | null = null) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      // Generate meaningful reference ID if not provided
      const referenceId = referenceData.id || generateReferenceId(referenceData);
      const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId);
      
      // Get current document to check version
      const currentDoc = await getDoc(referenceRef);
      const currentVersion = currentDoc.exists() ? (currentDoc.data()?.['version'] || 0) : 0;
      
      const data = {
        ...referenceData,
        id: referenceId,
        ingredientId,
        version: currentVersion + 1,
        lastModified: serverTimestamp(),
        modifiedBy: user.uid,
        contentHash: generateIngredientHash(referenceData), // Add content hash
        commitMessage: commitMessage || null, // Store commit message if provided
        // Preserve validation data if it exists
        validationStatus: referenceData.validationStatus || currentDoc.data()?.validationStatus || 'untested',
        validationNotes: referenceData.validationNotes || currentDoc.data()?.validationNotes || '',
        validatedBy: referenceData.validatedBy || currentDoc.data()?.validatedBy || null,
        validatedAt: referenceData.validatedAt || currentDoc.data()?.validatedAt || null,
        testResults: referenceData.testResults || currentDoc.data()?.testResults || null,
        // Keep legacy fields for compatibility
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      
      if (!referenceData.id || !currentDoc.exists()) {
        data.createdAt = serverTimestamp();
        data.createdBy = user.uid;
        data.version = 1;
      }
      
      // Save current version to history before updating
      if (currentDoc.exists() && currentDoc.data()) {
        await this.saveReferenceVersionHistory(ingredientId, referenceId, {
          ...currentDoc.data(),
          commitMessage: currentDoc.data().commitMessage || null
        });
      }
      
      await setDoc(referenceRef, data);
      
      // Update ingredient's lastModified and increment its version
      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
      const ingredientDoc = await getDoc(ingredientRef);
      const ingredientVersion = ingredientDoc.exists() ? (ingredientDoc.data().version || 0) : 0;
      
      await updateDoc(ingredientRef, {
        lastReferenceUpdate: serverTimestamp(),
        referenceCount: increment(referenceData.id ? 0 : 1),
        version: ingredientVersion + 1,
        lastModified: serverTimestamp(),
        modifiedBy: user.uid
      });
      
      return referenceId;
    } catch (error) {
      console.error('Error saving reference:', error);
      throw error;
    }
  },
  
  // Save reference version history
  async saveReferenceVersionHistory(ingredientId: string, referenceId: string, versionData: any) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const versionRef = doc(
        collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId, 'versions')
      );
      
      await setDoc(versionRef, {
        ...versionData,
        versionNumber: versionData.version || 1,
        archivedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving reference version history:', error);
      // Don't throw - version history is not critical
    }
  },
  
  // Get version history for a reference
  async getReferenceVersionHistory(ingredientId: string, referenceId: string) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const q = query(
        collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId, 'versions'),
        orderBy('versionNumber', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching reference version history:', error);
      return [];
    }
  },
  
  // Get all references for an ingredient
  async getReferencesForIngredient(ingredientId: string) {
    if (!db) throw new Error('Firebase not initialized');
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
  
  // Update validation status for a reference
  async updateReferenceValidation(ingredientId: string, referenceId: string, validationData: any) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId);
      
      await updateDoc(referenceRef, {
        validationStatus: validationData.status,
        validationNotes: validationData.notes || '',
        validatedBy: validationData.validatedBy || user.uid,
        validatedAt: validationData.validatedAt || serverTimestamp(),
        testResults: validationData.testResults || null,
        lastModified: serverTimestamp(),
        modifiedBy: user.uid
      });
      
      return true;
    } catch (error) {
      console.error('Error updating validation status:', error);
      throw error;
    }
  },

  // Get references by population type
  async getReferencesByPopulation(ingredientId: string, populationType: string) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      // Handle child/pediatric mapping
      const searchTypes = [populationType];
      if (populationType === 'child') {
        searchTypes.push('pediatric');
      } else if (populationType === 'pediatric') {
        searchTypes.push('child');
      }
      
      const q = query(
        collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references'),
        where('populationType', 'in', searchTypes)
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
  async getReferencesForComparison(ingredientId: string, healthSystem: string | null = null) {
    if (!db) throw new Error('Firebase not initialized');
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
  async deleteReference(ingredientId: string, referenceId: string) {
    if (!db) throw new Error('Firebase not initialized');
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
  async migrateFromLocalStorage(localStorageData: any) {
    if (!db) throw new Error('Firebase not initialized');
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
    if (!db) throw new Error('Firebase not initialized');
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
  async addHealthSystem(name: string) {
    if (!db) throw new Error('Firebase not initialized');
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
  async getDomains(healthSystemId: string) {
    if (!db) throw new Error('Firebase not initialized');
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
  // Phase 3.2: Detect duplicates before import
  async detectDuplicatesBeforeImport(configData: any) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const report = {
        duplicatesFound: [],
        identicalIngredients: [],
        variations: [],
        totalChecked: 0
      };
      
      if (!configData.INGREDIENT || configData.INGREDIENT.length === 0) {
        return report;
      }
      
      report.totalChecked = configData.INGREDIENT.length;
      
      // Get all existing ingredients
      const existingSnapshot = await getDocs(collection(db, COLLECTIONS.INGREDIENTS));
      const existingIngredients = new Map();
      
      existingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        existingIngredients.set(doc.id, data);
      });
      
      // Check each ingredient in the import for duplicates
      for (const importIngredient of configData.INGREDIENT) {
        const name = importIngredient.KEYNAME || importIngredient.keyname || 
                    importIngredient.Ingredient || importIngredient.ingredient || 
                    importIngredient.name;
        
        if (!name) continue;
        
        const ingredientId = normalizeIngredientId(name);
        const existingIngredient = existingIngredients.get(ingredientId);
        
        if (existingIngredient) {
          // Ingredient exists - check if it's identical
          const importHash = generateIngredientHash({
            NOTE: importIngredient.NOTE || importIngredient.notes
          });
          const existingHash = existingIngredient.contentHash || generateIngredientHash(existingIngredient);
          
          if (importHash && existingHash && importHash === existingHash) {
            report.identicalIngredients.push({
              name,
              ingredientId,
              hash: importHash,
              existingConfigs: existingIngredient.configSources || []
            });
          } else {
            report.variations.push({
              name,
              ingredientId,
              importHash,
              existingHash,
              existingConfigs: existingIngredient.configSources || []
            });
          }
        }
      }
      
      // Find duplicates within the import itself
      const importDuplicates = findDuplicates(configData.INGREDIENT.map(ing => ({
        NOTE: ing.NOTE || ing.notes,
        name: ing.KEYNAME || ing.keyname || ing.Ingredient || ing.ingredient || ing.name
      })));
      
      Object.entries(importDuplicates).forEach(([hash, ingredients]) => {
        report.duplicatesFound.push({
          hash,
          count: ingredients.length,
          ingredients: ingredients.map(ing => 
            ing.name || ing.KEYNAME || ing.keyname || ing.Ingredient || ing.ingredient || 'Unknown'
          )
        });
      });
      
      return report;
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      return {
        duplicatesFound: [],
        identicalIngredients: [],
        variations: [],
        totalChecked: 0,
        error: error.message
      };
    }
  },
  
  // Save an imported config with all ingredient data
  // Phase 2.1: Now preserves original imports as immutable baseline
  // Phase 3.2: Now includes duplicate detection
  async saveImportedConfig(configData: any, metadata: any) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      // Phase 3.2: Detect duplicates before import
      const duplicateReport = await this.detectDuplicatesBeforeImport(configData);
      
      // Phase 3.6: Check for auto-deduplication preference
      const preferences = getPreferences();
      let autoDedupeActions = [];
      
      if (preferences.autoDeduplicateOnImport && duplicateReport.identicalIngredients.length > 0) {
        // Prepare auto-deduplication actions
        for (const identical of duplicateReport.identicalIngredients) {
          autoDedupeActions.push({
            ingredientId: identical.ingredientId,
            name: identical.name,
            hash: identical.hash,
            existingConfigs: identical.existingConfigs,
            action: 'link' // Will link to existing shared ingredient
          });
        }
        
        // Add to duplicate report for display
        duplicateReport.autoDedupeActions = autoDedupeActions;
        duplicateReport.autoDedupeEnabled = true;
      }
      
      // Generate meaningful config ID
      const configId = normalizeConfigId(
        metadata.healthSystem,
        metadata.domain,
        metadata.subdomain,
        metadata.version
      );
      
      // Phase 2.1: Store original import as immutable baseline
      const baselineRef = doc(db, 'baselineConfigs', configId);
      const baselineExists = await getDoc(baselineRef);
      
      // Only save baseline if it doesn't exist (preserve original)
      if (!baselineExists.exists()) {
        await setDoc(baselineRef, {
          name: metadata.name || configId,
          healthSystem: metadata.healthSystem,
          domain: metadata.domain,
          subdomain: metadata.subdomain,
          version: metadata.version,
          ingredientCount: configData.INGREDIENT?.length || 0,
          importedAt: serverTimestamp(),
          importedBy: user.uid,
          metadata: metadata,
          isBaseline: true,  // Mark as baseline
          originalData: configData  // Store complete original data
        });
      }
      
      // Keep backward compatibility: still create the importedConfigs document
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
        metadata: metadata,
        baselineId: configId  // Link to baseline
      });
      
      // Include duplicate report in the import process
      const importStats = {
        totalIngredients: 0,
        newIngredients: 0,
        updatedIngredients: 0,
        duplicatesFound: duplicateReport.duplicatesFound.length,
        identicalIngredients: duplicateReport.identicalIngredients.length
      };
      
      // Store each ingredient in a subcollection and create/update main ingredients
      if (configData.INGREDIENT && configData.INGREDIENT.length > 0) {
        const batch = writeBatch(db);
        const processedIngredients = new Map(); // Track unique ingredients
        
        importStats.totalIngredients = configData.INGREDIENT.length;
        
        // Phase 2.1: Store baseline ingredients (only if baseline doesn't exist)
        if (!baselineExists.exists()) {
          configData.INGREDIENT.forEach((ingredient, index) => {
            const baselineIngredientRef = doc(collection(db, 'baselineConfigs', configId, 'ingredients'));
            batch.set(baselineIngredientRef, {
              ...ingredient,
              index: index,
              configId: configId,
              isBaseline: true
            });
          });
        }
        
        // Phase 3.6: Pre-process auto-deduplication data
        const autoDedupeMap = new Map();
        if (autoDedupeActions.length > 0) {
          for (const action of autoDedupeActions) {
            const sharedIngredient = await getSharedIngredientByHash(action.hash);
            autoDedupeMap.set(action.ingredientId, {
              ...action,
              sharedIngredient
            });
          }
        }
        
        // First, identify unique ingredients and their data
        configData.INGREDIENT.forEach((ingredientData) => {
          // Handle both uppercase and lowercase property names
          const rawName = ingredientData.KEYNAME || ingredientData.keyname || 
                         ingredientData.Ingredient || ingredientData.ingredient || 
                         ingredientData.name;
          
          if (rawName) {
            // Format the name properly (e.g., "PotassiumChloride" -> "Potassium Chloride")
            const name = formatIngredientName(rawName);
            
            if (!processedIngredients.has(name)) {
              processedIngredients.set(name, {
                name: name,  // Properly formatted name
                category: getKeyCategory(name) || 'OTHER',
                description: ingredientData.DISPLAY || ingredientData.display || 
                            ingredientData.Description || ingredientData.description || '',
                unit: ingredientData.Unit || ingredientData.unit || '',
                type: ingredientData.TYPE || ingredientData.type || '',
                configSources: [configId]
              });
            }
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
            importStats.newIngredients++;
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
            importStats.updatedIngredients++;
          }
          
          // Find the matching ingredient data to get its notes
          const matchingIngredientData = configData.INGREDIENT.find(ing => {
            const rawIngName = ing.KEYNAME || ing.keyname || 
                              ing.Ingredient || ing.ingredient || 
                              ing.name;
            const formattedIngName = formatIngredientName(rawIngName);
            return formattedIngName === name;
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
          
          // Check if this ingredient should be auto-deduplicated
          let referenceData = {
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
          };
          
          // Phase 3.6: Apply auto-deduplication if enabled
          const autoDedupeData = autoDedupeMap.get(ingredientId);
          if (autoDedupeData) {
            // This ingredient is identical to an existing one and should be linked
            if (autoDedupeData.sharedIngredient) {
              // Link to existing shared ingredient
              referenceData.sharedIngredientId = autoDedupeData.sharedIngredient.id;
              referenceData.isShared = true;
              referenceData.sharedAt = serverTimestamp();
              referenceData.autoDeduped = true;
              importStats.autoDeduped = (importStats.autoDeduped || 0) + 1;
            } else {
              // Create new shared ingredient with this as the first reference
              // This is the first time we're seeing this content
              const contentHash = generateIngredientHash({ sections });
              referenceData.contentHash = contentHash;
            }
          }
          
          batch.set(referenceRef, referenceData);
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
      
      // Log the import action with stats
      await auditService.logAction('CONFIG_IMPORTED', {
        configId: configId,
        name: metadata.name,
        healthSystem: metadata.healthSystem,
        ingredientCount: configData.INGREDIENT?.length || 0,
        importStats: importStats
      });
      
      return {
        configId,
        duplicateReport,
        importStats
      };
    } catch (error) {
      console.error('Error saving imported config:', error);
      throw error;
    }
  },
  
  // Get all imported configs
  async getAllConfigs() {
    if (!db) throw new Error('Firebase not initialized');
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
  async getConfigIngredients(configId: string) {
    if (!db) throw new Error('Firebase not initialized');
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
  async getConfigsByHealthSystem(healthSystem: string) {
    if (!db) throw new Error('Firebase not initialized');
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
  async deleteConfig(configId: string) {
    if (!db) throw new Error('Firebase not initialized');
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
  
  // Phase 2.1: Get baseline config data (immutable original)
  async getBaselineConfig(configId: string) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const baselineDoc = await getDoc(doc(db, 'baselineConfigs', configId));
      if (!baselineDoc.exists()) {
        return null;
      }
      return {
        id: baselineDoc.id,
        ...baselineDoc.data()
      };
    } catch (error) {
      console.error('Error fetching baseline config:', error);
      return null;
    }
  },
  
  // Phase 2.1: Get baseline ingredients for a config
  async getBaselineIngredients(configId: string) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const q = query(
        collection(db, 'baselineConfigs', configId, 'ingredients'),
        orderBy('index', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching baseline ingredients:', error);
      return [];
    }
  },
  
  // Phase 2.3: Compare working config with baseline to detect modifications
  async compareWithBaseline(configId: string, ingredientName: string) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      // Get baseline ingredient data
      const baselineIngredients = await this.getBaselineIngredients(configId);
      const baselineIngredient = baselineIngredients.find(ing => {
        const name = ing.KEYNAME || ing.keyname || ing.Ingredient || ing.ingredient || ing.name;
        return name === ingredientName;
      });
      
      if (!baselineIngredient) {
        return { status: 'NEW', differences: null };
      }
      
      // Get current working ingredient data
      const ingredientId = normalizeIngredientId(ingredientName);
      const referenceDoc = await getDoc(
        doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', configId)
      );
      
      if (!referenceDoc.exists()) {
        return { status: 'DELETED', differences: null };
      }
      
      const workingData = referenceDoc.data();
      
      // Compare sections (working) with NOTE (baseline)
      const baselineSections = convertNotesToSections(baselineIngredient.NOTE || baselineIngredient.notes || []);
      const workingSections = workingData.sections || [];
      
      // Simple comparison - could be enhanced with deep diff
      const sectionsMatch = JSON.stringify(baselineSections) === JSON.stringify(workingSections);
      
      return {
        status: sectionsMatch ? 'CLEAN' : 'MODIFIED',
        differences: sectionsMatch ? null : {
          baseline: baselineSections,
          working: workingSections
        }
      };
    } catch (error) {
      console.error('Error comparing with baseline:', error);
      return { status: 'ERROR', differences: null };
    }
  },
  
  // Phase 2.5: Revert working copy to baseline
  async revertToBaseline(configId: string, ingredientName: string) {
    if (!db) throw new Error('Firebase not initialized');
    try {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      // Get baseline ingredient data
      const baselineIngredients = await this.getBaselineIngredients(configId);
      const baselineIngredient = baselineIngredients.find(ing => {
        const name = ing.KEYNAME || ing.keyname || ing.Ingredient || ing.ingredient || ing.name;
        return name === ingredientName;
      });
      
      if (!baselineIngredient) {
        throw new Error('Baseline ingredient not found');
      }
      
      // Convert baseline NOTE to sections
      const sections = convertNotesToSections(baselineIngredient.NOTE || baselineIngredient.notes || []);
      
      // Update the reference with baseline data
      const ingredientId = normalizeIngredientId(ingredientName);
      const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', configId);
      
      await updateDoc(referenceRef, {
        sections: sections,
        lastModified: serverTimestamp(),
        modifiedBy: user.uid,
        revertedToBaseline: serverTimestamp(),
        status: 'CLEAN'
      });
      
      return true;
    } catch (error) {
      console.error('Error reverting to baseline:', error);
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
          const rawName = ingredientData.KEYNAME || ingredientData.Ingredient || ingredientData.name;
          if (rawName) {
            const name = formatIngredientName(rawName);
            if (!processedIngredients.has(name)) {
              processedIngredients.set(name, {
                name: name,
                category: getKeyCategory(name) || 'OTHER',
                description: ingredientData.DISPLAY || ingredientData.Description || '',
                unit: ingredientData.Unit || '',
                type: ingredientData.TYPE || '',
                configSources: [config.id]
              });
            }
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