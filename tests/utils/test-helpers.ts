import { vi } from 'vitest';
import type { Section, TestCase } from '../../src/types/section';
import type { TPNInstance } from '../../src/types/tpn';
import type { IngredientData, ReferenceData } from '../../src/lib/types';

/**
 * Test data factories for creating mock data
 */
export class TestDataFactory {
  static createSection(overrides: Partial<Section> = {}): Section {
    return {
      id: Math.floor(Math.random() * 1000),
      type: 'dynamic',
      name: 'Test Section',
      content: 'return "Hello, World!";',
      testCases: [this.createTestCase()],
      ...overrides
    };
  }

  static createTestCase(overrides: Partial<TestCase> = {}): TestCase {
    return {
      name: 'Default Test',
      variables: {},
      expected: 'Hello, World!',
      matchType: 'contains',
      ...overrides
    };
  }

  static createTPNInstance(overrides: Partial<TPNInstance> = {}): TPNInstance {
    return {
      values: {
        DoseWeightKG: 70,
        VolumePerKG: 100,
        Protein: 2.5,
        Carbohydrates: 15,
        Fat: 3,
        Sodium: 3,
        Potassium: 2,
        ...overrides.values
      },
      ...overrides
    };
  }

  static createIngredientData(overrides: Partial<IngredientData> = {}): IngredientData {
    return {
      id: 'test-ingredient',
      name: 'Test Ingredient',
      category: 'ELECTROLYTES',
      description: 'Test ingredient for testing',
      unit: 'mEq/kg/day',
      type: 'SALT',
      configSources: ['test-config'],
      version: 1,
      createdAt: { seconds: Date.now() / 1000 } as any,
      createdBy: 'test-user',
      lastModified: { seconds: Date.now() / 1000 } as any,
      modifiedBy: 'test-user',
      updatedAt: { seconds: Date.now() / 1000 } as any,
      updatedBy: 'test-user',
      contentHash: 'test-hash',
      ...overrides
    };
  }

  static createReferenceData(overrides: Partial<ReferenceData> = {}): ReferenceData {
    return {
      id: 'test-reference',
      name: 'Test Reference',
      ingredientId: 'test-ingredient',
      healthSystem: 'Test Health System',
      domain: 'test-domain',
      subdomain: 'test-subdomain',
      version: 'adult',
      populationType: 'adult',
      configId: 'test-config',
      sections: [TestDataFactory.createSection()],
      validationStatus: 'untested',
      validationNotes: '',
      validatedBy: null,
      validatedAt: null,
      testResults: null,
      createdAt: { seconds: Date.now() / 1000 } as any,
      createdBy: 'test-user',
      lastModified: { seconds: Date.now() / 1000 } as any,
      modifiedBy: 'test-user',
      updatedAt: { seconds: Date.now() / 1000 } as any,
      updatedBy: 'test-user',
      contentHash: 'test-hash',
      ...overrides
    };
  }

  // Bulk creation helpers
  static createSections(count: number = 3): Section[] {
    return Array.from({ length: count }, (_, i) => 
      this.createSection({ 
        id: i + 1, 
        name: `Test Section ${i + 1}`,
        type: i % 2 === 0 ? 'dynamic' : 'static'
      })
    );
  }

  static createTPNValues(overrides: Record<string, any> = {}) {
    return {
      DoseWeightKG: 70,
      VolumePerKG: 100,
      InfuseOver: 24,
      LipidInfuseOver: 24,
      Protein: 2.5,
      Carbohydrates: 15,
      Fat: 3,
      Sodium: 3,
      Potassium: 2,
      Calcium: 0.5,
      Magnesium: 0.3,
      Phosphate: 1,
      IVAdminSite: 'Central',
      ...overrides
    };
  }
}

/**
 * Mock Firebase services for testing
 */
export class MockFirebaseService {
  private static mockData = new Map();

  static reset() {
    this.mockData.clear();
  }

  static setMockData(collection: string, id: string, data: any) {
    const key = `${collection}/${id}`;
    this.mockData.set(key, data);
  }

  static getMockData(collection: string, id: string) {
    const key = `${collection}/${id}`;
    return this.mockData.get(key);
  }

  static getAllMockData(collection: string) {
    const results: any[] = [];
    for (const [key, value] of this.mockData.entries()) {
      if (key.startsWith(`${collection}/`)) {
        results.push({ id: key.split('/')[1], ...value });
      }
    }
    return results;
  }

