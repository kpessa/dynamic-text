/**
 * Service Migration Utility - Migrates from monolithic firebaseDataService to optimized services
 * Provides backward compatibility and gradual migration path
 */

import { firebaseService, ingredientService, referenceService, configService } from '../FirebaseService';
import { errorService } from '../base/ErrorService';

// Import the original monolithic service for comparison
// Note: This would be the original firebaseDataService.ts

/**
 * Migration wrapper that provides backward compatibility
 * while gradually migrating to the new optimized services
 */
export class ServiceMigration {
  private migrationLog: string[] = [];
  private migrationStats = {
    callsToOldService: 0,
    callsToNewService: 0,
    migrationErrors: 0
  };

  /**
   * Migrate a specific method call from old to new service
   */
  async migrateMethodCall<T>(
    methodName: string,
    oldServiceCall: () => Promise<T>,
    newServiceCall: () => Promise<T>,
    useNewService = true
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      let result: T;
      
      if (useNewService) {
        // Use new optimized service
        result = await newServiceCall();
        this.migrationStats.callsToNewService++;
        this.log(`✓ Using new service for ${methodName}`);
      } else {
        // Fallback to old service
        result = await oldServiceCall();
        this.migrationStats.callsToOldService++;
        this.log(`⚠ Falling back to old service for ${methodName}`);
      }
      
      const responseTime = Date.now() - startTime;
      firebaseService.recordOperation(responseTime, true);
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      firebaseService.recordOperation(responseTime, false);
      this.migrationStats.migrationErrors++;
      
      // If new service fails, try old service as fallback
      if (useNewService) {
        this.log(`❌ New service failed for ${methodName}, trying fallback...`);
        try {
          const fallbackResult = await oldServiceCall();
          this.migrationStats.callsToOldService++;
          this.log(`✓ Fallback successful for ${methodName}`);
          return fallbackResult;
        } catch (fallbackError) {
          this.log(`❌ Both services failed for ${methodName}`);
          throw errorService.convertToTPNError(fallbackError as Error, { 
            method: methodName, 
            originalError: error 
          });
        }
      }
      
      throw errorService.convertToTPNError(error as Error, { method: methodName });
    }
  }

  /**
   * Backward compatibility wrapper for ingredientService methods
   */
  createIngredientServiceWrapper() {
    return {
      // Map old method names to new service methods
      async saveIngredient(ingredientData: any, commitMessage?: string) {
        return this.migrateMethodCall(
          'saveIngredient',
          () => this.getOldIngredientService().saveIngredient(ingredientData, commitMessage),
          async () => {
            const result = await ingredientService.saveIngredient(ingredientData, commitMessage);
            return result.success ? result.data : null;
          }
        );
      },

      async getAllIngredients() {
        return this.migrateMethodCall(
          'getAllIngredients',
          () => this.getOldIngredientService().getAllIngredients(),
          async () => {
            const result = await ingredientService.getAllIngredients();
            return result.success ? result.data : [];
          }
        );
      },

      async getIngredientsByCategory(category: string) {
        return this.migrateMethodCall(
          'getIngredientsByCategory',
          () => this.getOldIngredientService().getIngredientsByCategory(category),
          async () => {
            const result = await ingredientService.getIngredientsByCategory(category);
            return result.success ? result.data : [];
          }
        );
      },

      subscribeToIngredients(callback: (ingredients: any[]) => void) {
        this.log('Using new service for subscribeToIngredients');
        this.migrationStats.callsToNewService++;
        return ingredientService.subscribeToIngredients(callback);
      },

      async fixIngredientCategories() {
        return this.migrateMethodCall(
          'fixIngredientCategories',
          () => this.getOldIngredientService().fixIngredientCategories(),
          async () => {
            const result = await ingredientService.fixIngredientCategories();
            return result.success ? result.data : 0;
          }
        );
      },

      async getVersionHistory(ingredientId: string) {
        return this.migrateMethodCall(
          'getVersionHistory',
          () => this.getOldIngredientService().getVersionHistory(ingredientId),
          async () => {
            const result = await ingredientService.getVersionHistory(ingredientId);
            return result.success ? result.data : [];
          }
        );
      }
    };
  }

  /**
   * Backward compatibility wrapper for referenceService methods
   */
  createReferenceServiceWrapper() {
    return {
      async saveReference(ingredientId: string, referenceData: any, commitMessage?: string) {
        return this.migrateMethodCall(
          'saveReference',
          () => this.getOldReferenceService().saveReference(ingredientId, referenceData, commitMessage),
          async () => {
            const result = await referenceService.saveReference(ingredientId, referenceData, commitMessage);
            return result.success ? result.data : null;
          }
        );
      },

      async getReferencesForIngredient(ingredientId: string) {
        return this.migrateMethodCall(
          'getReferencesForIngredient',
          () => this.getOldReferenceService().getReferencesForIngredient(ingredientId),
          async () => {
            const result = await referenceService.getReferencesForIngredient(ingredientId);
            return result.success ? result.data : [];
          }
        );
      },

      async getReferencesByPopulation(ingredientId: string, populationType: string) {
        return this.migrateMethodCall(
          'getReferencesByPopulation',
          () => this.getOldReferenceService().getReferencesByPopulation(ingredientId, populationType),
          async () => {
            const result = await referenceService.getReferencesByPopulation(ingredientId, populationType as any);
            return result.success ? result.data : [];
          }
        );
      },

      async updateReferenceValidation(ingredientId: string, referenceId: string, validationData: any) {
        return this.migrateMethodCall(
          'updateReferenceValidation',
          () => this.getOldReferenceService().updateReferenceValidation(ingredientId, referenceId, validationData),
          async () => {
            const result = await referenceService.updateReferenceValidation(ingredientId, referenceId, validationData);
            return result.success;
          }
        );
      },

      subscribeToReferences(ingredientId: string, callback: (references: any[]) => void) {
        this.log('Using new service for subscribeToReferences');
        this.migrationStats.callsToNewService++;
        return referenceService.subscribeToReferences(ingredientId, callback);
      },

      async deleteReference(ingredientId: string, referenceId: string) {
        return this.migrateMethodCall(
          'deleteReference',
          () => this.getOldReferenceService().deleteReference(ingredientId, referenceId),
          async () => {
            const result = await referenceService.deleteReference(ingredientId, referenceId);
            return result.success ? undefined : Promise.reject(new Error('Delete failed'));
          }
        );
      }
    };
  }

  /**
   * Backward compatibility wrapper for configService methods
   */
  createConfigServiceWrapper() {
    return {
      async saveImportedConfig(configData: any, metadata: any) {
        return this.migrateMethodCall(
          'saveImportedConfig',
          () => this.getOldConfigService().saveImportedConfig(configData, metadata),
          async () => {
            const result = await configService.saveImportedConfig(configData, metadata);
            return result.success ? result.data : null;
          }
        );
      },

      async getAllConfigs() {
        return this.migrateMethodCall(
          'getAllConfigs',
          () => this.getOldConfigService().getAllConfigs(),
          async () => {
            const result = await configService.getAllConfigs();
            return result.success ? result.data : [];
          }
        );
      },

      async getConfigIngredients(configId: string) {
        return this.migrateMethodCall(
          'getConfigIngredients',
          () => this.getOldConfigService().getConfigIngredients(configId),
          async () => {
            const result = await configService.getConfigIngredients(configId);
            return result.success ? result.data : [];
          }
        );
      },

      async detectDuplicatesBeforeImport(configData: any) {
        return this.migrateMethodCall(
          'detectDuplicatesBeforeImport',
          () => this.getOldConfigService().detectDuplicatesBeforeImport(configData),
          async () => {
            return await configService.detectDuplicatesBeforeImport(configData);
          }
        );
      },

      async deleteConfig(configId: string) {
        return this.migrateMethodCall(
          'deleteConfig',
          () => this.getOldConfigService().deleteConfig(configId),
          async () => {
            const result = await configService.deleteConfig(configId);
            return result.success ? undefined : Promise.reject(new Error('Delete failed'));
          }
        );
      }
    };
  }

  /**
   * Create a unified service wrapper that maintains the old API
   */
  createUnifiedWrapper() {
    return {
      ...this.createIngredientServiceWrapper(),
      ...this.createReferenceServiceWrapper(),
      ...this.createConfigServiceWrapper(),

      // Additional utility methods
      getMigrationStats: () => ({ ...this.migrationStats }),
      getMigrationLog: () => [...this.migrationLog],
      clearMigrationLog: () => { this.migrationLog = []; }
    };
  }

  /**
   * Validate migration by comparing old vs new service results
   */
  async validateMigration(testData: any[] = []): Promise<{
    passed: number;
    failed: number;
    errors: string[];
  }> {
    const validation = {
      passed: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Test ingredient operations
      this.log('Validating ingredient operations...');
      const ingredientTest = await this.validateIngredientOperations();
      validation.passed += ingredientTest.passed;
      validation.failed += ingredientTest.failed;
      validation.errors.push(...ingredientTest.errors);

      // Test reference operations
      this.log('Validating reference operations...');
      // Add reference validation tests here

      // Test config operations
      this.log('Validating config operations...');
      // Add config validation tests here

      this.log(`Migration validation completed: ${validation.passed} passed, ${validation.failed} failed`);
      return validation;
    } catch (error) {
      validation.errors.push(`Validation error: ${error}`);
      return validation;
    }
  }

  /**
   * Get migration performance comparison
   */
  getPerformanceComparison(): {
    newServicePerformance: any;
    migrationOverhead: number;
    recommendations: string[];
  } {
    const health = firebaseService.getMetrics();
    const recommendations: string[] = [];
    
    if (health.cache.hitRatio < 0.7) {
      recommendations.push('Consider increasing cache TTL for better performance');
    }
    
    if (health.errors.total > 0) {
      recommendations.push('Review error patterns and implement additional retry logic');
    }
    
    if (this.migrationStats.callsToOldService > this.migrationStats.callsToNewService) {
      recommendations.push('Increase adoption of new services to improve performance');
    }
    
    return {
      newServicePerformance: health,
      migrationOverhead: this.migrationStats.migrationErrors / 
        (this.migrationStats.callsToNewService + this.migrationStats.callsToOldService),
      recommendations
    };
  }

  private async validateIngredientOperations(): Promise<{
    passed: number;
    failed: number;
    errors: string[];
  }> {
    const result = { passed: 0, failed: 0, errors: [] as string[] };
    
    try {
      // Test getAllIngredients consistency
      const oldResult = await this.getOldIngredientService().getAllIngredients();
      const newServiceResponse = await ingredientService.getAllIngredients();
      const newResult = newServiceResponse.success ? newServiceResponse.data : [];
      
      if (oldResult.length === newResult.length) {
        result.passed++;
        this.log('✓ getAllIngredients length consistency validated');
      } else {
        result.failed++;
        result.errors.push(`Length mismatch: old=${oldResult.length}, new=${newResult.length}`);
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`getAllIngredients validation failed: ${error}`);
    }
    
    return result;
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.migrationLog.push(logEntry);
    
    // Keep only last 100 log entries
    if (this.migrationLog.length > 100) {
      this.migrationLog.shift();
    }
    
    console.log(logEntry);
  }

  // Placeholder methods for old service access
  // These would need to be implemented based on the actual old service structure
  private getOldIngredientService() {
    // This would import and return the original ingredientService from firebaseDataService
    // For now, we'll create a mock that throws to encourage migration
    return {
      saveIngredient: () => { throw new Error('Old service method - migrate to new service'); },
      getAllIngredients: () => { throw new Error('Old service method - migrate to new service'); },
      getIngredientsByCategory: () => { throw new Error('Old service method - migrate to new service'); },
      fixIngredientCategories: () => { throw new Error('Old service method - migrate to new service'); },
      getVersionHistory: () => { throw new Error('Old service method - migrate to new service'); }
    };
  }

  private getOldReferenceService() {
    return {
      saveReference: () => { throw new Error('Old service method - migrate to new service'); },
      getReferencesForIngredient: () => { throw new Error('Old service method - migrate to new service'); },
      getReferencesByPopulation: () => { throw new Error('Old service method - migrate to new service'); },
      updateReferenceValidation: () => { throw new Error('Old service method - migrate to new service'); },
      deleteReference: () => { throw new Error('Old service method - migrate to new service'); }
    };
  }

  private getOldConfigService() {
    return {
      saveImportedConfig: () => { throw new Error('Old service method - migrate to new service'); },
      getAllConfigs: () => { throw new Error('Old service method - migrate to new service'); },
      getConfigIngredients: () => { throw new Error('Old service method - migrate to new service'); },
      detectDuplicatesBeforeImport: () => { throw new Error('Old service method - migrate to new service'); },
      deleteConfig: () => { throw new Error('Old service method - migrate to new service'); }
    };
  }
}

// Export singleton instance
export const serviceMigration = new ServiceMigration();

// Create backward compatibility wrapper
export const legacyFirebaseDataService = serviceMigration.createUnifiedWrapper();

// Export migration utilities
export const migrationUtils = {
  validateMigration: (testData?: any[]) => serviceMigration.validateMigration(testData),
  getPerformanceComparison: () => serviceMigration.getPerformanceComparison(),
  getMigrationStats: () => serviceMigration.getMigrationStats(),
  getMigrationLog: () => serviceMigration.getMigrationLog()
};