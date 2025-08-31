import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Ingredient, ConfigManifest } from '../../models';
import { MigrationService, type MigrationOptions, type MigrationResult, type AnalysisResult } from '../migrationService';
import { ingredientModelService } from '../ingredientModelService';
import { transformationBridgeService } from '../transformationBridgeService';

// Mock the services
vi.mock('../ingredientModelService', () => ({
  ingredientModelService: {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../transformationBridgeService', () => ({
  transformationBridgeService: {
    configToIngredient: vi.fn((config) => ({
      id: config.KEYNAME ? config.KEYNAME.toLowerCase().replace(/\s+/g, '-') : 'test-id',
      keyname: config.KEYNAME || 'test-keyname',
      displayName: config.DISPLAY || config.KEYNAME || 'Test Ingredient',
      category: config.TYPE || 'Other',
      sections: config.NOTE ? config.NOTE.map((note: string, i: number) => ({
        id: `sec-${i}`,
        type: 'javascript',
        content: note,
        order: i
      })) : [],
      tests: config.TEST || [],
      metadata: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })),
    ingredientToConfig: vi.fn()
  }
}));

// Mock Firebase
vi.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } }
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined)
  })),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({})
  })),
  setDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({
    forEach: vi.fn()
  })),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  }
}));

// Helper function to create mock configs
function createMockConfig(overrides: any = {}) {
  return {
    id: 'config-1',
    name: 'Test Config',
    source: { path: 'test/path' },
    INGREDIENT: [
      {
        KEYNAME: 'Calcium',
        NOTE: ['Calculate calcium levels'],
        TEST: ['Test 1']
      },
      {
        KEYNAME: 'Iron',
        NOTE: ['Calculate iron levels'],
        TEST: []
      }
    ],
    ...overrides
  };
}

// Helper function to create mock ingredient
function createMockIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'ing-1',
    keyname: 'Calcium',
    displayName: 'Calcium',
    category: 'Micronutrient',
    sections: [
      {
        id: 'sec-1',
        type: 'javascript',
        content: '// Calculate calcium levels',
        order: 0
      }
    ],
    tests: [],
    metadata: {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    ...overrides
  };
}

