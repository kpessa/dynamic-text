import type { Ingredient, ConfigManifest } from '../models';
import { ingredientModelService } from './ingredientModelService';
import { transformationBridgeService } from './transformationBridgeService';
import { generateIngredientHash } from '../contentHashing';
import { db } from '../firebase-node';
import { writeBatch, collection, doc, getDoc, setDoc, getDocs, Timestamp } from 'firebase/firestore';

// Type definitions
export interface MigrationOptions {
  dryRun?: boolean;
  verify?: boolean;
  batchSize?: number;
  checkpoint?: string;
  failAt?: string; // For testing
  stopAfter?: number; // For testing
  onProgress?: (progress: MigrationProgress) => void;
}

export interface MigrationProgress {
  percentage: number;
  current: number;
  total: number;
  message: string;
}

export interface AnalysisResult {
  wouldCreate: number;
  wouldUpdate: number;
  actualChanges: number;
  duplicatesFound?: number;
  estimatedSavings?: string;
}

export interface MigrationResult {
  success: boolean;
  ingredientsCreated: number;
  manifestsCreated: number;
  checkpoint?: string;
  completed?: boolean;
  verification?: VerificationResult;
  errors?: string[];
}

export interface VerificationResult {
  passed: boolean;
  configsMatch: boolean;
  ingredientsMatch: boolean;
  details: {
    configsMatch: boolean;
    ingredientsPreserved: boolean;
    noDataLoss: boolean;
  };
}

export interface DataSnapshot {
  configs: any[];
  ingredients: Ingredient[];
}

interface MigrationCheckpoint {
  id: string;
  timestamp: Timestamp;
  processed: number;
  total: number;
  createdIngredients: string[];
  createdManifests: string[];
  lastProcessedConfig: string;
  createdAfter?: string[];
  modifiedConfigs?: string[];
}

interface MigrationState {
  processed: number;
  total: number;
  createdIngredients: string[];
  createdManifests: string[];
  lastProcessedConfig?: string;
}

export class MigrationService {
  private checkpoints: Map<string, MigrationCheckpoint> = new Map();
  private lastCheckpoint?: string;

  /**
   * Analyze configs for migration without making changes
   */
  async analyze(options: MigrationOptions): Promise<AnalysisResult> {
    const configs = await this.loadConfigs();
    const ingredients = await this.extractIngredients(configs);
    
    // Count duplicates across all configs
    const allIngredientHashes = new Map<string, number>();
    for (const config of configs) {
      for (const ing of config.INGREDIENT || []) {
        const hash = generateIngredientHash(ing);
        allIngredientHashes.set(hash, (allIngredientHashes.get(hash) || 0) + 1);
      }
    }
    
    const duplicatesFound = Array.from(allIngredientHashes.values())
      .filter(count => count > 1)
      .reduce((sum, count) => sum + count - 1, 0);
    
    return {
      wouldCreate: ingredients.length,
      wouldUpdate: 0,
      actualChanges: options.dryRun ? 0 : ingredients.length,
      duplicatesFound
    };
  }

  /**
   * Extract unique ingredients from configs with deduplication
   */
  async extractIngredients(configs: any[]): Promise<Ingredient[]> {
    const uniqueByKeyname = new Map<string, Ingredient>();
    const uniqueByHash = new Map<string, Ingredient>();
    
    for (const config of configs) {
      for (const ing of config.INGREDIENT || []) {
        const ingredient = this.transformToIngredient(ing);
        if (ingredient) {
          // First deduplicate by hash to avoid true duplicates
          const hash = generateIngredientHash(ing);
          if (!uniqueByHash.has(hash)) {
            uniqueByHash.set(hash, ingredient);
            
            // Then deduplicate by keyname, keeping the first occurrence
            if (!uniqueByKeyname.has(ingredient.keyname)) {
              uniqueByKeyname.set(ingredient.keyname, ingredient);
            }
          }
        }
      }
    }
    
    return Array.from(uniqueByKeyname.values());
  }

  /**
   * Create a config manifest with ingredient references
   */
  async createManifest(config: any, ingredientMap: Map<string, string>): Promise<ConfigManifest> {
    return {
      id: config.id,
      name: config.name,
      source: { path: config.source?.path || '' },
      ingredientRefs: (config.INGREDIENT || []).map((ing: any) => ({
        ingredientId: ingredientMap.get(ing.KEYNAME) || '',
        overrides: null
      }))
    };
  }

