---
title: Firebase ID Normalization - Implementation Summary
tags: [#firebase, #id-normalization, #database, #fixes, #implementation]
created: 2025-08-17
updated: 2025-08-17
status: implemented
---

# Firebase ID Normalization - Implementation Summary

## Changes Made

### 1. Helper Functions Added
- `normalizeIngredientId(name)`: Converts ingredient names to kebab-case IDs
  - Example: "Sodium Chloride" → "sodium-chloride"
  - Example: "L-Cysteine HCl" → "l-cysteine-hcl"

- `normalizeConfigId(healthSystem, domain, subdomain, version)`: Creates config IDs
  - Example: "UHS", "West", "CERT", "neonatal" → "uhs-west-cert-neonatal"

- `generateReferenceId(referenceData)`: Creates reference IDs
  - Based on health system, domain, subdomain, and population type

### 2. Config Document IDs
- Changed from auto-generated UUIDs to meaningful IDs
- Pattern: `{healthSystem}-{domain}-{subdomain}-{version}`
- Uses `setDoc()` instead of `addDoc()`

### 3. Ingredient Document IDs  
- Changed from auto-generated UUIDs to normalized ingredient names
- Uses ingredient name as ID (lowercase, kebab-case)
- Direct document access via `getDoc()` instead of queries

### 4. Reference Document IDs
- Changed from auto-generated UUIDs to config-based IDs
- For imported configs: uses the config ID as reference ID
- For manual references: uses health system and population type

### 5. Functions Updated
- `saveIngredient()`: Now uses normalized ingredient name as ID
- `saveImportedConfig()`: Uses meaningful config ID and normalized ingredient IDs
- `saveReference()`: Generates meaningful reference IDs
- `migrateFromLocalStorage()`: Uses normalized IDs
- `migrateExistingConfigs()`: Uses normalized IDs

## Testing
To test the changes:
1. Import a new TPN config JSON file
2. Check Firebase console - configs should have IDs like "uhs-west-cert-neonatal"
3. Check ingredients - should have IDs like "heparin", "sodium-chloride"
4. Check references under ingredients - should use config IDs

## Benefits
- Firebase console is now much more readable
- Direct document access without queries: `doc(db, 'ingredients', 'heparin')`
- Predictable IDs for debugging and management
- Better data organization and navigation

## Implementation Details

### ID Normalization Process
```javascript
// Ingredient ID normalization
function normalizeIngredientId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Config ID normalization
function normalizeConfigId(healthSystem, domain, subdomain, version) {
  return [healthSystem, domain, subdomain, version]
    .map(part => part.toLowerCase())
    .join('-');
}
```

### Database Structure
```
Firestore Collections:
├── ingredients/
│   ├── sodium-chloride/
│   ├── heparin/
│   └── amino-acids-trophamine/
├── configs/
│   ├── uhs-west-cert-neonatal/
│   ├── choc-main-icu-pediatric/
│   └── uhs-central-picu-adolescent/
└── references/
    ├── uhs-west-cert-neonatal/
    └── choc-main-icu-pediatric/
```

## Related Issues Fixed

- UUID-based IDs replaced with human-readable IDs
- Firebase console navigation improved
- Query performance enhanced with direct document access
- Data consistency improved across all collections

## Related Documents

- [[FIREBASE_ID_ISSUES_SUMMARY]] - Specific ID-related issues
- [[CHOC_IMPORT_FIX]] - CHOC import visibility issues
- [[FIREBASE_INTEGRATION]] - Firebase service architecture
- [[firebaseDataService]] - Implementation details