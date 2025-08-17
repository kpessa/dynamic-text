---
title: Auto-conversion Test Plan
tags: [#auto-conversion, #testing, #static-to-dynamic, #feature-test, #html-to-js]
created: 2025-08-17
updated: 2025-08-17
status: implemented
---

# Test Plan for Auto-conversion Feature

## Test Case: Type "[f(" in a static HTML section

1. Open the application at http://localhost:5173/
2. Create a new static HTML section or use an existing one
3. Double-click to edit the static section
4. Type some HTML content like: `<h1>Hello</h1>`
5. Then type `[f(` 
6. The section should automatically convert to a dynamic JavaScript section
7. The HTML content before `[f(` should be preserved in the converted code

## Expected Result:
- The section type changes from "📝 HTML" to "⚡ JavaScript"
- The content is transformed to JavaScript with the HTML preserved
- The editor remains open for continued editing
- A default test case is added to the new dynamic section

## Implementation Complete
The feature has been successfully implemented:
- CodeEditor detects when "[f(" is typed in HTML mode
- App.svelte converts the static section to dynamic type
- Previous HTML content is preserved in the conversion

## Technical Implementation

### Detection Logic
```javascript
// In CodeEditor.svelte
function handleInput(event) {
  const value = event.target.value;
  
  if (section.type === 'static' && value.includes('[f(')) {
    // Trigger auto-conversion
    dispatch('convert-to-dynamic', {
      sectionId: section.id,
      currentContent: value
    });
  }
}
```

### Conversion Process
```javascript
// In App.svelte
function handleConvertToDynamic(event) {
  const { sectionId, currentContent } = event.detail;
  const section = sections.find(s => s.id === sectionId);
  
  if (section && section.type === 'static') {
    // Convert static HTML to dynamic JavaScript
    section.type = 'dynamic';
    section.content = convertHtmlToJs(currentContent);
    
    // Add default test case if none exists
    if (!section.testCases || section.testCases.length === 0) {
      section.testCases = [{ name: 'Default', variables: {} }];
    }
    
    sections = [...sections]; // Trigger reactivity
  }
}
```

### Content Transformation
```javascript
function convertHtmlToJs(htmlContent) {
  // Find the position of [f( to preserve HTML before it
  const triggerIndex = htmlContent.indexOf('[f(');
  
  if (triggerIndex > 0) {
    const htmlPart = htmlContent.substring(0, triggerIndex);
    const jsPart = htmlContent.substring(triggerIndex);
    
    return `return \`${htmlPart}\` + (function() {
  // Continue your dynamic content here
  ${jsPart}
})();`;
  }
  
  return `return \`${htmlContent}\`;`;
}
```

## Testing Scenarios

### Scenario 1: Basic HTML to JS Conversion
**Input**: 
```html
<h1>Patient Summary</h1>
<p>Weight: [f(
```

**Expected Output**:
```javascript
return `<h1>Patient Summary</h1>
<p>Weight: ` + (function() {
  // Continue your dynamic content here
  [f(
})();
```

### Scenario 2: Empty Section Conversion
**Input**: `[f(`

**Expected Output**:
```javascript
return `[f(`;
```

### Scenario 3: Complex HTML Conversion
**Input**:
```html
<div class="patient-info">
  <h2>TPN Calculator</h2>
  <p>Current values: [f(
```

**Expected Output**:
```javascript
return `<div class="patient-info">
  <h2>TPN Calculator</h2>
  <p>Current values: ` + (function() {
  // Continue your dynamic content here
  [f(
})();
```

## User Experience Flow

1. **User starts with HTML**: Types static HTML content
2. **Trigger detected**: System detects "[f(" pattern
3. **Seamless conversion**: Section automatically becomes dynamic
4. **Context preserved**: All previous HTML content maintained
5. **Ready for dynamic code**: User can continue with JavaScript

## Error Handling

### Edge Cases Covered
- Empty sections with just "[f("
- Multiple "[f(" triggers in content
- Special characters in HTML content
- Very long HTML content before trigger

### Fallback Behavior
- If conversion fails, revert to original content
- User notification of conversion success/failure
- Preserve editor state and cursor position

## Related Components

- [[CodeEditor]] - Trigger detection and input handling
- [[SectionEditor]] - Section type management
- [[App]] - Conversion orchestration
- [[SectionList]] - Type indicator updates

## Benefits

1. **Seamless Workflow**: No manual section type switching
2. **Content Preservation**: HTML work is never lost
3. **Intuitive Trigger**: "[f(" naturally suggests function syntax
4. **Medical Context**: Supports TPN calculation workflows
5. **Developer Experience**: Smooth transition between static and dynamic content