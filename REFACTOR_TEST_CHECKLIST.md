# Refactoring Test Checklist

## Pre-Extraction Safety Check
- [ ] Current app is working without errors
- [ ] Dev server shows no compilation errors
- [ ] No TypeScript errors blocking functionality
- [ ] Create a git stash or commit as restore point

## Core Functionality Tests (Run after EACH extraction)

### 1. Section Management
- [ ] Can add new sections (HTML and JavaScript)
- [ ] Can edit section content
- [ ] Can delete sections
- [ ] Can reorder sections (drag and drop)
- [ ] Section numbering updates correctly

### 2. Code Execution
- [ ] JavaScript sections execute without errors
- [ ] Preview updates in real-time
- [ ] HTML sections render correctly
- [ ] Dynamic values (`me.getValue()`) work in TPN mode

### 3. Test Cases
- [ ] Can add test cases to sections
- [ ] Test cases execute correctly
- [ ] Variable substitution works
- [ ] Test results display properly

### 4. TPN Mode
- [ ] TPN mode toggle works
- [ ] TPN panel shows/hides correctly
- [ ] TPN values are accessible in code
- [ ] Ingredient values work

### 5. Import/Export
- [ ] Can export current configuration
- [ ] Can import configurations
- [ ] JSON format is correct
- [ ] Firebase sync works (if configured)

### 6. UI/UX
- [ ] Sidebar opens/closes
- [ ] Preview panel collapses/expands
- [ ] Styling looks correct (no broken layouts)
- [ ] Modals open and close properly
- [ ] No console errors

### 7. State Management
- [ ] Unsaved changes detection works
- [ ] Current ingredient/reference tracking works
- [ ] State persists across component updates

## Post-Extraction Verification
- [ ] All tests above pass
- [ ] No new console errors
- [ ] No new TypeScript errors
- [ ] Performance is acceptable (no lag/freezing)
- [ ] Commit the working change

## Red Flags (Stop if any occur)
- ❌ "Cannot assign to import" errors
- ❌ Blank screen or components not rendering
- ❌ Preview stops updating
- ❌ Loss of user data/state
- ❌ Multiple console errors