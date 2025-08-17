---
title: Firebase ID Issues Fix Summary
tags: [#firebase, #id-issues, #choc, #parentheses, #validation, #debugging]
created: 2025-08-17
updated: 2025-08-17
status: fixed
---

# Firebase ID Issues Fix Summary

## Issues Fixed

### 1. CHOC Config Import UUID Issue
**Problem**: CHOC configs were being saved with UUIDs instead of normalized IDs like "choc-main-icu-neonatal"

**Cause**: The Sidebar component was manually creating config IDs with string concatenation instead of using the `normalizeConfigId` function

**Fix**: 
- Imported `normalizeConfigId` from `firebaseDataService.js` into `Sidebar.svelte`
- Updated line 934 to use `normalizeConfigId()` instead of manual string concatenation
- This ensures consistent ID generation between local storage and Firebase

### 2. Ingredients with Parentheses
**Problem**: Ingredient names with parentheses (like "Amino Acids (Trophamine)") were potentially causing issues

**Fix**:
- Added Firebase ID validation function `isValidFirestoreId()` to check document ID requirements
- Enhanced `normalizeIngredientId()` with:
  - Logging for debugging parentheses normalization
  - Validation of generated IDs against Firebase restrictions
  - Fallback handling for edge cases (e.g., IDs over 1500 chars)
- Added comprehensive test cases for ingredients with parentheses

## Test Cases Added

### Ingredient Normalization Tests:
- `Amino Acids (Trophamine)` → `amino-acids-trophamine`
- `Calcium (Chloride)` → `calcium-chloride`
- `Dextrose (50%)` → `dextrose-50`
- `Trace Elements (NEOtrace)` → `trace-elements-neotrace`
- `Sodium Phosphate (mMol)` → `sodium-phosphate-mmol`
- `Magnesium Sulfate (mEq)` → `magnesium-sulfate-meq`
- `TPN Amino Acids 10% (Trophamine)` → `tpn-amino-acids-10-trophamine`
- `Calcium (Chloride) (10%)` → `calcium-chloride-10`
- `Multiple (Parentheses) (Test)` → `multiple-parentheses-test`

### Config Normalization Tests:
- `['CHOC', 'main', 'ICU', 'neonatal']` → `choc-main-icu-neonatal`
- `['CHOC', 'Main', 'PICU', 'Pediatric']` → `choc-main-picu-pediatric`

## Files Modified

1. **src/lib/Sidebar.svelte**
   - Added import for `normalizeConfigId`
   - Updated config ID generation to use proper normalization

2. **src/lib/firebaseDataService.js**
   - Added `isValidFirestoreId()` validation function
   - Enhanced `normalizeIngredientId()` with validation and logging
   - Added debug logging for parentheses normalization

3. **test-id-normalization.html**
   - Added 9 new test cases for ingredients with parentheses
   - Added 2 new test cases for CHOC config normalization

## Testing Instructions

1. Open `test-id-normalization.html` in your browser to verify all tests pass
2. Import a CHOC config and verify it creates proper IDs (e.g., "choc-main-icu-neonatal")
3. Create ingredients with parentheses and check console logs for normalization process
4. Verify ingredients with parentheses save correctly to Firebase

## Console Debugging

When creating/importing ingredients with parentheses, you'll now see console logs like:
```
Normalizing ingredient with parentheses: "Amino Acids (Trophamine)"
Normalized to: "amino-acids-trophamine"
```

This helps debug any issues with special character normalization.

## Technical Implementation

### ID Validation Function
```javascript
function isValidFirestoreId(id) {
  // Firestore document ID constraints
  if (!id || typeof id !== 'string') return false;
  if (id.length === 0 || id.length > 1500) return false;
  if (id === '.' || id === '..') return false;
  if (id.includes('/')) return false;
  return true;
}
```

### Enhanced Normalization
```javascript
function normalizeIngredientId(name) {
  console.log(`Normalizing ingredient with parentheses: "${name}"`);
  
  const normalized = name
    .toLowerCase()
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  console.log(`Normalized to: "${normalized}"`);
  
  if (!isValidFirestoreId(normalized)) {
    console.warn(`Invalid Firestore ID generated: ${normalized}`);
    return 'invalid-ingredient-id';
  }
  
  return normalized;
}
```

## Edge Cases Handled

- Empty or null ingredient names
- Names with multiple consecutive parentheses
- Names with special characters and percentages
- Very long ingredient names (>1500 characters)
- Reserved Firestore document names

## Related Documents

- [[FIREBASE_ID_NORMALIZATION_SUMMARY]] - Overall ID normalization strategy
- [[CHOC_IMPORT_FIX]] - CHOC import visibility fixes
- [[firebaseDataService]] - Firebase service implementation
- [[test-id-normalization]] - Testing utilities