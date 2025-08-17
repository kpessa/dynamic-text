# Firebase Service Patterns

*Date: August 17, 2025*
*Pattern Category: Service Layer*

## Overview

Documented patterns for Firebase service implementation and testing based on the Dynamic Text Editor project's Firebase data service.

## Service Layer Architecture

### 1. Service Module Pattern

```typescript
// Firebase service organized by domain
export const ingredientService = {
  async saveIngredient(data: IngredientData): Promise<string> { },
  async getAllIngredients(): Promise<IngredientData[]> { },
  async deleteIngredient(id: string): Promise<void> { },
  // ... other methods
};

export const referenceService = {
  async saveReference(ingredientId: string, data: ReferenceData): Promise<string> { },
  async getReferencesForIngredient(ingredientId: string): Promise<ReferenceData[]> { },
  // ... other methods
};
```

**Benefits:**
- Clear separation of concerns
- Easy to mock for testing
- Consistent API patterns
- Composable service modules

### 2. Version Tracking Pattern

```typescript
async saveIngredient(ingredientData: IngredientData): Promise<string> {
  const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
  
  // Get current version
  const currentDoc = await getDoc(ingredientRef);
  const currentVersion = currentDoc.exists() ? (currentDoc.data()['version'] || 0) : 0;
  
  const data: IngredientData = {
    ...ingredientData,
    version: currentVersion + 1,
    lastModified: serverTimestamp(),
    contentHash: generateIngredientHash(ingredientData)
  };
  
  // Save current version to history before updating
  if (currentDoc.exists()) {
    await this.saveVersionHistory(ingredientId, currentDoc.data() as IngredientData);
  }
  
  await setDoc(ingredientRef, data);
  return ingredientId;
}
```

**Benefits:**
- Complete audit trail
- Rollback capability
- Content change detection
- Optimistic versioning

### 3. Nested Collection Pattern

```typescript
// References stored as subcollection under ingredients
const referenceRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId);

// Version history as subcollection under references
const versionRef = doc(collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'references', referenceId, 'versions'));
```

**Benefits:**
- Logical data grouping
- Efficient queries within context
- Automatic cleanup when parent deleted
- Clear data relationships

### 4. Batch Operation Pattern

```typescript
async clearAllIngredients(): Promise<number> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.INGREDIENTS));
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  return snapshot.docs.length;
}
```

**Benefits:**
- Atomic operations
- Better performance for bulk operations
- Consistent state
- Error handling

## Authentication Patterns

### 1. Anonymous Authentication with Fallback

```typescript
const user = getCurrentUser() || await signInAnonymouslyUser();
```

**Benefits:**
- Works without user signup
- Seamless user experience
- Can upgrade to authenticated later
- Proper audit trail

### 2. User Context in Operations

```typescript
const data = {
  ...documentData,
  createdBy: user.uid,
  modifiedBy: user.uid,
  lastModified: serverTimestamp()
};
```

**Benefits:**
- Audit trail
- Permission enforcement
- User activity tracking
- Data ownership

## Error Handling Patterns

### 1. Service-Level Error Handling

```typescript
async saveIngredient(ingredientData: IngredientData): Promise<string> {
  try {
    // ... Firebase operations
    return ingredientId;
  } catch (error) {
    console.error('Error saving ingredient:', error);
    throw error; // Re-throw for caller to handle
  }
}
```

**Benefits:**
- Centralized logging
- Error context preservation
- Caller decision on error handling
- Debug information

### 2. Graceful Degradation

```typescript
async saveVersionHistory(ingredientId: string, versionData: IngredientData): Promise<void> {
  try {
    // ... save version history
  } catch (error) {
    console.error('Error saving version history:', error);
    // Don't throw - version history is not critical
  }
}
```

**Benefits:**
- Core functionality continues
- Non-critical features fail silently
- Better user experience
- System resilience

## Query Optimization Patterns

### 1. Compound Queries with Indexes

