---
title: KPT Namespace Usage Examples
tags: [#kpt, #namespace, #examples, #dynamic-content, #functions, #medical]
created: 2025-08-17
updated: 2025-08-17
status: implemented
---

# KPT Namespace Usage Examples

The KPT namespace is now available in dynamic text sections. Here are examples of how to use it:

## Basic Text Formatting

```javascript
// Destructure the functions you need
let { redText, greenText, boldText, formatNumber } = kpt;

// Use them in your dynamic content
return `
  <div>
    <h3>Patient Status</h3>
    <p>Weight: ${formatNumber(kpt.weight, 1)} kg</p>
    <p>Status: ${kpt.weight > 70 ? redText('High') : greenText('Normal')}</p>
    <p>Note: ${boldText('Review dosing guidelines')}</p>
  </div>
`;
```

## Number and Unit Formatting

```javascript
let { formatWeight, formatVolume, formatPercent, formatDose } = kpt;

return `
  <table>
    <tr><td>Weight:</td><td>${formatWeight(kpt.weight)}</td></tr>
    <tr><td>Volume:</td><td>${formatVolume(kpt.volume)}</td></tr>
    <tr><td>Protein:</td><td>${formatDose(kpt.protein)}</td></tr>
  </table>
`;
```

## Conditional Display

```javascript
let { showIf, whenAbove, whenBelow, checkRange } = kpt;

return `
  <div class="alerts">
    ${showIf(kpt.age < 18, '<p>⚠️ Pediatric patient - adjust dosing</p>')}
    ${whenAbove(kpt.volume, 2000, '<p>🔴 High volume alert</p>')}
    ${whenBelow(kpt.protein, 1.5, '<p>🟡 Low protein warning</p>')}
    <p>Range check: ${checkRange(kpt.weight, [50, 100], [30, 150])}</p>
  </div>
`;
```

## HTML Building Functions

```javascript
let { createTable, createList, createAlert } = kpt;

// Create a data table
const data = [
  ['Parameter', 'Value', 'Range'],
  ['Weight', kpt.weight + ' kg', '50-100'],
  ['Volume', kpt.volume + ' mL', '1000-2000']
];
const table = createTable(data, ['Parameter', 'Value', 'Range']);

// Create lists
const warnings = createList(['Check renal function', 'Monitor electrolytes']);
const alert = createAlert('Patient requires monitoring', 'warning');

return table + warnings + alert;
```

## Math and Utility Functions

```javascript
let { percentage, ratio, clamp, capitalize } = kpt;

const proteinPercent = percentage(kpt.protein * kpt.weight, kpt.calories * kpt.weight / 4);
const fluidRatio = ratio(kpt.volume, kpt.weight);
const clampedDose = clamp(kpt.protein, 1.0, 4.0);

return `
  <div>
    <p>Protein percentage: ${formatNumber(proteinPercent, 1)}%</p>
    <p>Fluid ratio: ${fluidRatio}</p>
    <p>Safe dose: ${clampedDose} g/kg/day</p>
    <p>Status: ${capitalize('normal')}</p>
  </div>
`;
```

## Complete Example

```javascript
// Import all the functions we need
let { 
  redText, greenText, boldText, 
  formatWeight, formatVolume, formatPercent,
  showIf, whenAbove, checkRange,
  createAlert, createTable 
} = kpt;

// Patient data summary
const patientData = [
  ['Parameter', 'Value', 'Status'],
  ['Weight', formatWeight(kpt.weight), checkRange(kpt.weight, [50, 100], [30, 150])],
  ['Age', kpt.age + ' years', kpt.age < 18 ? redText('Pediatric') : greenText('Adult')],
  ['Volume', formatVolume(kpt.volume), kpt.volume > 2000 ? redText('High') : greenText('Normal')]
];

const table = createTable(patientData, ['Parameter', 'Value', 'Status']);
const alerts = showIf(kpt.age < 18, createAlert('Pediatric patient - use specialized protocols', 'warning'));

return `
  <div>
    <h2>${boldText('Patient Assessment')}</h2>
    ${table}
    ${alerts}
  </div>
`;
```

## Available Functions

The KPT namespace includes these function categories:

- **Text Formatting**: redText, greenText, blueText, boldText, italicText, highlightText
- **Number Formatting**: roundTo, formatNumber, formatPercent, formatCurrency
- **TPN-Specific**: formatWeight, formatVolume, formatDose, formatConcentration  
- **Conditional Display**: showIf, hideIf, whenAbove, whenBelow, whenInRange
- **Validation**: checkRange, isNormal, isCritical
- **HTML Builders**: createTable, createList, createAlert
- **Utilities**: capitalize, pluralize, abbreviate
- **Math**: clamp, percentage, ratio
- **Aliases**: weight, age, volume, protein, calories

All functions are available for destructuring: `let { redText, weight } = kpt;`

## Function Reference

### Text Formatting Functions
```javascript
redText(text)       // <span style="color: red">text</span>
greenText(text)     // <span style="color: green">text</span>
blueText(text)      // <span style="color: blue">text</span>
boldText(text)      // <strong>text</strong>
italicText(text)    // <em>text</em>
highlightText(text) // <mark>text</mark>
```

### Number Formatting Functions
```javascript
roundTo(number, decimals)    // Round to specified decimal places
formatNumber(number, decimals) // Format with commas and decimals
formatPercent(decimal)       // Convert 0.15 to "15%"
formatCurrency(amount)       // Format as currency "$123.45"
```

### TPN-Specific Functions
```javascript
formatWeight(kg)        // "75.0 kg"
formatVolume(ml)        // "1500 mL"
formatDose(amount)      // "2.5 g/kg/day"
formatConcentration(%) // "20%"
```

### Conditional Display Functions
```javascript
showIf(condition, content)           // Show content if condition is true
hideIf(condition, content)           // Hide content if condition is true
whenAbove(value, threshold, content) // Show if value > threshold
whenBelow(value, threshold, content) // Show if value < threshold
whenInRange(value, min, max, content) // Show if value in range
```

### Validation Functions
```javascript
checkRange(value, normalRange, acceptableRange)
// Returns: "Normal", "Acceptable", or "Critical"

isNormal(value, range)     // Boolean: is value in normal range
isCritical(value, range)   // Boolean: is value outside acceptable range
```

### HTML Builder Functions
```javascript
createTable(data, headers)           // Generate HTML table
createList(items, ordered = false)   // Generate HTML list
createAlert(message, type = 'info')  // Generate styled alert box
```

### Utility Functions
```javascript
capitalize(text)    // "hello" → "Hello"
pluralize(text)     // "child" → "children"
abbreviate(text)    // "milligram" → "mg"
```

### Math Functions
```javascript
clamp(value, min, max)      // Constrain value between min and max
percentage(part, whole)     // Calculate percentage
ratio(numerator, denominator) // Calculate ratio as "X:1"
```

## Integration with TPN System

The KPT namespace is fully integrated with the TPN calculation system:

- **TPN Values**: Access current TPN values via `kpt.weight`, `kpt.age`, etc.
- **Medical Context**: Functions designed for medical/pharmaceutical use
- **Validation**: Built-in range checking for medical safety
- **Formatting**: Medical unit formatting (kg, mL, g/kg/day, etc.)

## Related Components

- [[kptNamespace]] - Core namespace implementation
- [[KPTManager]] - KPT function browser
- [[KPTReference]] - Function reference documentation
- [[codeExecutionService]] - Code execution with KPT integration