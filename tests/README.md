# Testing Infrastructure for Dynamic Text TPN Editor

This document describes the comprehensive testing setup for the Dynamic Text TPN Editor, a medical application that manages TPN (Total Parenteral Nutrition) calculations and content generation.

## Overview

The testing infrastructure is designed with **medical safety as the top priority**. Since this application handles critical medical calculations for patient care, our testing approach ensures:

- ✅ **Medical calculation accuracy**
- ✅ **Data integrity and persistence**
- ✅ **Cross-browser compatibility**
- ✅ **Performance under load**
- ✅ **Accessibility compliance**
- ✅ **Security validation**

## Testing Pyramid

Our testing follows the standard testing pyramid with medical-specific extensions:

```
        /\     E2E Tests (10%)
       /  \    - Critical user workflows
      /____\   - Cross-browser validation
     /      \  
    / INTEG. \ Integration Tests (20%)
   /  TESTS  \ - TPN calculations
  /__________\ - Firebase operations
 /            \
/ UNIT TESTS  \ Unit Tests (70%)
\   + MEDICAL / - Component behavior
 \____________/  - Store management
                 - Medical safety validations
```

## Test Categories

### 1. Unit Tests (`tests/**/*.test.ts`)

**Purpose**: Test individual components, functions, and stores in isolation.

**Key Areas**:
- **Store Testing**: Svelte 5 stores (sectionStore, tpnStore, workspaceStore)
- **Component Testing**: UI components with Svelte Testing Library
- **Utility Testing**: Helper functions and calculations
- **Medical Validation**: TPN safety calculations

**Example**:
```typescript
// tests/stores/tpnStore.test.ts
test('should calculate total volume correctly', () => {
  tpnStore.setIngredientValue('DoseWeightKG', 70);
  tpnStore.setIngredientValue('VolumePerKG', 100);
  
  const mockMe = tpnStore.createMockMe();
  const totalVolume = mockMe.getValue('TotalVolume');
  
  expect(totalVolume).toBe(7000); // 70 kg * 100 mL/kg
  MedicalAssertions.assertWithinMedicalRange(totalVolume, 7000, 0.1);
});
```

### 2. Integration Tests (`tests/integration/*.test.ts`)

**Purpose**: Test interactions between components and medical calculation accuracy.

**Key Areas**:
- **TPN Calculations**: Complete calculation workflows
- **Firebase Integration**: Data persistence and retrieval
- **Store Interactions**: Multiple stores working together
- **Medical Safety**: Osmolarity, dextrose concentration limits

**Example**:
```typescript
// tests/integration/tpn-calculations.test.ts
test('should validate osmolarity for peripheral administration', () => {
  tpnInstance.setValues({
    DoseWeightKG: 70,
    VolumePerKG: 100,
    Carbohydrates: 12,
    IVAdminSite: 'Peripheral'
  });
  
  const osmolarity = tpnInstance.getValue('OsmoValue');
  
  if (osmolarity > 800) {
    MedicalAssertions.assertPeripheralOsmolaritySafe(osmolarity);
  }
});
```

### 3. End-to-End Tests (`e2e/*.spec.ts`)

**Purpose**: Test complete user workflows in real browser environments.

**Key Areas**:
- **TPN Workflow**: Complete TPN configuration creation
- **Ingredient Management**: Save/load ingredient references
- **Cross-Health System**: Multi-organization workflows
- **Firebase Integration**: Real data persistence scenarios

**Example**:
```typescript
// e2e/tpn-workflow.spec.ts
test('should complete basic TPN content creation workflow', async ({ page }) => {
  // Enable TPN mode
  await page.click('button:has-text("TPN Mode")');
  
  // Set TPN parameters
  await page.fill('input[data-key="DoseWeightKG"]', '70');
  await page.fill('input[data-key="VolumePerKG"]', '100');
  
  // Add dynamic content
  const content = `
    const totalVol = me.getValue('TotalVolume');
    return \`Total Volume: \${totalVol} mL\`;
  `;
  await page.fill('.code-editor textarea', content);
  
  // Verify calculation
  await expect(page.locator('.preview-panel'))
    .toContainText('Total Volume: 7000 mL');
});
```

## Test Utilities and Helpers

### TestDataFactory (`tests/utils/test-helpers.ts`)

Creates consistent test data across all tests:

```typescript
// Create realistic TPN test data
const tpnValues = TestDataFactory.createTPNValues({
  DoseWeightKG: 70,
  VolumePerKG: 100,
  Protein: 2.5,
  Carbohydrates: 15,
  Fat: 3
});

