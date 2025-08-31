# Data Model Architecture

## Overview

This directory contains the TypeScript interfaces and type definitions for the ingredient-first data model architecture. The model represents a shift from reference-centric to ingredient-centric data organization.

## Core Concepts

### 1. Ingredients
- **Primary entity** containing TPN advisor content
- **Direct storage** of sections and test cases
- **Population variants** for different patient types
- **Versioning** and metadata tracking

### 2. Config Manifests
- **Lightweight references** to shared ingredients
- **Health system specific** configurations
- **Optional overrides** for customization
- **Source tracking** for imports

### 3. Transformations
- **Migration utilities** from legacy formats
- **Type guards** for runtime validation
- **Deduplication** analysis
- **Comparison** utilities

## File Structure

```
models/
├── ingredient.ts        # Ingredient entity interfaces
├── config.ts           # ConfigManifest interfaces
├── shared.ts           # Common types (Section, TestCase)
├── transformations.ts  # Migration and validation utilities
├── compatibility.ts    # Backward compatibility aliases
├── index.ts           # Barrel export
└── __tests__/         # Type guard tests
```

## Usage Examples

### Creating an Ingredient

```typescript
import type { Ingredient } from '@/lib/models';

const calcium: Ingredient = {
  id: 'calcium',
  keyname: 'Calcium',
  displayName: 'Calcium Gluconate',
  category: 'Salt',
  sections: [
    {
      id: 'calc-1',
      type: 'javascript',
      content: 'return me.getValue("calcium");',
      order: 0
    }
  ],
  tests: [
    {
      id: 'test-1',
      name: 'Normal Range',
      variables: { calcium: 2.5 }
    }
  ],
  metadata: {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};
```

### Creating a Config Manifest

```typescript
import type { ConfigManifest } from '@/lib/models';

const manifest: ConfigManifest = {
  id: 'choc-pediatric-tpn',
  name: 'CHOC Pediatric TPN',
  ingredientRefs: [
    {
      ingredientId: 'calcium',
      overrides: null
    },
    {
      ingredientId: 'phosphate',
      overrides: {
        displayName: 'Phosphate (Pediatric)'
      }
    }
  ],
  settings: {
    flexEnabled: true,
    defaultPopulation: 'pediatric'
  }
};
```

### Using Type Guards

```typescript
import { isIngredient, isLegacyConfig } from '@/lib/models';

function processData(data: unknown) {
  if (isLegacyConfig(data)) {
    // Handle legacy format
    console.log('Legacy config:', data.KEYNAME);
  } else if (isIngredient(data)) {
    // Handle new format
    console.log('New ingredient:', data.keyname);
  }
}
```

## Migration Path

### From Legacy to New Format

1. **Detect format** using type guards
2. **Transform data** using migration utilities
3. **Validate output** with type guards
4. **Preserve compatibility** with aliases

```typescript
import { isLegacyConfig } from '@/lib/models';
import { migrateLegacyToIngredient } from '@/lib/services/migration';

async function handleImport(data: unknown) {
  if (isLegacyConfig(data)) {
    const result = await migrateLegacyToIngredient(data);
    if (result.success) {
      return result.data;
    }
  }
  return data;
}
```

## Type Safety

All interfaces use strict TypeScript typing with:
- Required vs optional fields clearly marked
- Union types for constrained values
- Generic types for reusable patterns
- Type guards for runtime validation

## Backward Compatibility

The `compatibility.ts` file provides:
- Type aliases for existing code
- Migration helpers
- Format detection utilities

This ensures existing code continues to work during the migration period.

## Testing

Type guards are tested comprehensively in `__tests__/type-guards.test.ts`:
- Valid object validation
- Invalid object rejection
- Edge case handling
- Complex nested structure validation

Run tests with:
```bash
pnpm test src/lib/models/__tests__/type-guards.test.ts
```