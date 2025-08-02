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