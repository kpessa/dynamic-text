/**
 * Web Worker for TPN Calculations
 * Performs heavy medical calculations off the main thread
 * to maintain UI responsiveness
 */

// Worker state
let isInitialized = false
let calculationCache = new Map()
let performanceMetrics = {
  calculationsPerformed: 0,
  totalExecutionTime: 0,
  cacheHits: 0
}

// TPN calculation functions (simplified versions)
const TPNCalculations = {
  // Calculate total parenteral nutrition requirements
  calculateTPN(patientData, ingredients) {
    const startTime = performance.now()
    
    try {
      const result = {
        totalVolume: 0,
        totalCalories: 0,
        totalProtein: 0,
        osmolality: 0,
        concentrations: {},
        warnings: [],
        isValid: true
      }
      
      // Validate inputs
      if (!patientData || !ingredients) {
        throw new Error('Missing required parameters')
      }
      
      // Calculate base requirements
      const baseRequirements = this.calculateBaseRequirements(patientData)
      
      // Process each ingredient
      for (const ingredient of ingredients) {
        if (!ingredient.concentration || !ingredient.volume) {
          continue
        }
        
        const volume = parseFloat(ingredient.volume) || 0
        const concentration = parseFloat(ingredient.concentration) || 0
        
        result.totalVolume += volume
        
        // Calculate nutritional contributions
        if (ingredient.type === 'dextrose') {
          result.totalCalories += volume * concentration * 3.4 // 3.4 kcal/g
        } else if (ingredient.type === 'amino_acids') {
          result.totalProtein += volume * concentration / 100
          result.totalCalories += volume * concentration * 4 // 4 kcal/g
        } else if (ingredient.type === 'lipids') {
          result.totalCalories += volume * concentration * 9 // 9 kcal/g
        }
        
        // Track concentrations
        result.concentrations[ingredient.name] = {
          volume,
          concentration,
          contribution: volume * concentration
        }
      }
      
      // Calculate osmolality
      result.osmolality = this.calculateOsmolality(ingredients)
      
      // Validate against requirements
      const validation = this.validateTPN(result, baseRequirements, patientData)
      result.warnings = validation.warnings
      result.isValid = validation.isValid
      
      // Performance tracking
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      performanceMetrics.calculationsPerformed++
      performanceMetrics.totalExecutionTime += executionTime
      
      console.log(`[TPNWorker] Calculation completed in ${executionTime.toFixed(2)}ms`)
      
      return result
      
    } catch (error) {
      console.error('[TPNWorker] Calculation error:', error)
      return {
        error: error.message,
        isValid: false,
        warnings: [`Calculation failed: ${error.message}`]
      }
    }
  },
  
  // Calculate base nutritional requirements
  calculateBaseRequirements(patientData) {
    const { weight, age, populationType } = patientData
    
    let caloriesPerKg = 25 // Default for adults
    let proteinPerKg = 0.8 // Default protein requirement
    
    // Adjust based on population type
    switch (populationType) {
      case 'neonatal':
        caloriesPerKg = weight < 1 ? 120 : 110
        proteinPerKg = 3.5
        break
      case 'pediatric':
        if (age < 1) {
          caloriesPerKg = 100
          proteinPerKg = 2.5
        } else if (age < 3) {
          caloriesPerKg = 95
          proteinPerKg = 2.0
        } else {
          caloriesPerKg = 80
          proteinPerKg = 1.5
        }
        break
      case 'adolescent':
        caloriesPerKg = 35
        proteinPerKg = 1.2
        break
      case 'adult':
      default:
        caloriesPerKg = 25
        proteinPerKg = 0.8
        break
    }
    
    return {
      totalCalories: weight * caloriesPerKg,
      totalProtein: weight * proteinPerKg,
      fluidRequirements: this.calculateFluidRequirements(weight, age, populationType)
    }
  },
  
  // Calculate fluid requirements
  calculateFluidRequirements(weight, age, populationType) {
    if (populationType === 'neonatal') {
      // Neonatal fluid requirements (complex formula)
      const day = Math.min(age, 30) // Age in days
      if (day <= 3) {
        return weight * (60 + (day - 1) * 20) // 60-100 ml/kg/day
      }
      return weight * 120 // Standard after day 3
    }
    
    if (populationType === 'pediatric') {
      // Holliday-Segar method
      if (weight <= 10) {
        return weight * 100
      } else if (weight <= 20) {
        return 1000 + (weight - 10) * 50
      } else {
        return 1500 + (weight - 20) * 20
      }
    }
    
    // Adult requirements
    return weight * 30 // 30 ml/kg/day
  },
  
  // Calculate osmolality
  calculateOsmolality(ingredients) {
    let osmolality = 0
    
    for (const ingredient of ingredients) {
      const volume = parseFloat(ingredient.volume) || 0
      const concentration = parseFloat(ingredient.concentration) || 0
      
      // Osmolality contribution factors (simplified)
      let osmFactor = 0
      switch (ingredient.type) {
        case 'dextrose':
          osmFactor = concentration * 5.55 // Approximate
          break
        case 'amino_acids':
          osmFactor = concentration * 10 // Approximate
          break
        case 'sodium_chloride':
          osmFactor = concentration * 17.1
          break
        case 'potassium_phosphate':
          osmFactor = concentration * 7.5
          break
        default:
          osmFactor = concentration * 5 // Generic approximation
      }
      
      osmolality += osmFactor * (volume / 1000) // Convert to L
    }
    
    return osmolality
  },
  
  // Validate TPN formulation
  validateTPN(result, requirements, patientData) {
    const warnings = []
    let isValid = true
    
    // Calorie validation
    const calorieDeficit = Math.abs(result.totalCalories - requirements.totalCalories)
    const calorieVariance = (calorieDeficit / requirements.totalCalories) * 100
    
    if (calorieVariance > 20) {
      warnings.push(`Calorie variance: ${calorieVariance.toFixed(1)}% from target`)
      if (calorieVariance > 40) {
        isValid = false
      }
    }
    
    // Protein validation
    const proteinDeficit = Math.abs(result.totalProtein - requirements.totalProtein)
    const proteinVariance = (proteinDeficit / requirements.totalProtein) * 100
    
    if (proteinVariance > 15) {
      warnings.push(`Protein variance: ${proteinVariance.toFixed(1)}% from target`)
      if (proteinVariance > 30) {
        isValid = false
      }
    }
    
    // Osmolality validation
    if (result.osmolality > 900) {
      warnings.push(`High osmolality: ${result.osmolality.toFixed(0)} mOsm/L`)
      if (result.osmolality > 1200) {
        isValid = false
      }
    }
    
    // Volume validation
    if (result.totalVolume > requirements.fluidRequirements * 1.5) {
      warnings.push('Total volume exceeds recommended fluid limits')
    }
    
    // Population-specific validations
    if (patientData.populationType === 'neonatal') {
      if (result.osmolality > 800) {
        warnings.push('Osmolality may be too high for neonatal patient')
      }
    }
    
    return { warnings, isValid }
  },
  
  // Batch calculation for multiple scenarios
  batchCalculate(scenarios) {
    const results = []
    
    for (const scenario of scenarios) {
      const result = this.calculateTPN(scenario.patientData, scenario.ingredients)
      results.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        result
      })
    }
    
    return results
  }
}

