import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  type DocumentData,
  type QuerySnapshot,
  type DocumentSnapshot,
  type WriteBatch
} from 'firebase/firestore';
import { db, COLLECTIONS, getCurrentUser } from './firebase';
import { generateIngredientHash } from './contentHashing';
import type { 
  SharedIngredient, 
  SharedIngredientReference, 
  SharedIngredientInfo,
  SharingCandidate,
  ReferenceWithId,
  User,
  CreateSharedIngredientResponse,
  SharedStatus
} from './types.js';

/**
 * Service for managing shared ingredients across configurations
 * Handles linking, unlinking, and tracking of shared ingredient relationships
 */

// Collection for shared ingredient metadata
const SHARED_INGREDIENTS_COLLECTION = 'sharedIngredients';

/**
 * Create a shared ingredient entry
 * Links multiple ingredients/references that have identical content
 */
export async function createSharedIngredient(
  ingredientId: string, 
  references: SharedIngredientReference[] = []
): Promise<CreateSharedIngredientResponse> {
  try {
    // Check if Firebase is initialized
    if (!db) {
      throw new Error('Firebase is not initialized. Please check your configuration.');
    }
    
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    if (!references || references.length === 0) {
      throw new Error('No references provided to share');
    }
    
    // Get the first reference to extract content for hashing
    const firstRef = references[0]!;
    const firstRefDoc = await getDoc(doc(db, COLLECTIONS.INGREDIENTS, firstRef.ingredientId, 'references', firstRef.configId));
    
    if (!firstRefDoc.exists()) {
      throw new Error('Reference not found');
    }
    
    const refData = firstRefDoc.data();
    const contentHash = refData.contentHash || generateIngredientHash(refData);
    
    if (!contentHash) {
      throw new Error('Cannot share ingredient without content');
    }
    
    // Create shared ingredient document
    const sharedId = `shared_${contentHash}`;
    const sharedRef = doc(db, SHARED_INGREDIENTS_COLLECTION, sharedId);
    
    const sharedData: Omit<SharedIngredient, 'id'> = {
      masterIngredientId: ingredientId,
      contentHash: contentHash,
      linkedReferences: references.map(ref => ({
        ingredientId: ref.ingredientId,
        configId: ref.configId,
        healthSystem: ref.healthSystem,
        domain: ref.domain,
        subdomain: ref.subdomain,
        version: ref.version
      })),
      createdAt: serverTimestamp() as any,
      createdBy: user.uid,
      updatedAt: serverTimestamp() as any,
      updatedBy: user.uid
    };
    
    await setDoc(sharedRef, sharedData);
    
    // Update all linked references to point to the shared ingredient
    const batch = writeBatch(db);
    
    for (const ref of references) {
      const refDoc = doc(db, COLLECTIONS.INGREDIENTS, ref.ingredientId, 'references', ref.configId);
      batch.update(refDoc, {
        sharedIngredientId: sharedId,
        isShared: true,
        sharedAt: serverTimestamp()
      });
    }
    
    // Update master ingredient
    batch.update(doc(db, COLLECTIONS.INGREDIENTS, ingredientId), {
      isSharedMaster: true,
      sharedIngredientId: sharedId,
      sharedCount: references.length
    });
    
    await batch.commit();
    
    return { success: true, sharedId };
  } catch (error) {
    console.error('Error creating shared ingredient:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Add a reference to an existing shared ingredient
 */
export async function addToSharedIngredient(
  sharedId: string, 
  reference: SharedIngredientReference
): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const sharedRef = doc(db, SHARED_INGREDIENTS_COLLECTION, sharedId);
    const sharedDoc = await getDoc(sharedRef);
    
    if (!sharedDoc.exists()) {
      throw new Error('Shared ingredient not found');
    }
    
    const sharedData = sharedDoc.data() as SharedIngredient;
    
    // Verify the reference has the same content hash
    const refDoc = await getDoc(doc(db, COLLECTIONS.INGREDIENTS, reference.ingredientId, 'references', reference.configId));
    if (!refDoc.exists()) {
      throw new Error('Reference not found');
    }
    
    const refData = refDoc.data();
    const refHash = refData.contentHash || generateIngredientHash(refData);
    
    if (refHash !== sharedData.contentHash) {
      throw new Error('Reference content does not match shared ingredient');
    }
    
    // Add to shared ingredient
    await updateDoc(sharedRef, {
      linkedReferences: arrayUnion({
        ingredientId: reference.ingredientId,
        configId: reference.configId,
        healthSystem: reference.healthSystem,
        domain: reference.domain,
        subdomain: reference.subdomain,
        version: reference.version
      }),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    });
    
    // Update the reference
    await updateDoc(doc(db, COLLECTIONS.INGREDIENTS, reference.ingredientId, 'references', reference.configId), {
      sharedIngredientId: sharedId,
      isShared: true,
      sharedAt: serverTimestamp()
    });
    
    // Update shared count on master
    const masterRef = doc(db, COLLECTIONS.INGREDIENTS, sharedData.masterIngredientId);
    const masterDoc = await getDoc(masterRef);
    if (masterDoc.exists()) {
      await updateDoc(masterRef, {
        sharedCount: ((masterDoc.data().sharedCount as number) || 0) + 1
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error adding to shared ingredient:', error);
    throw error;
  }
}

/**
 * Get a shared ingredient by its content hash
 */
export async function getSharedIngredientByHash(hash: string): Promise<SharedIngredient | null> {
  try {
    const sharedId = `shared_${hash}`;
    const sharedRef = doc(db, SHARED_INGREDIENTS_COLLECTION, sharedId);
    const sharedDoc = await getDoc(sharedRef);
    
    if (sharedDoc.exists()) {
      return {
        id: sharedId,
        ...sharedDoc.data()
      } as SharedIngredient;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting shared ingredient by hash:', error);
    return null;
  }
}

/**
 * Remove a reference from a shared ingredient (unshare)
 */
export async function removeFromSharedIngredient(
  sharedId: string, 
  reference: Pick<SharedIngredientReference, 'ingredientId' | 'configId'>
): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const sharedRef = doc(db, SHARED_INGREDIENTS_COLLECTION, sharedId);
    const sharedDoc = await getDoc(sharedRef);
    
    if (!sharedDoc.exists()) {
      throw new Error('Shared ingredient not found');
    }
    
    const sharedData = sharedDoc.data() as SharedIngredient;
    
    // Remove from shared ingredient
    const updatedReferences = sharedData.linkedReferences.filter(
      ref => !(ref.ingredientId === reference.ingredientId && ref.configId === reference.configId)
    );
    
    if (updatedReferences.length === 0) {
      // No more references, delete the shared ingredient
      await deleteDoc(sharedRef);
      
      // Update master ingredient
      await updateDoc(doc(db, COLLECTIONS.INGREDIENTS, sharedData.masterIngredientId), {
        isSharedMaster: false,
        sharedIngredientId: null,
        sharedCount: 0
      });
    } else {
      // Update the shared ingredient
      await updateDoc(sharedRef, {
        linkedReferences: updatedReferences,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });
      
      // Update shared count on master
      await updateDoc(doc(db, COLLECTIONS.INGREDIENTS, sharedData.masterIngredientId), {
        sharedCount: updatedReferences.length
      });
    }
    
    // Update the reference to remove shared status
    await updateDoc(doc(db, COLLECTIONS.INGREDIENTS, reference.ingredientId, 'references', reference.configId), {
      sharedIngredientId: null,
      isShared: false,
      unsharedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error removing from shared ingredient:', error);
    throw error;
  }
}

/**
 * Get all shared ingredients
 */
export async function getSharedIngredients(): Promise<SharedIngredient[]> {
  try {
    const snapshot = await getDocs(collection(db, SHARED_INGREDIENTS_COLLECTION));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SharedIngredient[];
  } catch (error) {
    console.error('Error fetching shared ingredients:', error);
    return [];
  }
}

/**
 * Get shared ingredient by ID
 */
export async function getSharedIngredient(sharedId: string): Promise<SharedIngredient | null> {
  try {
    const sharedDoc = await getDoc(doc(db, SHARED_INGREDIENTS_COLLECTION, sharedId));
    if (!sharedDoc.exists()) {
      return null;
    }
    return {
      id: sharedDoc.id,
      ...sharedDoc.data()
    } as SharedIngredient;
  } catch (error) {
    console.error('Error fetching shared ingredient:', error);
    return null;
  }
}

/**
 * Check if an ingredient/reference is shared
 */
export async function isIngredientShared(
  ingredientId: string, 
  configId: string | null = null
): Promise<SharedStatus> {
  try {
    if (configId) {
      // Check specific reference
      const refDoc = await getDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', configId));
      if (refDoc.exists()) {
        const data = refDoc.data();
        return {
          isShared: data.isShared || false,
          sharedIngredientId: data.sharedIngredientId || null
        };
      }
    } else {
      // Check master ingredient
      const ingredientDoc = await getDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredientId));
      if (ingredientDoc.exists()) {
        const data = ingredientDoc.data();
        return {
          isShared: data.isSharedMaster || false,
          sharedIngredientId: data.sharedIngredientId || null,
          sharedCount: data.sharedCount || 0
        };
      }
    }
    return { isShared: false, sharedIngredientId: null };
  } catch (error) {
    console.error('Error checking shared status:', error);
    return { isShared: false, sharedIngredientId: null };
  }
}

/**
 * Get detailed shared ingredient information
 */
export async function getSharedIngredientInfo(ingredientId: string): Promise<SharedIngredientInfo | null> {
  try {
    // First check if this ingredient is shared
    const sharedStatus = await isIngredientShared(ingredientId);
    
    if (!sharedStatus.isShared || !sharedStatus.sharedIngredientId) {
      return null;
    }
    
    // Get the shared ingredient document
    const sharedDoc = await getDoc(doc(db, 'sharedIngredients', sharedStatus.sharedIngredientId));
    if (!sharedDoc.exists()) {
      return null;
    }
    
    const sharedData = sharedDoc.data() as SharedIngredient;
    
    return {
      sharedIngredientId: sharedDoc.id,
      masterIngredientId: sharedData.masterIngredientId,
      sharedAcross: sharedData.sharedAcross || [],
      contentHash: sharedData.contentHash,
      createdAt: sharedData.createdAt,
      lastModified: sharedData.updatedAt
    };
  } catch (error) {
    console.error('Error getting shared ingredient info:', error);
    return null;
  }
}

/**
 * Find candidates for sharing (ingredients with same content hash)
 */
export async function findSharingCandidates(ingredientId: string): Promise<SharingCandidate[]> {
  try {
    const ingredientDoc = await getDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredientId));
    if (!ingredientDoc.exists()) {
      return [];
    }
    
    const ingredientData = ingredientDoc.data();
    const contentHash = ingredientData.contentHash || generateIngredientHash(ingredientData);
    
    if (!contentHash) {
      return [];
    }
    
    // Find all ingredients with the same content hash
    const q = query(
      collection(db, COLLECTIONS.INGREDIENTS),
      where('contentHash', '==', contentHash)
    );
    
    const snapshot = await getDocs(q);
    const candidates: SharingCandidate[] = [];
    
    for (const doc of snapshot.docs) {
      if (doc.id !== ingredientId) {
        const data = doc.data();
        
        // Get all references for this ingredient
        const refsSnapshot = await getDocs(collection(db, COLLECTIONS.INGREDIENTS, doc.id, 'references'));
        const references: ReferenceWithId[] = refsSnapshot.docs.map(refDoc => ({
          id: refDoc.id,
          ingredientId: doc.id,
          ...refDoc.data()
        })) as ReferenceWithId[];
        
        candidates.push({
          ingredientId: doc.id,
          ingredientName: data.name,
          references: references,
          isShared: data.isSharedMaster || false,
          sharedIngredientId: data.sharedIngredientId || null
        });
      }
    }
    
    return candidates;
  } catch (error) {
    console.error('Error finding sharing candidates:', error);
    return [];
  }
}

/**
 * Create an independent copy of a shared reference
 */
export async function makeIndependentCopy(
  ingredientId: string, 
  configId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    // Get the reference
    const refDoc = await getDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', configId));
    if (!refDoc.exists()) {
      throw new Error('Reference not found');
    }
    
    const refData = refDoc.data();
    
    if (!refData.isShared) {
      return { success: true, message: 'Reference is already independent' };
    }
    
    // Remove from shared ingredient
    if (refData.sharedIngredientId) {
      await removeFromSharedIngredient(refData.sharedIngredientId, {
        ingredientId,
        configId
      });
    }
    
    // Mark as modified to indicate it's now independent
    await updateDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', configId), {
      isModified: true,
      independentAt: serverTimestamp(),
      modifiedBy: user.uid
    });
    
    return { success: true, message: 'Reference is now independent' };
  } catch (error) {
    console.error('Error making independent copy:', error);
    throw error;
  }
}
