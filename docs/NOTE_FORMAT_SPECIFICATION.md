# NOTE Format Specification

## Overview

The NOTE format is a structured data format used in clinical TPN (Total Parenteral Nutrition) systems to represent medical documentation with both static text content and dynamic JavaScript sections. This format allows clinical advisors to create documents that combine narrative text with computed values from patient data.

## Format Structure

### Basic Structure

The NOTE format consists of an array of objects, where each object has a `TEXT` property containing a string value:

```json
[
  { "TEXT": "Line 1 of content" },
  { "TEXT": "Line 2 of content" },
  { "TEXT": "Line 3 of content" }
]
```

### Static Content

Static content is regular text that appears as-is in the document:

```json
[
  { "TEXT": "Patient Information" },
  { "TEXT": "Weight: 70 kg" },
  { "TEXT": "Height: 175 cm" }
]
```

### Dynamic Content

Dynamic content is JavaScript code that gets executed to produce computed values. Dynamic sections are marked with special delimiters:
- Start marker: `[f(`
- End marker: `)]`

Example:
```json
[
  { "TEXT": "Current Weight:" },
  { "TEXT": "[f(" },
  { "TEXT": "return me.getValue('weight') + ' kg'" },
  { "TEXT": ")]" }
]
```

## Parsing Rules

### 1. Section Creation

The parser converts NOTE arrays into sections with the following properties:
- `id`: Unique identifier for the section
- `type`: Either "static" or "dynamic"
- `content`: The text or code content
- `name`: A descriptive name for the section
- `testCases`: (Dynamic sections only) Test cases for the code

### 2. Static Content Accumulation

Adjacent static TEXT items are combined into a single static section:

```json
// Input
[
  { "TEXT": "Line 1" },
  { "TEXT": "Line 2" },
  { "TEXT": "Line 3" }
]

// Output (single static section)
{
  "type": "static",
  "content": "Line 1\nLine 2\nLine 3"
}
```

### 3. Dynamic Block Detection

The parser identifies dynamic blocks using the `[f(` and `)]` markers:

```json
// Input
[
  { "TEXT": "[f(" },
  { "TEXT": "// Calculate BMI" },
  { "TEXT": "const weight = me.getValue('weight');" },
  { "TEXT": "const height = me.getValue('height');" },
  { "TEXT": "return weight / (height * height);" },
  { "TEXT": ")]" }
]

// Output (dynamic section)
{
  "type": "dynamic",
  "content": "// Calculate BMI\nconst weight = me.getValue('weight');\nconst height = me.getValue('height');\nreturn weight / (height * height);",
  "name": "Calculate BMI"
}
```

### 4. Single-Line Dynamic Blocks

Dynamic blocks can appear on a single line:

```json
[
  { "TEXT": "Weight: [f(return me.getValue('weight'))] kg" }
]
```

This creates three sections:
1. Static: "Weight: "
2. Dynamic: "return me.getValue('weight')"
3. Static: " kg"

### 5. Multiple Dynamic Blocks

A single NOTE item can contain multiple dynamic blocks:

```json
[
  { "TEXT": "Weight: [f(return weight)] Height: [f(return height)]" }
]
```

### 6. Section Naming

Dynamic sections are automatically named using:
1. If the first line is a comment (`// Comment`), use the comment text
2. Otherwise, use "Dynamic Section {number}"

## Special Cases and Edge Cases

### 1. Unclosed Dynamic Blocks

If a `[f(` marker is found without a matching `)]`, the parser:
- Logs a warning
- Treats the unclosed content as static
- Adds "(Warning: Unclosed dynamic block)" to the section name

### 2. Empty NOTE Items

NOTE items without a TEXT property are skipped:

```json
[
  { "TEXT": "Valid" },
  { "INVALID": "Skipped" },  // This is ignored
  { "TEXT": "Also valid" }
]
```

### 3. Nested Dynamic Markers

The parser tracks nesting levels but currently treats nested `[f(` markers as actual dynamic blocks, not as literal strings. This is by design as the NOTE format doesn't support escaping.

## JavaScript Context

Dynamic sections have access to a special context object called `me` with the following methods:

### Core Methods
- `me.getValue(key)`: Get a TPN value by key
- `me.getMin(key)`: Get minimum value
- `me.getMax(key)`: Get maximum value
- `me.getUnits(key)`: Get units for a value
- `me.getDefault(key)`: Get default value

### Available Data
- `me.ingredients`: Array of ingredient data
- `me.populationType`: Current population type (ADULT, PEDIATRIC, etc.)
- `me.selectedIngredients`: Currently selected ingredients

## Reverse Conversion

To convert sections back to NOTE format:

1. Static sections → Split by newlines, create TEXT items
2. Dynamic sections → Wrap with `[f(` and `)]` markers

Example:
```javascript
// Section
{
  type: 'dynamic',
  content: 'return "Hello"'
}

// NOTE format
[
  { "TEXT": "[f(" },
  { "TEXT": "return \"Hello\"" },
  { "TEXT": ")]" }
]
```

## Best Practices

### 1. Comment Your Dynamic Code
Always start dynamic sections with a comment explaining their purpose:

```json
[
  { "TEXT": "[f(" },
  { "TEXT": "// Calculate adjusted body weight" },
  { "TEXT": "const weight = me.getValue('weight');" },
  { "TEXT": "return weight * 0.95;" },
  { "TEXT": ")]" }
]
```

### 2. Keep Dynamic Sections Focused
Each dynamic section should calculate one specific value or perform one specific task.

### 3. Handle Missing Values
Always check if values exist before using them:

```javascript
const weight = me.getValue('weight');
if (!weight) return 'Weight not available';
return weight + ' kg';
```

### 4. Use Consistent Formatting
Maintain consistent indentation and formatting in dynamic sections for readability.

## Implementation Reference

The canonical implementation of the NOTE format parser is located at:
`src/lib/services/domain/ConfigService.ts` - `convertNotesToSections()`

The reverse converter is located at:
`src/lib/noteFormatConverter.ts` - `sectionsToNoteArray()`

## Version History

- **v1.0**: Initial NOTE format specification
- **v1.1**: Added support for single-line dynamic blocks
- **v1.2**: Enhanced error handling for unclosed blocks
- **v1.3**: Added automatic section naming from comments

## Testing

Comprehensive unit tests for the NOTE format parser are available at:
`src/lib/services/domain/__tests__/ConfigService.test.ts`

These tests cover:
- Basic parsing scenarios
- Edge cases and error conditions
- Complex multi-block documents
- Round-trip conversion (NOTE → sections → NOTE)