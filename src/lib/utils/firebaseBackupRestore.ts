import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  type Firestore,
  type DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  projectId: string;
  collections: string[];
  documentCount: number;
  sizeInBytes: number;
  path: string;
  description?: string;
  checksum?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredCollections: string[];
  documentCount: number;
  timestamp: Date;
  strategy?: 'merge' | 'overwrite';
  conflictsResolved?: number;
  deletedDocuments?: number;
}

export interface ExportResult {
  collection: string;
  documentCount: number;
  exportPath: string;
  format: 'json' | 'csv';
  query?: any;
}

export interface ImportResult {
  success: boolean;
  collection: string;
  documentsImported: number;
  errors: string[];
  duplicatesSkipped?: number;
  duplicateIds?: string[];
  batchSize?: number;
  batchesProcessed?: number;
}

export interface ValidationResult {
  valid: boolean;
  checksumValid?: boolean;
  collectionsPresent?: string[];
  documentCount?: number;
  errors: string[];
  schemaValid?: boolean;
  collectionSchemas?: Record<string, { valid: boolean; fields: string[] }>;
}

export class FirebaseBackupRestore {
  private backupDir = './backups';
  private db: Firestore | null = null;

  constructor(firestore?: Firestore) {
    this.db = firestore || db;
  }

  /**
   * Create a backup of Firestore data
   */
  async createBackup(
    projectId: string, 
    options: { 
      collections?: string[]; 
      description?: string;
    } = {}
  ): Promise<BackupMetadata> {
    const timestamp = new Date();
    const backupId = `backup-${this.formatTimestamp(timestamp)}`;
    const backupPath = `${this.backupDir}/${backupId}`;

    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    // Get collections to backup
    const collectionsToBackup = options.collections || ['ingredients', 'references'];
    let totalDocuments = 0;
    const backupData: Record<string, any[]> = {};

    // Backup each collection
    for (const collectionName of collectionsToBackup) {
      const collectionRef = collection(this.db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      backupData[collectionName] = [];
      snapshot.forEach(doc => {
        backupData[collectionName].push({
          id: doc.id,
          data: doc.data()
        });
        totalDocuments++;
      });
    }

    // Calculate size (rough estimate)
    const sizeInBytes = JSON.stringify(backupData).length;

    // Create metadata
    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      projectId,
      collections: collectionsToBackup,
      documentCount: totalDocuments,
      sizeInBytes,
      path: backupPath,
      description: options.description,
      checksum: this.generateChecksum(JSON.stringify(backupData))
    };

    // In a real implementation, you would save this to file system or cloud storage
    // For now, we'll store it in localStorage for browser environment
    if (typeof window !== 'undefined') {
      localStorage.setItem(`backup_${backupId}`, JSON.stringify(backupData));
      localStorage.setItem(`backup_metadata_${backupId}`, JSON.stringify(metadata));
    }

    return metadata;
  }

  /**
   * Restore data from a backup
   */
  async restoreBackup(
    backupId: string,
    options: {
      collections?: string[];
      strategy?: 'merge' | 'overwrite';
    } = {}
  ): Promise<RestoreResult> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    // Get backup data
    const backupDataStr = typeof window !== 'undefined' 
      ? localStorage.getItem(`backup_${backupId}`)
      : null;

    if (!backupDataStr) {
      throw new Error('Backup not found');
    }

    const backupData = JSON.parse(backupDataStr);
    const strategy = options.strategy || 'merge';
    const collectionsToRestore = options.collections || Object.keys(backupData);
    
    let documentsRestored = 0;
    let deletedDocuments = 0;
    let conflictsResolved = 0;

    for (const collectionName of collectionsToRestore) {
      if (!backupData[collectionName]) continue;

      const collectionRef = collection(this.db, collectionName);

      // If overwrite strategy, delete existing documents first
      if (strategy === 'overwrite') {
        const existingDocs = await getDocs(collectionRef);
        for (const existingDoc of existingDocs.docs) {
          await deleteDoc(doc(this.db, collectionName, existingDoc.id));
          deletedDocuments++;
        }
      }

      // Restore documents
      for (const docData of backupData[collectionName]) {
        const docRef = doc(this.db, collectionName, docData.id);
        
        if (strategy === 'merge') {
          // Check if document exists
          const existingDoc = await getDocs(collection(this.db, collectionName));
          if (existingDoc.docs.find(d => d.id === docData.id)) {
            conflictsResolved++;
          }
        }

        await setDoc(docRef, docData.data, { merge: strategy === 'merge' });
        documentsRestored++;
      }
    }