// Create test sections
const sections = TestDataFactory.createSections(3);
```

### MedicalAssertions

Specialized assertions for medical safety:

```typescript
// Validate calculations within medical tolerance
MedicalAssertions.assertWithinMedicalRange(actual, expected, 0.1);

// Validate peripheral administration safety
MedicalAssertions.assertPeripheralOsmolaritySafe(osmolarity);

// Validate dextrose concentration safety
MedicalAssertions.assertDextroseSafe(dexPercent, 'Central');
```

### TPNTestUtils

Utilities for TPN calculation testing:

```typescript
// Create mock TPN environment
const mockMe = TPNTestUtils.createMockMe({ DoseWeightKG: 70 });

// Test dynamic text evaluation
const result = await TPNTestUtils.testDynamicText(
  'return me.getValue("TotalVolume");',
  { VolumePerKG: 100, DoseWeightKG: 70 }
);
```

## Running Tests

### Development

```bash
# Run all unit tests
pnpm test:unit

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run specific test pattern
pnpm test:unit --testNamePattern="TPN.*[Cc]alculation"

# Run integration tests only
pnpm test:unit --testPathPattern="integration"
```

### End-to-End Testing

```bash
# Run E2E tests (starts dev server automatically)
pnpm test:e2e

# Run E2E with UI for debugging
pnpm test:e2e:ui

# Run E2E in debug mode
pnpm test:e2e:debug

# Run on specific browser
pnpm exec playwright test --project=chromium
```

### Medical Safety Validation

```bash
# Run medical safety test suite
node tests/test-runner.js

# Run only medical calculation tests
pnpm test:unit --testNamePattern="Medical.*Safety|TPN.*[Cc]alculation"
```

### Complete Test Suite

```bash
# Run all tests including E2E
RUN_E2E=true node tests/test-runner.js

# CI-style complete run
pnpm test:all
```

## CI/CD Integration

Our GitHub Actions workflow (`.github/workflows/test.yml`) includes:

1. **Multi-Node Testing**: Tests on Node.js 18.x and 20.x
2. **Medical Safety Gates**: Dedicated medical calculation validation
3. **Cross-Browser E2E**: Tests on Chromium, Firefox, and WebKit
4. **Security Scanning**: Dependency vulnerability checks
5. **Quality Gates**: Coverage thresholds and quality metrics

### Critical Test Gates

- **Medical Safety**: All TPN calculation tests must pass
- **Coverage Threshold**: Minimum 75% code coverage
- **Cross-Browser**: E2E tests must pass on all major browsers
- **Security**: No high/critical vulnerabilities in dependencies

## Mock Strategy

### Firebase Mocking

```typescript
// Setup in tests/setup.ts
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  // ... other Firebase functions
}));
```

### TPN Legacy Support Mocking

```typescript
// Mock TPN calculations for predictable testing
vi.mock('../../src/lib/tpnLegacy', () => ({
  TPNLegacySupport: vi.fn().mockImplementation(() => ({
    getValue: vi.fn((key) => mockValues[key] || 0),
    setValue: vi.fn(),
    maxP: vi.fn((value, precision) => value.toFixed(precision))
  }))
}));
```

## Test Data Management

### Medical Test Cases

We maintain a comprehensive set of medical test cases:

```typescript
const MEDICAL_TEST_CASES = {
  ADULT_STANDARD: {
    DoseWeightKG: 70,
    VolumePerKG: 35,
    Protein: 1.5,
    Carbohydrates: 4,
    Fat: 1,
    expectedOsmolarity: { min: 600, max: 900 }
  },
  
  PEDIATRIC_HIGH_CALORIE: {
    DoseWeightKG: 20,
    VolumePerKG: 100,
    Protein: 3,
    Carbohydrates: 12,
    Fat: 3,
    expectedKcalPerKg: { min: 60, max: 80 }
  },
  
  NEONATAL: {
    DoseWeightKG: 3,
    VolumePerKG: 150,
    Protein: 3.5,
    Carbohydrates: 8,
    Fat: 3,
    expectedKcalPerKg: { min: 70, max: 90 }
  }
};
```

## Coverage Requirements

- **Overall Coverage**: ≥ 75%
- **Medical Calculations**: ≥ 95%
- **Store Logic**: ≥ 90%
- **Components**: ≥ 80%
- **E2E Critical Paths**: 100%

## Debugging Tests

### Unit Test Debugging

```bash
# Run specific test with debug output
pnpm test:unit --testNamePattern="TPN calculation" --verbose

