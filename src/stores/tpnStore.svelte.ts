import { TPNLegacySupport } from '../lib/tpnLegacy.js';
import type { TPNInstance, MockMeInterface } from '../types/tpn.js';
import { createKPTNamespace } from '../lib/kptNamespace.js';

interface EvaluationContext {
  me: MockMeInterface;
  kpt: any;
}

// TPN store using Svelte 5 runes
class TPNStore {
  private _tpnMode = $state<boolean>(false);
  private _currentTPNInstance = $state<TPNInstance | null>(null);
  private _showKeyReference = $state<boolean>(false);
  private _tpnPanelExpanded = $state<boolean>(true);
  private _currentIngredientValues = $state<Record<string, any>>({});
  private _calculationTPNInstance: TPNLegacySupport;

  constructor() {
    this._calculationTPNInstance = new TPNLegacySupport();
  }

  // Derived computed values - using simple checks to prevent reactivity loops
  get hasTPNInstance() { return this._currentTPNInstance !== null; }
  get hasIngredientValues() { return Object.keys(this._currentIngredientValues).length > 0; }
  get tpnModeWithInstance() { return this._tpnMode && this._currentTPNInstance !== null; }

  // Getters
  get tpnMode() {
    return this._tpnMode;
  }

  get currentTPNInstance() {
    return this._currentTPNInstance;
  }

  get showKeyReference() {
    return this._showKeyReference;
  }

  get tpnPanelExpanded() {
    return this._tpnPanelExpanded;
  }

  get currentIngredientValues() {
    return this._currentIngredientValues;
  }

  get calculationTPNInstance() {
    return this._calculationTPNInstance;
  }

  // Setters
  setTPNMode(enabled: boolean) {
    this._tpnMode = enabled;
  }

  setCurrentTPNInstance(instance: TPNInstance | null) {
    this._currentTPNInstance = instance;
    
    // Update calculation instance if provided
    if (instance) {
      this._calculationTPNInstance.setValues(instance.values || {});
    }
  }

  setShowKeyReference(show: boolean) {
    this._showKeyReference = show;
  }

  setTPNPanelExpanded(expanded: boolean) {
    this._tpnPanelExpanded = expanded;
  }

  // Ingredient value management
  setIngredientValue(key: string, value: any) {
    // Create new object to ensure reactivity
    this._currentIngredientValues = {
      ...this._currentIngredientValues,
      [key]: value
    };
    
    // Update calculation instance
    this._calculationTPNInstance.setValue(key, value);
  }

  getIngredientValue(key: string): any {
    return this._currentIngredientValues[key];
  }

  removeIngredientValue(key: string) {
    const { [key]: removed, ...rest } = this._currentIngredientValues;
    this._currentIngredientValues = rest;
  }

  setMultipleIngredientValues(values: Record<string, any>) {
    this._currentIngredientValues = {
      ...this._currentIngredientValues,
      ...values
    };
    
    // Update calculation instance with all values
    Object.entries(values).forEach(([key, value]) => {
      this._calculationTPNInstance.setValue(key, value);
    });
  }

  clearIngredientValues() {
    this._currentIngredientValues = {};
    // Use the new safe clear method
    this._calculationTPNInstance.clearValues();
  }

  // Helper methods
  createMockMe(variables: Record<string, any> = {}): MockMeInterface {
    return {
      getValue: (key: string) => {
        // First check test variables, then ingredient values, then TPN instance
        if (variables[key] !== undefined) {
          return variables[key];
        }
        if (this._currentIngredientValues[key] !== undefined) {
          return this._currentIngredientValues[key];
        }
        if (this._currentTPNInstance?.values?.[key] !== undefined) {
          return this._currentTPNInstance.values[key];
        }
        return this._calculationTPNInstance.getValue(key);
      },
      
      maxP: (value: number, precision: number = 1) => {
        return this._calculationTPNInstance.maxP(value, precision);
      },
      
      // Add any other TPN methods that might be needed
      calculate: (expression: string) => {
        return (this._calculationTPNInstance as any).calculate?.(expression);
      }
    };
  }

  // Create evaluation context with KPT namespace
  createEvaluationContext(variables: Record<string, any> = {}): EvaluationContext {
    const mockMe = this.createMockMe(variables);
    const kpt = createKPTNamespace(mockMe);
    
    return {
      me: mockMe,
      kpt: kpt
    };
  }

  // Reset all TPN state
  reset() {
    this._tpnMode = false;
    this._currentTPNInstance = null;
    this._showKeyReference = false;
    this._tpnPanelExpanded = true;
    this._currentIngredientValues = {};
    // Use the safe clear method
    this._calculationTPNInstance.clearValues();
  }
}

// Create and export the store instance
export const tpnStore = new TPNStore();
