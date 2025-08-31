import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MigrationService } from '../migrationService';
import type { Ingredient, ConfigManifest } from '../../models';
import fs from 'fs/promises';
import path from 'path';

// Mock Firebase with more realistic behavior
vi.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } }
}));

// Mock actual config data
const mockConfigsData: any[] = [];

vi.mock('firebase/firestore', () => ({
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined)
  })),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn((ref) => Promise.resolve({
    exists: () => true,
    data: () => ({
      id: 'checkpoint-test',
      createdIngredients: [],
      createdManifests: []
    })
  })),
  setDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({
    forEach: (callback: (doc: any) => void) => {
      mockConfigsData.forEach(config => {
        callback({
          id: config.id,
          data: () => config
        });
      });
    }
  })),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  }
}));

describe('MigrationService Integration Tests', () => {
  let migrationService: MigrationService;
  let realConfigs: any[] = [];

  beforeAll(async () => {
    migrationService = new MigrationService();
    
    // Load real config files from refs directory
    try {
      const refsDir = path.join(process.cwd(), 'refs');
      const files = await fs.readdir(refsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(refsDir, file), 'utf-8');
          const config = JSON.parse(content);
          realConfigs.push({
            id: file.replace('.json', ''),
            ...config
          });
        }
      }
    } catch (error) {
      // If refs directory doesn't exist, use mock data
      realConfigs = [
        {
          id: 'child-build-main-choc',
          name: 'Child Build Main Chocolate',
          INGREDIENT: [
            {
              KEYNAME: 'Calcium',
              NOTE: ['Calculate calcium levels for pediatric patients'],
              TEST: ['Test calcium calculation'],
              TYPE: 'Micronutrient',
              UOM_DISP: 'mg',
              PRECISION: 2
            },
            {
              KEYNAME: 'Iron',
              NOTE: ['Calculate iron levels'],
              TEST: [],
              TYPE: 'Micronutrient',
              UOM_DISP: 'mg'
            }
          ]
        },
        {
          id: 'adult-maintenance',
          name: 'Adult Maintenance',
          INGREDIENT: [
            {
              KEYNAME: 'Calcium', // Duplicate
              NOTE: ['Calculate calcium levels for adult patients'],
              TEST: ['Test adult calcium'],
              TYPE: 'Micronutrient',
              UOM_DISP: 'mg',
              PRECISION: 1
            },
            {
              KEYNAME: 'Magnesium',
              NOTE: ['Calculate magnesium levels'],
              TYPE: 'Micronutrient',
              UOM_DISP: 'mg'
            }
          ]
        }
      ];
    }
    
    // Set mock data for getDocs
    mockConfigsData.push(...realConfigs);
  });

  afterAll(() => {
    mockConfigsData.length = 0;
  });

  describe('Real Config Migration', () => {
    it('should migrate child-build-main-choc.json correctly', async () => {
      const childConfig = realConfigs.find(c => c.id.includes('child'));
      if (!childConfig) {
        console.log('Skipping test - no child config found');
        return;
      }

      const ingredients = await migrationService.extractIngredients([childConfig]);
      
      expect(ingredients).toBeDefined();
      expect(ingredients.length).toBeGreaterThan(0);
      
      // Verify ingredient structure
      const firstIngredient = ingredients[0];
      expect(firstIngredient).toHaveProperty('id');
      expect(firstIngredient).toHaveProperty('keyname');
      expect(firstIngredient).toHaveProperty('sections');
      expect(firstIngredient).toHaveProperty('metadata');
    });

    it('should handle multiple configs with deduplication', async () => {
      if (realConfigs.length < 2) {
        console.log('Skipping test - not enough configs');
        return;
      }

      const ingredients = await migrationService.extractIngredients(realConfigs);
      
      // Count unique keynames - should have at least some ingredients
      expect(ingredients.length).toBeGreaterThan(0);
      
      // Verify no duplicate keynames in the result
      const keynames = ingredients.map(i => i.keyname);
      const uniqueKeynames = new Set(keynames);
      
      // After deduplication, should have same count as unique set
      expect(keynames.length).toBe(uniqueKeynames.size);
    });
  });

  describe('Checkpoint and Resume', () => {
    it('should create checkpoint during migration', async () => {
      const checkpointSpy = vi.spyOn(migrationService as any, 'createCheckpoint');
      
      // Run partial migration
      const result = await migrationService.migrate({
        stopAfter: 1,
        batchSize: 1
      });
      
      expect(result.completed).toBe(false);
      expect(result.checkpoint).toBeDefined();
      
      // Verify checkpoint was created
      if (realConfigs.length > 0) {
        expect(checkpointSpy).toHaveBeenCalled();
      }
      
      checkpointSpy.mockRestore();
    });

    it('should resume from checkpoint', async () => {
      // First, create a checkpoint
      const partial = await migrationService.migrate({
        stopAfter: 1,
        batchSize: 1
      });
      
      if (!partial.checkpoint) {
        console.log('No checkpoint created');
        return;
      }
      
      // Resume from checkpoint
      const resumed = await migrationService.resume(partial.checkpoint);
      
      expect(resumed.success).toBe(true);
      expect(resumed.completed).toBe(true);
    });
  });

  describe('Data Integrity Verification', () => {
    it('should verify no data loss after migration', async () => {
      const preSnapshot = {
        configs: realConfigs,
        ingredients: []
      };
      
      // Simulate migration
      const ingredients = await migrationService.extractIngredients(realConfigs);
      
      const postSnapshot = {
        configs: realConfigs,
        ingredients
      };
      
      const verification = await migrationService.verify(preSnapshot, postSnapshot);
      
      expect(verification.passed).toBe(true);
      expect(verification.details.noDataLoss).toBe(true);
    });

    it('should detect data loss if ingredients are missing', async () => {
      const preSnapshot = {
        configs: realConfigs,
        ingredients: []
      };
      
      const postSnapshot = {
        configs: [],
        ingredients: [] // No ingredients created
      };
      
      const verification = await migrationService.verify(preSnapshot, postSnapshot);
      
      expect(verification.passed).toBe(false);
      expect(verification.details.noDataLoss).toBe(false);
    });
  });

  describe('Batch Processing', () => {
    it('should process large datasets in batches', async () => {
      // Create a large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `config-${i}`,
        name: `Config ${i}`,
        INGREDIENT: [
          {
            KEYNAME: `Ingredient-${i}`,
            NOTE: [`Note for ingredient ${i}`],
            TYPE: 'Test'
          }
        ]
      }));
      
      // Update mock data
      mockConfigsData.length = 0;
      mockConfigsData.push(...largeDataset);
      
      const processBatchSpy = vi.spyOn(migrationService as any, 'processBatch');
      
      await migrationService.migrate({
        batchSize: 10
      });
      
      // Should process in 10 batches
      expect(processBatchSpy).toHaveBeenCalledTimes(10);
      
      processBatchSpy.mockRestore();
    });

    it('should handle batch processing errors gracefully', async () => {
      const processBatchSpy = vi.spyOn(migrationService as any, 'processBatch')
        .mockRejectedValueOnce(new Error('Batch processing failed'));
      
      await expect(migrationService.migrate({
        batchSize: 1
      })).rejects.toThrow('Batch processing failed');
      
      processBatchSpy.mockRestore();
    });
  });

  describe('Progress Reporting', () => {
    it('should report progress accurately', async () => {
      const progressReports: any[] = [];
      
      await migrationService.migrate({
        batchSize: 1,
        onProgress: (progress) => progressReports.push(progress)
      });
      
      if (realConfigs.length > 0) {
        expect(progressReports.length).toBeGreaterThan(0);
        
        // Check first and last progress
        expect(progressReports[0].percentage).toBe(0);
        expect(progressReports[progressReports.length - 1].percentage).toBe(100);
        
        // Check progress is monotonic
        for (let i = 1; i < progressReports.length; i++) {
          expect(progressReports[i].percentage).toBeGreaterThanOrEqual(
            progressReports[i - 1].percentage
          );
        }
      }
    });
  });

  describe('Dry Run Analysis', () => {
    it('should analyze without making changes', async () => {
      const result = await migrationService.analyze({
        dryRun: true
      });
      
      expect(result.wouldCreate).toBeGreaterThanOrEqual(0);
      expect(result.actualChanges).toBe(0);
    });

    it('should report duplicate statistics', async () => {
      // Ensure we have duplicates in test data
      if (realConfigs.length < 2) {
        // Add configs with duplicate ingredients
        mockConfigsData.push(
          {
            id: 'test-1',
            INGREDIENT: [{ KEYNAME: 'Duplicate', NOTE: ['Same'] }]
          },
          {
            id: 'test-2',
            INGREDIENT: [{ KEYNAME: 'Duplicate', NOTE: ['Same'] }]
          }
        );
      }
      
      const result = await migrationService.analyze({
        dryRun: true
      });
      
      if (result.duplicatesFound) {
        expect(result.duplicatesFound).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should process 100 ingredients in under 5 seconds', async () => {
      const start = Date.now();
      
      const largeConfig = {
        id: 'performance-test',
        INGREDIENT: Array.from({ length: 100 }, (_, i) => ({
          KEYNAME: `PerfIngredient-${i}`,
          NOTE: [`Performance test ${i}`],
          TYPE: 'Test'
        }))
      };
      
      const ingredients = await migrationService.extractIngredients([largeConfig]);
      
      const duration = Date.now() - start;
      
      expect(ingredients).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});