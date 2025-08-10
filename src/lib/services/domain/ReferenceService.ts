/**
 * Reference Service - Manages TPN ingredient references with version control
 * Handles references nested under ingredients with validation and caching
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
  increment
} from 'firebase/firestore';

import { db, COLLECTIONS, getCurrentUser, signInAnonymouslyUser } from '../../firebase';
import { cacheService } from '../base/CacheService';
import { errorService } from '../base/ErrorService';
import { syncService } from '../base/SyncService';
import { generateIngredientHash } from '../../contentHashing';

import type { 
  ReferenceData, 
  PopulationType,
  ServiceResponse,
  FirebaseTimestamp 
} from '../../types';

// Cache keys
const CACHE_KEYS = {
  INGREDIENT_REFERENCES: (ingredientId: string) => `references:ingredient:${ingredientId}`,
  REFERENCE: (ingredientId: string, referenceId: string) => `reference:${ingredientId}:${referenceId}`,
  REFERENCES_BY_POPULATION: (ingredientId: string, populationType: string) => 
    `references:${ingredientId}:population:${populationType}`,
  REFERENCE_VERSIONS: (ingredientId: string, referenceId: string) => 
    `reference:${ingredientId}:${referenceId}:versions`
};

// Cache TTLs
const CACHE_TTL = {
  REFERENCE: 10 * 60 * 1000, // 10 minutes
  REFERENCE_LIST: 5 * 60 * 1000, // 5 minutes
  VERSIONS: 30 * 60 * 1000 // 30 minutes
};

// Helper function to generate meaningful reference IDs
export function generateReferenceId(referenceData: Partial<ReferenceData>): string {
  const parts = [
    referenceData.healthSystem,
    referenceData.domain,
    referenceData.subdomain,
    referenceData.populationType || referenceData.version
  ].filter(Boolean).map(part => part!.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  
  return parts.join('-');
}

export class ReferenceService {
  /**
   * Save a reference under an ingredient with version tracking
   */
  async saveReference(
    ingredientId: string,
    referenceData: ReferenceData,
    commitMessage?: string
  ): Promise<ServiceResponse<string>> {
    return errorService.withRetry(async () => {
      // Validate reference data
      this.validateReferenceData(referenceData);
      
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const referenceId = referenceData.id || generateReferenceId(referenceData);
      const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId);
      
      // Get current version for version tracking
      const currentDoc = await getDoc(referenceRef);
      const currentVersion = currentDoc.exists() ? (currentDoc.data().version || 0) : 0;
      
      // Prepare reference data
      const data = {
        ...referenceData,
        id: referenceId,
        ingredientId,
        version: currentVersion + 1,
        lastModified: serverTimestamp(),
        modifiedBy: user.uid,
        contentHash: generateIngredientHash(referenceData),
        commitMessage: commitMessage || null,
        // Preserve validation data
        validationStatus: referenceData.validationStatus || currentDoc.data()?.validationStatus || 'untested',
        validationNotes: referenceData.validationNotes || currentDoc.data()?.validationNotes || '',
        validatedBy: referenceData.validatedBy || currentDoc.data()?.validatedBy || null,
        validatedAt: referenceData.validatedAt || currentDoc.data()?.validatedAt || null,
        testResults: referenceData.testResults || currentDoc.data()?.testResults || null,
        // Legacy compatibility
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      
      // Set creation fields for new references
      if (!referenceData.id || !currentDoc.exists()) {
        data.createdAt = serverTimestamp();
        data.createdBy = user.uid;
        data.version = 1;
      }
      
      // Save version history before updating
      if (currentDoc.exists() && currentDoc.data()) {
        await this.saveReferenceVersionHistory(ingredientId, referenceId, {
          ...currentDoc.data(),
          commitMessage: currentDoc.data().commitMessage || null
        });
      }
      
      // Save reference
      await setDoc(referenceRef, data);
      
      // Update ingredient metadata
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
      
      // Invalidate relevant caches
      this.invalidateReferenceCaches(ingredientId, referenceId, referenceData.populationType);
      
      return {
        success: true,
        data: referenceId,
        message: `Reference ${referenceData.name} saved successfully`
      };
    }, { maxAttempts: 3 }, { operation: 'saveReference', ingredientId, referenceId: referenceData.id });
  }

  /**
   * Get all references for an ingredient with caching
   */
  async getReferencesForIngredient(ingredientId: string): Promise<ServiceResponse<ReferenceData[]>> {
    return errorService.withRetry(async () => {
      const references = await cacheService.get(
        CACHE_KEYS.INGREDIENT_REFERENCES(ingredientId),
        async () => {
          const q = query(
            collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references'),
            orderBy('populationType', 'asc')
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ReferenceData[];
        },
        CACHE_TTL.REFERENCE_LIST
      );
      
      return {
        success: true,
        data: references,
        message: `Retrieved ${references.length} references for ingredient ${ingredientId}`
      };
    }, { maxAttempts: 3 }, { operation: 'getReferencesForIngredient', ingredientId });
  }

  /**
   * Get references by population type with caching
   */
  async getReferencesByPopulation(
    ingredientId: string, 
    populationType: PopulationType
  ): Promise<ServiceResponse<ReferenceData[]>> {
    return errorService.withRetry(async () => {
      const references = await cacheService.get(
        CACHE_KEYS.REFERENCES_BY_POPULATION(ingredientId, populationType),
        async () => {
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
          })) as ReferenceData[];
        },
        CACHE_TTL.REFERENCE_LIST
      );
      
      return {
        success: true,
        data: references,
        message: `Retrieved ${references.length} ${populationType} references`
      };
    }, { maxAttempts: 3 }, { operation: 'getReferencesByPopulation', ingredientId, populationType });
  }

  /**
   * Get single reference with caching
   */
  async getReference(
    ingredientId: string, 
    referenceId: string
  ): Promise<ServiceResponse<ReferenceData | null>> {
    return errorService.withRetry(async () => {
      const reference = await cacheService.get(
        CACHE_KEYS.REFERENCE(ingredientId, referenceId),
        async () => {
          const docSnapshot = await getDoc(
            doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId)
          );
          return docSnapshot.exists() ? 
            { id: docSnapshot.id, ...docSnapshot.data() } as ReferenceData : null;
        },
        CACHE_TTL.REFERENCE
      );
      
      return {
        success: true,
        data: reference,
        message: reference ? 'Reference found' : 'Reference not found'
      };
    }, { maxAttempts: 2 }, { operation: 'getReference', ingredientId, referenceId });
  }

  /**
   * Subscribe to reference changes for an ingredient
   */
  subscribeToReferences(
    ingredientId: string,
    callback: (references: ReferenceData[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    return syncService.subscribe({
      id: `references-${ingredientId}`,
      collectionPath: `${COLLECTIONS.INGREDIENTS}/${ingredientId}/references`,
      constraints: [orderBy('populationType', 'asc')],
      callback: (data) => {
        // Invalidate cache on updates
        this.invalidateReferenceCaches(ingredientId);
        callback(data as ReferenceData[]);
      },
      errorCallback,
      debounceMs: 300
    });
  }

  /**
   * Update validation status for a reference
   */
  async updateReferenceValidation(
    ingredientId: string, 
    referenceId: string, 
    validationData: {
      status: 'untested' | 'passed' | 'failed' | 'warning';
      notes?: string;
      testResults?: any;
      validatedBy?: string;
      validatedAt?: FirebaseTimestamp;
    }
  ): Promise<ServiceResponse<void>> {
    return errorService.withRetry(async () => {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId);
      
      await updateDoc(referenceRef, {
        validationStatus: validationData.status,
        validationNotes: validationData.notes || '',
        validatedBy: validationData.validatedBy || user.uid,
        validatedAt: validationData.validatedAt || serverTimestamp(),
        testResults: validationData.testResults || null,
        lastModified: serverTimestamp(),
        modifiedBy: user.uid,
        version: increment(1)
      });
      
      // Invalidate caches
      cacheService.invalidate(CACHE_KEYS.REFERENCE(ingredientId, referenceId));
      cacheService.invalidate(CACHE_KEYS.INGREDIENT_REFERENCES(ingredientId));
      
      return {
        success: true,
        data: undefined,
        message: 'Validation status updated successfully'
      };
    }, { maxAttempts: 2 }, { operation: 'updateReferenceValidation', ingredientId, referenceId });
  }

  /**
   * Delete a reference
   */
  async deleteReference(
    ingredientId: string, 
    referenceId: string
  ): Promise<ServiceResponse<void>> {
    return errorService.withRetry(async () => {
      const batch = writeBatch(db);
      
      // Delete reference
      const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId);
      batch.delete(referenceRef);
      
      // Update ingredient reference count
      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
      batch.update(ingredientRef, {
        lastReferenceUpdate: serverTimestamp(),
        referenceCount: increment(-1),
        version: increment(1)
      });
      
      await batch.commit();
      
      // Invalidate caches
      this.invalidateReferenceCaches(ingredientId, referenceId);
      
      return {
        success: true,
        data: undefined,
        message: 'Reference deleted successfully'
      };
    }, { maxAttempts: 2 }, { operation: 'deleteReference', ingredientId, referenceId });
  }

  /**
   * Get references across health systems for comparison
   */
  async getReferencesForComparison(
    ingredientId: string, 
    healthSystem?: string
  ): Promise<ServiceResponse<Record<string, ReferenceData[]>>> {
    return errorService.withRetry(async () => {
      let q = collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references');
      
      if (healthSystem) {
        q = query(q, where('healthSystem', '==', healthSystem));
      }
      
      const snapshot = await getDocs(q);
      const references = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferenceData[];
      
      // Group by population type for easy comparison
      const grouped: Record<string, ReferenceData[]> = {};
      references.forEach(ref => {
        if (!grouped[ref.populationType]) {
          grouped[ref.populationType] = [];
        }
        grouped[ref.populationType].push(ref);
      });
      
      return {
        success: true,
        data: grouped,
        message: `Retrieved ${references.length} references for comparison`
      };
    }, { maxAttempts: 3 }, { operation: 'getReferencesForComparison', ingredientId, healthSystem });
  }

  /**
   * Get version history for a reference
   */
  async getReferenceVersionHistory(
    ingredientId: string, 
    referenceId: string
  ): Promise<ServiceResponse<ReferenceData[]>> {
    return errorService.withRetry(async () => {
      const versions = await cacheService.get(
        CACHE_KEYS.REFERENCE_VERSIONS(ingredientId, referenceId),
        async () => {
          const q = query(
            collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId, 'versions'),
            orderBy('versionNumber', 'desc')
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ReferenceData[];
        },
        CACHE_TTL.VERSIONS
      );
      
      return {
        success: true,
        data: versions,
        message: `Retrieved ${versions.length} versions`
      };
    }, { maxAttempts: 2 }, { operation: 'getReferenceVersionHistory', ingredientId, referenceId });
  }

  /**
   * Batch update references
   */
  async batchUpdateReferences(
    updates: Array<{
      ingredientId: string;
      referenceId: string;
      data: Partial<ReferenceData>;
    }>
  ): Promise<ServiceResponse<number>> {
    return errorService.withRetry(async () => {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const batch = writeBatch(db);
      
      // Validate all updates first
      for (const update of updates) {
        this.validateReferenceData(update.data as ReferenceData);
      }
      
      // Apply updates
      for (const update of updates) {
        const referenceRef = doc(
          db, 
          COLLECTIONS.INGREDIENTS, 
          update.ingredientId, 
          'references', 
          update.referenceId
        );
        
        batch.update(referenceRef, {
          ...update.data,
          lastModified: serverTimestamp(),
          modifiedBy: user.uid,
          version: increment(1)
        });
      }
      
      await batch.commit();
      
      // Invalidate caches
      const affectedIngredients = new Set(updates.map(u => u.ingredientId));
      affectedIngredients.forEach(ingredientId => {
        this.invalidateReferenceCaches(ingredientId);
      });
      
      return {
        success: true,
        data: updates.length,
        message: `Successfully updated ${updates.length} references`
      };
    }, { maxAttempts: 3 }, { operation: 'batchUpdateReferences', count: updates.length });
  }

  /**
   * Save reference version history (private method)
   */
  private async saveReferenceVersionHistory(
    ingredientId: string, 
    referenceId: string, 
    versionData: any
  ): Promise<void> {
    try {
      const versionRef = doc(
        collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId, 'versions')
      );
      
      await setDoc(versionRef, {
        ...versionData,
        versionNumber: versionData.version || 1,
        archivedAt: serverTimestamp()
      });
      
      // Invalidate version cache
      cacheService.invalidate(CACHE_KEYS.REFERENCE_VERSIONS(ingredientId, referenceId));
    } catch (error) {
      console.error('Error saving reference version history:', error);
      // Don't throw - version history is not critical
    }
  }

  /**
   * Validate reference data for medical safety
   */
  private validateReferenceData(referenceData: Partial<ReferenceData>): void {
    // Required fields validation
    if (!referenceData.name) {
      throw new Error('Reference name is required');
    }
    
    if (!referenceData.healthSystem) {
      throw new Error('Health system is required for reference');
    }
    
    if (!referenceData.populationType) {
      throw new Error('Population type is required for medical safety');
    }
    
    // Validate population type
    const validPopulationTypes = ['neonatal', 'child', 'pediatric', 'adolescent', 'adult'];
    if (!validPopulationTypes.includes(referenceData.populationType)) {
      throw new Error(`Invalid population type: ${referenceData.populationType}`);
    }
    
    // Validate sections if present
    if (referenceData.sections) {
      for (const section of referenceData.sections) {
        if (!section.id || !section.type || !section.content) {
          throw new Error('Invalid section data: id, type, and content are required');
        }
      }
    }
  }

  /**
   * Invalidate reference-related caches
   */
  private invalidateReferenceCaches(
    ingredientId: string, 
    referenceId?: string, 
    populationType?: PopulationType
  ): void {
    cacheService.invalidate(CACHE_KEYS.INGREDIENT_REFERENCES(ingredientId));
    
    if (referenceId) {
      cacheService.invalidate(CACHE_KEYS.REFERENCE(ingredientId, referenceId));
    }
    
    if (populationType) {
      cacheService.invalidate(CACHE_KEYS.REFERENCES_BY_POPULATION(ingredientId, populationType));
    }
    
    // Invalidate all population-specific caches for this ingredient
    const populationTypes = ['neonatal', 'child', 'pediatric', 'adolescent', 'adult'];
    populationTypes.forEach(type => {
      cacheService.invalidate(CACHE_KEYS.REFERENCES_BY_POPULATION(ingredientId, type));
    });
  }
}

// Export singleton instance
export const referenceService = new ReferenceService();