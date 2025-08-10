/**
 * Service Usage Examples - Demonstrates how to use the optimized Firebase services
 * These examples show best practices for TPN medical application development
 */

import { 
  firebaseService,
  ingredientService, 
  referenceService, 
  configService,
  cacheService,
  errorService,
  syncService
} from '../FirebaseService';

import type { 
  IngredientData, 
  ReferenceData, 
  ConfigData, 
  ConfigMetadata,
  PopulationType 
} from '../../types';

/**
 * Example 1: Basic ingredient management with error handling and caching
 */
export class IngredientManagementExample {
  async demonstrateIngredientOperations() {
    try {
      console.log('=== Ingredient Management Example ===');
      
      // 1. Create a new ingredient with medical validation
      const newIngredient: IngredientData = {
        name: 'Potassium Chloride',
        category: 'ELECTROLYTE',
        description: 'Essential electrolyte for TPN therapy',
        unit: 'mEq/L',
        type: 'standard'
      };
      
      const saveResult = await ingredientService.saveIngredient(
        newIngredient, 
        'Initial creation with safety validation'
      );
      
      if (saveResult.success) {
        console.log(`✓ Ingredient created with ID: ${saveResult.data}`);
        
        // 2. Get the ingredient (will be cached)
        const getResult = await ingredientService.getIngredient(saveResult.data!);
        if (getResult.success && getResult.data) {
          console.log(`✓ Retrieved ingredient: ${getResult.data.name}`);
          
          // 3. Update the ingredient
          const updatedIngredient = {
            ...getResult.data,
            description: 'Updated: Essential electrolyte for TPN therapy with enhanced safety protocols'
          };
          
          const updateResult = await ingredientService.saveIngredient(
            updatedIngredient,
            'Enhanced safety protocols added'
          );
          
          if (updateResult.success) {
            console.log('✓ Ingredient updated successfully');
          }
        }
      }
      
      // 4. Get all ingredients (cached for performance)
      const allIngredientsResult = await ingredientService.getAllIngredients();
      if (allIngredientsResult.success) {
        console.log(`✓ Retrieved ${allIngredientsResult.data.length} total ingredients`);
      }
      
      // 5. Get ingredients by category (also cached)
      const electrolyteResult = await ingredientService.getIngredientsByCategory('ELECTROLYTE');
      if (electrolyteResult.success) {
        console.log(`✓ Retrieved ${electrolyteResult.data.length} electrolyte ingredients`);
      }
      
    } catch (error) {
      console.error('❌ Ingredient management error:', error);
      // Error service provides user-friendly error messages
      if (error.userMessage) {
        console.error('User message:', error.userMessage);
      }
    }
  }

  /**
   * Demonstrate real-time ingredient subscription with cleanup
   */
  async demonstrateRealTimeSubscription() {
    console.log('=== Real-time Subscription Example ===');
    
    // Subscribe to ingredient changes with optimization
    const unsubscribe = ingredientService.subscribeToIngredients(
      (ingredients) => {
        console.log(`🔄 Ingredient update: ${ingredients.length} ingredients`);
        // Update UI here
        this.updateIngredientUI(ingredients);
      },
      (error) => {
        console.error('❌ Subscription error:', error);
      }
    );
    
    // Cleanup after 30 seconds (in real app, do this on component unmount)
    setTimeout(() => {
      unsubscribe();
      console.log('✓ Subscription cleaned up');
    }, 30000);
  }

  private updateIngredientUI(ingredients: IngredientData[]) {
    // Mock UI update
    console.log('🎯 UI updated with ingredients:', ingredients.map(i => i.name));
  }
}

/**
 * Example 2: Reference management with population-specific handling
 */