```typescript
async getIngredientsByCategory(category: string) {
  const q = query(
    collection(db, COLLECTIONS.INGREDIENTS),
    where('category', '==', category),
    orderBy('name', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

**Benefits:**
- Efficient queries
- Server-side filtering
- Sorted results
- Reduced data transfer

### 2. Real-time Subscriptions

```typescript
subscribeToIngredients(callback: (ingredients: any[]) => void) {
  const q = query(
    collection(db, COLLECTIONS.INGREDIENTS),
    orderBy('name', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const ingredients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(ingredients);
  });
}
```

**Benefits:**
- Real-time updates
- Automatic UI synchronization
- Multi-user collaboration
- Efficient change detection

## Data Modeling Patterns

### 1. Content Hashing for Deduplication

```typescript
const data = {
  ...ingredientData,
  contentHash: generateIngredientHash(ingredientData)
};
```

**Benefits:**
- Duplicate detection
- Change tracking
- Content integrity
- Storage optimization

### 2. Normalized References

```typescript
// Store reference data separately from ingredient
const referenceData = {
  ingredientId,
  configId,
  healthSystem,
  populationType,
  sections: convertNotesToSections(notes)
};
```

**Benefits:**
- Flexible data relationships
- Independent versioning
- Efficient queries
- Data consistency

## Migration and Import Patterns

### 1. Baseline Preservation

```typescript
// Store original import as immutable baseline
if (!baselineExists.exists()) {
  await setDoc(baselineRef, {
    originalData: configData,
    isBaseline: true,
    importedAt: serverTimestamp()
  });
}
```

**Benefits:**
- Data integrity
- Rollback capability
- Change tracking
- Import auditing

### 2. Duplicate Detection Before Import

```typescript
async detectDuplicatesBeforeImport(configData: any) {
  const report = {
    duplicatesFound: [],
    identicalIngredients: [],
    variations: []
  };
  
  // Check each ingredient against existing data
  for (const importIngredient of configData.INGREDIENT) {
    const importHash = generateIngredientHash(importIngredient);
    // ... comparison logic
  }
  
  return report;
}
```

**Benefits:**
- Data quality
- User awareness
- Storage efficiency
- Import optimization

## Testing Patterns

### 1. Service Layer Mocking

```typescript
// Mock Firebase functions with realistic structure
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-id', path: 'mock/path' })),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => mockData
  }))
}));
```

**Benefits:**
- Fast test execution
- Predictable results
- No external dependencies
- Isolated testing

### 2. Mock Data Builders

```typescript
const createTestIngredient = (overrides = {}): IngredientData => ({
  id: 'test-ingredient',
  name: 'Test Ingredient',
  category: 'Test Category',
  version: 1,
  createdAt: new Date().toISOString(),
  ...overrides
});
```

**Benefits:**
- Consistent test data
- Easy to customize
- Maintainable tests
- Realistic scenarios

## Performance Patterns

### 1. Lazy Loading

```typescript
// Load ingredients on demand
async getIngredientsByCategory(category: string) {
  // Only fetch when needed
  return this.queryWithCache(category);
}
```

### 2. Client-Side Caching

```typescript
// Use Firestore's built-in caching
db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
});
```

## Security Patterns

### 1. Data Validation

```typescript
function validateIngredientData(data: IngredientData): void {
  if (!data.name || data.name.trim() === '') {
    throw new Error('Ingredient name is required');
  }
  // ... other validations
}
```

### 2. User Authorization

```typescript
// Check user permissions before operations
const user = getCurrentUser();
if (!user) {
  throw new Error('Authentication required');
}
```

## Integration Patterns

### 1. Service Composition

```typescript
// Combine multiple services for complex operations
export const complexOperationService = {
  async importAndProcess(configData: any) {
    const duplicateReport = await configService.detectDuplicatesBeforeImport(configData);
    const importResult = await configService.saveImportedConfig(configData, metadata);
    await auditService.logAction('CONFIG_IMPORTED', importResult);
    return { duplicateReport, importResult };
  }
};
```

### 2. Event-Driven Updates

```typescript
// Update related data when ingredients change
async saveIngredient(ingredientData: IngredientData): Promise<string> {
  const result = await setDoc(ingredientRef, data);
  
  // Trigger related updates
  await this.updateDerivedData(ingredientId);
  await auditService.logAction('INGREDIENT_SAVED', { ingredientId });
  
  return result;
}
```

## Common Pitfalls and Solutions

### 1. Avoid Deep Nesting
```typescript
// ❌ Avoid: Too many subcollection levels
ingredients/{id}/references/{refId}/versions/{versionId}/changes/{changeId}

// ✅ Better: Flatten with IDs
ingredients/{id}
references/{ingredientId}_{refId}
versions/{ingredientId}_{refId}_{versionId}
```

### 2. Handle Concurrent Updates
```typescript
// Use transactions for concurrent operations
await runTransaction(db, async (transaction) => {
  const doc = await transaction.get(docRef);
  const newVersion = (doc.data()?.version || 0) + 1;
  transaction.update(docRef, { version: newVersion });
});
```

### 3. Optimize Query Patterns
```typescript
// ❌ Avoid: Multiple separate queries
const ingredients = await getAllIngredients();
const references = await getReferencesForIngredient(id);

// ✅ Better: Single query with subcollection
const q = collectionGroup(db, 'references');
const snapshot = await getDocs(query(q, where('ingredientId', '==', id)));
```

## Related Patterns

- [[Service Layer Architecture]]
- [[Version Control Patterns]]
- [[Data Migration Patterns]]
- [[Testing Service Layers]]

---

*Patterns documented from Dynamic Text Editor Firebase implementation*
*Focus: Production-ready service patterns*