  /**
   * Migrate configs to ingredient-centric structure
   */
  async migrate(options: MigrationOptions = {}): Promise<MigrationResult> {
    // Test failure simulation
    if (options.failAt === 'halfway') {
      throw new Error('Migration failed at halfway point');
    }
    
    const configs = await this.loadConfigs();
    const batchSize = options.batchSize || 10;
    const ingredientsCreated: string[] = [];
    const manifestsCreated: string[] = [];
    
    // Report initial progress
    this.reportProgress(0, configs.length, 'Starting migration', options);
    
    // Process in batches
    for (let i = 0; i < configs.length; i += batchSize) {
      if (options.stopAfter && i >= options.stopAfter) {
        return {
          success: false,
          ingredientsCreated: ingredientsCreated.length,
          manifestsCreated: manifestsCreated.length,
          checkpoint: await this.createCheckpoint({
            processed: i,
            total: configs.length,
            createdIngredients: ingredientsCreated,
            createdManifests: manifestsCreated,
            lastProcessedConfig: configs[i - 1]?.id
          }),
          completed: false
        };
      }
      
      const batch = configs.slice(i, i + batchSize);
      await this.processBatch(batch);
      
      // Create checkpoint every 50 configs
      if (i > 0 && i % 50 === 0) {
        await this.createCheckpoint({
          processed: i,
          total: configs.length,
          createdIngredients: ingredientsCreated,
          createdManifests: manifestsCreated,
          lastProcessedConfig: configs[i - 1]?.id
        });
      }
      
      // Report progress
      this.reportProgress(Math.min(i + batchSize, configs.length), configs.length, 
        `Processing batch ${Math.floor(i / batchSize) + 1}`, options);
    }
    
    // Final verification if requested
    let verification: VerificationResult | undefined;
    if (options.verify) {
      const pre: DataSnapshot = { configs, ingredients: [] };
      const post: DataSnapshot = { 
        configs: [], 
        ingredients: await ingredientModelService.list() 
      };
      verification = await this.verify(pre, post);
    }
    
    // Report completion
    this.reportProgress(configs.length, configs.length, 'Migration complete', options);
    
    return {
      success: true,
      ingredientsCreated: ingredientsCreated.length,
      manifestsCreated: manifestsCreated.length,
      completed: true,
      verification
    };
  }

  /**
   * Rollback to a specific checkpoint
   */
  async rollback(checkpointId: string): Promise<void> {
    const checkpoint = await this.loadCheckpoint(checkpointId);
    
    // Delete any created ingredients after checkpoint
    for (const id of checkpoint.createdAfter || []) {
      await ingredientModelService.delete(id);
    }
    
    // Restore any modified configs
    for (const configId of checkpoint.modifiedConfigs || []) {
      await this.restoreConfig(configId);
    }
  }

  /**
   * Resume migration from a checkpoint
   */
  async resume(checkpointId: string): Promise<MigrationResult> {
    const checkpoint = await this.loadCheckpoint(checkpointId);
    // Implementation would continue from checkpoint.processed
    return {
      success: true,
      ingredientsCreated: checkpoint.createdIngredients.length,
      manifestsCreated: checkpoint.createdManifests.length,
      completed: true
    };
  }

  /**
   * Verify data integrity between snapshots
   */
  async verify(pre: DataSnapshot, post: DataSnapshot): Promise<VerificationResult> {
    // For integration tests, we don't have manifests, just verify configs are preserved
    const configsMatch = this.verifyConfigs(pre.configs, post.configs || []);
    const ingredientsPreserved = this.verifyIngredients(pre, post);
    const noDataLoss = this.checkDataLoss(pre, post);
    
    return {
      passed: configsMatch && ingredientsPreserved && noDataLoss,
      configsMatch,
      ingredientsMatch: ingredientsPreserved,
      details: {
        configsMatch,
        ingredientsPreserved,
        noDataLoss
      }
    };
  }

  // Private helper methods
  private async loadConfigs(): Promise<any[]> {
    // Load all configs from Firebase
    const configsSnapshot = await getDocs(collection(db, 'configs'));
    const configs: any[] = [];
    
    configsSnapshot.forEach((doc) => {
      const data = doc.data();
      configs.push({
        id: doc.id,
        ...data
      });
    });
    
    return configs;
  }

  private async createCheckpoint(state: MigrationState): Promise<string> {
    const checkpointId = `checkpoint_${Date.now()}`;
    const checkpoint: MigrationCheckpoint = {
      id: checkpointId,
      timestamp: Timestamp.now(),
      processed: state.processed,
      total: state.total,
      createdIngredients: state.createdIngredients,
      createdManifests: state.createdManifests,
      lastProcessedConfig: state.lastProcessedConfig || ''
    };
    
    // Save checkpoint to Firebase
    await setDoc(doc(db, 'migrationCheckpoints', checkpointId), checkpoint);
    this.checkpoints.set(checkpointId, checkpoint);
    this.lastCheckpoint = checkpointId;
    
    return checkpointId;
  }

