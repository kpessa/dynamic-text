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