// Message handling
self.addEventListener('message', async (event) => {
  const { id, type, payload } = event.data
  
  try {
    let result
    
    switch (type) {
      case 'INITIALIZE':
        isInitialized = true
        result = { initialized: true }
        break
        
      case 'CALCULATE_TPN':
        const cacheKey = JSON.stringify(payload)
        
        // Check cache first
        if (calculationCache.has(cacheKey)) {
          performanceMetrics.cacheHits++
          result = calculationCache.get(cacheKey)
          console.log('[TPNWorker] Cache hit for calculation')
        } else {
          result = TPNCalculations.calculateTPN(payload.patientData, payload.ingredients)
          
          // Cache result (limit cache size)
          if (calculationCache.size > 100) {
            const firstKey = calculationCache.keys().next().value
            calculationCache.delete(firstKey)
          }
          calculationCache.set(cacheKey, result)
        }
        break
        
      case 'BATCH_CALCULATE':
        result = TPNCalculations.batchCalculate(payload.scenarios)
        break
        
      case 'CALCULATE_REQUIREMENTS':
        result = TPNCalculations.calculateBaseRequirements(payload.patientData)
        break
        
      case 'VALIDATE_TPN':
        const requirements = TPNCalculations.calculateBaseRequirements(payload.patientData)
        result = TPNCalculations.validateTPN(payload.tpnResult, requirements, payload.patientData)
        break
        
      case 'GET_PERFORMANCE_METRICS':
        result = {
          ...performanceMetrics,
          cacheSize: calculationCache.size,
          averageExecutionTime: performanceMetrics.calculationsPerformed > 0 
            ? performanceMetrics.totalExecutionTime / performanceMetrics.calculationsPerformed 
            : 0
        }
        break
        
      case 'CLEAR_CACHE':
        calculationCache.clear()
        result = { cacheCleared: true }
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    
    // Send success response
    self.postMessage({
      id,
      success: true,
      result
    })
    
  } catch (error) {
    console.error('[TPNWorker] Error processing message:', error)
    
    // Send error response
    self.postMessage({
      id,
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
})

// Periodic cache cleanup
setInterval(() => {
  if (calculationCache.size > 50) {
    console.log('[TPNWorker] Performing cache cleanup')
    const keysToDelete = Array.from(calculationCache.keys()).slice(0, 10)
    keysToDelete.forEach(key => calculationCache.delete(key))
  }
}, 60000) // Every minute

// Performance reporting
setInterval(() => {
  if (performanceMetrics.calculationsPerformed > 0) {
    console.log('[TPNWorker] Performance metrics:', {
      calculations: performanceMetrics.calculationsPerformed,
      avgTime: (performanceMetrics.totalExecutionTime / performanceMetrics.calculationsPerformed).toFixed(2),
      cacheHits: performanceMetrics.cacheHits,
      cacheSize: calculationCache.size
    })
  }
}, 30000) // Every 30 seconds

// Log initialization only once when worker starts (not on every file load)
if (typeof self !== 'undefined' && !self.__tpnWorkerInitLogged) {
  self.__tpnWorkerInitLogged = true
  console.log('[TPNWorker] TPN calculation worker initialized')
}