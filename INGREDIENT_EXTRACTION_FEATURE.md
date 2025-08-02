# Ingredient Extraction Feature

## Overview
The Dynamic Text Editor now automatically extracts ingredient references from dynamic sections and:
1. Displays badges showing which ingredients each section uses
2. Auto-populates test case variables with referenced ingredients
3. Works with both TPN variables and custom variables

## How it works

### Ingredient Badges
Each dynamic section shows badges for all variables referenced via `me.getValue()`:
- **TPN badges**: Color-coded by category (e.g., blue for Basic Parameters, green for Macronutrients)
- **Custom badges**: Gray badges for non-TPN variables
- **Variable count**: Shows total number of variables referenced

### Automatic Test Case Population
When you create or edit a dynamic section:
1. The system extracts all `me.getValue('key')` calls from the code
2. Test cases are automatically populated with these variables
3. TPN variables default to 0, custom variables default to empty string
4. Variables are removed if no longer referenced in the code

### Example
If your dynamic section contains:
```javascript
const weight = me.getValue('Weight');        // TPN variable
const height = me.getValue('Height');        // TPN variable
const name = me.getValue('PatientName');     // Custom variable
```

The section will show badges: [Weight] [Height] [PatientName] [3 vars]

And test cases will automatically have:
- Weight: 0
- Height: 0  
- PatientName: ""

## Features

- Real-time extraction as you type
- Color-coded badges by TPN category
- Works in both TPN and non-TPN modes
- Test variables sync with code references
- Supports all TPN keys and custom variables

## Usage

1. Create a dynamic section
2. Use `me.getValue('VariableName')` in your code
3. Badges appear automatically in the section header
4. Test cases auto-populate with the referenced variables
5. Change test values to test different scenarios