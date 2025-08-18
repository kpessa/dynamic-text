/**
 * KPT Function Persistence Service
 * Handles saving/loading custom KPT functions to/from localStorage
 */

interface KPTFunction {
  name: string;
  parameters: string;
  body: string;
  description: string;
  category?: string;
  createdAt: Date;
  modifiedAt: Date;
}

const KPT_STORAGE_KEY = 'kpt_custom_functions';

export class KPTPersistence {
  private static listeners: Set<(functions: KPTFunction[]) => void> = new Set();
  /**
   * Save a custom function to localStorage
   */
  static saveFunction(func: KPTFunction): void {
    const functions = this.loadFunctions();
    const existingIndex = functions.findIndex(f => f.name === func.name);
    
    if (existingIndex >= 0) {
      functions[existingIndex] = { ...func, modifiedAt: new Date() };
    } else {
      functions.push({ ...func, createdAt: new Date(), modifiedAt: new Date() });
    }
    
    localStorage.setItem(KPT_STORAGE_KEY, JSON.stringify(functions));
    // console.log('[KPT Persistence] Saved to localStorage:', functions.length, 'functions');
    // console.log('[KPT Persistence] localStorage content:', localStorage.getItem(KPT_STORAGE_KEY));
    
    // Update window.kpt namespace
    this.updateWindowNamespace(func);
    
    // Notify all listeners of the change
    this.notifyListeners(functions);
  }
  
  /**
   * Load all custom functions from localStorage
   */
  static loadFunctions(): KPTFunction[] {
    try {
      const stored = localStorage.getItem(KPT_STORAGE_KEY);
      // console.log('[KPT Persistence] Loading from localStorage:', stored ? 'found data' : 'no data');
      if (!stored) return [];
      
      const functions = JSON.parse(stored);
      // console.log('[KPT Persistence] Parsed functions:', functions.length);
      return functions.map((func: any) => ({
        ...func,
        createdAt: new Date(func.createdAt),
        modifiedAt: new Date(func.modifiedAt)
      }));
    } catch (error) {
      // logWarn('Failed to load KPT functions from localStorage:', error);
      return [];
    }
  }
  
  /**
   * Delete a custom function
   */
  static deleteFunction(functionName: string): boolean {
    const functions = this.loadFunctions();
    const filteredFunctions = functions.filter(f => f.name !== functionName);
    
    if (filteredFunctions.length === functions.length) {
      return false; // Function not found
    }
    localStorage.setItem(KPT_STORAGE_KEY, JSON.stringify(filteredFunctions));
    // console.log('[KPT Persistence] Deleted function:', functionName);
    
    // Remove from window.kpt namespace
    if (window.kpt && window.kpt[functionName]) {
      delete window.kpt[functionName];
    }
    
    // Notify listeners of the change
    this.notifyListeners(filteredFunctions);
    
    return true;
  }
  
  /**
   * Export all custom functions as JSON
   */
  static exportFunctions(): string {
    const functions = this.loadFunctions();
    return JSON.stringify(functions, null, 2);
  }
  