    return {
      success: true,
      restoredCollections: collectionsToRestore,
      documentCount: documentsRestored,
      timestamp: new Date(),
      strategy,
      conflictsResolved: strategy === 'merge' ? conflictsResolved : undefined,
      deletedDocuments: strategy === 'overwrite' ? deletedDocuments : undefined
    };
  }

  /**
   * List available backups
   */
  async listBackups(options: {
    after?: Date;
    sortBy?: 'timestamp';
    order?: 'asc' | 'desc';
  } = {}): Promise<BackupMetadata[]> {
    const backups: BackupMetadata[] = [];

    if (typeof window !== 'undefined') {
      // Get all backup metadata from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('backup_metadata_')) {
          const metadataStr = localStorage.getItem(key);
          if (metadataStr) {
            const metadata = JSON.parse(metadataStr);
            metadata.timestamp = new Date(metadata.timestamp);
            
            // Apply filters
            if (options.after && metadata.timestamp < options.after) {
              continue;
            }
            
            backups.push(metadata);
          }
        }
      }
    }

    // Sort backups
    if (options.sortBy === 'timestamp') {
      backups.sort((a, b) => {
        const diff = a.timestamp.getTime() - b.timestamp.getTime();
        return options.order === 'desc' ? -diff : diff;
      });
    }

    return backups;
  }

  /**
   * Validate a backup
   */
  async validateBackup(
    backupId: string,
    options: { validateSchema?: boolean } = {}
  ): Promise<ValidationResult> {
    const backupDataStr = typeof window !== 'undefined' 
      ? localStorage.getItem(`backup_${backupId}`)
      : null;
    
    const metadataStr = typeof window !== 'undefined'
      ? localStorage.getItem(`backup_metadata_${backupId}`)
      : null;

    const errors: string[] = [];
    
    if (!backupDataStr) {
      errors.push('Backup data not found');
    }
    
    if (!metadataStr) {
      errors.push('Missing metadata file');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        checksumValid: false,
        errors
      };
    }

    const backupData = JSON.parse(backupDataStr!);
    const metadata = JSON.parse(metadataStr!);
    
    // Validate checksum
    const currentChecksum = this.generateChecksum(backupDataStr!);
    const checksumValid = currentChecksum === metadata.checksum;
    
    if (!checksumValid) {
      errors.push('Checksum mismatch');
    }

    // Validate schema if requested
    let schemaValid = true;
    const collectionSchemas: Record<string, { valid: boolean; fields: string[] }> = {};
    
    if (options.validateSchema) {
      for (const [collectionName, documents] of Object.entries(backupData)) {
        const fields = new Set<string>();
        (documents as any[]).forEach(doc => {
          Object.keys(doc.data).forEach(field => fields.add(field));
        });
        
        collectionSchemas[collectionName] = {
          valid: fields.size > 0,
          fields: Array.from(fields)
        };
        
        if (fields.size === 0) {
          schemaValid = false;
        }
      }
    }

    return {
      valid: errors.length === 0 && checksumValid,
      checksumValid,
      collectionsPresent: Object.keys(backupData),
      documentCount: Object.values(backupData).reduce((sum, docs) => sum + (docs as any[]).length, 0),
      errors,
      schemaValid: options.validateSchema ? schemaValid : undefined,
      collectionSchemas: options.validateSchema ? collectionSchemas : undefined
    };
  }

  /**
   * Export a collection to JSON or CSV
   */
  async exportCollection(
    collectionName: string,
    options: {
      format?: 'json' | 'csv';
      query?: any;
    } = {}
  ): Promise<ExportResult> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    const format = options.format || 'json';
    const exportPath = `./exports/${collectionName}-${this.formatTimestamp(new Date())}.${format}`;
    
    // Get collection data
    const collectionRef = collection(this.db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    const documents: any[] = [];
    snapshot.forEach(doc => {
      // Apply query filter if provided
      if (options.query) {
        // Simple query implementation - in real app would use Firestore queries
        const data = doc.data();
        if (options.query.where) {
          const shouldInclude = Object.entries(options.query.where).every(
            ([field, value]) => data[field] === value
          );
          if (!shouldInclude) return;
        }
      }
      
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Format data based on export format
    let exportData: string;
    if (format === 'csv') {
      // Convert to CSV
      const headers = documents.length > 0 ? Object.keys(documents[0]) : [];
      const csvRows = [
        headers.join(','),
        ...documents.map(doc => 
          headers.map(header => JSON.stringify(doc[header] || '')).join(',')
        )
      ];
      exportData = csvRows.join('\n');
    } else {
      exportData = JSON.stringify(documents, null, 2);
    }

    // In a real implementation, save to file system
    if (typeof window !== 'undefined') {
      localStorage.setItem(`export_${collectionName}_${Date.now()}`, exportData);
    }

    return {
      collection: collectionName,
      documentCount: documents.length,
      exportPath,
      format,
      query: options.query
    };
  }

  /**
   * Import data into a collection
   */
  async importCollection(
    importPath: string,
    collectionName: string,
    options: {
      skipDuplicates?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<ImportResult> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    // In a real implementation, read from file system
    // For now, we'll simulate with localStorage
    const importKey = importPath.split('/').pop()?.replace(/\.[^/.]+$/, '');
    const importDataStr = typeof window !== 'undefined'
      ? localStorage.getItem(`export_${importKey}`)
      : null;

    if (!importDataStr) {
      throw new Error('Invalid data format');
    }

    let documents: any[];
    try {
      documents = JSON.parse(importDataStr);
    } catch (error) {
      throw new Error('Invalid data format');
    }

    const batchSize = options.batchSize || 100;
    const errors: string[] = [];
    let documentsImported = 0;
    let duplicatesSkipped = 0;
    const duplicateIds: string[] = [];
    let batchesProcessed = 0;

    // Process in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      for (const docData of batch) {
        const docId = docData.id || this.generateDocId();
        const docRef = doc(this.db, collectionName, docId);
        
        try {
          if (options.skipDuplicates) {
            // Check if document exists
            const existingDocs = await getDocs(collection(this.db, collectionName));
            if (existingDocs.docs.find(d => d.id === docId)) {
              duplicatesSkipped++;
              duplicateIds.push(docId);
              continue;
            }
          }
          
          const { id, ...data } = docData;
          await setDoc(docRef, data);
          documentsImported++;
        } catch (error) {
          errors.push(`Failed to import document ${docId}: ${error}`);
        }
      }
      
      batchesProcessed++;
    }

    return {
      success: errors.length === 0,
      collection: collectionName,
      documentsImported,
      errors,
      duplicatesSkipped: options.skipDuplicates ? duplicatesSkipped : undefined,
      duplicateIds: options.skipDuplicates ? duplicateIds : undefined,
      batchSize,
      batchesProcessed
    };
  }

  /**
   * Delete a backup
   */
  async deleteBackup(
    backupId: string,
    options: { confirm?: boolean } = {}
  ): Promise<{ success: boolean; deleted: string }> {
    if (options.confirm === false) {
      throw new Error('Confirmation required');
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(`backup_${backupId}`);
      localStorage.removeItem(`backup_metadata_${backupId}`);
    }

    return {
      success: true,
      deleted: backupId
    };
  }

  /**
   * Get backup metadata
   */
  async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    const metadataStr = typeof window !== 'undefined'
      ? localStorage.getItem(`backup_metadata_${backupId}`)
      : null;

    if (!metadataStr) {
      return null;
    }

    const metadata = JSON.parse(metadataStr);
    metadata.timestamp = new Date(metadata.timestamp);
    return metadata;
  }

  // Helper methods
  private formatTimestamp(date: Date): string {
    return date.toISOString()
      .replace(/[:.]/g, '')
      .replace('T', '-')
      .slice(0, 15);
  }

  private generateChecksum(data: string): string {
    // Simple checksum implementation - in production use crypto
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private generateDocId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const firebaseBackupRestore = new FirebaseBackupRestore();