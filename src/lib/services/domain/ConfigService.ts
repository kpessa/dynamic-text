/**
 * Config Service - Handles imported TPN configurations with deduplication and validation
 * Manages baseline configs, working copies, and import/export operations
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  increment
} from 'firebase/firestore';

import { db, COLLECTIONS, getCurrentUser, signInAnonymouslyUser } from '../../firebase';
import { cacheService } from '../base/CacheService';
import { errorService } from '../base/ErrorService';
import { syncService } from '../base/SyncService';
import { ingredientService, formatIngredientName, normalizeIngredientId } from './IngredientService';
import { referenceService, generateReferenceId } from './ReferenceService';
import { getKeyCategory } from '../../tpnLegacy.js';
import { generateIngredientHash, findDuplicates } from '../../contentHashing';
import { getPreferences } from '../../preferencesService.js';
import { createSharedIngredient, getSharedIngredientByHash } from '../../sharedIngredientService.js';

import type { 
  ConfigData,
  ConfigMetadata,
  ImportedConfig,
  DuplicateReport,
  ImportStats,
  ImportedIngredient,
  ServiceResponse,
  Section,
  NoteItem,
  IngredientData,
  PopulationType,
  FirebaseTimestamp 
} from '../../types';

// Cache keys
const CACHE_KEYS = {
  ALL_CONFIGS: 'configs:all',
  CONFIG: (id: string) => `config:${id}`,
  CONFIG_INGREDIENTS: (id: string) => `config:${id}:ingredients`,
  CONFIGS_BY_HEALTH_SYSTEM: (healthSystem: string) => `configs:health-system:${healthSystem}`,
  BASELINE_CONFIG: (id: string) => `baseline-config:${id}`,
  BASELINE_INGREDIENTS: (id: string) => `baseline-config:${id}:ingredients`
};

// Cache TTLs
const CACHE_TTL = {
  CONFIG: 15 * 60 * 1000, // 15 minutes
  CONFIG_LIST: 10 * 60 * 1000, // 10 minutes
  BASELINE: 60 * 60 * 1000 // 1 hour (baselines are immutable)
};

// Helper functions
export function normalizeConfigId(
  healthSystem: string, 
  domain: string, 
  subdomain: string, 
  version: string
): string {
  const parts = [healthSystem, domain, subdomain, version]
    .filter(Boolean)
    .map(part => part.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return parts.join('-');
}

export function versionToPopulationType(version?: string): PopulationType {
  const mapping: Record<string, PopulationType> = {
    'neonatal': 'neonatal',
    'child': 'child',
    'pediatric': 'child',
    'adolescent': 'adolescent',
    'adult': 'adult'
  };
  
  return mapping[version?.toLowerCase() || ''] || 'adult';
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
    
    if (text.includes('[f(')) {
      if (currentStaticContent.trim() && !dynamicStarted) {
        sections.push({ 
          id: sectionId++,
          type: 'static', 
          content: currentStaticContent.trim() 
        });
        currentStaticContent = '';
      }
      
      dynamicStarted = true;
      inDynamicBlock = true;
      dynamicContent = text;
    } else if (inDynamicBlock) {
      dynamicContent += '\n' + text;
      
      if (text.includes(')]')) {
        let remainingText = dynamicContent;
        
        while (remainingText.includes('[f(')) {
          const startIdx = remainingText.indexOf('[f(');
          
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
          
          const endIdx = remainingText.indexOf(')]', startIdx);
          
          if (endIdx !== -1) {
            const dynamicText = remainingText.substring(startIdx + 3, endIdx);
            sections.push({ 
              id: sections.length + 1,
              type: 'dynamic', 
              content: dynamicText.trim(),
              testCases: [{ name: 'Default', variables: {} }]
            });
            remainingText = remainingText.substring(endIdx + 2);
          } else {
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
        
        if (remainingText.trim()) {
          currentStaticContent = remainingText;
        }
        
        inDynamicBlock = false;
        dynamicContent = '';
      }
    } else {
      currentStaticContent += (currentStaticContent ? '\n' : '') + text;
    }
  });
  
  if (currentStaticContent.trim()) {
    sections.push({ 
      id: sections.length + 1,
      type: 'static', 
      content: currentStaticContent.trim() 
    });
  }
  
  return sections;
}

export class ConfigService {
  /**
   * Detect duplicates before import with comprehensive analysis
   */
  async detectDuplicatesBeforeImport(configData: ConfigData): Promise<DuplicateReport> {
    return errorService.withRetry(async () => {
      const report: DuplicateReport = {
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
      const existingResponse = await ingredientService.getAllIngredients();
      if (!existingResponse.success || !existingResponse.data) {
        throw new Error('Failed to fetch existing ingredients for duplicate detection');
      }
      
      const existingIngredients = new Map();
      existingResponse.data.forEach(ingredient => {
        existingIngredients.set(ingredient.id!, ingredient);
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
          const importHash = generateIngredientHash({
            NOTE: importIngredient.NOTE || importIngredient.notes
          });
          const existingHash = existingIngredient.contentHash || 
                               generateIngredientHash(existingIngredient);
          
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
    }, { maxAttempts: 3 }, { operation: 'detectDuplicatesBeforeImport' });
  }

  /**
   * Save imported config with comprehensive processing and deduplication
   */
  async saveImportedConfig(
    configData: ConfigData, 
    metadata: ConfigMetadata
  ): Promise<ServiceResponse<{ configId: string; duplicateReport: DuplicateReport; importStats: ImportStats }>> {
    return errorService.withRetry(async () => {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      // Detect duplicates before import
      const duplicateReport = await this.detectDuplicatesBeforeImport(configData);
      
      // Check for auto-deduplication preference
      const preferences = getPreferences();
      let autoDedupeActions: any[] = [];
      
      if (preferences.autoDeduplicateOnImport && duplicateReport.identicalIngredients.length > 0) {
        for (const identical of duplicateReport.identicalIngredients) {
          autoDedupeActions.push({
            ingredientId: identical.ingredientId,
            name: identical.name,
            hash: identical.hash,
            existingConfigs: identical.existingConfigs,
            action: 'link'
          });
        }
        
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
      
      // Store original import as immutable baseline
      const baselineRef = doc(db, 'baselineConfigs', configId);
      const baselineExists = await getDoc(baselineRef);
      
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
          isBaseline: true,
          originalData: configData
        });
      }
      
      // Create working config document
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
        baselineId: configId
      });
      
      const importStats: ImportStats = {
        totalIngredients: 0,
        newIngredients: 0,
        updatedIngredients: 0,
        duplicatesFound: duplicateReport.duplicatesFound.length,
        identicalIngredients: duplicateReport.identicalIngredients.length
      };
      
      // Process ingredients if available
      if (configData.INGREDIENT && configData.INGREDIENT.length > 0) {
        const result = await this.processConfigIngredients(
          configData, 
          configId, 
          metadata, 
          autoDedupeActions,
          !baselineExists.exists()
        );
        
        Object.assign(importStats, result);
      }
      
      // Invalidate caches
      cacheService.invalidate(CACHE_KEYS.ALL_CONFIGS);
      cacheService.invalidate(CACHE_KEYS.CONFIGS_BY_HEALTH_SYSTEM(metadata.healthSystem));
      
      return {
        success: true,
        data: {
          configId,
          duplicateReport,
          importStats
        },
        message: `Config ${metadata.name} imported successfully with ${importStats.totalIngredients} ingredients`
      };
    }, { maxAttempts: 3 }, { operation: 'saveImportedConfig', configName: metadata.name });
  }

  /**
   * Get all imported configs with caching
   */
  async getAllConfigs(): Promise<ServiceResponse<ImportedConfig[]>> {
    return errorService.withRetry(async () => {
      const configs = await cacheService.get(
        CACHE_KEYS.ALL_CONFIGS,
        async () => {
          const q = query(
            collection(db, 'importedConfigs'),
            orderBy('importedAt', 'desc')
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ImportedConfig[];
        },
        CACHE_TTL.CONFIG_LIST
      );
      
      return {
        success: true,
        data: configs,
        message: `Retrieved ${configs.length} configs`
      };
    }, { maxAttempts: 3 }, { operation: 'getAllConfigs' });
  }

  /**
   * Get config by ID with caching
   */
  async getConfig(configId: string): Promise<ServiceResponse<ImportedConfig | null>> {
    return errorService.withRetry(async () => {
      const config = await cacheService.get(
        CACHE_KEYS.CONFIG(configId),
        async () => {
          const docSnapshot = await getDoc(doc(db, 'importedConfigs', configId));
          return docSnapshot.exists() ? 
            { id: docSnapshot.id, ...docSnapshot.data() } as ImportedConfig : null;
        },
        CACHE_TTL.CONFIG
      );
      
      return {
        success: true,
        data: config,
        message: config ? 'Config found' : 'Config not found'
      };
    }, { maxAttempts: 2 }, { operation: 'getConfig', configId });
  }

  /**
   * Get ingredients for a specific config
   */
  async getConfigIngredients(configId: string): Promise<ServiceResponse<ImportedIngredient[]>> {
    return errorService.withRetry(async () => {
      const ingredients = await cacheService.get(
        CACHE_KEYS.CONFIG_INGREDIENTS(configId),
        async () => {
          const q = query(
            collection(db, 'importedConfigs', configId, 'ingredients'),
            orderBy('index', 'asc')
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ImportedIngredient[];
        },
        CACHE_TTL.CONFIG
      );
      
      return {
        success: true,
        data: ingredients,
        message: `Retrieved ${ingredients.length} ingredients for config ${configId}`
      };
    }, { maxAttempts: 3 }, { operation: 'getConfigIngredients', configId });
  }

  /**
   * Get configs by health system
   */
  async getConfigsByHealthSystem(healthSystem: string): Promise<ServiceResponse<ImportedConfig[]>> {
    return errorService.withRetry(async () => {
      const configs = await cacheService.get(
        CACHE_KEYS.CONFIGS_BY_HEALTH_SYSTEM(healthSystem),
        async () => {
          const q = query(
            collection(db, 'importedConfigs'),
            where('healthSystem', '==', healthSystem),
            orderBy('importedAt', 'desc')
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ImportedConfig[];
        },
        CACHE_TTL.CONFIG_LIST
      );
      
      return {
        success: true,
        data: configs,
        message: `Retrieved ${configs.length} configs for ${healthSystem}`
      };
    }, { maxAttempts: 3 }, { operation: 'getConfigsByHealthSystem', healthSystem });
  }

  /**
   * Get baseline config (immutable original)
   */
  async getBaselineConfig(configId: string): Promise<ServiceResponse<any>> {
    return errorService.withRetry(async () => {
      const baseline = await cacheService.get(
        CACHE_KEYS.BASELINE_CONFIG(configId),
        async () => {
          const baselineDoc = await getDoc(doc(db, 'baselineConfigs', configId));
          return baselineDoc.exists() ? 
            { id: baselineDoc.id, ...baselineDoc.data() } : null;
        },
        CACHE_TTL.BASELINE
      );
      
      return {
        success: true,
        data: baseline,
        message: baseline ? 'Baseline config found' : 'Baseline config not found'
      };
    }, { maxAttempts: 2 }, { operation: 'getBaselineConfig', configId });
  }

  /**
   * Compare working config with baseline
   */
  async compareWithBaseline(
    configId: string, 
    ingredientName: string
  ): Promise<ServiceResponse<{ status: string; differences: any }>> {
    return errorService.withRetry(async () => {
      // Get baseline ingredient data
      const baselineIngredients = await this.getBaselineIngredients(configId);
      if (!baselineIngredients.success || !baselineIngredients.data) {
        throw new Error('Failed to get baseline ingredients');
      }
      
      const baselineIngredient = baselineIngredients.data.find(ing => {
        const name = ing.KEYNAME || ing.keyname || ing.Ingredient || ing.ingredient || ing.name;
        return name === ingredientName;
      });
      
      if (!baselineIngredient) {
        return {
          success: true,
          data: { status: 'NEW', differences: null },
          message: 'Ingredient not found in baseline'
        };
      }
      
      // Get current working ingredient data
      const ingredientId = normalizeIngredientId(ingredientName);
      const referenceResponse = await referenceService.getReference(ingredientId, configId);
      
      if (!referenceResponse.success || !referenceResponse.data) {
        return {
          success: true,
          data: { status: 'DELETED', differences: null },
          message: 'Ingredient deleted from working copy'
        };
      }
      
      const workingData = referenceResponse.data;
      
      // Compare sections (working) with NOTE (baseline)
      const baselineSections = convertNotesToSections(baselineIngredient.NOTE || baselineIngredient.notes || []);
      const workingSections = workingData.sections || [];
      
      const sectionsMatch = JSON.stringify(baselineSections) === JSON.stringify(workingSections);
      
      return {
        success: true,
        data: {
          status: sectionsMatch ? 'CLEAN' : 'MODIFIED',
          differences: sectionsMatch ? null : {
            baseline: baselineSections,
            working: workingSections
          }
        },
        message: sectionsMatch ? 'No changes from baseline' : 'Changes detected'
      };
    }, { maxAttempts: 2 }, { operation: 'compareWithBaseline', configId, ingredientName });
  }

  /**
   * Revert working copy to baseline
   */
  async revertToBaseline(
    configId: string, 
    ingredientName: string
  ): Promise<ServiceResponse<void>> {
    return errorService.withRetry(async () => {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
      // Get baseline ingredient data
      const baselineIngredients = await this.getBaselineIngredients(configId);
      if (!baselineIngredients.success || !baselineIngredients.data) {
        throw new Error('Failed to get baseline ingredients');
      }
      
      const baselineIngredient = baselineIngredients.data.find(ing => {
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
      
      // Invalidate caches
      cacheService.invalidatePattern(new RegExp(`reference.*${ingredientId}.*${configId}`));
      
      return {
        success: true,
        data: undefined,
        message: 'Successfully reverted to baseline'
      };
    }, { maxAttempts: 2 }, { operation: 'revertToBaseline', configId, ingredientName });
  }

  /**
   * Delete a config and all its ingredients
   */
  async deleteConfig(configId: string): Promise<ServiceResponse<void>> {
    return errorService.withRetry(async () => {
      const batch = writeBatch(db);
      
      // Delete all ingredients in the subcollection
      const ingredientsSnapshot = await getDocs(
        collection(db, 'importedConfigs', configId, 'ingredients')
      );
      
      ingredientsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the main config document
      batch.delete(doc(db, 'importedConfigs', configId));
      
      // Also delete baseline if it exists
      batch.delete(doc(db, 'baselineConfigs', configId));
      
      await batch.commit();
      
      // Invalidate caches
      cacheService.invalidatePattern(new RegExp(`config.*${configId}`));
      cacheService.invalidate(CACHE_KEYS.ALL_CONFIGS);
      
      return {
        success: true,
        data: undefined,
        message: 'Config deleted successfully'
      };
    }, { maxAttempts: 2 }, { operation: 'deleteConfig', configId });
  }

  /**
   * Get baseline ingredients for a config
   */
  private async getBaselineIngredients(configId: string): Promise<ServiceResponse<any[]>> {
    return errorService.withRetry(async () => {
      const ingredients = await cacheService.get(
        CACHE_KEYS.BASELINE_INGREDIENTS(configId),
        async () => {
          const q = query(
            collection(db, 'baselineConfigs', configId, 'ingredients'),
            orderBy('index', 'asc')
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        },
        CACHE_TTL.BASELINE
      );
      
      return {
        success: true,
        data: ingredients,
        message: `Retrieved ${ingredients.length} baseline ingredients`
      };
    }, { maxAttempts: 3 }, { operation: 'getBaselineIngredients', configId });
  }

  /**
   * Process config ingredients during import
   */
  private async processConfigIngredients(
    configData: ConfigData,
    configId: string,
    metadata: ConfigMetadata,
    autoDedupeActions: any[],
    saveBaseline: boolean
  ): Promise<Partial<ImportStats>> {
    const batch = writeBatch(db);
    const processedIngredients = new Map();
    const stats = {
      totalIngredients: configData.INGREDIENT.length,
      newIngredients: 0,
      updatedIngredients: 0
    };
    
    // Save baseline ingredients if needed
    if (saveBaseline) {
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
    
    // Process auto-deduplication data
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
    
    // Identify unique ingredients
    configData.INGREDIENT.forEach((ingredientData) => {
      const rawName = ingredientData.KEYNAME || ingredientData.keyname || 
                     ingredientData.Ingredient || ingredientData.ingredient || 
                     ingredientData.name;
      
      if (rawName) {
        const name = formatIngredientName(rawName);
        
        if (!processedIngredients.has(name)) {
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
      }
    });
    
    // Create or update ingredients
    for (const [name, ingredientInfo] of processedIngredients) {
      const ingredientId = normalizeIngredientId(name);
      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
      
      const existingIngredient = await getDoc(ingredientRef);
      const user = getCurrentUser() || await signInAnonymouslyUser();
      
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
        batch.set(ingredientRef, ingredientData);
        stats.newIngredients++;
      } else {
        // Update existing ingredient
        const existingData = existingIngredient.data();
        batch.update(ingredientRef, {
          configSources: arrayUnion(configId),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
          description: existingData.description || ingredientInfo.description
        });
        stats.updatedIngredients++;
      }
      
      // Create reference under ingredient
      const matchingIngredientData = configData.INGREDIENT.find(ing => {
        const rawIngName = ing.KEYNAME || ing.keyname || 
                          ing.Ingredient || ing.ingredient || 
                          ing.name;
        const formattedIngName = formatIngredientName(rawIngName);
        return formattedIngName === name;
      });
      
      // Convert notes to sections
      let sections: Section[] = [];
      const notes = matchingIngredientData?.NOTE || matchingIngredientData?.notes;
      if (notes) {
        sections = convertNotesToSections(notes);
      }
      
      // Create reference
      const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', configId);
      let referenceData = {
        name: metadata.name,
        healthSystem: metadata.healthSystem,
        domain: metadata.domain,
        subdomain: metadata.subdomain,
        version: metadata.version,
        populationType: versionToPopulationType(metadata.version),
        configId: configId,
        sections: sections,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      
      // Apply auto-deduplication if enabled
      const autoDedupeData = autoDedupeMap.get(ingredientId);
      if (autoDedupeData) {
        if (autoDedupeData.sharedIngredient) {
          referenceData.sharedIngredientId = autoDedupeData.sharedIngredient.id;
          referenceData.isShared = true;
          referenceData.sharedAt = serverTimestamp();
          referenceData.autoDeduped = true;
        } else {
          const contentHash = generateIngredientHash({ sections });
          referenceData.contentHash = contentHash;
        }
      }
      
      batch.set(referenceRef, referenceData);
    }
    
    // Store ingredients in importedConfigs subcollection
    configData.INGREDIENT.forEach((ingredient, index) => {
      const ingredientRef = doc(collection(db, 'importedConfigs', configId, 'ingredients'));
      batch.set(ingredientRef, {
        ...ingredient,
        index: index,
        configId: configId
      });
    });
    
    await batch.commit();
    
    return stats;
  }
}

// Export singleton instance
export const configService = new ConfigService();