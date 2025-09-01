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
  // Import KPT namespace functions
  const createKPTNamespace = (meContext) => {
    // Text formatting functions
    const redText = (text) => 
      `<span style="color: red; font-weight: bold;">${text}</span>`;
    const greenText = (text) => 
      `<span style="color: green; font-weight: bold;">${text}</span>`;
    const blueText = (text) => 
      `<span style="color: blue; font-weight: bold;">${text}</span>`;
    const boldText = (text) => `<strong>${text}</strong>`;
    const italicText = (text) => `<em>${text}</em>`;
    const highlightText = (text, color = '#ffff00') => 
      `<span style="background-color: ${color}; padding: 2px 4px; border-radius: 2px;">${text}</span>`;

    // Number formatting
    const roundTo = (num, decimals = 2) => {
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    };
    const formatNumber = (num, decimals = 2) => {
      if (typeof num !== 'number' || isNaN(num)) return String(num);
      return num.toFixed(decimals).replace(/\.?0+$/, '').replace(/\.$/, '');
    };
    const formatPercent = (num, decimals = 1) => 
      formatNumber(num, decimals) + '%';
    const formatCurrency = (num, currency = '$') => 
      currency + formatNumber(num, 2);

    // TPN-specific formatting
    const formatWeight = (weight, unit = 'kg') => 
      `${formatNumber(weight, 1)} ${unit}`;
    const formatVolume = (volume, unit = 'mL') => 
      `${formatNumber(volume, 0)} ${unit}`;
    const formatDose = (dose, unit = 'mg/kg/day') => 
      `${formatNumber(dose, 2)} ${unit}`;
    const formatConcentration = (concentration) => 
      `${formatNumber(concentration * 100, 1)}%`;

    // Conditional display
    const showIf = (condition, content) => condition ? content : '';
    const hideIf = (condition, content) => !condition ? content : '';
    const whenAbove = (value, threshold, content) => 
      value > threshold ? content : '';
    const whenBelow = (value, threshold, content) => 
      value < threshold ? content : '';
    const whenInRange = (value, min, max, content) => 
      value >= min && value <= max ? content : '';

    // Range checking
    const checkRange = (value, normal = [0, 100], critical = [0, 200]) => {
      if (value < critical[0] || value > critical[1]) {
        return redText('CRITICAL');
      } else if (value < normal[0] || value > normal[1]) {
        return `<span style="color: orange; font-weight: bold;">WARNING</span>`;
      }
      return greenText('NORMAL');
    };
    const isNormal = (value, min, max) => value >= min && value <= max;
    const isCritical = (value, criticalMin, criticalMax) => 
      value < criticalMin || value > criticalMax;

    // HTML building
    const createTable = (data, headers) => {
      let html = '<table border="1" style="border-collapse: collapse; margin: 10px 0;">';
      if (headers) {
        html += '<thead><tr>';
        headers.forEach(header => {
          html += `<th style="padding: 8px; background-color: #f5f5f5; font-weight: bold;">${header}</th>`;
        });
        html += '</tr></thead>';
      }
      html += '<tbody>';
      data.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
          html += `<td style="padding: 8px; border: 1px solid #ddd;">${cell}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      return html;
    };
    
    const createList = (items, ordered = false) => {
      const tag = ordered ? 'ol' : 'ul';
      let html = `<${tag}>`;
      items.forEach(item => {
        html += `<li>${item}</li>`;
      });
      html += `</${tag}>`;
      return html;
    };
    
    const createAlert = (message, type = 'info') => {
      const colors = {
        info: '#d1ecf1',
        warning: '#fff3cd',
        error: '#f8d7da',
        success: '#d4edda'
      };
      const borderColors = {
        info: '#bee5eb',
        warning: '#ffeeba',
        error: '#f5c6cb',
        success: '#c3e6cb'
      };
      return `<div style="padding: 12px; margin: 10px 0; border: 1px solid ${borderColors[type]}; border-radius: 4px; background-color: ${colors[type]};">${message}</div>`;
    };

    // Utility functions
    const capitalize = (text) => 
      text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    const pluralize = (count, singular, plural) => {
      if (count === 1) return singular;
      return plural || singular + 's';
    };
    const abbreviate = (text, maxLength) => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength - 3) + '...';
    };

    // Math utilities
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const percentage = (part, total) => {
      if (total === 0) return 0;
      return (part / total) * 100;
    };
    const ratio = (a, b) => {
      const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
      const divisor = gcd(a, b);
      return `${a / divisor}:${b / divisor}`;
    };

    // Get context values
    const getContextValue = (key) => {
      if (meContext && typeof meContext.getValue === 'function') {
        return meContext.getValue(key) || 0;
      }
      return 0;
    };

    return {
      // Text formatting
      redText, greenText, blueText, boldText, italicText, highlightText,
      // Number formatting
      roundTo, formatNumber, formatPercent, formatCurrency,
      // TPN-specific
      formatWeight, formatVolume, formatDose, formatConcentration,
      // Conditional
      showIf, hideIf, whenAbove, whenBelow, whenInRange,
      // Range checking
      checkRange, isNormal, isCritical,
      // HTML building
      createTable, createList, createAlert,
      // Utilities
      capitalize, pluralize, abbreviate,
      // Math
      clamp, percentage, ratio,
      // Context values
      weight: getContextValue('DoseWeightKG'),
      age: getContextValue('Age'),
      volume: getContextValue('TotalVolume'),
      protein: getContextValue('Protein'),
      calories: getContextValue('Calories')
    };
  };
  
  // Merge custom functions if provided
  const mergeCustomFunctions = (kptNamespace, customFunctions) => {
    if (!customFunctions || !Array.isArray(customFunctions)) {
      return kptNamespace;
    }
    
    const merged = { ...kptNamespace };
    
    for (const func of customFunctions) {
      if (func.name && func.code && func.isCustom) {
        try {
          // Create function with proper context binding
          const funcBody = func.code;
          const compiledFunc = new Function('return ' + funcBody)();
          
          // Bind the function to the me context for access to getValue etc
          merged[func.name] = function(...args) {
            return compiledFunc.apply(sandbox.me, args);
          };
        } catch (error) {
          console.error(`Failed to compile custom function ${func.name}:`, error);
        }
      }
    }
    
    return merged;
  };
  
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
      },
      
      // KPT namespace - Add all KPT functions here
      kpt: null // Will be initialized below
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
  
  // Initialize KPT namespace with the me context
  // Create base KPT namespace with built-in functions
  const baseKPT = createKPTNamespace(sandbox.me);
  
  // Merge custom functions if provided in context
  sandbox.me.kpt = mergeCustomFunctions(baseKPT, context.customFunctions);
  
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