# Story 1: Stabilize Firebase Save/Load Functionality

## Technical Requirements

### 1.1 Firebase Data Structure

```typescript
// types/firebase.types.ts
interface SavedConfiguration {
  // Metadata
  id: string;                    // UUID v4
  version: number;               // Schema version for migrations
  createdAt: Timestamp;          // Firebase Timestamp
  updatedAt: Timestamp;          // Firebase Timestamp
  createdBy: string;             // User UID from Firebase Auth
  lastModifiedBy: string;        // User UID from Firebase Auth
  
  // Core Data
  name: string;                  // Configuration name
  description?: string;          // Optional description
  
  // Section Data
  sections: Section[];           // Array of sections
  sectionOrder: string[];        // Array of section IDs for ordering
  
  // Test Data
  testCases: TestCaseMap;        // Map of sectionId -> TestCase[]
  globalTestContext?: TestContext; // Shared test values
  
  // TPN Configuration
  tpnSettings: {
    populationType: 'child' | 'adolescent' | 'adult' | 'neonate';
    defaultValues: Record<string, any>;
    ingredients?: IngredientConfig[];
  };
  
  // State Management
  checksum: string;              // SHA-256 of serialized data
  isDraft: boolean;              // Draft vs published state
  tags?: string[];               // Organization tags
}

interface Section {
  id: string;                    // UUID v4
  title: string;                 // Display title
  type: 'static' | 'dynamic';    // Section type
  content: string;               // HTML or JavaScript code
  enabled: boolean;              // Active/inactive state
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastEditedBy: string;
    version: number;             // For conflict resolution
  };
  
  // Dynamic Section Specific
  dynamicConfig?: {
    timeout: number;             // Execution timeout in ms
    requiredContext: string[];  // Required me.getValue() keys
    exports?: string[];          // Exported variables
  };
}

interface TestCase {
  id: string;                    // UUID v4
  sectionId: string;             // Parent section reference
  name: string;                  // Test case name
  description?: string;          // Test purpose
  
  // Test Configuration
  input: Record<string, any>;    // Input values for me object
  expectedOutput: string;        // Expected HTML output
  
  // Test Metadata
  status?: 'passed' | 'failed' | 'pending';
  lastRun?: Timestamp;
  lastRunDuration?: number;      // Execution time in ms
  errorMessage?: string;         // Failure details
  
  // AI Generation Metadata
  isAIGenerated?: boolean;
  aiModel?: string;
  aiPrompt?: string;
}

type TestCaseMap = Record<string, TestCase[]>;

interface TestContext {
  globalValues: Record<string, any>;
  populationType: string;
  ingredients: any[];
}
```

### 1.2 Save Implementation

