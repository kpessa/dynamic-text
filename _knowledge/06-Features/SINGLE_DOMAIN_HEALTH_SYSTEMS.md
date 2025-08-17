---
title: Single-Domain Health Systems Support
tags: [#features, #health-systems, #domain-management, #ux-improvement, #choc]
created: 2025-08-17
updated: 2025-08-17
status: implemented
---

# Single-Domain Health Systems Support

## Feature Overview
Health systems like CHOC that only have a single facility/domain now automatically get a "main" domain instead of requiring selection of UHS-specific domains (west, central, east).

## Changes Implemented

### 1. Automatic Domain Assignment
- Non-UHS health systems automatically use "main" as their domain
- This happens both during import and when saving references

### 2. Folder Structure
- **UHS**: Maintains the existing structure with multiple domains
  - UHS → West/Central/East → Subdomains → Versions
- **Other Health Systems**: Use a simplified structure with single domain
  - CHOC → Main → Subdomains → Versions
  - Other → Main → Subdomains → Versions

### 3. UI Updates
- Domain selector is automatically disabled for non-UHS health systems
- Shows "Main (default)" as the domain value
- Applies to both import and save dialogs

### 4. Reactive Behavior
- When health system selection changes in dialogs:
  - UHS: Domain selector enables, allows selection of west/central/east
  - Non-UHS: Domain automatically sets to "main", selector disables

## User Experience
1. Select CHOC (or any non-UHS health system) in import dialog
2. Domain automatically shows "Main (default)" and is disabled
3. Continue with subdomain and version selection as normal
4. Imported items appear under CHOC → Main → [subdomain] → [version]

## Benefits
- Simplifies workflow for single-facility health systems
- Maintains consistency in folder structure
- No need to select irrelevant domains for non-UHS facilities
- Backward compatible with existing data

## Testing Steps
1. Go to import dialog
2. Select CHOC as health system
3. Verify domain shows "Main (default)" and is disabled
4. Import some ingredients
5. Check sidebar - items should appear under CHOC → Main
6. Try switching between UHS and CHOC to verify domain selector behavior

## Technical Implementation

### Domain Logic
```javascript
// Automatic domain assignment for non-UHS systems
function getDefaultDomain(healthSystem) {
  return healthSystem === 'UHS' ? '' : 'main';
}

// UI state management
const isUHS = healthSystem === 'UHS';
const domainDisabled = !isUHS;
const domainValue = isUHS ? selectedDomain : 'main';
```

### Data Structure
```
Health Systems:
├── UHS/
│   ├── west/
│   ├── central/
│   └── east/
├── CHOC/
│   └── main/
└── Other/
    └── main/
```

### Components Affected
- [[ExportModal]] - Save dialog domain handling
- [[IngredientManager]] - Import dialog domain handling
- [[Sidebar]] - Folder structure display
- Health system selection logic

## Backward Compatibility

- Existing UHS data structure unchanged
- New "main" domain structure for other systems
- Migration not required for existing data
- Supports mixed data structures

## Future Enhancements

### Potential Improvements
- Support for custom domain names
- Multi-domain support for larger health systems
- Domain-specific configurations
- Advanced folder organization options

### Configuration Options
```javascript
// Future: Configurable domain structure
const healthSystemConfig = {
  'UHS': ['west', 'central', 'east'],
  'CHOC': ['main'],
  'Custom': ['domain1', 'domain2'] // Future support
};
```

## Related Documents

- [[CHOC-import-fix]] - CHOC import issues fixed
- [[ExportModal]] - Save dialog implementation
- [[IngredientManager]] - Import functionality
- [[health-system-management]] - Health system configuration