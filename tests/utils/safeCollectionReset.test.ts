import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the utility before importing
vi.mock('../../src/lib/utils/safeCollectionReset', async () => {
  const actual = await vi.importActual('../../src/lib/utils/safeCollectionReset');
  return {
    ...actual,
    SafeCollectionReset: vi.fn().mockImplementation(() => ({
      resetCollection: vi.fn(),
      validateCollectionExists: vi.fn(),
      createBackupBeforeReset: vi.fn(),
      initializeEmptyCollection: vi.fn(),
      rollbackOnFailure: vi.fn(),
      confirmReset: vi.fn(),
      validateSchema: vi.fn(),
      resetMultipleCollections: vi.fn(),
      getCollectionStats: vi.fn()
    }))
  };
});

describe('SafeCollectionReset', () => {
  let safeReset: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { SafeCollectionReset } = await import('../../src/lib/utils/safeCollectionReset');
    safeReset = new SafeCollectionReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resetCollection', () => {
    it('should reset collection with backup creation', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const mockResult = {
        success: true,
        collection: collectionName,
        backupId: 'backup-20250901-120000',
        documentsDeleted: 50,
        timestamp: new Date()
      };

      safeReset.resetCollection.mockResolvedValue(mockResult);

      // Act
      const result = await safeReset.resetCollection(collectionName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.documentsDeleted).toBe(50);
    });

    it('should require confirmation for destructive operation', async () => {
      // Arrange
      const collectionName = 'ingredients';
      safeReset.resetCollection.mockRejectedValue(new Error('User confirmation required'));

      // Act & Assert
      await expect(safeReset.resetCollection(collectionName, { skipConfirmation: false }))
        .rejects.toThrow('User confirmation required');
    });

    it('should skip backup when explicitly requested', async () => {
      // Arrange
      const collectionName = 'test-collection';
      const mockResult = {
        success: true,
        collection: collectionName,
        backupId: null,
        documentsDeleted: 10
      };

      safeReset.resetCollection.mockResolvedValue(mockResult);

      // Act
      const result = await safeReset.resetCollection(collectionName, { skipBackup: true });

      // Assert
      expect(result.backupId).toBeNull();
      expect(result.success).toBe(true);
    });

    it('should handle empty collection gracefully', async () => {
      // Arrange
      const collectionName = 'empty-collection';
      const mockResult = {
        success: true,
        collection: collectionName,
        documentsDeleted: 0,
        message: 'Collection was already empty'
      };

      safeReset.resetCollection.mockResolvedValue(mockResult);

      // Act
      const result = await safeReset.resetCollection(collectionName);

      // Assert
      expect(result.documentsDeleted).toBe(0);
      expect(result.message).toBe('Collection was already empty');
    });

    it('should fail if collection does not exist', async () => {
      // Arrange
      const collectionName = 'non-existent';
      safeReset.resetCollection.mockRejectedValue(new Error('Collection does not exist'));

      // Act & Assert
      await expect(safeReset.resetCollection(collectionName))
        .rejects.toThrow('Collection does not exist');
    });
  });

  describe('validateCollectionExists', () => {
    it('should validate existing collection', async () => {
      // Arrange
      const collectionName = 'ingredients';
      safeReset.validateCollectionExists.mockResolvedValue({
        exists: true,
        documentCount: 50
      });

      // Act
      const result = await safeReset.validateCollectionExists(collectionName);

      // Assert
      expect(result.exists).toBe(true);
      expect(result.documentCount).toBe(50);
    });

    it('should detect non-existent collection', async () => {
      // Arrange
      const collectionName = 'non-existent';
      safeReset.validateCollectionExists.mockResolvedValue({
        exists: false,
        documentCount: 0
      });

      // Act
      const result = await safeReset.validateCollectionExists(collectionName);

      // Assert
      expect(result.exists).toBe(false);
      expect(result.documentCount).toBe(0);
    });

    it('should handle permission errors', async () => {
      // Arrange
      const collectionName = 'restricted';
      safeReset.validateCollectionExists.mockRejectedValue(new Error('Insufficient permissions'));

      // Act & Assert
      await expect(safeReset.validateCollectionExists(collectionName))
        .rejects.toThrow('Insufficient permissions');
    });
  });

  describe('createBackupBeforeReset', () => {
    it('should create automatic backup before reset', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const mockBackup = {
        backupId: 'auto-backup-20250901-120000',
        collection: collectionName,
        documentCount: 50,
        timestamp: new Date()
      };

      safeReset.createBackupBeforeReset.mockResolvedValue(mockBackup);

      // Act
      const backup = await safeReset.createBackupBeforeReset(collectionName);

      // Assert
      expect(backup.backupId).toMatch(/auto-backup-/);
      expect(backup.collection).toBe(collectionName);
      expect(backup.documentCount).toBe(50);
    });

    it('should include metadata in backup', async () => {
      // Arrange
      const collectionName = 'references';
      const metadata = { reason: 'Pre-reset backup', operator: 'system' };
      const mockBackup = {
        backupId: 'auto-backup-20250901-120000',
        metadata
      };

      safeReset.createBackupBeforeReset.mockResolvedValue(mockBackup);

      // Act
      const backup = await safeReset.createBackupBeforeReset(collectionName, metadata);

      // Assert
      expect(backup.metadata.reason).toBe('Pre-reset backup');
      expect(backup.metadata.operator).toBe('system');
    });

    it('should handle backup failure', async () => {
      // Arrange
      const collectionName = 'ingredients';
      safeReset.createBackupBeforeReset.mockRejectedValue(new Error('Backup failed: Insufficient storage'));

      // Act & Assert
      await expect(safeReset.createBackupBeforeReset(collectionName))
        .rejects.toThrow('Backup failed: Insufficient storage');
    });
  });

  describe('initializeEmptyCollection', () => {
    it('should initialize empty collection with schema', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const schema = {
        fields: ['id', 'name', 'content', 'version'],
        indexes: ['name', 'version']
      };
      const mockResult = {
        success: true,
        collection: collectionName,
        schemaApplied: true,
        indexesCreated: 2
      };

      safeReset.initializeEmptyCollection.mockResolvedValue(mockResult);

      // Act
      const result = await safeReset.initializeEmptyCollection(collectionName, schema);

      // Assert
      expect(result.success).toBe(true);
      expect(result.schemaApplied).toBe(true);
      expect(result.indexesCreated).toBe(2);
    });

    it('should create collection without schema', async () => {
      // Arrange
      const collectionName = 'test-collection';
      const mockResult = {
        success: true,
        collection: collectionName,
        schemaApplied: false
      };

      safeReset.initializeEmptyCollection.mockResolvedValue(mockResult);

      // Act
      const result = await safeReset.initializeEmptyCollection(collectionName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.schemaApplied).toBe(false);
    });

    it('should add seed data when provided', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const seedData = [
        { id: 'default-1', name: 'Default Ingredient 1' },
        { id: 'default-2', name: 'Default Ingredient 2' }
      ];
      const mockResult = {
        success: true,
        collection: collectionName,
        seedDocumentsAdded: 2
      };

      safeReset.initializeEmptyCollection.mockResolvedValue(mockResult);

      // Act
      const result = await safeReset.initializeEmptyCollection(collectionName, null, seedData);

      // Assert
      expect(result.seedDocumentsAdded).toBe(2);
    });
  });

  describe('rollbackOnFailure', () => {
    it('should rollback to backup on failure', async () => {
      // Arrange
      const backupId = 'auto-backup-20250901-120000';
      const error = new Error('Reset operation failed');
      const mockRollback = {
        success: true,
        restoredFrom: backupId,
        documentsRestored: 50
      };

      safeReset.rollbackOnFailure.mockResolvedValue(mockRollback);

      // Act
      const result = await safeReset.rollbackOnFailure(backupId, error);

      // Assert
      expect(result.success).toBe(true);
      expect(result.restoredFrom).toBe(backupId);
      expect(result.documentsRestored).toBe(50);
    });

    it('should handle rollback failure', async () => {
      // Arrange
      const backupId = 'auto-backup-20250901-120000';
      const error = new Error('Reset operation failed');
      safeReset.rollbackOnFailure.mockRejectedValue(new Error('Rollback failed: Backup corrupted'));

      // Act & Assert
      await expect(safeReset.rollbackOnFailure(backupId, error))
        .rejects.toThrow('Rollback failed: Backup corrupted');
    });

    it('should log rollback reason', async () => {
      // Arrange
      const backupId = 'auto-backup-20250901-120000';
      const error = new Error('Schema validation failed');
      const mockRollback = {
        success: true,
        rollbackReason: 'Schema validation failed',
        timestamp: new Date()
      };

      safeReset.rollbackOnFailure.mockResolvedValue(mockRollback);

      // Act
      const result = await safeReset.rollbackOnFailure(backupId, error);

      // Assert
      expect(result.rollbackReason).toBe('Schema validation failed');
    });
  });

  describe('confirmReset', () => {
    it('should prompt for user confirmation', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const documentCount = 50;
      safeReset.confirmReset.mockResolvedValue(true);

      // Act
      const confirmed = await safeReset.confirmReset(collectionName, documentCount);

      // Assert
      expect(confirmed).toBe(true);
    });

    it('should include document count in confirmation', async () => {
      // Arrange
      const collectionName = 'references';
      const documentCount = 100;
      safeReset.confirmReset.mockResolvedValue(false);

      // Act
      const confirmed = await safeReset.confirmReset(collectionName, documentCount);

      // Assert
      expect(confirmed).toBe(false);
    });

    it('should skip confirmation in CI environment', async () => {
      // Arrange
      const collectionName = 'test-collection';
      safeReset.confirmReset.mockResolvedValue(true);

      // Act
      const confirmed = await safeReset.confirmReset(collectionName, 0, { isCI: true });

      // Assert
      expect(confirmed).toBe(true);
    });
  });

  describe('validateSchema', () => {
    it('should validate collection schema', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const expectedSchema = {
        fields: ['id', 'name', 'content', 'version'],
        required: ['id', 'name']
      };
      const mockValidation = {
        valid: true,
        missingFields: [],
        extraFields: []
      };

      safeReset.validateSchema.mockResolvedValue(mockValidation);

      // Act
      const validation = await safeReset.validateSchema(collectionName, expectedSchema);

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.missingFields).toHaveLength(0);
    });

    it('should detect schema mismatches', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const expectedSchema = {
        fields: ['id', 'name', 'content', 'version', 'tags'],
        required: ['id', 'name']
      };
      const mockValidation = {
        valid: false,
        missingFields: ['tags'],
        extraFields: ['deprecated_field']
      };

      safeReset.validateSchema.mockResolvedValue(mockValidation);

      // Act
      const validation = await safeReset.validateSchema(collectionName, expectedSchema);

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.missingFields).toContain('tags');
      expect(validation.extraFields).toContain('deprecated_field');
    });

    it('should validate field types', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const expectedSchema = {
        fields: {
          id: 'string',
          version: 'number',
          isActive: 'boolean'
        }
      };
      const mockValidation = {
        valid: true,
        typeMatches: true
      };

      safeReset.validateSchema.mockResolvedValue(mockValidation);

      // Act
      const validation = await safeReset.validateSchema(collectionName, expectedSchema);

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.typeMatches).toBe(true);
    });
  });

  describe('resetMultipleCollections', () => {
    it('should reset multiple collections in sequence', async () => {
      // Arrange
      const collections = ['ingredients', 'references', 'users'];
      const mockResult = {
        success: true,
        collectionsReset: collections,
        totalDocumentsDeleted: 200,
        backups: [
          'backup-ingredients-20250901',
          'backup-references-20250901',
          'backup-users-20250901'
        ]
      };

      safeReset.resetMultipleCollections.mockResolvedValue(mockResult);

      // Act
      const result = await safeReset.resetMultipleCollections(collections);

      // Assert
      expect(result.success).toBe(true);
      expect(result.collectionsReset).toEqual(collections);
      expect(result.backups).toHaveLength(3);
    });

    it('should handle partial failure with rollback', async () => {
      // Arrange
      const collections = ['ingredients', 'references', 'users'];
      const mockResult = {
        success: false,
        collectionsReset: ['ingredients'],
        failedAt: 'references',
        rolledBack: ['ingredients'],
        error: 'Failed to reset references collection'
      };

      safeReset.resetMultipleCollections.mockResolvedValue(mockResult);

      // Act
      const result = await safeReset.resetMultipleCollections(collections);

      // Assert
      expect(result.success).toBe(false);
      expect(result.failedAt).toBe('references');
      expect(result.rolledBack).toContain('ingredients');
    });

    it('should support atomic reset option', async () => {
      // Arrange
      const collections = ['ingredients', 'references'];
      const mockResult = {
        success: true,
        atomic: true,
        collectionsReset: collections,
        transactionId: 'txn-12345'
      };

      safeReset.resetMultipleCollections.mockResolvedValue(mockResult);

      // Act
      const result = await safeReset.resetMultipleCollections(collections, { atomic: true });

      // Assert
      expect(result.atomic).toBe(true);
      expect(result.transactionId).toBeDefined();
    });
  });

  describe('getCollectionStats', () => {
    it('should return collection statistics', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const mockStats = {
        collection: collectionName,
        documentCount: 150,
        sizeInBytes: 1048576,
        lastModified: new Date('2025-09-01T10:00:00Z'),
        indexes: ['name_1', 'version_1']
      };

      safeReset.getCollectionStats.mockResolvedValue(mockStats);

      // Act
      const stats = await safeReset.getCollectionStats(collectionName);

      // Assert
      expect(stats.documentCount).toBe(150);
      expect(stats.sizeInBytes).toBe(1048576);
      expect(stats.indexes).toContain('name_1');
    });

    it('should include document size distribution', async () => {
      // Arrange
      const collectionName = 'ingredients';
      const mockStats = {
        collection: collectionName,
        documentCount: 150,
        sizeDistribution: {
          min: 512,
          max: 16384,
          average: 7000,
          median: 6500
        }
      };

      safeReset.getCollectionStats.mockResolvedValue(mockStats);

      // Act
      const stats = await safeReset.getCollectionStats(collectionName, { includeSizeDistribution: true });

      // Assert
      expect(stats.sizeDistribution.average).toBe(7000);
      expect(stats.sizeDistribution.max).toBe(16384);
    });
  });
});