```typescript
// services/firebaseSaveService.ts
class FirebaseSaveService {
  private readonly COLLECTION = 'configurations';
  private readonly BATCH_SIZE = 500; // Firestore batch limit
  
  async saveConfiguration(config: SavedConfiguration): Promise<SaveResult> {
    try {
      // 1. Validate data structure
      const validation = await this.validateConfiguration(config);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors);
      }
      
      // 2. Calculate checksum
      config.checksum = await this.calculateChecksum(config);
      
      // 3. Prepare for save with optimistic locking
      const existingDoc = await this.getExistingDocument(config.id);
      if (existingDoc && existingDoc.checksum !== config.checksum) {
        // Conflict detection
        const resolution = await this.resolveConflict(existingDoc, config);
        if (resolution.action === 'abort') {
          throw new ConflictError('Save aborted due to conflicts');
        }
        config = resolution.merged;
      }
      
      // 4. Use transaction for atomic save
      const result = await firestore.runTransaction(async (transaction) => {
        const docRef = firestore.collection(this.COLLECTION).doc(config.id);
        
        // Save main configuration
        transaction.set(docRef, {
          ...config,
          updatedAt: serverTimestamp(),
          version: increment(1)
        });
        
        // Save large sections separately if needed (> 1MB limit)
        if (this.isLargeConfiguration(config)) {
          await this.saveLargeSections(transaction, config);
        }
        
        // Update user's configuration index
        const userRef = firestore.collection('users')
          .doc(config.lastModifiedBy)
          .collection('configurations')
          .doc(config.id);
          
        transaction.set(userRef, {
          name: config.name,
          updatedAt: serverTimestamp(),
          role: 'owner'
        });
        
        return { success: true, id: config.id };
      });
      
      // 5. Verify save with read-back
      const saved = await this.verifyConfiguration(config.id, config.checksum);
      if (!saved.verified) {
        throw new VerificationError('Save verification failed');
      }
      
      return {
        success: true,
        id: config.id,
        timestamp: saved.timestamp,
        checksum: config.checksum
      };
      
    } catch (error) {
      // Log to monitoring
      console.error('Save failed:', error);
      
      // Attempt local backup
      await this.saveLocalBackup(config);
      
      throw new SaveError('Failed to save configuration', { cause: error });
    }
  }
  
  private async validateConfiguration(config: any): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Required fields
    if (!config.id) errors.push('Missing configuration ID');
    if (!config.sections || !Array.isArray(config.sections)) {
      errors.push('Invalid sections array');
    }
    
    // Section validation
    for (const section of config.sections || []) {
      if (!section.id) errors.push(`Section missing ID`);
      if (!section.type || !['static', 'dynamic'].includes(section.type)) {
        errors.push(`Invalid section type: ${section.type}`);
      }
      if (section.type === 'dynamic' && !section.dynamicConfig) {
        errors.push(`Dynamic section ${section.id} missing config`);
      }
    }
    
    // Size validation
    const size = JSON.stringify(config).length;
    if (size > 10_000_000) { // 10MB limit
      errors.push(`Configuration too large: ${size} bytes`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private async calculateChecksum(config: SavedConfiguration): Promise<string> {
    // Deterministic serialization
    const normalized = this.normalizeForChecksum(config);
    const json = JSON.stringify(normalized, Object.keys(normalized).sort());
    
    // Use Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
```

### 1.3 Load Implementation

```typescript
// services/firebaseLoadService.ts
class FirebaseLoadService {
  async loadConfiguration(id: string): Promise<SavedConfiguration> {
    try {
      // 1. Fetch main document
      const docRef = firestore.collection('configurations').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new NotFoundError(`Configuration ${id} not found`);
      }
      
      const data = doc.data() as SavedConfiguration;
      
      // 2. Handle large configurations
      if (data.sections?.length === 0 && data.sectionOrder?.length > 0) {
        // Sections stored separately
        data.sections = await this.loadLargeSections(id, data.sectionOrder);
      }
      
      // 3. Verify data integrity
      const calculatedChecksum = await this.calculateChecksum(data);
      if (calculatedChecksum !== data.checksum) {
        console.warn('Checksum mismatch detected');
        
        // Attempt recovery
        const recovered = await this.attemptRecovery(id);
        if (recovered) {
          data = recovered;
        } else {
          throw new IntegrityError('Data integrity check failed');
        }
      }
      
      // 4. Migrate if needed
      if (data.version < CURRENT_SCHEMA_VERSION) {
        data = await this.migrateConfiguration(data);
      }
      
      // 5. Restore to application state
      await this.restoreToState(data);
      
      return data;
      
    } catch (error) {
      console.error('Load failed:', error);
      
      // Attempt cache recovery
      const cached = await this.loadFromCache(id);
      if (cached) {
        console.warn('Loaded from cache due to error');
        return cached;
      }
      
      throw new LoadError('Failed to load configuration', { cause: error });
    }
  }
  
  private async restoreToState(config: SavedConfiguration): Promise<void> {
    // Update stores in correct order
    
    // 1. Clear existing state
    sectionStore.clear();
    testStore.clear();
    tpnStore.reset();
    
    // 2. Restore TPN settings first (needed for context)
    tpnStore.setPopulationType(config.tpnSettings.populationType);
    tpnStore.setDefaultValues(config.tpnSettings.defaultValues);
    
    // 3. Restore sections
    for (const section of config.sections) {
      sectionStore.addSection(section);
    }
    
    // 4. Restore section order
    sectionStore.reorderSections(config.sectionOrder);
    
    // 5. Restore test cases
    for (const [sectionId, tests] of Object.entries(config.testCases)) {
      testStore.setTestsForSection(sectionId, tests);
    }
    
    // 6. Update UI state
    uiStore.setConfigurationName(config.name);
    uiStore.setLastSaved(config.updatedAt);
    uiStore.setSaveStatus('saved');
  }
}
```

---
