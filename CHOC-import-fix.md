# CHOC Import Visibility Fix

## Problem
When importing CHOC health system configs and ingredients, they were saved but not visible in the sidebar because:
- The `healthSystems` array was hardcoded to only include 'UHS' and 'Other'
- CHOC wasn't automatically added to the filter options
- Imported items couldn't be filtered/viewed

## Solution Implemented

### 1. Auto-add Health Systems During Import
Modified `handleImportJSON()` to automatically add new health systems:
```javascript
// Auto-add new health system if it doesn't exist
if (importData.healthSystem && !healthSystems.includes(importData.healthSystem)) {
  addHealthSystem(importData.healthSystem);
}
```

### 2. Modified addHealthSystem Function
Updated to accept an optional parameter:
```javascript
function addHealthSystem(systemName = null) {
  const nameToAdd = systemName || newItemName;
  // ... rest of function
}
```

### 3. Discover Missing Health Systems on Load
Updated `loadFromLocalStorage()` to scan existing references and add any missing health systems:
```javascript
// Discover any missing health systems from existing references
Object.values(referenceTexts).forEach(ref => {
  if (ref.healthSystem && !healthSystems.includes(ref.healthSystem)) {
    addHealthSystem(ref.healthSystem);
  }
});
```

## Expected Behavior After Fix
1. When you reload the page, CHOC should appear in the Health System filter dropdown
2. You can filter and view all CHOC imported configs and ingredients
3. Future imports with new health systems will automatically add them to the filter options
4. The folder structure for CHOC will be created automatically

## Testing
1. Reload the application at http://localhost:5173/
2. Check the Health System dropdown in the sidebar filters
3. CHOC should now appear as an option
4. Select CHOC to see all imported CHOC ingredients