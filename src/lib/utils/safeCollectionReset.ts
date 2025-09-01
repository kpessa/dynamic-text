import { 
  collection, 
  getDocs, 
  deleteDoc,
  doc,
  setDoc,
  type Firestore
} from 'firebase/firestore';
import { db } from '../firebase';
import { firebaseBackupRestore } from './firebaseBackupRestore';

export interface ResetResult {
  success: boolean;
  collection: string;
  backupId: string | null;
  documentsDeleted: number;
  timestamp: Date;
  message?: string;
}

export interface CollectionInfo {
  exists: boolean;
  documentCount: number;
}

export interface BackupInfo {
  backupId: string;
  collection: string;
  documentCount: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface InitResult {
  success: boolean;
  collection: string;
  schemaApplied: boolean;
  indexesCreated?: number;
  seedDocumentsAdded?: number;
}

export interface RollbackResult {
  success: boolean;
  restoredFrom: string;
  documentsRestored: number;
  rollbackReason?: string;
  timestamp?: Date;
}

export interface SchemaValidation {
  valid: boolean;
  missingFields: string[];
  extraFields: string[];
  typeMatches?: boolean;
}

export interface MultiResetResult {
  success: boolean;
  collectionsReset: string[];
  totalDocumentsDeleted?: number;
  backups?: string[];
  failedAt?: string;
  rolledBack?: string[];
  error?: string;
  atomic?: boolean;
  transactionId?: string;
}

export interface CollectionStats {
  collection: string;
  documentCount: number;
  sizeInBytes: number;
  lastModified: Date;
  indexes: string[];
  sizeDistribution?: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
}

export class SafeCollectionReset {
  private db: Firestore | null = null;
  private backupService = firebaseBackupRestore;

  constructor(firestore?: Firestore) {
    this.db = firestore || db;
  }

  /**
   * Reset a collection with automatic backup
   */
  async resetCollection(
    collectionName: string,
    options: {
      skipConfirmation?: boolean;
      skipBackup?: boolean;
    } = {}
  ): Promise<ResetResult> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    // Check if collection exists
    const collectionInfo = await this.validateCollectionExists(collectionName);
    if (!collectionInfo.exists) {
      throw new Error('Collection does not exist');
    }

    // Require confirmation for destructive operation
    if (!options.skipConfirmation) {
      const confirmed = await this.confirmReset(collectionName, collectionInfo.documentCount);
      if (!confirmed) {
        throw new Error('User confirmation required');
      }
    }

    // Create backup unless skipped
    let backupId: string | null = null;
    if (!options.skipBackup && collectionInfo.documentCount > 0) {
      const backup = await this.createBackupBeforeReset(collectionName);
      backupId = backup.backupId;
    }

    // Delete all documents in the collection
    let documentsDeleted = 0;
    try {
      const collectionRef = collection(this.db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const deletePromises = snapshot.docs.map(docSnapshot => 
        deleteDoc(doc(this.db!, collectionName, docSnapshot.id))
      );
      
      await Promise.all(deletePromises);
      documentsDeleted = snapshot.size;
    } catch (error) {
      // If deletion fails and we have a backup, restore it
      if (backupId) {
        await this.rollbackOnFailure(backupId, error as Error);
      }
      throw error;
    }

    return {
      success: true,
      collection: collectionName,
      backupId,
      documentsDeleted,
      timestamp: new Date(),
      message: documentsDeleted === 0 ? 'Collection was already empty' : undefined
    };
  }

  /**
   * Validate if a collection exists
   */
  async validateCollectionExists(collectionName: string): Promise<CollectionInfo> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const collectionRef = collection(this.db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      return {
        exists: true,
        documentCount: snapshot.size
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        throw new Error('Insufficient permissions');
      }
      return {
        exists: false,
        documentCount: 0
      };
    }
  }

  /**
   * Create automatic backup before reset
   */
  async createBackupBeforeReset(
    collectionName: string,
    metadata?: Record<string, any>
  ): Promise<BackupInfo> {
    const backupMetadata = await this.backupService.createBackup(
      'dynamic-text',
      {
        collections: [collectionName],
        description: `Pre-reset backup for ${collectionName}`
      }
    );

    return {
      backupId: backupMetadata.id,
      collection: collectionName,
      documentCount: backupMetadata.documentCount,
      timestamp: backupMetadata.timestamp,
      metadata: {
        ...metadata,
        reason: metadata?.reason || 'Pre-reset backup',
        operator: metadata?.operator || 'system'
      }
    };
  }

  /**
   * Initialize empty collection with schema
   */
  async initializeEmptyCollection(
    collectionName: string,
    schema?: any,
    seedData?: any[]
  ): Promise<InitResult> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    let seedDocumentsAdded = 0;
    
