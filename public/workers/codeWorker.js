/**
 * Web Worker for Code Execution
 * Executes JavaScript code in a sandboxed environment
 * off the main thread for better performance
 */

// Import Babel for transpilation
let Babel = null
let isInitialized = false

// Performance metrics
let performanceMetrics = {
  executionsPerformed: 0,
  totalExecutionTime: 0,
  errorCount: 0,
  averageExecutionTime: 0
}

// Cache for transpiled code
const codeCache = new Map()
const maxCacheSize = 100

// Initialize Babel
async function initializeBabel() {
  if (isInitialized) return
  
  try {
    // Load Babel standalone
    importScripts('https://unpkg.com/@babel/standalone/babel.min.js')
    Babel = self.Babel
    
    if (!Babel) {
      throw new Error('Failed to load Babel')
    }
    
    isInitialized = true
    console.log('[CodeWorker] Babel initialized successfully')
  } catch (error) {
    console.error('[CodeWorker] Failed to initialize Babel:', error)
    throw error
  }
}

// Create sandboxed execution environment
function createSandbox(context = {}) {
  // Safe global objects for medical calculations
  const sandbox = {
    // Math functions
    Math: Math,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    JSON: JSON,
    Date: Date,
    
    // TPN calculation helpers
    me: {
      getValue: (key) => {
        return context.tpnValues?.[key] || context.ingredientValues?.[key] || 0
      },
      
      // Format number with maximum precision
      maxP: (value, precision = 2) => {
        if (typeof value !== 'number' || isNaN(value)) return 0
        return Number(value.toFixed(precision))
      },
      
      // Round to nearest
      round: (value, precision = 0) => {
        if (typeof value !== 'number' || isNaN(value)) return 0
        const factor = Math.pow(10, precision)
        return Math.round(value * factor) / factor
      },
      
      // Calculate percentage
      percentage: (part, whole) => {
        if (!whole || whole === 0) return 0
        return (part / whole) * 100
      },
      
      // Unit conversions common in TPN
      convertUnits: {
        // mg to g
        mgToG: (mg) => mg / 1000,
        // g to mg
        gToMg: (g) => g * 1000,
        // ml to L
        mlToL: (ml) => ml / 1000,
        // L to ml
        lToMl: (l) => l * 1000,
        // kg to g
        kgToG: (kg) => kg * 1000,
        // g to kg
        gToKg: (g) => g / 1000
      },
      
      // Medical calculation helpers
      medical: {
        // Calculate BMI
        bmi: (weight, height) => {
          return weight / ((height / 100) * (height / 100))
        },
        
        // Calculate BSA (Body Surface Area) using Du Bois formula
        bsa: (weight, height) => {
          return 0.007184 * Math.pow(weight, 0.425) * Math.pow(height, 0.725)
        },
        
        // Calculate ideal body weight
        ibw: (height, gender) => {
          const heightCm = height
          if (gender === 'male' || gender === 'M') {
            return 50 + 2.3 * ((heightCm / 2.54) - 60)
          } else {
            return 45.5 + 2.3 * ((heightCm / 2.54) - 60)
          }
        }
      }
    },
    
    // Custom context variables
    ...context,
    
    // Console for debugging (limited)
    console: {
      log: (...args) => {
        // Send console output back to main thread
        self.postMessage({
          type: 'CONSOLE_LOG',
          args: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          )
        })
      }
    }
  }
  
  return sandbox
}

