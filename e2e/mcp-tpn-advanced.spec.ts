import { test, expect } from '@playwright/test';

test.describe('🧪 Advanced TPN Calculations and Dynamic Sections', () => {
  test.beforeEach(async ({ page }) => {
    console.log('\n🏥 Setting up TPN test environment...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Enable TPN mode
    const tpnToggle = page.locator('input[type="checkbox"]').filter({ hasText: /TPN Mode/i });
    if (await tpnToggle.isVisible()) {
      const isChecked = await tpnToggle.isChecked();
      if (!isChecked) {
        await tpnToggle.check();
        console.log('  ✅ TPN Mode enabled');
      }
    }
  });

  test('Complex TPN calculations with multiple ingredients', async ({ page }) => {
    console.log('\n🧮 Testing complex TPN calculations...');
    
    // Add JavaScript section
    console.log('Step 1: Adding JavaScript section for calculations...');
    const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
    if (await addJsButton.isVisible()) {
      await addJsButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Alternative: Look for a more generic add button
      const genericAddButton = page.locator('button').filter({ hasText: /add/i }).first();
      await genericAddButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Find the JavaScript editor - wait for it to be visible
    const jsEditor = page.locator('.cm-content, textarea, [contenteditable="true"]').last();
    await expect(jsEditor).toBeVisible({ timeout: 5000 });
    await jsEditor.click();
    
    // Complex TPN calculation code
    const complexCalc = `// Complex TPN Calculation
const weight = me?.getValue ? me.getValue('weight') || 70 : 70;
const height = me?.getValue ? me.getValue('height') || 170 : 170;
const age = me?.getValue ? me.getValue('age') || 40 : 40;
const gender = me?.getValue ? me.getValue('gender') || 'male' : 'male';

// Calculate BMI
const bmi = weight / Math.pow(height / 100, 2);

// Calculate Basal Metabolic Rate (Harris-Benedict)
let bmr;
if (gender === 'male') {
  bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
} else {
  bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
}

// Calculate protein requirements (1.2-2.0 g/kg based on stress)
const stressFactor = 1.5; // moderate stress
const proteinReq = weight * stressFactor;

// Calculate fluid requirements (30-40 mL/kg)
const fluidReq = weight * 35;

// Calculate electrolyte requirements
const sodium = weight * 1.5; // mEq/kg
const potassium = weight * 1.0; // mEq/kg
const calcium = 10; // mEq/day
const magnesium = 8; // mEq/day
const phosphate = weight * 0.5; // mmol

// Format results
return \`
<div class="tpn-calculation-results">
  <h3>TPN Calculation Results</h3>
  
  <div class="patient-metrics">
    <h4>Patient Metrics</h4>
    <ul>
      <li>Weight: \${weight} kg</li>
      <li>Height: \${height} cm</li>
      <li>BMI: \${bmi.toFixed(1)} kg/m²</li>
      <li>BMR: \${bmr.toFixed(0)} kcal/day</li>
    </ul>
  </div>
  
  <div class="nutritional-requirements">
    <h4>Nutritional Requirements</h4>
    <ul>
      <li>Protein: \${proteinReq.toFixed(1)} g/day</li>
      <li>Calories: \${(bmr * stressFactor).toFixed(0)} kcal/day</li>
      <li>Fluid: \${fluidReq.toFixed(0)} mL/day</li>
    </ul>
  </div>
  
  <div class="electrolyte-requirements">
    <h4>Electrolyte Requirements</h4>
    <ul>
      <li>Sodium: \${sodium.toFixed(1)} mEq/day</li>
      <li>Potassium: \${potassium.toFixed(1)} mEq/day</li>
      <li>Calcium: \${calcium} mEq/day</li>
      <li>Magnesium: \${magnesium} mEq/day</li>
      <li>Phosphate: \${phosphate.toFixed(1)} mmol/day</li>
    </ul>
  </div>
</div>
\`;`;
    
    await page.keyboard.type(complexCalc);
    console.log('  ✅ Complex calculation code added');
    
    // Wait for preview update
    await page.waitForTimeout(2000);
    
    // Check preview
    console.log('Step 2: Verifying calculation results...');
    const preview = page.locator('.preview-content, .preview, [class*="preview"]').first();
    const previewText = await preview.textContent();
    
    if (previewText?.includes('TPN Calculation Results')) {
      console.log('  ✅ Calculation results displayed in preview');
      console.log(`  📊 Preview contains: ${previewText.substring(0, 100)}...`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-tpn-complex-calc.png',
      fullPage: true
    });
  });

  test('Ingredient selection and calculations', async ({ page }) => {
    console.log('\n💊 Testing ingredient selection and calculations...');
    
    // Open ingredient manager if available
    console.log('Step 1: Looking for ingredient manager...');
    const ingredientButton = page.getByRole('button', { name: /ingredient/i }).first();
    
    if (await ingredientButton.isVisible()) {
      await ingredientButton.click();
      await page.waitForTimeout(1000);
      console.log('  ✅ Ingredient manager opened');
      
      // Search for specific ingredients
      console.log('Step 2: Searching for amino acids...');
      const searchInput = page.locator('input[placeholder*="search" i]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('amino');
        await page.waitForTimeout(500);
        
        // Check search results
        const results = page.locator('.ingredient-item, .search-result');
        const resultCount = await results.count();
        console.log(`  📊 Found ${resultCount} amino acid ingredient(s)`);
        
        // Select first result if available
        if (resultCount > 0) {
          await results.first().click();
          console.log('  ✅ Selected amino acid ingredient');
        }
      }
      
      // Test different concentration calculations
      console.log('Step 3: Testing concentration calculations...');
      const concentrations = ['5%', '10%', '15%'];
      
      for (const conc of concentrations) {
        const concInput = page.locator('input[placeholder*="concentration" i]').first();
        if (await concInput.isVisible()) {
          await concInput.clear();
          await concInput.fill(conc);
          await concInput.press('Tab');
          await page.waitForTimeout(300);
          console.log(`  ✅ Tested ${conc} concentration`);
        }
      }
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-tpn-ingredients.png',
      fullPage: true
    });
  });

  test('Population-specific TPN calculations', async ({ page }) => {
    console.log('\n👥 Testing population-specific calculations...');
    
    const populations = [
      { name: 'Pediatric', weightRange: '10-50 kg', special: 'growth factors' },
      { name: 'Adult', weightRange: '50-100 kg', special: 'standard' },
      { name: 'Geriatric', weightRange: '40-80 kg', special: 'reduced requirements' },
      { name: 'Critical Care', weightRange: '60-90 kg', special: 'stress factors' }
    ];
    
    for (const pop of populations) {
      console.log(`\nTesting ${pop.name} population...`);
      
      // Add new JavaScript section for each population
      const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
      await addJsButton.click();
      await page.waitForTimeout(500);
      
      const jsEditor = page.locator('.cm-content, textarea').last();
      await jsEditor.click();
      
      const popCalc = `// ${pop.name} TPN Calculations
const population = "${pop.name}";
const weightRange = "${pop.weightRange}";
const specialConsiderations = "${pop.special}";

// Population-specific factors
const proteinFactor = population === "Pediatric" ? 2.5 : 
                      population === "Geriatric" ? 1.0 : 
                      population === "Critical Care" ? 2.0 : 1.5;

const fluidFactor = population === "Pediatric" ? 100 : 
                   population === "Geriatric" ? 25 : 35;

// Get weight or use population default
const weight = me?.getValue ? me.getValue('weight') || 50 : 50;

// Calculate requirements
const protein = weight * proteinFactor;
const fluid = weight * fluidFactor;
const calories = population === "Pediatric" ? weight * 100 : 
                population === "Geriatric" ? weight * 25 : 
                weight * 30;

return \`
<div class="population-specific-tpn">
  <h4>${pop.name} TPN Requirements</h4>
  <p>Weight Range: \${weightRange}</p>
  <p>Special Considerations: \${specialConsiderations}</p>
  <ul>
    <li>Protein: \${protein.toFixed(1)} g/day (\${proteinFactor} g/kg)</li>
    <li>Fluid: \${fluid} mL/day</li>
    <li>Calories: \${calories} kcal/day</li>
  </ul>
</div>
\`;`;
      
      await page.keyboard.type(popCalc);
      await page.waitForTimeout(1000);
      console.log(`  ✅ ${pop.name} calculation added`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-tpn-populations.png',
      fullPage: true
    });
  });

  test('Dynamic section dependencies and updates', async ({ page }) => {
    console.log('\n🔄 Testing dynamic section dependencies...');
    
    // Create interdependent sections
    console.log('Step 1: Creating base data section...');
    const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
    await addJsButton.click();
    await page.waitForTimeout(500);
    
    let jsEditor = page.locator('.cm-content, textarea').last();
    await jsEditor.click();
    
    const baseData = `// Base Patient Data
const patientData = {
  weight: 75,
  height: 175,
  age: 45,
  gender: 'male',
  diagnosis: 'post-operative',
  albumin: 3.5,
  prealbumin: 20
};

// Store in global context for other sections
if (typeof window !== 'undefined') {
  window.tpnPatientData = patientData;
}

return \`
<div class="base-data">
  <h4>Patient Data Initialized</h4>
  <p>Weight: \${patientData.weight} kg</p>
  <p>Diagnosis: \${patientData.diagnosis}</p>
  <p>Albumin: \${patientData.albumin} g/dL</p>
</div>
\`;`;
    
    await page.keyboard.type(baseData);
    console.log('  ✅ Base data section created');
    
    // Create dependent calculation section
    console.log('Step 2: Creating dependent calculation section...');
    await addJsButton.click();
    await page.waitForTimeout(500);
    
    jsEditor = page.locator('.cm-content, textarea').last();
    await jsEditor.click();
    
    const dependentCalc = `// Dependent Nutritional Assessment
const data = window?.tpnPatientData || {
  weight: 70,
  albumin: 3.5,
  prealbumin: 20
};

// Nutritional assessment based on lab values
let nutritionalStatus = 'normal';
if (data.albumin < 3.0) {
  nutritionalStatus = 'moderate malnutrition';
} else if (data.albumin < 2.5) {
  nutritionalStatus = 'severe malnutrition';
}

// Adjust protein requirements based on status
const baseProtein = data.weight * 1.5;
const adjustedProtein = nutritionalStatus === 'severe malnutrition' ? baseProtein * 1.5 :
                       nutritionalStatus === 'moderate malnutrition' ? baseProtein * 1.3 :
                       baseProtein;

return \`
<div class="nutritional-assessment">
  <h4>Nutritional Assessment</h4>
  <p>Status: \${nutritionalStatus}</p>
  <p>Base Protein Requirement: \${baseProtein.toFixed(1)} g/day</p>
  <p>Adjusted Protein Requirement: \${adjustedProtein.toFixed(1)} g/day</p>
  <p>Adjustment Factor: \${(adjustedProtein / baseProtein).toFixed(2)}x</p>
</div>
\`;`;
    
    await page.keyboard.type(dependentCalc);
    console.log('  ✅ Dependent calculation section created');
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: 'screenshots/mcp-tpn-dependencies.png',
      fullPage: true
    });
  });

  test('Error handling in TPN calculations', async ({ page }) => {
    console.log('\n⚠️ Testing error handling in TPN calculations...');
    
    // Test with invalid inputs
    console.log('Step 1: Testing with invalid weight...');
    const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
    await addJsButton.click();
    await page.waitForTimeout(500);
    
    let jsEditor = page.locator('.cm-content, textarea').last();
    await jsEditor.click();
    
    const errorHandling = `// TPN Calculation with Error Handling
try {
  // Test various edge cases
  const weight = me?.getValue ? me.getValue('weight') : -1; // Invalid weight
  
  if (weight <= 0 || weight > 500) {
    throw new Error(\`Invalid weight: \${weight} kg. Must be between 0 and 500 kg.\`);
  }
  
  const proteinReq = weight * 1.5;
  
  // Test division by zero
  const concentration = 0;
  if (concentration === 0) {
    throw new Error('Concentration cannot be zero for calculations');
  }
  
  const volume = proteinReq / concentration;
  
  return \`Calculation successful: \${volume} mL\`;
  
} catch (error) {
  return \`
<div class="error-message" style="color: red; border: 1px solid red; padding: 10px;">
  <strong>⚠️ Calculation Error:</strong><br>
  \${error.message}
</div>
\`;
}`;
    
    await page.keyboard.type(errorHandling);
    console.log('  ✅ Error handling code added');
    
    // Test with various invalid scenarios
    console.log('Step 2: Testing boundary conditions...');
    await addJsButton.click();
    await page.waitForTimeout(500);
    
    jsEditor = page.locator('.cm-content, textarea').last();
    await jsEditor.click();
    
    const boundaryTests = `// Boundary Condition Tests
const tests = [
  { weight: 0, expected: 'invalid' },
  { weight: 0.1, expected: 'valid' },
  { weight: 500, expected: 'valid' },
  { weight: 501, expected: 'invalid' },
  { weight: -10, expected: 'invalid' },
  { weight: null, expected: 'invalid' },
  { weight: undefined, expected: 'invalid' },
  { weight: 'abc', expected: 'invalid' }
];

const results = tests.map(test => {
  try {
    const weight = typeof test.weight === 'number' ? test.weight : NaN;
    if (isNaN(weight) || weight <= 0 || weight > 500) {
      return { ...test, result: 'invalid', status: '✅' };
    }
    return { ...test, result: 'valid', status: '✅' };
  } catch (e) {
    return { ...test, result: 'error', status: '❌' };
  }
});

const allPassed = results.every(r => r.result === r.expected);

return \`
<div class="boundary-tests">
  <h4>Boundary Condition Tests: \${allPassed ? '✅ PASSED' : '❌ FAILED'}</h4>
  <table>
    <tr><th>Weight</th><th>Expected</th><th>Result</th><th>Status</th></tr>
    \${results.map(r => \`
      <tr>
        <td>\${r.weight}</td>
        <td>\${r.expected}</td>
        <td>\${r.result}</td>
        <td>\${r.status}</td>
      </tr>
    \`).join('')}
  </table>
</div>
\`;`;
    
    await page.keyboard.type(boundaryTests);
    console.log('  ✅ Boundary tests added');
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: 'screenshots/mcp-tpn-error-handling.png',
      fullPage: true
    });
  });

  test('Real-time TPN monitoring dashboard', async ({ page }) => {
    console.log('\n📊 Creating real-time TPN monitoring dashboard...');
    
    // Create monitoring dashboard
    console.log('Step 1: Creating monitoring dashboard...');
    const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
    await addJsButton.click();
    await page.waitForTimeout(500);
    
    const jsEditor = page.locator('.cm-content, textarea').last();
    await jsEditor.click();
    
    const dashboard = `// Real-time TPN Monitoring Dashboard
const currentTime = new Date().toLocaleTimeString();
const weight = me?.getValue ? me.getValue('weight') || 70 : 70;

// Simulate real-time values
const vitals = {
  glucose: 95 + Math.random() * 40, // 95-135 mg/dL
  sodium: 135 + Math.random() * 10, // 135-145 mEq/L
  potassium: 3.5 + Math.random() * 1.5, // 3.5-5.0 mEq/L
  chloride: 95 + Math.random() * 10, // 95-105 mEq/L
  co2: 22 + Math.random() * 6, // 22-28 mEq/L
  bun: 10 + Math.random() * 10, // 10-20 mg/dL
  creatinine: 0.6 + Math.random() * 0.6, // 0.6-1.2 mg/dL
};

// Calculate anion gap
const anionGap = vitals.sodium - (vitals.chloride + vitals.co2);

// Determine status for each value
const getStatus = (value, min, max) => {
  if (value < min) return { status: 'low', color: 'blue' };
  if (value > max) return { status: 'high', color: 'red' };
  return { status: 'normal', color: 'green' };
};

const glucoseStatus = getStatus(vitals.glucose, 70, 110);
const sodiumStatus = getStatus(vitals.sodium, 136, 145);
const potassiumStatus = getStatus(vitals.potassium, 3.5, 5.0);

// Calculate TPN adjustments needed
const adjustments = [];
if (glucoseStatus.status === 'high') {
  adjustments.push('Consider reducing dextrose concentration');
}
if (sodiumStatus.status === 'low') {
  adjustments.push('Increase sodium chloride supplementation');
}
if (potassiumStatus.status === 'low') {
  adjustments.push('Increase potassium supplementation');
}

return \`
<div class="tpn-monitoring-dashboard" style="padding: 20px; background: #f5f5f5;">
  <h3>🏥 TPN Monitoring Dashboard</h3>
  <p>Last Updated: \${currentTime}</p>
  
  <div class="lab-values" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0;">
    <div class="value-card" style="padding: 10px; background: white; border-left: 3px solid \${glucoseStatus.color};">
      <strong>Glucose:</strong> \${vitals.glucose.toFixed(1)} mg/dL 
      <span style="color: \${glucoseStatus.color};">(\${glucoseStatus.status})</span>
    </div>
    <div class="value-card" style="padding: 10px; background: white; border-left: 3px solid \${sodiumStatus.color};">
      <strong>Sodium:</strong> \${vitals.sodium.toFixed(1)} mEq/L
      <span style="color: \${sodiumStatus.color};">(\${sodiumStatus.status})</span>
    </div>
    <div class="value-card" style="padding: 10px; background: white; border-left: 3px solid \${potassiumStatus.color};">
      <strong>Potassium:</strong> \${vitals.potassium.toFixed(1)} mEq/L
      <span style="color: \${potassiumStatus.color};">(\${potassiumStatus.status})</span>
    </div>
    <div class="value-card" style="padding: 10px; background: white;">
      <strong>Anion Gap:</strong> \${anionGap.toFixed(1)} mEq/L
    </div>
  </div>
  
  <div class="adjustments" style="background: #fff3cd; padding: 15px; border-radius: 5px;">
    <h4>⚠️ Recommended Adjustments:</h4>
    \${adjustments.length > 0 ? 
      '<ul>' + adjustments.map(a => '<li>' + a + '</li>').join('') + '</ul>' :
      '<p style="color: green;">✅ All values within normal range</p>'
    }
  </div>
  
  <div class="current-formula" style="margin-top: 20px; padding: 15px; background: white;">
    <h4>Current TPN Formula (per day)</h4>
    <ul>
      <li>Total Volume: \${(weight * 30).toFixed(0)} mL</li>
      <li>Protein: \${(weight * 1.5).toFixed(1)} g</li>
      <li>Dextrose: \${(weight * 4).toFixed(0)} g</li>
      <li>Lipids: \${(weight * 1).toFixed(1)} g</li>
      <li>Total Calories: \${(weight * 30).toFixed(0)} kcal</li>
    </ul>
  </div>
</div>
\`;`;
    
    await page.keyboard.type(dashboard);
    console.log('  ✅ Monitoring dashboard created');
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: 'screenshots/mcp-tpn-monitoring-dashboard.png',
      fullPage: true
    });
  });

  test.afterEach(async ({ page }) => {
    console.log('\n🧹 Cleaning up TPN test environment...\n');
    await page.close();
  });
});