describe('MigrationService', () => {
  let migrationService: MigrationService;
  let originalState: any;

  beforeEach(() => {
    migrationService = new MigrationService();
    originalState = { configs: [], ingredients: [] };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Dry Run Mode', () => {
    it('should analyze without modifying data', async () => {
      const mockConfigs = [createMockConfig()];
      vi.spyOn(migrationService as any, 'loadConfigs').mockResolvedValue(mockConfigs);
      vi.mocked(ingredientModelService.list).mockResolvedValue([]);
      
      const result = await migrationService.analyze({ dryRun: true });
      
      expect(result.wouldCreate).toBeGreaterThan(0);
      expect(result.wouldUpdate).toBe(0);
      expect(result.actualChanges).toBe(0);
      expect(ingredientModelService.create).not.toHaveBeenCalled();
    });

    it('should report what would be created', async () => {
      const mockConfigs = [
        createMockConfig({ id: 'config-1' }),
        createMockConfig({ id: 'config-2' })
      ];
      vi.spyOn(migrationService as any, 'loadConfigs').mockResolvedValue(mockConfigs);
      vi.mocked(ingredientModelService.list).mockResolvedValue([]);
      
      const result = await migrationService.analyze({ dryRun: true });
      
      expect(result.wouldCreate).toBe(2); // Two unique ingredients (Calcium, Iron)
      expect(result.duplicatesFound).toBe(2); // Calcium and Iron appear in both configs
    });
  });

  describe('Ingredient Extraction', () => {
    it('should extract unique ingredients from configs', async () => {
      const mockConfig1 = createMockConfig({ id: 'config-1' });
      const mockConfig2 = createMockConfig({ 
        id: 'config-2',
        INGREDIENT: [
          {
            KEYNAME: 'Zinc',
            NOTE: ['Calculate zinc levels'],
            TEST: []
          }
        ]
      });
      
      const configs = [mockConfig1, mockConfig2];
      const ingredients = await migrationService.extractIngredients(configs);
      
      expect(ingredients).toHaveLength(3); // Calcium, Iron, Zinc
      expect(ingredients[0]).toHaveProperty('id');
      expect(ingredients[0]).toHaveProperty('sections');
      expect(ingredients.map(i => i.keyname)).toContain('Calcium');
      expect(ingredients.map(i => i.keyname)).toContain('Iron');
      expect(ingredients.map(i => i.keyname)).toContain('Zinc');
    });

    it('should deduplicate identical ingredients', async () => {
      const configWithDuplicates = createMockConfig({
        INGREDIENT: [
          {
            KEYNAME: 'Calcium',
            NOTE: ['Same content'],
            TEST: []
          },
          {
            KEYNAME: 'Calcium',
            NOTE: ['Same content'],
            TEST: []
          }
        ]
      });
      
      const configs = [configWithDuplicates];
      const ingredients = await migrationService.extractIngredients(configs);
      
      expect(ingredients).toHaveLength(1); // Only one unique Calcium
      expect(ingredients[0].keyname).toBe('Calcium');
    });

    it('should handle configs with no ingredients', async () => {
      const emptyConfig = {
        id: 'empty-config',
        name: 'Empty Config',
        INGREDIENT: []
      };
      
      const ingredients = await migrationService.extractIngredients([emptyConfig]);
      
      expect(ingredients).toHaveLength(0);
    });
  });

  describe('Config Manifest Creation', () => {
    it('should create config manifests with ingredient references', async () => {
      const mockConfig = createMockConfig();
      const ingredientMap = new Map<string, string>([
        ['Calcium', 'ing-calcium-123'],
        ['Iron', 'ing-iron-456']
      ]);
      
      const manifest = await migrationService.createManifest(mockConfig, ingredientMap);
      
      expect(manifest.ingredientRefs).toHaveLength(mockConfig.INGREDIENT.length);
      expect(manifest.ingredientRefs[0].ingredientId).toBe('ing-calcium-123');
      expect(manifest.ingredientRefs[1].ingredientId).toBe('ing-iron-456');
      expect(manifest.id).toBe(mockConfig.id);
      expect(manifest.name).toBe(mockConfig.name);
    });

    it('should preserve config metadata in manifest', async () => {
      const mockConfig = createMockConfig({
        metadata: {
          author: 'Test Author',
          version: '1.0.0'
        }
      });
      const ingredientMap = new Map<string, string>();
      
      const manifest = await migrationService.createManifest(mockConfig, ingredientMap);
      
      expect(manifest.source).toEqual({ path: mockConfig.source.path });
      expect(manifest.name).toBe(mockConfig.name);
    });
  });

  describe('Rollback Capability', () => {
    it('should rollback on failure', async () => {
      const migrationWithError = () => migrationService.migrate({ 
        failAt: 'halfway' 
      } as MigrationOptions);
      
      await expect(migrationWithError).rejects.toThrow();
      
      // Verify state hasn't changed
      const postFailureState = await getDataState();
      expect(postFailureState).toEqual(originalState);
    });

    it('should create checkpoints during migration', async () => {
      const mockConfigs = Array.from({ length: 100 }, (_, i) => 
        createMockConfig({ id: `config-${i}` })
      );
      vi.spyOn(migrationService as any, 'loadConfigs').mockResolvedValue(mockConfigs);
      
      const checkpoints: string[] = [];
      vi.spyOn(migrationService as any, 'createCheckpoint').mockImplementation(async (state) => {
        const id = `checkpoint-${Date.now()}`;
        checkpoints.push(id);
        return id;
      });
      
      await migrationService.migrate({ batchSize: 10 });
      
      expect(checkpoints.length).toBeGreaterThan(0);
    });

    it('should rollback to specific checkpoint', async () => {
      const checkpointId = 'checkpoint-123';
      const checkpoint = {
        id: checkpointId,
        createdAfter: ['ing-1', 'ing-2'],
        modifiedConfigs: ['config-1']
      };
      
      vi.spyOn(migrationService as any, 'loadCheckpoint').mockResolvedValue(checkpoint);
      vi.mocked(ingredientModelService.delete).mockResolvedValue();
      
      await migrationService.rollback(checkpointId);
      
      expect(ingredientModelService.delete).toHaveBeenCalledWith('ing-1');
      expect(ingredientModelService.delete).toHaveBeenCalledWith('ing-2');
    });
  });

  describe('Data Verification', () => {
    it('should verify data integrity post-migration', async () => {
      const mockConfigs = [createMockConfig()];
      vi.spyOn(migrationService as any, 'loadConfigs').mockResolvedValue(mockConfigs);
      vi.mocked(ingredientModelService.create).mockResolvedValue('ing-new');
      
      const result = await migrationService.migrate({ verify: true });
      
      expect(result.verification).toBeDefined();
      expect(result.verification?.passed).toBeDefined();
      expect(result.verification?.configsMatch).toBeDefined();
      expect(result.verification?.ingredientsMatch).toBeDefined();
    });

    it('should detect data loss during verification', async () => {
      const preSnapshot = {
        configs: [createMockConfig()],
        ingredients: []
      };
      
      const postSnapshot = {
        configs: [],
        ingredients: [createMockIngredient()]
      };
      
      const verification = await migrationService.verify(preSnapshot, postSnapshot);
      
      expect(verification.passed).toBe(false);
      expect(verification.details.noDataLoss).toBe(false);
    });
  });

  describe('Progress Reporting', () => {
    it('should report progress during migration', async () => {
      const progressReports: any[] = [];
      const mockConfigs = Array.from({ length: 10 }, (_, i) => 
        createMockConfig({ id: `config-${i}` })
      );
      
      vi.spyOn(migrationService as any, 'loadConfigs').mockResolvedValue(mockConfigs);
      
      await migrationService.migrate({
        onProgress: (progress) => progressReports.push(progress)
      });
      
      expect(progressReports.length).toBeGreaterThan(0);
      expect(progressReports[progressReports.length - 1].percentage).toBe(100);
    });
  });

  describe('Batch Processing', () => {
    it('should process configs in batches', async () => {
      const mockConfigs = Array.from({ length: 25 }, (_, i) => 
        createMockConfig({ id: `config-${i}` })
      );
      
      vi.spyOn(migrationService as any, 'loadConfigs').mockResolvedValue(mockConfigs);
      const processBatchSpy = vi.spyOn(migrationService as any, 'processBatch');
      
      await migrationService.migrate({ batchSize: 10 });
      
      expect(processBatchSpy).toHaveBeenCalledTimes(3); // 25 configs / 10 batch size = 3 batches
    });
  });
});

// Helper function to get current data state
async function getDataState() {
  const configs = []; // Mock implementation
  const ingredients = await ingredientModelService.list();
  return { configs, ingredients };
}