  /**
   * Import functions from JSON string
   */
  static importFunctions(jsonString: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const importedFunctions: KPTFunction[] = JSON.parse(jsonString);
      const errors: string[] = [];
      let imported = 0;
      
      for (const func of importedFunctions) {
        try {
          // Validate function structure
          if (!func.name || !func.body || !func.parameters) {
            errors.push(`Invalid function structure: ${func.name || 'unnamed'}`);
            continue;
          }
          
          // Test the function to ensure it's valid
          this.validateFunction(func);
          
          this.saveFunction(func);
          imported++;
        } catch (error) {
          errors.push(`Failed to import ${func.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return { success: true, imported, errors };
    } catch (error) {
      return { 
        success: false, 
        imported: 0, 
        errors: [`Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`] 
      };
    }
  }
  
  /**
   * Update the window.kpt namespace with a function
   */
  private static updateWindowNamespace(func: KPTFunction): void {
    try {
      // Initialize window.kpt if it doesn't exist
      if (!window.kpt) {
        window.kpt = {};
      }
      
      // Create the function from the body
      const funcCode = `(${func.parameters}) => { ${func.body} }`;
      const compiledFunction = new Function('return ' + funcCode)();
      
      // Add to window.kpt
      window.kpt[func.name] = compiledFunction;
    } catch (error) {
      // logError(`Failed to update window namespace for ${func.name}:`, error, 'Validation');
      throw new Error(`Function compilation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Initialize all custom functions on app startup
   */
  static initializeCustomFunctions(): void {
    const functions = this.loadFunctions();
    
    // Ensure window.kpt exists
    if (!window.kpt) {
      window.kpt = {};
    }
    
    // Add each custom function to the namespace
    for (const func of functions) {
      try {
        this.updateWindowNamespace(func);
      } catch (error) {
        // logError(`Failed to initialize custom function ${func.name}:`, error, 'Validation');
      }
    }
  }
  
  /**
   * Validate a function before saving
   */
  private static validateFunction(func: KPTFunction): void {
    // Check for valid JavaScript function syntax
    try {
      const funcCode = `(${func.parameters}) => { ${func.body} }`;
      new Function('return ' + funcCode)();
    } catch (error) {
      throw new Error(`Invalid function syntax: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Check for reserved names
    const reservedNames = ['toString', 'valueOf', 'constructor', 'prototype'];
    if (reservedNames.includes(func.name)) {
      throw new Error(`Function name '${func.name}' is reserved`);
    }
    
    // Check for valid function name
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(func.name)) {
      throw new Error(`Invalid function name '${func.name}'. Must be a valid JavaScript identifier.`);
    }
  }
  
  /**
   * Generate one-liner export format for dynamic sections
   */
  static generateOneLinerExport(functionName: string): string {
    const func = this.loadFunctions().find(f => f.name === functionName);
    if (!func) {
      throw new Error(`Function ${functionName} not found`);
    }
    
    const escapedBody = func.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `[f( window.kpt = window.kpt || {}; var kpt = window.kpt; kpt.${func.name} = function(${func.parameters}) { ${escapedBody} }; return ''; )]`;
  }
  
  /**
   * Generate one-liner export for all custom functions
   */
  static generateAllFunctionsOneLiner(): string {
    const functions = this.loadFunctions();
    if (functions.length === 0) {
      return '[f( window.kpt = window.kpt || {}; return \'\'; )]';
    }
    
    const functionDefinitions = functions.map(func => {
      const escapedBody = func.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      return `kpt.${func.name} = function(${func.parameters}) { ${escapedBody} };`;
    }).join(' ');
    
    return `[f( window.kpt = window.kpt || {}; var kpt = window.kpt; ${functionDefinitions} return ''; )]`;
  }
  
  /**
   * Subscribe to function changes
   */
  static subscribe(callback: (functions: KPTFunction[]) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }
  
  /**
   * Notify all listeners of changes
   */
  private static notifyListeners(functions: KPTFunction[]): void {
    // console.log('[KPT Persistence] Notifying', this.listeners.size, 'listeners of function changes');
    this.listeners.forEach(callback => {
      try {
        callback(functions);
      } catch (error) {
        // logError('[KPT Persistence] Error in listener callback:', error);
      }
    });
  }
  
  /**
   * Listen for storage events from other tabs/windows
   */
  static initStorageListener(): void {
    // console.log('[KPT Persistence] Setting up storage listener');
    window.addEventListener('storage', (e) => {
      if (e.key === KPT_STORAGE_KEY && e.newValue) {
        // console.log('[KPT Persistence] Storage changed from another tab');
        // Re-initialize all functions when storage changes
        this.initializeCustomFunctions();
        
        // Notify listeners
        const functions = this.loadFunctions();
        this.notifyListeners(functions);
      }
    });
  }
}

export type { KPTFunction };