// Execute code safely
function executeCode(code, context) {
  const startTime = performance.now()
  
  try {
    // Check cache for transpiled code
    let transpiledCode
    const cacheKey = code
    
    if (codeCache.has(cacheKey)) {
      transpiledCode = codeCache.get(cacheKey)
    } else {
      // Transpile code with Babel
      const result = Babel.transform(code, {
        presets: ['env'],
        plugins: [],
        compact: true
      })
      
      transpiledCode = result.code
      
      // Cache transpiled code
      if (codeCache.size >= maxCacheSize) {
        const firstKey = codeCache.keys().next().value
        codeCache.delete(firstKey)
      }
      codeCache.set(cacheKey, transpiledCode)
    }
    
    // Create sandbox environment
    const sandbox = createSandbox(context)
    
    // Create function with sandbox as context
    const func = new Function(
      ...Object.keys(sandbox),
      `
        'use strict';
        try {
          ${transpiledCode}
        } catch (error) {
          throw new Error('Execution error: ' + error.message);
        }
      `
    )
    
    // Execute with sandbox values
    const result = func(...Object.values(sandbox))
    
    const endTime = performance.now()
    const executionTime = endTime - startTime
    
    // Update performance metrics
    performanceMetrics.executionsPerformed++
    performanceMetrics.totalExecutionTime += executionTime
    performanceMetrics.averageExecutionTime = 
      performanceMetrics.totalExecutionTime / performanceMetrics.executionsPerformed
    
    return {
      result,
      executionTime,
      success: true
    }
    
  } catch (error) {
    const endTime = performance.now()
    const executionTime = endTime - startTime
    
    performanceMetrics.errorCount++
    
    console.error('[CodeWorker] Execution error:', error)
    
    return {
      error: error.message,
      stack: error.stack,
      executionTime,
      success: false
    }
  }
}

// Batch execute multiple code blocks
function batchExecute(codeBlocks) {
  const results = []
  const startTime = performance.now()
  
  for (const block of codeBlocks) {
    const result = executeCode(block.code, block.context)
    results.push({
      ...result,
      blockId: block.id || results.length
    })
  }
  
  const totalTime = performance.now() - startTime
  
  return {
    results,
    totalExecutionTime: totalTime,
    successCount: results.filter(r => r.success).length,
    errorCount: results.filter(r => !r.success).length
  }
}

// Validate code syntax
function validateCode(code) {
  try {
    Babel.transform(code, {
      presets: ['env'],
      plugins: [],
      compact: true
    })
    
    return {
      valid: true,
      errors: []
    }
  } catch (error) {
    return {
      valid: false,
      errors: [{
        message: error.message,
        line: error.loc?.line,
        column: error.loc?.column
      }]
    }
  }
}

// Message handling
self.addEventListener('message', async (event) => {
  const { id, type, payload } = event.data
  
  try {
    let result
    
    // Initialize if needed
    if (!isInitialized && type !== 'INITIALIZE') {
      await initializeBabel()
    }
    
    switch (type) {
      case 'INITIALIZE':
        await initializeBabel()
        result = { initialized: true }
        break
        
      case 'EXECUTE_CODE':
        result = executeCode(payload.code, payload.context)
        break
        
      case 'BATCH_EXECUTE':
        result = batchExecute(payload.codeBlocks)
        break
        
      case 'VALIDATE_CODE':
        result = validateCode(payload.code)
        break
        
      case 'GET_PERFORMANCE_METRICS':
        result = {
          ...performanceMetrics,
          cacheSize: codeCache.size,
          cacheHitRate: 0 // Would need to track this
        }
        break
        
      case 'CLEAR_CACHE':
        codeCache.clear()
        result = { cacheCleared: true, newSize: codeCache.size }
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
    console.error('[CodeWorker] Error processing message:', error)
    
    // Send error response
    self.postMessage({
      id,
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
})

// Handle uncaught errors
self.addEventListener('error', (error) => {
  console.error('[CodeWorker] Uncaught error:', error)
  performanceMetrics.errorCount++
})

// Periodic cache cleanup
setInterval(() => {
  if (codeCache.size > maxCacheSize * 0.8) {
    console.log('[CodeWorker] Performing cache cleanup')
    const keysToDelete = Array.from(codeCache.keys()).slice(0, 10)
    keysToDelete.forEach(key => codeCache.delete(key))
  }
}, 60000) // Every minute

// Performance reporting
setInterval(() => {
  if (performanceMetrics.executionsPerformed > 0) {
    console.log('[CodeWorker] Performance metrics:', {
      executions: performanceMetrics.executionsPerformed,
      avgTime: performanceMetrics.averageExecutionTime.toFixed(2),
      errors: performanceMetrics.errorCount,
      cacheSize: codeCache.size
    })
  }
}, 30000) // Every 30 seconds

console.log('[CodeWorker] Code execution worker initialized')