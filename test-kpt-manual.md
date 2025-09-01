# Manual KPT Testing Guide

## Test Steps for KPT Button Functionality

### 1. Initial Setup
- Open http://localhost:5173 in your browser
- Enable TPN Mode (toggle the TPN switch in the navbar)

### 2. Test KPT Button
- Look for the "KPT" button in the navbar (should be next to the key reference button)
- Click the KPT button
- Expected: KPT Reference panel should open showing all available KPT functions

### 3. Test KPT Reference Panel
When the panel is open, you should see:
- Categories: TEXT_FORMATTING, NUMBER_FORMATTING, TPN_FORMATTING, CONDITIONAL, etc.
- Search bar to filter functions
- Function list with:
  - Function name (e.g., `formatNumber`)
  - Description
  - Example usage
  - Parameters

### 4. Test Function Selection
- Click on any function in the list
- Expected: The function example should be inserted into the editor at cursor position

### 5. Test KPT Functions in Dynamic Section
Create a new dynamic section and test these functions:

```javascript
// Test basic formatting
me.kpt.formatNumber(123.456, 2)  // Should output: "123.46"
me.kpt.redText("Alert")          // Should output: red colored text
me.kpt.roundTo(3.14159, 2)       // Should output: 3.14

// Test conditional functions
me.kpt.showIf(true, "This shows")   // Should display text
me.kpt.hideIf(false, "This shows")  // Should display text

// Test TPN formatting (if in TPN mode with values)
me.kpt.formatWeight(75)          // Should output: "75 kg"
me.kpt.formatVolume(1500)        // Should output: "1500 mL"
```

### 6. Verify in Preview
- The preview panel should show the formatted output
- Functions should execute without errors
- Formatted text should display with proper styling

## Troubleshooting

If the KPT button doesn't appear:
1. Check browser console for errors
2. Verify TPN mode is enabled
3. Hard refresh the page (Cmd+Shift+R on Mac)

If functions don't work:
1. Check if `me.kpt` is available in the console
2. Verify the worker file is loading correctly
3. Check for JavaScript errors in dynamic sections

## What's Working Now

Based on the code changes:
✅ KPTReference component imported in App.svelte
✅ showKPTReference state variable added
✅ KPT button bound to showKPTReference in Navbar
✅ KPTReference panel integrated with proper event handlers
✅ Function selection inserts code into editor
✅ Worker includes full KPT namespace (30+ functions)