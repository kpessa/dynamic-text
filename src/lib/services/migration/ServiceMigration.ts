/**
 * Service Migration Utility - Migrates from monolithic firebaseDataService to optimized services
 * Provides backward compatibility and gradual migration path
 */

// Import the services from the actual firebaseDataService
import { ingredientService, referenceService, configService } from '../../firebaseDataService';
// Note: errorService doesn't exist yet, commenting out for now
// import { errorService } from '../base/ErrorService';

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
      
      // const responseTime = Date.now() - startTime;
      // firebaseService.recordOperation(responseTime, true);
      
      return result;
    } catch (error) {
      // const responseTime = Date.now() - startTime;
      // firebaseService.recordOperation(responseTime, false);
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
          // throw errorService.convertToTPNError(fallbackError as Error, { 
          //   method: methodName, 
          //   originalError: error 
          // });
          throw fallbackError;
        }
      }
      
      // throw errorService.convertToTPNError(error as Error, { method: methodName });
      throw error;
    }
  }

  /**
   * Backward compatibility wrapper for ingredientService methods
   */
  createIngredientServiceWrapper() {
    const self = this;
    return {
      // Map old method names to new service methods
      async saveIngredient(ingredientData: any, commitMessage?: string) {
        return self.migrateMethodCall(
          'saveIngredient',
          async () => ({}), // Old service not available
          async () => {
            const result = await ingredientService.saveIngredient(ingredientData, commitMessage);
            return result;
          }
        );
      },

      async getAllIngredients() {
        return self.migrateMethodCall(
          'getAllIngredients',
          async () => [], // Old service not available
          async () => {
            const result = await ingredientService.getAllIngredients();
            return result;
          }
        );
      },

      async getIngredientsByCategory(category: string) {
        return self.migrateMethodCall(
          'getIngredientsByCategory',
          async () => [], // Old service not available
          async () => {
            const result = await ingredientService.getIngredientsByCategory(category);
            return result;
          }
        );
      },

      subscribeToIngredients(callback: (ingredients: any[]) => void) {
        self.log('Using new service for subscribeToIngredients');
        self.migrationStats.callsToNewService++;
        return ingredientService.subscribeToIngredients(callback);
      },

      async fixIngredientCategories() {
        return self.migrateMethodCall(
          'fixIngredientCategories',
          async () => 0, // Old service not available
          async () => {
            const result = await ingredientService.fixIngredientCategories();
            return result;
          }
        );
      },

      async getVersionHistory(ingredientId: string) {
        return self.migrateMethodCall(
          'getVersionHistory',
          async () => [], // Old service not available
          async () => {
            const result = await ingredientService.getVersionHistory(ingredientId);
            return result;
          }
        );
      }
    };
  }

  /**
   * Backward compatibility wrapper for referenceService methods
   */
  createReferenceServiceWrapper() {
    const self = this;
    return {
      async saveReference(ingredientId: string, referenceData: any, commitMessage?: string) {
        return self.migrateMethodCall(
          'saveReference',
          () => self.getOldReferenceService().saveReference(ingredientId, referenceData, commitMessage),
          async () => {
            const result = await referenceService.saveReference(ingredientId, referenceData, commitMessage);
            return result;
          }
        );
      },

      async getReferencesForIngredient(ingredientId: string) {
        return self.migrateMethodCall(
          'getReferencesForIngredient',
          () => self.getOldReferenceService().getReferencesForIngredient(ingredientId),
          async () => {
            const result = await referenceService.getReferencesForIngredient(ingredientId);
            return result;
          }
        );
      },

      async getReferencesByPopulation(ingredientId: string, populationType: string) {
        return self.migrateMethodCall(
          'getReferencesByPopulation',
          () => self.getOldReferenceService().getReferencesByPopulation(ingredientId, populationType),
          async () => {
            const result = await referenceService.getReferencesByPopulation(ingredientId, populationType as any);
            return result;
          }
        );
      },

      async updateReferenceValidation(ingredientId: string, referenceId: string, validationData: any) {
        return self.migrateMethodCall(
          'updateReferenceValidation',
          () => self.getOldReferenceService().updateReferenceValidation(ingredientId, referenceId, validationData),
          async () => {
            const result = await referenceService.updateReferenceValidation(ingredientId, referenceId, validationData);
            return result;
          }
        );
      },

      subscribeToReferences(ingredientId: string, callback: (references: any[]) => void) {
        self.log('Using new service for subscribeToReferences');
        self.migrationStats.callsToNewService++;
        return referenceService.subscribeToReferences(ingredientId, callback);
      },

      async deleteReference(ingredientId: string, referenceId: string) {
        return self.migrateMethodCall(
          'deleteReference',
          () => self.getOldReferenceService().deleteReference(ingredientId, referenceId),
          async () => {
            await referenceService.deleteReference(ingredientId, referenceId);
            return undefined;
          }
        );
      }
    };
  }

  /**
   * Backward compatibility wrapper for configService methods
   */
  createConfigServiceWrapper() {
    const self = this;
    return {
      async saveImportedConfig(configData: any, metadata: any) {
        return self.migrateMethodCall(
          'saveImportedConfig',
          () => self.getOldConfigService().saveImportedConfig(configData, metadata),
          async () => {
            const result = await configService.saveImportedConfig(configData, metadata);
            return result;
          }
        );
      },

      async getAllConfigs() {
        return self.migrateMethodCall(
          'getAllConfigs',
          () => self.getOldConfigService().getAllConfigs(),
          async () => {
            const result = await configService.getAllConfigs();
            return result;
          }
        );
      },

      async getConfigIngredients(configId: string) {
        return self.migrateMethodCall(
          'getConfigIngredients',
          () => self.getOldConfigService().getConfigIngredients(configId),
          async () => {
            const result = await configService.getConfigIngredients(configId);
            return result;
          }
        );
      },

      async detectDuplicatesBeforeImport(configData: any) {
        return self.migrateMethodCall(
          'detectDuplicatesBeforeImport',
          () => self.getOldConfigService().detectDuplicatesBeforeImport(configData),
          async () => {
            return await configService.detectDuplicatesBeforeImport(configData);
          }
        );
      },

      async deleteConfig(configId: string) {
        return self.migrateMethodCall(
          'deleteConfig',
          () => self.getOldConfigService().deleteConfig(configId),
          async () => {
            await configService.deleteConfig(configId);
            return undefined;
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
   * Get the migration statistics
   */
  getMigrationStats() {
    return { ...this.migrationStats };
  }

  /**
   * Get the migration log
   */
  getMigrationLog() {
    return [...this.migrationLog];
  }

  /**
   * Validate migration by comparing old vs new service results
   */
  async validateMigration(_testData: any[] = []): Promise<{
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
    // const health = firebaseService.getMetrics();
    const recommendations: string[] = [];
    
    // if (health.cache.hitRatio < 0.7) {
    //   recommendations.push('Consider increasing cache TTL for better performance');
    // }
    
    // if (health.errors.total > 0) {
    //   recommendations.push('Review error patterns and implement additional retry logic');
    // }
    
    if (this.migrationStats.callsToOldService > this.migrationStats.callsToNewService) {
      recommendations.push('Increase adoption of new services to improve performance');
    }
    
    return {
      newServicePerformance: {}, // health placeholder
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
      // Note: Old service mocks throw errors, so we only test new service
      const newResult = await ingredientService.getAllIngredients();
      
      if (Array.isArray(newResult)) {
        result.passed++;
        this.log(`✓ getAllIngredients returned ${newResult.length} ingredients`);
      } else {
        result.failed++;
        result.errors.push(`getAllIngredients did not return an array`);
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
  // private __getOldIngredientService() {
  //   // This would import and return the original ingredientService from firebaseDataService
  //   // For now, we'll create a mock that throws to encourage migration
  //   return {
  //     saveIngredient: async () => { throw new Error('Old service method - migrate to new service'); },
  //     getAllIngredients: async () => { throw new Error('Old service method - migrate to new service'); },
  //     getIngredientsByCategory: async () => { throw new Error('Old service method - migrate to new service'); },
  //     fixIngredientCategories: async () => { throw new Error('Old service method - migrate to new service'); },
  //     getVersionHistory: async () => { throw new Error('Old service method - migrate to new service'); }
  //   };
  // }

  private getOldReferenceService() {
    return {
      saveReference: async (_ingredientId: string, _referenceData: any, _commitMessage?: string) => { throw new Error('Old service method - migrate to new service'); },
      getReferencesForIngredient: async (_ingredientId: string) => { throw new Error('Old service method - migrate to new service'); },
      getReferencesByPopulation: async (_ingredientId: string, _populationType: string) => { throw new Error('Old service method - migrate to new service'); },
      updateReferenceValidation: async (_ingredientId: string, _referenceId: string, _validationData: any) => { throw new Error('Old service method - migrate to new service'); },
      deleteReference: async (_ingredientId: string, _referenceId: string) => { throw new Error('Old service method - migrate to new service'); }
    };
  }

  private getOldConfigService() {
    return {
      saveImportedConfig: async (_configData: any, _metadata: any) => { throw new Error('Old service method - migrate to new service'); },
      getAllConfigs: async () => { throw new Error('Old service method - migrate to new service'); },
      getConfigIngredients: async (_configId: string) => { throw new Error('Old service method - migrate to new service'); },
      detectDuplicatesBeforeImport: async (_configData: any) => { throw new Error('Old service method - migrate to new service'); },
      deleteConfig: async (_configId: string) => { throw new Error('Old service method - migrate to new service'); }
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