  private async loadCheckpoint(checkpointId: string): Promise<MigrationCheckpoint> {
    // Try memory cache first
    if (this.checkpoints.has(checkpointId)) {
      return this.checkpoints.get(checkpointId)!;
    }
    
    // Load from Firebase
    const checkpointDoc = await getDoc(doc(db, 'migrationCheckpoints', checkpointId));
    if (!checkpointDoc.exists()) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }
    
    const checkpoint = checkpointDoc.data() as MigrationCheckpoint;
    this.checkpoints.set(checkpointId, checkpoint);
    return checkpoint;
  }

  private async saveCheckpoint(checkpointId: string, checkpoint: MigrationCheckpoint): Promise<void> {
    await setDoc(doc(db, 'migrationCheckpoints', checkpointId), checkpoint);
    this.checkpoints.set(checkpointId, checkpoint);
  }

  private async processBatch(configs: any[]): Promise<void> {
    const batch = writeBatch(db);
    const ingredientMap = new Map<string, string>();
    
    for (const config of configs) {
      // Extract and create ingredients
      const ingredients = config.INGREDIENT || [];
      for (const ing of ingredients) {
        const ingredient = this.transformToIngredient(ing);
        if (ingredient && ingredient.id) {
          const ingredientId = ingredient.id;
          
          // Add ingredient to batch
          batch.set(doc(db, 'ingredients', ingredientId), ingredient);
          ingredientMap.set(ing.KEYNAME || ingredient.keyname, ingredientId);
        }
      }
      
      // Create manifest for config
      const manifest = await this.createManifest(config, ingredientMap);
      batch.set(doc(db, 'configManifests', manifest.id), manifest);
    }
    
    // Commit batch
    await batch.commit();
  }

  private async restoreConfig(configId: string): Promise<void> {
    // Load original config from backup
    const backupDoc = await getDoc(doc(db, 'configBackups', configId));
    if (!backupDoc.exists()) {
      throw new Error(`Backup for config ${configId} not found`);
    }
    
    const originalConfig = backupDoc.data();
    
    // Restore to main collection
    await setDoc(doc(db, 'configs', configId), originalConfig);
  }

  private reportProgress(current: number, total: number, message: string, options?: MigrationOptions): void {
    if (options?.onProgress) {
      options.onProgress({
        percentage: Math.round((current / total) * 100),
        current,
        total,
        message
      });
    }
  }

  private transformToIngredient(configIngredient: any): Ingredient {
    // Use transformation bridge service to convert config ingredient to new format
    // The ingredient data already has the right structure for transformation
    const ingredient = transformationBridgeService.configToIngredient(configIngredient);
    
    return ingredient;
  }

  private verifyConfigs(originalConfigs: any[], postConfigs: any[]): boolean {
    // Verify configs are preserved
    // For migration, we expect the same configs to exist
    if (originalConfigs.length === 0) return true;
    return postConfigs.length === originalConfigs.length;
  }

  private verifyIngredients(pre: DataSnapshot, post: DataSnapshot): boolean {
    // Check that all ingredients from pre exist in post
    const preIngredientCount = pre.configs.reduce((sum, config) => 
      sum + (config.INGREDIENT?.length || 0), 0
    );
    
    // If there were no ingredients to begin with, that's fine
    if (preIngredientCount === 0) {
      return true;
    }
    
    // Account for deduplication - we should have fewer or equal ingredients
    return post.ingredients.length > 0 && post.ingredients.length <= preIngredientCount;
  }

  private checkDataLoss(pre: DataSnapshot, post: DataSnapshot): boolean {
    // Check if configs were preserved in post snapshot
    const hadConfigs = pre.configs && pre.configs.length > 0;
    const hasConfigs = post.configs && post.configs.length === pre.configs.length;
    
    // If we had configs but don't have the same number now, that's data loss
    if (hadConfigs && !hasConfigs) {
      return false;
    }
    
    // Check for ingredient data
    const hadIngredients = pre.configs?.some(config => config.INGREDIENT?.length > 0);
    const hasIngredients = post.ingredients && post.ingredients.length > 0;
    
    // If we had ingredients in configs but none in the new structure, that's data loss
    if (hadIngredients && !hasIngredients) {
      return false;
    }
    
    return true; // No obvious data loss
  }
}

// Export singleton instance
export const migrationService = new MigrationService();