export class ReferenceManagementExample {
  async demonstrateReferenceOperations() {
    try {
      console.log('=== Reference Management Example ===');
      
      // First, ensure we have an ingredient to work with
      const ingredientsResult = await ingredientService.getAllIngredients();
      if (!ingredientsResult.success || ingredientsResult.data.length === 0) {
        console.log('❌ No ingredients found. Create ingredients first.');
        return;
      }
      
      const ingredient = ingredientsResult.data[0];
      console.log(`📋 Working with ingredient: ${ingredient.name}`);
      
      // 1. Create a pediatric reference
      const pediatricReference: ReferenceData = {
        name: 'CHOC Pediatric Protocol',
        healthSystem: 'CHOC',
        domain: 'pediatrics',
        subdomain: 'intensive-care',
        version: 'v2.1',
        populationType: 'child' as PopulationType,
        sections: [
          {
            id: 1,
            type: 'static',
            content: 'Pediatric dosing guidelines for TPN therapy'
          },
          {
            id: 2,
            type: 'dynamic',
            content: 'calculatePediatricDose(me.getValue("weight"), me.getValue("age"))',
            testCases: [
              { name: 'Infant', variables: { weight: 3.5, age: 0.1 } },
              { name: 'Toddler', variables: { weight: 12, age: 2 } }
            ]
          }
        ]
      };
      
      const saveRefResult = await referenceService.saveReference(
        ingredient.id!,
        pediatricReference,
        'Initial pediatric protocol creation'
      );
      
      if (saveRefResult.success) {
        console.log(`✓ Pediatric reference created: ${saveRefResult.data}`);
        
        // 2. Get references by population type
        const pediatricRefs = await referenceService.getReferencesByPopulation(
          ingredient.id!,
          'child'
        );
        
        if (pediatricRefs.success) {
          console.log(`✓ Found ${pediatricRefs.data.length} pediatric references`);
        }
        
        // 3. Update validation status
        const validationResult = await referenceService.updateReferenceValidation(
          ingredient.id!,
          saveRefResult.data!,
          {
            status: 'passed',
            notes: 'Validated by pediatric clinical team',
            testResults: { safety: 'passed', efficacy: 'passed' }
          }
        );
        
        if (validationResult.success) {
          console.log('✓ Reference validation updated');
        }
      }
      
      // 4. Get all references for ingredient
      const allRefsResult = await referenceService.getReferencesForIngredient(ingredient.id!);
      if (allRefsResult.success) {
        console.log(`✓ Retrieved ${allRefsResult.data.length} references for ${ingredient.name}`);
      }
      
    } catch (error) {
      console.error('❌ Reference management error:', error);
    }
  }

  /**
   * Demonstrate reference comparison across health systems
   */
  async demonstrateReferenceComparison() {
    try {
      console.log('=== Reference Comparison Example ===');
      
      const ingredientsResult = await ingredientService.getAllIngredients();
      if (!ingredientsResult.success || ingredientsResult.data.length === 0) {
        return;
      }
      
      const ingredient = ingredientsResult.data[0];
      
      // Get references grouped by population type for comparison
      const comparisonResult = await referenceService.getReferencesForComparison(
        ingredient.id!
      );
      
      if (comparisonResult.success) {
        console.log('📊 Reference Comparison:');
        Object.entries(comparisonResult.data).forEach(([populationType, references]) => {
          console.log(`  ${populationType}: ${references.length} references`);
          references.forEach(ref => {
            console.log(`    - ${ref.healthSystem}: ${ref.name} (${ref.validationStatus})`);
          });
        });
      }
      
    } catch (error) {
      console.error('❌ Reference comparison error:', error);
    }
  }
}

/**
 * Example 3: Configuration import with duplicate detection and auto-deduplication
 */
export class ConfigImportExample {
  async demonstrateConfigImport() {
    try {
      console.log('=== Configuration Import Example ===');
      
      // Mock configuration data (would come from file upload)
      const mockConfigData: ConfigData = {
        INGREDIENT: [
          {
            KEYNAME: 'PotassiumChloride',
            DISPLAY: 'Potassium Chloride for TPN',
            Unit: 'mEq/L',
            TYPE: 'electrolyte',
            NOTE: [
              { TEXT: 'Standard electrolyte replacement' },
              { TEXT: '[f( calculateDose(me.getValue("weight")) )]' },
              { TEXT: 'Monitor serum levels closely' }
            ]
          },
          {
            KEYNAME: 'CalciumGluconate',
            DISPLAY: 'Calcium Gluconate 10%',
            Unit: 'mg/dL',
            TYPE: 'electrolyte',
            NOTE: [
              { TEXT: 'Essential for bone development' },
              { TEXT: 'Pediatric dosing: 200-800 mg/kg/day' }
            ]
          }
        ]
      };
      
      const metadata: ConfigMetadata = {
        name: 'CHOC Pediatric TPN Protocol v2.1',
        healthSystem: 'CHOC',
        domain: 'pediatrics',
        subdomain: 'nicu',
        version: 'child',
        importedBy: 'dr.smith@choc.org'
      };
      
      // 1. First, detect duplicates before import
      console.log('🔍 Detecting duplicates...');
      const duplicateReport = await configService.detectDuplicatesBeforeImport(mockConfigData);
      
      console.log(`📊 Duplicate Detection Results:`);
      console.log(`  Total ingredients checked: ${duplicateReport.totalChecked}`);
      console.log(`  Duplicates found: ${duplicateReport.duplicatesFound.length}`);
      console.log(`  Identical ingredients: ${duplicateReport.identicalIngredients.length}`);
      console.log(`  Variations: ${duplicateReport.variations.length}`);
      
      // 2. Import the configuration
      console.log('📥 Importing configuration...');
      const importResult = await configService.saveImportedConfig(mockConfigData, metadata);
      
      if (importResult.success) {
        const { configId, duplicateReport: finalReport, importStats } = importResult.data;
        
        console.log(`✓ Configuration imported: ${configId}`);
        console.log(`📈 Import Statistics:`);
        console.log(`  Total ingredients: ${importStats.totalIngredients}`);
        console.log(`  New ingredients: ${importStats.newIngredients}`);
        console.log(`  Updated ingredients: ${importStats.updatedIngredients}`);
        
        // 3. Get the imported configuration
        const configResult = await configService.getConfig(configId);
        if (configResult.success && configResult.data) {
          console.log(`✓ Retrieved config: ${configResult.data.name}`);
        }
        
        // 4. Get ingredients for the configuration
        const configIngredientsResult = await configService.getConfigIngredients(configId);
        if (configIngredientsResult.success) {
          console.log(`✓ Config has ${configIngredientsResult.data.length} ingredients`);
        }
      }
      
    } catch (error) {
      console.error('❌ Configuration import error:', error);
    }
  }