# Run with Node.js debugger
node --inspect-brk node_modules/.bin/vitest run
```

### E2E Test Debugging

```bash
# Debug mode with browser window
pnpm test:e2e:debug

# Generate trace files
TRACE=on pnpm test:e2e

# View trace in Playwright trace viewer
pnpm exec playwright show-trace trace.zip
```

## Medical Safety Checklist

Before any release, verify:

- [ ] All TPN calculation tests pass
- [ ] Osmolarity limits validated for peripheral/central access
- [ ] Dextrose concentration limits enforced
- [ ] Negative value handling tested
- [ ] Division by zero protection verified
- [ ] Boundary condition testing completed
- [ ] Medical assertion utilities functioning
- [ ] Cross-health system data integrity maintained

## Contributing to Tests

### Adding New Tests

1. **Identify the test category** (unit/integration/e2e)
2. **Use existing test helpers** where possible
3. **Follow medical safety patterns** for calculation tests
4. **Include both positive and negative test cases**
5. **Add medical assertions** for calculation validation

### Medical Calculation Tests

When adding medical calculation tests:

1. **Use realistic medical values** from `TestDataFactory`
2. **Include boundary testing** (min/max values)
3. **Validate safety limits** with `MedicalAssertions`
4. **Test error conditions** (negative weights, zero volumes)
5. **Cross-validate** with multiple calculation methods

### Example New Test

```typescript
test('should calculate protein calories correctly', () => {
  const protein = 2.5; // g/kg/day
  const doseWeight = 70; // kg
  const expectedProteinKcal = protein * 4 * doseWeight; // 700 kcal
  
  tpnInstance.setValues({ Protein: protein, DoseWeightKG: doseWeight });
  
  const actualKcal = calculateProteinCalories(tpnInstance);
  
  MedicalAssertions.assertWithinMedicalRange(
    actualKcal, 
    expectedProteinKcal, 
    0.1,
    'Protein calorie calculation'
  );
  
  // Test boundary conditions
  expect(actualKcal).toBeGreaterThan(0);
  expect(actualKcal).toBeLessThan(3000); // Reasonable upper limit
});
```

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install
```

### Environment Variables

```bash
# Optional: Enable E2E tests in CI
export RUN_E2E=true

# Set base URL for E2E tests
export BASE_URL=http://localhost:5173

# Enable verbose logging
export DEBUG=true
```

### IDE Setup

#### VS Code

Recommended extensions:
- Vitest (vitest.explorer)
- Playwright Test for VSCode
- Svelte for VS Code

#### Test Runner Configuration

```json
// .vscode/settings.json
{
  "vitest.include": ["tests/**/*.{test,spec}.{js,ts}"],
  "vitest.exclude": ["e2e/**/*"],
  "playwright.reuseBrowser": true,
  "playwright.showTrace": true
}
```

## Monitoring and Metrics

Our testing generates several reports:

- **Coverage Report**: `coverage/index.html`
- **E2E Test Report**: `playwright-report/index.html`
- **Medical Safety Report**: `medical-safety-report.md`
- **Quality Gates Report**: `quality-report.md`

## Troubleshooting

### Common Issues

**Tests failing due to timing**:
```typescript
// Use proper waits instead of timeouts
await waitFor(() => {
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});
```

**Mock not working**:
```typescript
// Ensure mocks are cleared between tests
afterEach(() => {
  vi.clearAllMocks();
});
```

**E2E tests flaky**:
```typescript
// Use proper selectors and waits
await expect(page.locator('[data-testid="result"]'))
  .toContainText('Expected result');
```

**Medical calculations incorrect**:
- Verify input values are realistic
- Check calculation formulas against medical references
- Ensure proper handling of edge cases
- Use `MedicalAssertions` for validation

For additional help, refer to the main project documentation or reach out to the development team.