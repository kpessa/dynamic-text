/**
 * TPN Reference Range Validation System
 * Implements 3-tier validation: Soft (Normal), Firm (Critical), Hard (Feasible)
 */

export class TPNReferenceRangeValidator {
  constructor() {
    this.validationHistory = [];
  }

  /**
   * Create a reference range checker from range array
   */
  createRangeChecker(rangeArray) {
    const checker = {
      constraints: rangeArray ? rangeArray.length : 0,
      Feasible_Low: null,
      Critical_Low: null,
      Normal_Low: null,
      Normal_High: null,
      Critical_High: null,
      Feasible_High: null
    };

    // Populate thresholds
    if (rangeArray && rangeArray.length > 0) {
      rangeArray.forEach(range => {
        const key = range.THRESHOLD.replace(/\s/g, '_');
        checker[key] = range;
      });
    }

    return checker;
  }

  /**
   * Check value against reference ranges
   * Returns validation result with severity and message
   */
  checkValue(value, rangeChecker, keyname, uom = '') {
    const result = {
      status: 'valid',
      severity: null,
      message: '',
      threshold: null,
      thresholdName: ''
    };

    if (!rangeChecker || rangeChecker.constraints === 0) {
      return result;
    }

    // Check thresholds in order of severity
    const checks = [
      { name: 'Feasible_Low', op: '<', severity: 'hard', side: 'below' },
      { name: 'Feasible_High', op: '>', severity: 'hard', side: 'above' },
      { name: 'Critical_Low', op: '<', severity: 'firm', side: 'below' },
      { name: 'Critical_High', op: '>', severity: 'firm', side: 'above' },
      { name: 'Normal_Low', op: '<', severity: 'soft', side: 'below' },
      { name: 'Normal_High', op: '>', severity: 'soft', side: 'above' }
    ];

    for (const check of checks) {
      const threshold = rangeChecker[check.name];
      
      if (threshold && threshold.VALUE !== undefined) {
        const thresholdValue = parseFloat(threshold.VALUE);
        let violated = false;
        
        if (check.op === '<' && value < thresholdValue) {
          violated = true;
        } else if (check.op === '>' && value > thresholdValue) {
          violated = true;
        }
        
        if (violated) {
          result.status = 'invalid';
          result.severity = check.severity;
          result.threshold = thresholdValue;
          result.thresholdName = check.name.replace(/_/g, ' ');
          result.message = `The value of ${value} ${uom} is ${check.side} the ${result.thresholdName} of ${thresholdValue} ${uom}`;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Handle validation on input blur
   */
  async handleInputValidation(element, ingredientConfig, oldValue, newValue) {
    const keyname = ingredientConfig.KEYNAME;
    const uom = ingredientConfig.UOM_DISP || '';
    const precision = ingredientConfig.PRECISION || 2;
    
    // Round to precision
    const roundedValue = this.roundToP(newValue, precision);
    
    // Create range checker if needed
    if (!ingredientConfig.rangeChecker) {
      ingredientConfig.rangeChecker = this.createRangeChecker(ingredientConfig.REFERENCE_RANGE);
    }
    
    // Check value
    const validation = this.checkValue(roundedValue, ingredientConfig.rangeChecker, keyname, uom);
    
    let acceptedValue = roundedValue;
    let userAction = 'accepted';
    
    switch (validation.severity) {
      case 'hard':
        // Hard stop - show alert and revert
        alert(
          `${ingredientConfig.DISPLAY || keyname}:\n\n` +
          `${validation.message}\n\n` +
          `The value will be reset to ${oldValue} ${uom}`
        );
        acceptedValue = oldValue;
        userAction = 'reverted';
        element.classList.remove('tpn-range-warning');
        break;
        
      case 'firm':
        // Firm stop - require confirmation
        element.classList.add('tpn-range-warning');
        
        if (oldValue !== roundedValue) {
          const confirmed = confirm(
            `${ingredientConfig.DISPLAY || keyname}:\n\n` +
            `${validation.message}\n\n` +
            `OK: Continue with ${roundedValue} ${uom}\n` +
            `Cancel: Revert to ${oldValue} ${uom}`
          );
          
          if (!confirmed) {
            acceptedValue = oldValue;
            userAction = 'reverted';
            element.classList.remove('tpn-range-warning');
          } else {
            userAction = 'confirmed';
          }
        }
        break;
        
      case 'soft':
        // Soft warning - just add visual warning
        element.classList.add('tpn-range-warning');
        userAction = 'continued';
        break;
        
      default:
        // Valid - remove any warnings
        element.classList.remove('tpn-range-warning');
        userAction = 'accepted';
        break;
    }
    
    // Log validation event
    if (validation.status === 'invalid') {
      this.validationHistory.unshift({
        timestamp: Date.now(),
        keyname,
        oldValue,
        enteredValue: newValue,
        acceptedValue,
        severity: validation.severity,
        threshold: validation.threshold,
        message: validation.message,
        userAction
      });
    }
    
    return {
      acceptedValue,
      isValid: validation.status === 'valid',
      validation
    };
  }

  /**
   * Round number to precision
   */
  roundToP(n, p) {
    if (typeof n !== 'number' || isNaN(n)) return 0;
    return parseFloat(n.toFixed(p));
  }

  /**
   * Format number for display
   */
  formatValue(n, p) {
    if (typeof n !== 'number') return n;
    let rv = n.toFixed(p);
    if (rv.includes('.')) {
      rv = rv.replace(/\.?0+$/, '').replace(/\.$/, '');
    }
    return rv;
  }

  /**
   * Get validation history
   */
  getHistory() {
    return this.validationHistory;
  }

  /**
   * Clear validation history
   */
  clearHistory() {
    this.validationHistory = [];
  }
}

// Singleton instance
export const tpnValidator = new TPNReferenceRangeValidator();