  /**
   * Demonstrate baseline comparison and revert functionality
   */
  async demonstrateBaselineComparison() {
    try {
      console.log('=== Baseline Comparison Example ===');
      
      const configsResult = await configService.getAllConfigs();
      if (!configsResult.success || configsResult.data.length === 0) {
        console.log('❌ No configurations found');
        return;
      }
      
      const config = configsResult.data[0];
      const testIngredientName = 'Potassium Chloride';
      
      // Compare working copy with baseline
      const comparisonResult = await configService.compareWithBaseline(
        config.id,
        testIngredientName
      );
      
      if (comparisonResult.success) {
        console.log(`📋 Baseline Comparison for ${testIngredientName}:`);
        console.log(`  Status: ${comparisonResult.data.status}`);
        
        if (comparisonResult.data.differences) {
          console.log('  Changes detected from baseline');
        }
        
        // If modified, demonstrate revert
        if (comparisonResult.data.status === 'MODIFIED') {
          console.log('🔄 Reverting to baseline...');
          const revertResult = await configService.revertToBaseline(
            config.id,
            testIngredientName
          );
          
          if (revertResult.success) {
            console.log('✓ Successfully reverted to baseline');
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Baseline comparison error:', error);
    }
  }
}

/**
 * Example 4: Performance monitoring and optimization
 */
export class PerformanceMonitoringExample {
  async demonstrateHealthMonitoring() {
    console.log('=== Performance Monitoring Example ===');
    
    try {
      // 1. Get comprehensive health status
      const health = await firebaseService.healthCheck();
      
      console.log('🏥 Service Health Status:');
      console.log(`  Online: ${health.isOnline}`);
      console.log(`  Cache Hit Ratio: ${(health.cacheHitRatio * 100).toFixed(1)}%`);
      console.log(`  Active Subscriptions: ${health.activeSubscriptions}`);
      console.log(`  Error Rate: ${(health.errorRate * 100).toFixed(2)}%`);
      console.log(`  Avg Response Time: ${health.performance.avgResponseTime.toFixed(0)}ms`);
      
      // 2. Get detailed metrics
      const metrics = firebaseService.getMetrics();
      
      console.log('📊 Detailed Metrics:');
      console.log('  Cache:', {
        hits: metrics.cache.hits,
        misses: metrics.cache.misses,
        hitRatio: `${(metrics.cache.hitRatio * 100).toFixed(1)}%`,
        size: metrics.cache.size
      });
      
      console.log('  Sync:', {
        totalSubscriptions: metrics.sync.totalSubscriptions,
        activeSubscriptions: metrics.sync.activeSubscriptions,
        totalUpdates: metrics.sync.totalUpdates,
        errors: metrics.sync.errors
      });
      
      console.log('  Network:', {
        isOnline: metrics.network.isOnline,
        connectionType: metrics.network.connectionType || 'unknown'
      });
      
      // 3. Test connectivity
      const isConnected = await firebaseService.testConnectivity();
      console.log(`🔌 Connectivity Test: ${isConnected ? 'PASSED' : 'FAILED'}`);
      
      // 4. Get active subscriptions for debugging
      const activeSubscriptions = firebaseService.getActiveSubscriptions();
      console.log(`📡 Active Subscriptions: ${activeSubscriptions.length}`);
      activeSubscriptions.forEach(sub => {
        console.log(`  - ${sub.id}: ${sub.collectionPath} (${sub.updateCount} updates)`);
      });
      
    } catch (error) {
      console.error('❌ Health monitoring error:', error);
    }
  }

  /**
   * Demonstrate performance optimization
   */
  async demonstratePerformanceOptimization() {
    console.log('=== Performance Optimization Example ===');
    
    try {
      // Get metrics before optimization
      const beforeMetrics = firebaseService.getMetrics();
      console.log('📊 Before optimization:');
      console.log(`  Cache size: ${beforeMetrics.cache.size}`);
      console.log(`  Active subscriptions: ${beforeMetrics.sync.activeSubscriptions}`);
      
      // Run optimization
      await firebaseService.optimizePerformance();
      
      // Get metrics after optimization
      const afterMetrics = firebaseService.getMetrics();
      console.log('📊 After optimization:');
      console.log(`  Cache size: ${afterMetrics.cache.size}`);
      console.log(`  Active subscriptions: ${afterMetrics.sync.activeSubscriptions}`);
      
      console.log('✓ Performance optimization completed');
      
    } catch (error) {
      console.error('❌ Performance optimization error:', error);
    }
  }
}

/**
 * Example 5: Error handling and recovery
 */
export class ErrorHandlingExample {
  async demonstrateErrorHandling() {
    console.log('=== Error Handling Example ===');
    
    try {
      // 1. Simulate a network error with retry
      console.log('🔄 Testing retry logic with network simulation...');
      
      const retryResult = await errorService.withRetry(
        async () => {
          // Simulate intermittent failure
          if (Math.random() < 0.7) {
            throw new Error('Simulated network error');
          }
          return 'Success after retry';
        },
        {
          maxAttempts: 5,
          baseDelay: 1000,
          backoffFactor: 2
        }
      );
      
      console.log(`✓ Retry success: ${retryResult}`);
      
    } catch (error) {
      console.log(`❌ Retry failed: ${error.message}`);
    }
    
    // 2. Demonstrate network state monitoring
    console.log('📡 Setting up network monitoring...');
    const unsubscribeNetwork = errorService.onNetworkStateChange((state) => {
      console.log(`🌐 Network state changed:`, {
        online: state.isOnline,
        type: state.connectionType,
        effective: state.effectiveType
      });
    });
    
    // 3. Get error statistics
    const errorStats = errorService.getErrorStats();
    console.log('📈 Error Statistics:', {
      total: errorStats.total,
      last24h: errorStats.last24h,
      byType: errorStats.byType,
      bySeverity: errorStats.bySeverity
    });
    
    // Cleanup
    setTimeout(() => {
      unsubscribeNetwork();
      console.log('✓ Network monitoring cleaned up');
    }, 10000);
  }

  /**
   * Demonstrate medical safety error handling
   */
  async demonstrateMedicalSafetyValidation() {
    console.log('=== Medical Safety Validation Example ===');
    
    try {
      // Try to create a high-risk ingredient
      const dangerousIngredient: IngredientData = {
        name: 'Insulin (High Concentration)', // This should trigger safety warning
        category: 'HORMONE',
        description: 'High-alert medication',
        unit: 'units/mL',
        type: 'high-risk'
      };
      
      const result = await ingredientService.saveIngredient(dangerousIngredient);
      
      if (result.success) {
        console.log('⚠️ High-risk ingredient created with safety protocols');
      }
      
    } catch (error) {
      if (error.type === 'MEDICAL_SAFETY_ERROR') {
        console.log('🚨 Medical safety error caught:', error.userMessage);
        console.log('Technical details:', error.technicalDetails);
      } else {
        console.error('❌ Unexpected error:', error);
      }
    }
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Starting Firebase Service Examples...');
  console.log('=========================================');
  
  try {
    // Initialize services
    await firebaseService.initialize();
    
    const ingredientExample = new IngredientManagementExample();
    const referenceExample = new ReferenceManagementExample();
    const configExample = new ConfigImportExample();
    const performanceExample = new PerformanceMonitoringExample();
    const errorExample = new ErrorHandlingExample();
    
    // Run examples sequentially
    await ingredientExample.demonstrateIngredientOperations();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    
    await referenceExample.demonstrateReferenceOperations();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await configExample.demonstrateConfigImport();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await performanceExample.demonstrateHealthMonitoring();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await errorExample.demonstrateErrorHandling();
    
    console.log('=========================================');
    console.log('✅ All examples completed successfully!');
    
    // Final health check
    const finalHealth = await firebaseService.healthCheck();
    console.log('📊 Final Health Status:', {
      online: finalHealth.isOnline,
      cacheHitRatio: `${(finalHealth.cacheHitRatio * 100).toFixed(1)}%`,
      avgResponseTime: `${finalHealth.performance.avgResponseTime.toFixed(0)}ms`
    });
    
  } catch (error) {
    console.error('❌ Examples failed:', error);
  }
}

// Export individual examples for selective usage
export {
  IngredientManagementExample,
  ReferenceManagementExample,
  ConfigImportExample,
  PerformanceMonitoringExample,
  ErrorHandlingExample
};