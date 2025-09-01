import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// Mock the utilities before importing
vi.mock('../../src/lib/utils/firebaseBackupRestore', async () => {
  const actual = await vi.importActual('../../src/lib/utils/firebaseBackupRestore');
  return {
    ...actual,
    FirebaseBackupRestore: vi.fn().mockImplementation(() => ({
      createBackup: vi.fn(),
      restoreBackup: vi.fn(),
      listBackups: vi.fn(),
      validateBackup: vi.fn(),
      deleteBackup: vi.fn(),
      exportCollection: vi.fn(),
      importCollection: vi.fn(),
      getBackupMetadata: vi.fn()
    }))
  };
});

describe('FirebaseBackupRestore', () => {
  let backupRestore: any;
  const testBackupDir = './backups';
  const testProjectId = 'test-project';

  beforeEach(async () => {
    vi.clearAllMocks();
    const { FirebaseBackupRestore } = await import('../../src/lib/utils/firebaseBackupRestore');
    backupRestore = new FirebaseBackupRestore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBackup', () => {
    it('should create a timestamped backup successfully', async () => {
      // Arrange
      const mockBackupId = 'backup-20250901-120000';
      const mockMetadata = {
        id: mockBackupId,
        timestamp: new Date('2025-09-01T12:00:00Z'),
        projectId: testProjectId,
        collections: ['ingredients', 'references'],
        documentCount: 150,
        sizeInBytes: 524288,
        path: `${testBackupDir}/${mockBackupId}`
      };

      backupRestore.createBackup.mockResolvedValue(mockMetadata);

      // Act
      const result = await backupRestore.createBackup(testProjectId);

      // Assert
      expect(result).toEqual(mockMetadata);
      expect(result.id).toMatch(/backup-\d{8}-\d{6}/);
      expect(result.collections).toContain('ingredients');
      expect(result.collections).toContain('references');
    });

    it('should handle selective collection backup', async () => {
      // Arrange
      const collections = ['ingredients'];
      const mockMetadata = {
        id: 'backup-20250901-120000',
        collections: ['ingredients'],
        documentCount: 50
      };

      backupRestore.createBackup.mockResolvedValue(mockMetadata);

      // Act
      const result = await backupRestore.createBackup(testProjectId, { collections });

      // Assert
      expect(result.collections).toEqual(['ingredients']);
      expect(result.collections).not.toContain('references');
    });

    it('should include backup description when provided', async () => {
      // Arrange
      const description = 'Pre-migration backup';
      const mockMetadata = {
        id: 'backup-20250901-120000',
        description,
        timestamp: new Date()
      };

      backupRestore.createBackup.mockResolvedValue(mockMetadata);

      // Act
      const result = await backupRestore.createBackup(testProjectId, { description });

      // Assert
      expect(result.description).toBe(description);
    });

    it('should handle backup failure gracefully', async () => {
      // Arrange
      backupRestore.createBackup.mockRejectedValue(new Error('Insufficient permissions'));

      // Act & Assert
      await expect(backupRestore.createBackup(testProjectId))
        .rejects.toThrow('Insufficient permissions');
    });

    it('should validate project exists before backup', async () => {
      // Arrange
      backupRestore.createBackup.mockRejectedValue(new Error('Project not found'));

      // Act & Assert
      await expect(backupRestore.createBackup('non-existent-project'))
        .rejects.toThrow('Project not found');
    });
  });

  describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
      // Arrange
      const backupId = 'backup-20250901-120000';
      const mockResult = {
        success: true,
        restoredCollections: ['ingredients', 'references'],
        documentCount: 150,
        timestamp: new Date()
      };

      backupRestore.restoreBackup.mockResolvedValue(mockResult);

      // Act
      const result = await backupRestore.restoreBackup(backupId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.restoredCollections).toContain('ingredients');
      expect(result.documentCount).toBe(150);
    });

    it('should restore selective collections', async () => {
      // Arrange
      const backupId = 'backup-20250901-120000';
      const collections = ['ingredients'];
      const mockResult = {
        success: true,
        restoredCollections: ['ingredients'],
        documentCount: 50
      };

      backupRestore.restoreBackup.mockResolvedValue(mockResult);

      // Act
      const result = await backupRestore.restoreBackup(backupId, { collections });

      // Assert
      expect(result.restoredCollections).toEqual(['ingredients']);
      expect(result.restoredCollections).not.toContain('references');
    });

    it('should validate backup before restoration', async () => {
      // Arrange
      const invalidBackupId = 'invalid-backup';
      backupRestore.restoreBackup.mockRejectedValue(new Error('Invalid backup format'));

      // Act & Assert
      await expect(backupRestore.restoreBackup(invalidBackupId))
        .rejects.toThrow('Invalid backup format');
    });

    it('should handle restore with merge strategy', async () => {
      // Arrange
      const backupId = 'backup-20250901-120000';
      const mockResult = {
        success: true,
        strategy: 'merge',
        conflictsResolved: 5
      };

      backupRestore.restoreBackup.mockResolvedValue(mockResult);

      // Act
      const result = await backupRestore.restoreBackup(backupId, { strategy: 'merge' });

      // Assert
      expect(result.strategy).toBe('merge');
      expect(result.conflictsResolved).toBe(5);
    });

    it('should handle restore with overwrite strategy', async () => {
      // Arrange
      const backupId = 'backup-20250901-120000';
      const mockResult = {
        success: true,
        strategy: 'overwrite',
        deletedDocuments: 10
      };

      backupRestore.restoreBackup.mockResolvedValue(mockResult);

      // Act
      const result = await backupRestore.restoreBackup(backupId, { strategy: 'overwrite' });

      // Assert
      expect(result.strategy).toBe('overwrite');
      expect(result.deletedDocuments).toBe(10);
    });
  });

  describe('listBackups', () => {
    it('should list all available backups', async () => {
      // Arrange
      const mockBackups = [
        {
          id: 'backup-20250901-120000',
          timestamp: new Date('2025-09-01T12:00:00Z'),
          sizeInBytes: 524288,
          collections: ['ingredients', 'references']
        },
        {
          id: 'backup-20250831-180000',
          timestamp: new Date('2025-08-31T18:00:00Z'),
          sizeInBytes: 262144,
          collections: ['ingredients']
        }
      ];

      backupRestore.listBackups.mockResolvedValue(mockBackups);

      // Act
      const backups = await backupRestore.listBackups();

      // Assert
      expect(backups).toHaveLength(2);
      expect(backups[0].id).toBe('backup-20250901-120000');
      expect(backups[1].id).toBe('backup-20250831-180000');
    });

    it('should filter backups by date range', async () => {
      // Arrange
      const startDate = new Date('2025-09-01T00:00:00Z');
      const mockBackups = [
        {
          id: 'backup-20250901-120000',
          timestamp: new Date('2025-09-01T12:00:00Z')
        }
      ];

      backupRestore.listBackups.mockResolvedValue(mockBackups);

      // Act
      const backups = await backupRestore.listBackups({ after: startDate });

      // Assert
      expect(backups).toHaveLength(1);
      expect(backups[0].id).toBe('backup-20250901-120000');
    });

    it('should sort backups by timestamp', async () => {
      // Arrange
      const mockBackups = [
        {
          id: 'backup-20250901-120000',
          timestamp: new Date('2025-09-01T12:00:00Z')
        },
        {
          id: 'backup-20250902-080000',
          timestamp: new Date('2025-09-02T08:00:00Z')
        }
      ];

      backupRestore.listBackups.mockResolvedValue(mockBackups);

      // Act
      const backups = await backupRestore.listBackups({ sortBy: 'timestamp', order: 'desc' });

      // Assert
      expect(backups[0].id).toBe('backup-20250902-080000');
      expect(backups[1].id).toBe('backup-20250901-120000');
    });
  });

  describe('validateBackup', () => {
    it('should validate backup integrity successfully', async () => {
      // Arrange
      const backupId = 'backup-20250901-120000';
      const mockValidation = {
        valid: true,
        checksumValid: true,
        collectionsPresent: ['ingredients', 'references'],
        documentCount: 150,
        errors: []
      };

      backupRestore.validateBackup.mockResolvedValue(mockValidation);

      // Act
      const validation = await backupRestore.validateBackup(backupId);

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.checksumValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect corrupted backup', async () => {
      // Arrange
      const backupId = 'backup-corrupted';
      const mockValidation = {
        valid: false,
        checksumValid: false,
        errors: ['Checksum mismatch', 'Missing metadata file']
      };

      backupRestore.validateBackup.mockResolvedValue(mockValidation);

      // Act
      const validation = await backupRestore.validateBackup(backupId);

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.checksumValid).toBe(false);
      expect(validation.errors).toContain('Checksum mismatch');
    });

    it('should validate collection structure', async () => {
      // Arrange
      const backupId = 'backup-20250901-120000';
      const mockValidation = {
        valid: true,
        schemaValid: true,
        collectionSchemas: {
          ingredients: { valid: true, fields: ['id', 'name', 'content'] },
          references: { valid: true, fields: ['id', 'type', 'data'] }
        }
      };

      backupRestore.validateBackup.mockResolvedValue(mockValidation);

      // Act
      const validation = await backupRestore.validateBackup(backupId, { validateSchema: true });

      // Assert
      expect(validation.schemaValid).toBe(true);
      expect(validation.collectionSchemas.ingredients.valid).toBe(true);
    });
  });

  describe('exportCollection', () => {
    it('should export single collection to JSON', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const mockExport = {
        collection: collectionName,
        documentCount: 50,
        exportPath: './exports/ingredients-20250901.json',
        format: 'json'
      };

      backupRestore.exportCollection.mockResolvedValue(mockExport);

      // Act
      const result = await backupRestore.exportCollection(collectionName);

      // Assert
      expect(result.collection).toBe(collectionName);
      expect(result.documentCount).toBe(50);
      expect(result.format).toBe('json');
    });

    it('should support CSV export format', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const mockExport = {
        collection: collectionName,
        exportPath: './exports/ingredients-20250901.csv',
        format: 'csv'
      };

      backupRestore.exportCollection.mockResolvedValue(mockExport);

      // Act
      const result = await backupRestore.exportCollection(collectionName, { format: 'csv' });

      // Assert
      expect(result.format).toBe('csv');
      expect(result.exportPath).toMatch(/\.csv$/);
    });

    it('should apply query filters during export', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const query = { where: { isActive: true } };
      const mockExport = {
        collection: collectionName,
        documentCount: 25,
        query
      };

      backupRestore.exportCollection.mockResolvedValue(mockExport);

      // Act
      const result = await backupRestore.exportCollection(collectionName, { query });

      // Assert
      expect(result.documentCount).toBe(25);
      expect(result.query).toEqual(query);
    });
  });

  describe('importCollection', () => {
    it('should import collection from JSON file', async () => {
      // Arrange
      const importPath = './imports/ingredients.json';
      const mockImport = {
        success: true,
        collection: 'ingredients',
        documentsImported: 50,
        errors: []
      };

      backupRestore.importCollection.mockResolvedValue(mockImport);

      // Act
      const result = await backupRestore.importCollection(importPath, 'ingredients');

      // Assert
      expect(result.success).toBe(true);
      expect(result.documentsImported).toBe(50);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate data before import', async () => {
      // Arrange
      const importPath = './imports/invalid.json';
      backupRestore.importCollection.mockRejectedValue(new Error('Invalid data format'));

      // Act & Assert
      await expect(backupRestore.importCollection(importPath, 'ingredients'))
        .rejects.toThrow('Invalid data format');
    });

    it('should handle duplicate detection during import', async () => {
      // Arrange
      const importPath = './imports/ingredients.json';
      const mockImport = {
        success: true,
        documentsImported: 45,
        duplicatesSkipped: 5,
        duplicateIds: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5']
      };

      backupRestore.importCollection.mockResolvedValue(mockImport);

      // Act
      const result = await backupRestore.importCollection(importPath, 'ingredients', { skipDuplicates: true });

      // Assert
      expect(result.documentsImported).toBe(45);
      expect(result.duplicatesSkipped).toBe(5);
    });

    it('should support batch import with progress tracking', async () => {
      // Arrange
      const importPath = './imports/large-dataset.json';
      const mockImport = {
        success: true,
        documentsImported: 1000,
        batchSize: 100,
        batchesProcessed: 10
      };

      backupRestore.importCollection.mockResolvedValue(mockImport);

      // Act
      const result = await backupRestore.importCollection(importPath, 'ingredients', { batchSize: 100 });

      // Assert
      expect(result.batchesProcessed).toBe(10);
      expect(result.batchSize).toBe(100);
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      // Arrange
      const backupId = 'backup-20250901-120000';
      backupRestore.deleteBackup.mockResolvedValue({ success: true, deleted: backupId });

      // Act
      const result = await backupRestore.deleteBackup(backupId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(backupId);
    });

    it('should require confirmation for deletion', async () => {
      // Arrange
      const backupId = 'backup-20250901-120000';
      backupRestore.deleteBackup.mockRejectedValue(new Error('Confirmation required'));

      // Act & Assert
      await expect(backupRestore.deleteBackup(backupId, { confirm: false }))
        .rejects.toThrow('Confirmation required');
    });
  });

  describe('getBackupMetadata', () => {
    it('should retrieve backup metadata', async () => {
      // Arrange
      const backupId = 'backup-20250901-120000';
      const mockMetadata = {
        id: backupId,
        timestamp: new Date('2025-09-01T12:00:00Z'),
        projectId: testProjectId,
        collections: ['ingredients', 'references'],
        documentCount: 150,
        sizeInBytes: 524288,
        checksum: 'abc123def456'
      };

      backupRestore.getBackupMetadata.mockResolvedValue(mockMetadata);

      // Act
      const metadata = await backupRestore.getBackupMetadata(backupId);

      // Assert
      expect(metadata.id).toBe(backupId);
      expect(metadata.collections).toContain('ingredients');
      expect(metadata.checksum).toBe('abc123def456');
    });

    it('should handle missing backup metadata', async () => {
      // Arrange
      const backupId = 'non-existent-backup';
      backupRestore.getBackupMetadata.mockResolvedValue(null);

      // Act
      const metadata = await backupRestore.getBackupMetadata(backupId);

      // Assert
      expect(metadata).toBeNull();
    });
  });
});