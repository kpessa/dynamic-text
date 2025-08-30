type ValidationStatus = 'untested' | 'passed' | 'failed' | 'partial';

interface TestResult {
  passed: boolean;
  message?: string;
  details?: any;
}

interface ValidationState {
  currentValidationStatus: ValidationStatus;
  currentValidationNotes: string;
  currentValidatedBy: string | null;
  currentValidatedAt: Date | null;
  currentTestResults: TestResult[] | null;
}

class ValidationStore {
  // Private state using $state rune
  private _state = $state<ValidationState>({
    currentValidationStatus: 'untested',
    currentValidationNotes: '',
    currentValidatedBy: null,
    currentValidatedAt: null,
    currentTestResults: null
  });

  // Getters
  get currentValidationStatus() { return this._state.currentValidationStatus; }
  get currentValidationNotes() { return this._state.currentValidationNotes; }
  get currentValidatedBy() { return this._state.currentValidatedBy; }
  get currentValidatedAt() { return this._state.currentValidatedAt; }
  get currentTestResults() { return this._state.currentTestResults; }

  // Setters
  set currentValidationStatus(value: ValidationStatus) { this._state.currentValidationStatus = value; }
  set currentValidationNotes(value: string) { this._state.currentValidationNotes = value; }
  set currentValidatedBy(value: string | null) { this._state.currentValidatedBy = value; }
  set currentValidatedAt(value: Date | null) { this._state.currentValidatedAt = value; }
  set currentTestResults(value: TestResult[] | null) { this._state.currentTestResults = value; }

  // Derived state
  isPassed = $derived(() => this._state.currentValidationStatus === 'passed');
  isFailed = $derived(() => this._state.currentValidationStatus === 'failed');
  hasBeenValidated = $derived(() => this._state.currentValidationStatus !== 'untested');

  // Methods
  updateValidation(status: ValidationStatus, notes?: string, testResults?: TestResult[]) {
    this._state.currentValidationStatus = status;
    if (notes !== undefined) {
      this._state.currentValidationNotes = notes;
    }
    if (testResults !== undefined) {
      this._state.currentTestResults = testResults;
    }
    this._state.currentValidatedAt = new Date();
  }

  clearValidation() {
    this._state = {
      currentValidationStatus: 'untested',
      currentValidationNotes: '',
      currentValidatedBy: null,
      currentValidatedAt: null,
      currentTestResults: null
    };
  }

  // Update method for partial updates
  update(updates: Partial<ValidationState>) {
    Object.assign(this._state, updates);
  }

  // Subscribe method for Svelte store compatibility
  subscribe(callback: (value: ValidationState) => void) {
    // Use $effect to watch for changes
    $effect(() => {
      callback(this._state);
    });
    // Return unsubscribe function
    return () => {};
  }

  // Set method for Svelte store compatibility
  set(value: ValidationState) {
    this._state = value;
  }
}

// Export singleton instance
export const validationStore = new ValidationStore();

// Export as validation for backward compatibility
export const validation = validationStore;