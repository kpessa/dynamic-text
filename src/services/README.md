# Service Layer API Documentation

## Overview
The service layer provides a clean separation between business logic and UI components. All services are written in TypeScript and follow functional programming principles.

## Services

### 📝 codeExecutionService
Handles code transpilation, execution, and sandboxing for dynamic JavaScript sections.

#### Methods

##### `sanitizeHTML(html: string): string`
Sanitizes HTML content to prevent XSS attacks.
- **Parameters**: Raw HTML string
- **Returns**: Sanitized HTML safe for rendering
- **Usage**: `sanitizeHTML('<script>alert("XSS")</script>')` → `""`

##### `createMockMe(variables: Record<string, any>): object`
Creates a mock TPN instance for testing and evaluation.
- **Parameters**: Variable key-value pairs
- **Returns**: Mock `me` object with TPN API
- **Usage**: 
```typescript
const me = createMockMe({ DOSE_WEIGHT: 10 });
me.getValue('DOSE_WEIGHT'); // Returns 10
```

##### `transpileCode(code: string): string`
Transpiles modern JavaScript to ES5 using Babel.
- **Parameters**: Modern JavaScript code
- **Returns**: ES5-compatible code
- **Throws**: Error if code has syntax errors

##### `evaluateCode(code: string, testVariables?: Record<string, any>): string`
Evaluates dynamic JavaScript code with optional test variables.
- **Parameters**: 
  - `code`: JavaScript code to evaluate
  - `testVariables`: Optional variables for test context
- **Returns**: String result of evaluation
- **Usage**: `evaluateCode('return 2 + 2')` → `"4"`

##### `runTestCase(code: string, testCase: TestCase): TestResult`
Runs a test case against dynamic code.
- **Parameters**: Code and test case configuration
- **Returns**: Test result with pass/fail status

---

### 📤 exportService
Manages import/export operations for sections and configurations.

#### Methods

##### `sectionsToJSON(sections: Section[]): object`
Converts sections to JSON format for export.
- **Parameters**: Array of sections
- **Returns**: JSON structure with metadata

##### `sectionsToLineObjects(sections: Section[]): LineObject[]`
Converts sections to line objects for configurator view.
- **Parameters**: Array of sections
- **Returns**: Array of line objects

##### `exportAsHTML(sections: Section[], previewHTML: string): string`
Exports sections as standalone HTML document.
- **Parameters**: Sections and preview HTML
- **Returns**: Complete HTML document string

##### `importFromJSON(jsonData: any): Section[]`
Imports sections from JSON data.
- **Parameters**: JSON data structure
- **Returns**: Array of sections
- **Throws**: Error if data is invalid

##### `validateImportData(data: any): ValidationResult`
Validates import data structure.
- **Parameters**: Data to validate
- **Returns**: `{ valid: boolean, errors: string[] }`

---

### 🧪 testingService
Manages test case execution and validation.

#### Types
```typescript
interface TestCase {
  name: string;
  variables: Record<string, any>;
  expectedOutput?: string;
  expectedStyles?: Record<string, string>;
  matchType?: 'exact' | 'contains' | 'regex';
}

interface TestResult {
  passed: boolean;
  error?: string;
  actualOutput?: string;
  actualStyles?: Record<string, string>;
}
```

#### Methods

##### `runSectionTests(code: string, testCases: TestCase[]): TestResult[]`
Runs all test cases for a section.
- **Parameters**: Section code and test cases
- **Returns**: Array of test results

##### `createDefaultTestCase(): TestCase`
Creates a new test case with default values.
- **Returns**: Default test case object

##### `validateTestCase(testCase: any): ValidationResult`
Validates test case structure.
- **Returns**: Validation result with errors

##### `calculateTestStats(results: SectionTestResults[]): TestStats`
Calculates test statistics across all sections.
- **Returns**: Statistics including pass rate

---

### 📄 sectionService
Manages section CRUD operations and transformations.

#### Types
```typescript
interface Section {
  id: string;
  type: 'static' | 'dynamic';
  content: string;
  isEditing?: boolean;
  testCases?: TestCase[];
  activeTestCase?: TestCase;
  showTests?: boolean;
}
```

#### Methods

##### `createSection(type: 'static' | 'dynamic'): Section`
Creates a new section with unique ID.
- **Parameters**: Section type
- **Returns**: New section object

