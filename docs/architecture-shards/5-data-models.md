# 5. Data Models

## Core Data Structures

### Section Model
```typescript
interface Section {
  id: string                    // Unique identifier
  type: 'static' | 'dynamic'    // Content type
  name: string                  // User-friendly name
  content: string              // HTML or JavaScript code
  order: number                // Display order
  testCases?: TestCase[]       // Associated tests
  metadata?: {
    created: Date
    modified: Date
    author?: string
  }
}
```

### Test Case Model
```typescript
interface TestCase {
  id: string
  name: string
  variables: Record<string, any>  // Input values
  expected: string                 // Expected output
  matchType: 'exact' | 'contains' | 'regex'
  result?: {
    status: 'pass' | 'fail' | 'error'
    actual?: string
    error?: string
  }
}
```

### TPN Context Model
```typescript
interface TPNContext {
  values: Record<string, number>     // TPN values
  ingredients: Ingredient[]          // Available ingredients
  populationType: PopulationType     // Current population
  
  // Methods available in sandbox
  getValue(key: string): number
  getObject(key: string): any
  hasValue(key: string): boolean
}
```

## Firebase Schema
```yaml
Collections:
  users/
    {userId}/
      references/
        {referenceId}/
          - name: string
          - sections: Section[]
          - version: number
          - lastModified: timestamp
          
  ingredients/
    {ingredientId}/
      - name: string
      - category: string
      - NOTE: { TEXT: string }[]
      - versions/
        {versionId}/
          - snapshot: Ingredient
          - timestamp: timestamp
          
  baselineConfigs/
    {configId}/
      - original: TPNConfig
      - imported: timestamp
      - immutable: true
```