  static createMockFirestoreDoc(data: any = {}) {
    return {
      exists: () => Object.keys(data).length > 0,
      data: () => data,
      id: 'mock-doc-id',
      ref: { id: 'mock-doc-id', path: 'mock-path' }
    };
  }

  static createMockSnapshot(docs: any[] = []) {
    return {
      docs: docs.map(doc => this.createMockFirestoreDoc(doc)),
      empty: docs.length === 0,
      size: docs.length
    };
  }
}

/**
 * Test utilities for TPN calculations
 */
export class TPNTestUtils {
  /**
   * Validate TPN calculation results
   */
  static validateCalculation(
    result: number, 
    expected: number, 
    tolerance: number = 0.1
  ): boolean {
    return Math.abs(result - expected) <= tolerance;
  }

  /**
   * Create a mock TPN me object for testing
   */
  static createMockMe(values: Record<string, any> = {}) {
    const defaultValues = TestDataFactory.createTPNValues(values);
    
    return {
      getValue: vi.fn((key: string) => {
        // Calculated values
        if (key === 'TotalVolume') {
          return defaultValues.VolumePerKG * defaultValues.DoseWeightKG;
        }
        if (key === 'NonLipidVolTotal') {
          const totalVol = defaultValues.VolumePerKG * defaultValues.DoseWeightKG;
          const lipidVol = (defaultValues.Fat * defaultValues.DoseWeightKG) / 0.2;
          return totalVol - lipidVol;
        }
        if (key === 'LipidVolTotal') {
          return (defaultValues.Fat * defaultValues.DoseWeightKG) / 0.2;
        }
        return defaultValues[key] || 0;
      }),
      maxP: vi.fn((value: number, precision: number = 1) => {
        return parseFloat(value.toFixed(precision)).toString();
      }),
      draw: vi.fn(),
      EtoS: vi.fn(() => ({
        SodiumChloride: 0,
        PotassiumChloride: 0,
        CalciumGluconate: defaultValues.Calcium || 0,
        MagnesiumSulfate: defaultValues.Magnesium || 0
      }))
    };
  }

  /**
   * Test dynamic text evaluation
   */
  static async testDynamicText(
    code: string, 
    tpnValues: Record<string, any> = {},
    testVariables: Record<string, any> = {}
  ): Promise<string> {
    const mockMe = this.createMockMe({ ...tpnValues, ...testVariables });
    
    // Simple evaluation - in real implementation this would use Babel
    try {
      const func = new Function('me', `return (${code});`);
      return func(mockMe);
    } catch (error) {
      return `[Error: ${error.message}]`;
    }
  }
}

/**
 * Component testing helpers
 */
export class ComponentTestHelpers {
  /**
   * Wait for component to update
   */
  static async waitForUpdate(timeout: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

  /**
   * Simulate user input
   */
  static async simulateInput(input: HTMLInputElement, value: string): Promise<void> {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await this.waitForUpdate();
  }

  /**
   * Simulate button click
   */
  static async simulateClick(button: HTMLElement): Promise<void> {
    button.click();
    await this.waitForUpdate();
  }

  /**
   * Get text content without whitespace
   */
  static getCleanText(element: HTMLElement): string {
    return element.textContent?.replace(/\s+/g, ' ').trim() || '';
  }
}

/**
 * Assert helpers for medical calculations
 */
export class MedicalAssertions {
  /**
   * Assert TPN calculation is within acceptable medical range
   */
  static assertWithinMedicalRange(
    actual: number,
    expected: number,
    tolerance: number = 0.1,
    message?: string
  ) {
    const diff = Math.abs(actual - expected);
    const withinRange = diff <= tolerance;
    
    if (!withinRange) {
      throw new Error(
        message || 
        `Medical calculation out of range. Expected: ${expected}, Actual: ${actual}, Tolerance: ${tolerance}, Difference: ${diff}`
      );
    }
  }

  /**
   * Assert osmolarity is safe for peripheral administration
   */
  static assertPeripheralOsmolaritySafe(osmolarity: number) {
    if (osmolarity > 800) {
      throw new Error(`Osmolarity ${osmolarity} mOsm/L exceeds peripheral safety limit of 800 mOsm/L`);
    }
  }

  /**
   * Assert dextrose concentration is within safe limits
   */
  static assertDextroseSafe(dexPercent: number, adminSite: string) {
    const maxPercentage = adminSite === 'Central' ? 35 : 12.5;
    if (dexPercent > maxPercentage) {
      throw new Error(
        `Dextrose concentration ${dexPercent}% exceeds ${adminSite} limit of ${maxPercentage}%`
      );
    }
  }
}