##### `updateSectionContent(sections: Section[], id: string, content: string): Section[]`
Updates section content.
- **Parameters**: Sections array, section ID, new content
- **Returns**: Updated sections array

##### `deleteSection(sections: Section[], id: string): Section[]`
Removes a section.
- **Parameters**: Sections array, section ID
- **Returns**: Filtered sections array

##### `convertToDynamic(sections: Section[], id: string, content: string): Section[]`
Converts static section to dynamic.
- **Parameters**: Sections, ID, current content
- **Returns**: Updated sections with converted section

##### `reorderSections(sections: Section[], fromIndex: number, toIndex: number): Section[]`
Reorders sections via drag and drop.
- **Parameters**: Sections, source index, target index
- **Returns**: Reordered sections array

##### `extractUsedKeys(sections: Section[]): string[]`
Extracts all TPN keys used in sections.
- **Returns**: Array of unique key names

---

### 📋 clipboardService
Handles clipboard operations with fallback support.

#### Methods

##### `copyToClipboard(text: string): Promise<boolean>`
Copies text to clipboard.
- **Parameters**: Text to copy
- **Returns**: Success status

##### `copyJSONToClipboard(data: any): Promise<boolean>`
Copies formatted JSON to clipboard.
- **Parameters**: Data object
- **Returns**: Success status

##### `copyCodeSnippet(template: string, key: string): Promise<boolean>`
Copies code snippet with key substitution.
- **Parameters**: Template and key
- **Returns**: Success status

##### `isClipboardAvailable(): boolean`
Checks if clipboard API is available.
- **Returns**: Availability status

---

### 🎨 uiHelpers
Provides UI utility functions and helpers.

#### Methods

##### `getIngredientBadgeColor(category: string): string`
Gets color for ingredient category badge.
- **Parameters**: Category name
- **Returns**: Hex color value

##### `getPopulationColor(populationType: string): string`
Gets color for population type.
- **Parameters**: Population type
- **Returns**: Hex color value

##### `formatTimestamp(timestamp: any): string`
Formats timestamp for display.
- **Parameters**: Timestamp (Date or Firebase)
- **Returns**: Formatted string (e.g., "2 hours ago")

##### `debounce<T>(func: T, wait: number): T`
Creates debounced version of function.
- **Parameters**: Function and wait time
- **Returns**: Debounced function

##### `generateId(prefix?: string): string`
Generates unique identifier.
- **Parameters**: Optional prefix
- **Returns**: Unique ID string

---

## Usage Examples

### Basic Code Evaluation
```typescript
import { evaluateCode } from './services/codeExecutionService';

const code = 'return me.getValue("DOSE_WEIGHT") * 2';
const result = evaluateCode(code, { DOSE_WEIGHT: 10 });
console.log(result); // "20"
```

### Running Tests
```typescript
import { runSectionTests } from './services/testingService';

const testCases = [
  {
    name: 'Weight calculation',
    variables: { DOSE_WEIGHT: 10 },
    expectedOutput: '10 kg',
    matchType: 'exact'
  }
];

const results = runSectionTests(code, testCases);
console.log(results[0].passed); // true/false
```

### Section Management
```typescript
import { createSection, updateSectionContent } from './services/sectionService';

let sections = [];
const newSection = createSection('dynamic');
sections = [...sections, newSection];
sections = updateSectionContent(sections, newSection.id, 'return "Hello"');
```

### Clipboard Operations
```typescript
import { copyJSONToClipboard } from './services/clipboardService';

const data = { sections: [...] };
await copyJSONToClipboard(data);
// Data is now in clipboard as formatted JSON
```

## Best Practices

1. **Error Handling**: All services handle errors gracefully and return safe defaults
2. **Pure Functions**: Most service methods are pure functions without side effects
3. **Type Safety**: Use TypeScript types for all parameters and returns
4. **Validation**: Validate inputs before processing
5. **Documentation**: Document complex logic with inline comments

## Testing

Each service has corresponding tests in `__tests__/` directory:
- `codeExecutionService.test.ts`
- `tpnCalculations.test.ts`

Run tests with: `pnpm test`

## Contributing

When adding new service methods:
1. Add TypeScript types
2. Document the method with JSDoc
3. Create unit tests
4. Update this README
5. Follow functional programming principles