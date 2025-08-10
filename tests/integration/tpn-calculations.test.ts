import { describe, it, expect, beforeEach } from 'vitest';
import { TPNLegacySupport, extractKeysFromCode, isCalculatedValue, getKeyCategory } from '../../src/lib/tpnLegacy';
import { TPNTestUtils, MedicalAssertions } from '../utils/test-helpers';

describe('TPN Calculations Integration', () => {
  let tpnInstance: TPNLegacySupport;

  beforeEach(() => {
    tpnInstance = new TPNLegacySupport();
  });

  describe('Basic Volume Calculations', () => {
    it('should calculate total volume correctly', () => {
      const doseWeight = 70; // kg
      const volumePerKg = 100; // mL/kg/day
      const expectedTotal = 7000; // mL
      
      tpnInstance.setValues({
        DoseWeightKG: doseWeight,
        VolumePerKG: volumePerKg
      });
      
      const totalVolume = tpnInstance.getValue('TotalVolume') as number;
      expect(totalVolume).toBe(expectedTotal);
      
      MedicalAssertions.assertWithinMedicalRange(
        totalVolume,
        expectedTotal,
        0.1,
        'Total volume calculation'
      );
    });

    it('should calculate lipid volume correctly', () => {
      const doseWeight = 70; // kg  
      const fatGPerKg = 3; // g/kg/day
      const fatConcentration = 0.2; // 20%
      const expectedLipidVol = (fatGPerKg * doseWeight) / fatConcentration; // 1050 mL
      
      tpnInstance.setValues({
        DoseWeightKG: doseWeight,
        Fat: fatGPerKg,
        prefFatConcentration: fatConcentration
      });
      
      const lipidVolume = tpnInstance.getValue('LipidVolTotal') as number;
      
      MedicalAssertions.assertWithinMedicalRange(
        lipidVolume,
        expectedLipidVol,
        0.1,
        'Lipid volume calculation'
      );
    });

    it('should calculate non-lipid volume correctly', () => {
      const doseWeight = 70;
      const volumePerKg = 100;
      const fatGPerKg = 3;
      const fatConc = 0.2;
      
      const expectedTotal = doseWeight * volumePerKg; // 7000
      const expectedLipid = (fatGPerKg * doseWeight) / fatConc; // 1050
      const expectedNonLipid = expectedTotal - expectedLipid; // 5950
      
      tpnInstance.setValues({
        DoseWeightKG: doseWeight,
        VolumePerKG: volumePerKg,
        Fat: fatGPerKg,
        prefFatConcentration: fatConc
      });
      
      const nonLipidVolume = tpnInstance.getValue('NonLipidVolTotal') as number;
      
      MedicalAssertions.assertWithinMedicalRange(
        nonLipidVolume,
        expectedNonLipid,
        0.1,
        'Non-lipid volume calculation'
      );
    });
  });

  describe('Dextrose Concentration Calculations', () => {
    it('should calculate dextrose percentage for 3:1 admixture', () => {
      const carbs = 15; // g/kg/day
      const doseWeight = 70; // kg
      const totalVolume = 7000; // mL
      const expectedDexPercent = (100 * carbs * doseWeight) / totalVolume; // 15%
      
      tpnInstance.setValues({
        DoseWeightKG: doseWeight,
        VolumePerKG: 100,
        Carbohydrates: carbs,
        admixturecheckbox: false // 3:1 admixture
      });
      
      const dexPercent = tpnInstance.getValue('DexPercent') as number;
      
      MedicalAssertions.assertWithinMedicalRange(
        dexPercent,
        expectedDexPercent,
        0.1,
        'Dextrose percentage calculation'
      );
      
      // Verify it's safe for central administration
      MedicalAssertions.assertDextroseSafe(dexPercent, 'Central');
    });

    it('should calculate dextrose percentage for 2:1 admixture', () => {
      const carbs = 15; // g/kg/day
      const doseWeight = 70; // kg
      const fat = 3; // g/kg/day
      const fatConc = 0.2;
      const totalVolume = 7000; // mL
      const lipidVolume = (fat * doseWeight) / fatConc; // 1050 mL
      const nonLipidVolume = totalVolume - lipidVolume; // 5950 mL
      const expectedDexPercent = (100 * carbs * doseWeight) / nonLipidVolume; // ~17.6%
      
      tpnInstance.setValues({
        DoseWeightKG: doseWeight,
        VolumePerKG: 100,
        Carbohydrates: carbs,
        Fat: fat,
        prefFatConcentration: fatConc,
        admixturecheckbox: true // 2:1 admixture
      });
      
      const dexPercent = tpnInstance.getValue('DexPercent') as number;
      
      MedicalAssertions.assertWithinMedicalRange(
        dexPercent,
        expectedDexPercent,
        0.1,
        'Dextrose percentage calculation for 2:1'
      );
    });
  });

  describe('Osmolarity Calculations', () => {
    it('should calculate osmolarity within safe limits', () => {
      tpnInstance.setValues({
        DoseWeightKG: 70,
        VolumePerKG: 100,
        Carbohydrates: 12, // Moderate carb load
        Protein: 2.5,
        Fat: 3,
        prefFatConcentration: 0.2
      });
      
      const osmolarity = tpnInstance.getValue('OsmoValue') as number;
      
      expect(osmolarity).toBeGreaterThan(0);
      expect(osmolarity).toBeLessThan(2000); // Reasonable upper bound
      
      // Check if it's safe for peripheral administration (if under 800)
      if (osmolarity <= 800) {
        MedicalAssertions.assertPeripheralOsmolaritySafe(osmolarity);
      }
    });

    it('should calculate higher osmolarity for higher dextrose concentrations', () => {
      const baseValues = {
        DoseWeightKG: 70,
        VolumePerKG: 100,
        Protein: 2.5,
        Fat: 3,
        prefFatConcentration: 0.2
      };
      
      tpnInstance.setValues({ ...baseValues, Carbohydrates: 10 });
      const lowCarbOsmo = tpnInstance.getValue('OsmoValue') as number;
      
      tpnInstance.setValues({ ...baseValues, Carbohydrates: 20 });
      const highCarbOsmo = tpnInstance.getValue('OsmoValue') as number;
      
      expect(highCarbOsmo).toBeGreaterThan(lowCarbOsmo);
    });
  });

  describe('Electrolyte Calculations', () => {
    it('should handle electrolyte to salt conversion', () => {
      tpnInstance.setValues({
        Potassium: 2.0,
        Sodium: 3.0,
        Calcium: 0.5,
        Magnesium: 0.3,
        Phosphate: 1.0,
        Chloride: 2.5,
        Acetate: 2.0
      });
      
      const saltResult = tpnInstance.EtoS();
      
      expect(saltResult).toHaveProperty('CalciumGluconate', 0.5);
      expect(saltResult).toHaveProperty('MagnesiumSulfate', 0.3);
      expect(saltResult).toHaveProperty('Chloride', 2.5);
      expect(saltResult).toHaveProperty('Acetate', 2.0);
      expect(saltResult).toHaveProperty('KorNaPhos');
      expect(saltResult.Error).toBe('');
    });
  });

  describe('Number Formatting', () => {
    it('should format numbers with maxP correctly', () => {
      expect(tpnInstance.maxP(3.14159, 2)).toBe('3.14');
      expect(tpnInstance.maxP(10.0, 1)).toBe('10');
      expect(tpnInstance.maxP(7.005, 2)).toBe('7'); // Note: Actual implementation may vary
      expect(tpnInstance.maxP(0.1000, 3)).toBe('0.1');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle zero values gracefully', () => {
      tpnInstance.setValues({
        DoseWeightKG: 0,
        VolumePerKG: 100
      });
      
      const totalVolume = tpnInstance.getValue('TotalVolume') as number;
      expect(totalVolume).toBe(0);
    });

    it('should handle very small patients (neonates)', () => {
      const neonateWeight = 3; // kg
      const neonateVolumePerKg = 150; // mL/kg/day (higher for neonates)
      
      tpnInstance.setValues({
        DoseWeightKG: neonateWeight,
        VolumePerKG: neonateVolumePerKg,
        Carbohydrates: 12, // g/kg/day
        Fat: 3
      });
      
      const totalVolume = tpnInstance.getValue('TotalVolume') as number;
      const dexPercent = tpnInstance.getValue('DexPercent') as number;
      
      expect(totalVolume).toBe(450); // 3 * 150
      expect(dexPercent).toBeGreaterThan(0);
      
      // Should be safe for central administration
      MedicalAssertions.assertDextroseSafe(dexPercent, 'Central');
    });

    it('should handle large adult patients', () => {
      const largeAdultWeight = 120; // kg
      const volumePerKg = 25; // Lower mL/kg for large adults
      
      tpnInstance.setValues({
        DoseWeightKG: largeAdultWeight,
        VolumePerKG: volumePerKg,
        Carbohydrates: 4, // Lower g/kg for large adults
        Fat: 1.5,
        Protein: 1.2
      });
      
      const totalVolume = tpnInstance.getValue('TotalVolume') as number;
      const dexPercent = tpnInstance.getValue('DexPercent') as number;
      
      expect(totalVolume).toBe(3000); // 120 * 25
      expect(dexPercent).toBeGreaterThan(0);
      expect(dexPercent).toBeLessThan(35); // Should be reasonable
    });
  });

  describe('Key Classification and Extraction', () => {
    it('should correctly classify ingredient keys', () => {
      expect(getKeyCategory('Sodium')).toBe('ELECTROLYTES');
      expect(getKeyCategory('Potassium')).toBe('ELECTROLYTES');
      expect(getKeyCategory('Protein')).toBe('MACRONUTRIENTS');
      expect(getKeyCategory('MultiVitamin')).toBe('ADDITIVES');
      expect(getKeyCategory('DoseWeightKG')).toBe('BASIC_PARAMETERS');
      expect(getKeyCategory('TotalVolume')).toBe('CALCULATED_VOLUMES');
      expect(getKeyCategory('DexPercent')).toBe('CLINICAL_CALCULATIONS');
    });

    it('should identify calculated vs input values', () => {
      expect(isCalculatedValue('DoseWeightKG')).toBe(false);
      expect(isCalculatedValue('Protein')).toBe(false);
      expect(isCalculatedValue('TotalVolume')).toBe(true);
      expect(isCalculatedValue('NonLipidVolTotal')).toBe(true);
      expect(isCalculatedValue('DexPercent')).toBe(true);
      expect(isCalculatedValue('OsmoValue')).toBe(true);
    });

    it('should extract keys from dynamic text code', () => {
      const dynamicCode = `
        const totalVol = me.getValue('TotalVolume');
        const doseWt = me.getValue('DoseWeightKG');
        const protein = me.getValue('Protein');
        const result = me.EtoS();
        return \`Volume: \${totalVol} mL, Weight: \${doseWt} kg\`;
      `;
      
      const extractedKeys = extractKeysFromCode(dynamicCode);
      
      expect(extractedKeys).toContain('TotalVolume');
      expect(extractedKeys).toContain('DoseWeightKG');
      expect(extractedKeys).toContain('Protein');
      
      // EtoS() should add electrolyte keys
      expect(extractedKeys).toContain('Potassium');
      expect(extractedKeys).toContain('Sodium');
      expect(extractedKeys).toContain('Calcium');
    });
  });

  describe('Medical Safety Validations', () => {
    it('should validate safe dextrose concentrations', () => {
      // Test central line safety
      expect(() => {
        MedicalAssertions.assertDextroseSafe(25, 'Central');
      }).not.toThrow();
      
      expect(() => {
        MedicalAssertions.assertDextroseSafe(40, 'Central'); // Too high
      }).toThrow();
      
      // Test peripheral line safety  
      expect(() => {
        MedicalAssertions.assertDextroseSafe(10, 'Peripheral');
      }).not.toThrow();
      
      expect(() => {
        MedicalAssertions.assertDextroseSafe(15, 'Peripheral'); // Too high for peripheral
      }).toThrow();
    });

    it('should validate peripheral osmolarity limits', () => {
      expect(() => {
        MedicalAssertions.assertPeripheralOsmolaritySafe(750);
      }).not.toThrow();
      
      expect(() => {
        MedicalAssertions.assertPeripheralOsmolaritySafe(900); // Too high
      }).toThrow();
    });

    it('should identify unsafe TPN configurations', () => {
      // High carb load that might exceed peripheral limits
      tpnInstance.setValues({
        DoseWeightKG: 70,
        VolumePerKG: 80, // Lower volume concentrates dextrose
        Carbohydrates: 20, // High carb load
        Protein: 3.0,
        Fat: 2.0,
        IVAdminSite: 'Peripheral'
      });
      
      const dexPercent = tpnInstance.getValue('DexPercent') as number;
      const osmolarity = tpnInstance.getValue('OsmoValue') as number;
      const adminSite = tpnInstance.getValue('IVAdminSite') as string;
      
      if (adminSite === 'Peripheral') {
        // Should catch unsafe peripheral configurations
        if (dexPercent > 12.5) {
          expect(() => {
            MedicalAssertions.assertDextroseSafe(dexPercent, 'Peripheral');
          }).toThrow();
        }
        
        if (osmolarity > 800) {
          expect(() => {
            MedicalAssertions.assertPeripheralOsmolaritySafe(osmolarity);
          }).toThrow();
        }
      }
    });
  });

  describe('Real-world Clinical Scenarios', () => {
    it('should handle standard adult TPN', () => {
      tpnInstance.setValues({
        DoseWeightKG: 70,
        VolumePerKG: 35, // Concentrated adult TPN
        Carbohydrates: 4,
        Protein: 1.5,
        Fat: 1.0,
        Sodium: 2,
        Potassium: 2,
        Calcium: 0.25,
        Magnesium: 0.15,
        Phosphate: 0.3,
        IVAdminSite: 'Central'
      });
      
      const totalVol = tpnInstance.getValue('TotalVolume') as number;
      const dexPercent = tpnInstance.getValue('DexPercent') as number;
      const osmolarity = tpnInstance.getValue('OsmoValue') as number;
      
      expect(totalVol).toBe(2450); // 70 * 35
      expect(dexPercent).toBeGreaterThan(0);
      expect(dexPercent).toBeLessThan(35);
      expect(osmolarity).toBeGreaterThan(0);
      
      // Should be safe for central administration
      MedicalAssertions.assertDextroseSafe(dexPercent, 'Central');
    });

    it('should handle pediatric TPN', () => {
      tpnInstance.setValues({
        DoseWeightKG: 15, // 15kg child
        VolumePerKG: 100,
        Carbohydrates: 12,
        Protein: 2.5,
        Fat: 3.0,
        Sodium: 3,
        Potassium: 2.5,
        Calcium: 0.5,
        Magnesium: 0.3,
        Phosphate: 1.0,
        IVAdminSite: 'Central'
      });
      
      const totalVol = tpnInstance.getValue('TotalVolume') as number;
      const dexPercent = tpnInstance.getValue('DexPercent') as number;
      const lipidVol = tpnInstance.getValue('LipidVolTotal') as number;
      const nonLipidVol = tpnInstance.getValue('NonLipidVolTotal') as number;
      
      expect(totalVol).toBe(1500); // 15 * 100
      expect(lipidVol).toBeGreaterThan(0);
      expect(nonLipidVol).toBeGreaterThan(0);
      expect(totalVol).toBe(lipidVol + nonLipidVol);
      
      // Pediatric dextrose concentrations should be reasonable
      expect(dexPercent).toBeGreaterThan(5);
      expect(dexPercent).toBeLessThan(25);
      
      MedicalAssertions.assertDextroseSafe(dexPercent, 'Central');
    });

    it('should handle neonatal TPN', () => {
      tpnInstance.setValues({
        DoseWeightKG: 2.5, // 2.5kg neonate
        VolumePerKG: 150, // High fluid needs
        Carbohydrates: 8, // Conservative carb start
        Protein: 3.5, // High protein needs
        Fat: 3.0,
        Sodium: 3,
        Potassium: 2,
        Calcium: 1.0, // Higher calcium needs
        Magnesium: 0.5,
        Phosphate: 1.5, // Higher phosphate needs
        IVAdminSite: 'Central'
      });
      
      const totalVol = tpnInstance.getValue('TotalVolume') as number;
      const dexPercent = tpnInstance.getValue('DexPercent') as number;
      
      expect(totalVol).toBe(375); // 2.5 * 150
      expect(dexPercent).toBeGreaterThan(0);
      
      // Neonatal concentrations should be appropriate
      MedicalAssertions.assertDextroseSafe(dexPercent, 'Central');
    });
  });
});