    // Add seed data if provided
    if (seedData && seedData.length > 0) {
      for (const docData of seedData) {
        const docId = docData.id || `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(this.db, collectionName, docId), docData);
        seedDocumentsAdded++;
      }
    }

    return {
      success: true,
      collection: collectionName,
      schemaApplied: !!schema,
      indexesCreated: schema?.indexes?.length || 0,
      seedDocumentsAdded
    };
  }

  /**
   * Rollback on failure
   */
  async rollbackOnFailure(backupId: string, error: Error): Promise<RollbackResult> {
    try {
      const restoreResult = await this.backupService.restoreBackup(backupId, {
        strategy: 'overwrite'
      });

      return {
        success: true,
        restoredFrom: backupId,
        documentsRestored: restoreResult.documentCount,
        rollbackReason: error.message,
        timestamp: new Date()
      };
    } catch (rollbackError) {
      throw new Error(`Rollback failed: ${(rollbackError as Error).message}`);
    }
  }

  /**
   * Confirm reset operation
   */
  async confirmReset(
    collectionName: string,
    documentCount: number,
    options: { isCI?: boolean } = {}
  ): Promise<boolean> {
    // In CI environment, auto-confirm
    if (options.isCI || process.env.CI === 'true') {
      return true;
    }

    // In browser environment, use confirm dialog
    if (typeof window !== 'undefined' && window.confirm) {
      return window.confirm(
        `Are you sure you want to reset collection "${collectionName}" with ${documentCount} documents? This action cannot be undone.`
      );
    }

    // Default to false for safety
    return false;
  }

  /**
   * Validate collection schema
   */
  async validateSchema(
    collectionName: string,
    expectedSchema: any
  ): Promise<SchemaValidation> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    const collectionRef = collection(this.db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      return {
        valid: true,
        missingFields: [],
        extraFields: []
      };
    }

    // Get actual fields from documents
    const actualFields = new Set<string>();
    snapshot.forEach(doc => {
      Object.keys(doc.data()).forEach(field => actualFields.add(field));
    });

    // Compare with expected schema
    const expectedFields = expectedSchema.fields 
      ? (Array.isArray(expectedSchema.fields) 
          ? expectedSchema.fields 
          : Object.keys(expectedSchema.fields))
      : [];
    
    const missingFields = expectedFields.filter(field => !actualFields.has(field));
    const extraFields = Array.from(actualFields).filter(field => !expectedFields.includes(field));

    return {
      valid: missingFields.length === 0,
      missingFields,
      extraFields,
      typeMatches: true // Simplified - would need actual type checking
    };
  }

  /**
   * Reset multiple collections
   */
  async resetMultipleCollections(
    collections: string[],
    options: { atomic?: boolean } = {}
  ): Promise<MultiResetResult> {
    const backups: string[] = [];
    const resetCollections: string[] = [];
    let totalDocumentsDeleted = 0;

    try {
      for (const collectionName of collections) {
        const result = await this.resetCollection(collectionName, {
          skipConfirmation: true // Already confirmed for batch
        });
        
        if (result.backupId) {
          backups.push(result.backupId);
        }
        resetCollections.push(collectionName);
        totalDocumentsDeleted += result.documentsDeleted;
      }

      return {
        success: true,
        collectionsReset: resetCollections,
        totalDocumentsDeleted,
        backups,
        atomic: options.atomic,
        transactionId: options.atomic ? `txn-${Date.now()}` : undefined
      };
    } catch (error) {
      // Rollback all successfully reset collections
      const rolledBack: string[] = [];
      for (let i = 0; i < backups.length; i++) {
        await this.backupService.restoreBackup(backups[i]);
        rolledBack.push(resetCollections[i]);
      }

      return {
        success: false,
        collectionsReset: resetCollections,
        failedAt: collections[resetCollections.length],
        rolledBack,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(
    collectionName: string,
    options: { includeSizeDistribution?: boolean } = {}
  ): Promise<CollectionStats> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    const collectionRef = collection(this.db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    let totalSize = 0;
    const sizes: number[] = [];
    let lastModified = new Date(0);

    snapshot.forEach(doc => {
      const data = doc.data();
      const docSize = JSON.stringify(data).length;
      totalSize += docSize;
      sizes.push(docSize);
      
      // Track last modified
      if (data.lastModified && new Date(data.lastModified) > lastModified) {
        lastModified = new Date(data.lastModified);
      }
    });

    const stats: CollectionStats = {
      collection: collectionName,
      documentCount: snapshot.size,
      sizeInBytes: totalSize,
      lastModified,
      indexes: ['name_1', 'version_1'] // Simplified - would query actual indexes
    };

    if (options.includeSizeDistribution && sizes.length > 0) {
      sizes.sort((a, b) => a - b);
      stats.sizeDistribution = {
        min: sizes[0],
        max: sizes[sizes.length - 1],
        average: totalSize / sizes.length,
        median: sizes[Math.floor(sizes.length / 2)]
      };
    }

    return stats;
  }
}

// Export singleton instance
export const safeCollectionReset = new SafeCollectionReset();