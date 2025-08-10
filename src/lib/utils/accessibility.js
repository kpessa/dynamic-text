/**
 * Accessibility utilities for the TPN application
 * Provides comprehensive accessibility support including WCAG 2.1 AA compliance
 */

// Screen reader announcements
class ScreenReaderAnnouncer {
  constructor() {
    this.liveRegion = null;
    this.politeRegion = null;
    this.init();
  }

  init() {
    // Create assertive live region for urgent announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'assertive');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('class', 'sr-only');
    this.liveRegion.setAttribute('id', 'aria-live-assertive');
    document.body.appendChild(this.liveRegion);

    // Create polite live region for non-urgent announcements
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.setAttribute('class', 'sr-only');
    this.politeRegion.setAttribute('id', 'aria-live-polite');
    document.body.appendChild(this.politeRegion);
  }

  announce(message, priority = 'polite') {
    const region = priority === 'assertive' ? this.liveRegion : this.politeRegion;
    if (region) {
      // Clear previous message
      region.textContent = '';
      // Small delay to ensure screen readers notice the change
      setTimeout(() => {
        region.textContent = message;
      }, 100);
      
      // Clear message after announcement
      setTimeout(() => {
        region.textContent = '';
      }, 3000);
    }
  }

  announceTPNCalculation(calculationType, value, unit = '', isWarning = false) {
    const priority = isWarning ? 'assertive' : 'polite';
    const warningText = isWarning ? 'Warning: ' : '';
    const message = `${warningText}${calculationType} calculated: ${value} ${unit}`;
    this.announce(message, priority);
  }

  announceValidationResult(isValid, fieldName, errorMessage = '') {
    const priority = isValid ? 'polite' : 'assertive';
    const message = isValid 
      ? `${fieldName} is valid`
      : `Validation error in ${fieldName}: ${errorMessage}`;
    this.announce(message, priority);
  }

  announceSectionChange(sectionName, actionType) {
    const message = `${actionType} ${sectionName} section`;
    this.announce(message, 'polite');
  }
}

// Focus management
export class FocusManager {
  constructor() {
    this.focusStack = [];
    this.trapElements = [];
  }

  // Store current focus and move to new element
  moveFocusTo(element, storePrevious = true) {
    if (storePrevious && document.activeElement) {
      this.focusStack.push(document.activeElement);
    }
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }

  // Return focus to previous element
  restoreFocus() {
    const previousElement = this.focusStack.pop();
    if (previousElement && typeof previousElement.focus === 'function') {
      previousElement.focus();
    }
  }

  // Trap focus within a container (for modals)
  trapFocus(container) {
    if (!container) return;

    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    this.trapElements.push({ container, handler: handleTabKey });

    // Focus first element
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      this.trapElements = this.trapElements.filter(item => item.container !== container);
    };
  }

  getFocusableElements(container) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(element => {
        return element.offsetParent !== null && 
               !element.disabled && 
               !element.getAttribute('aria-hidden');
      });
  }

  // Clean up all focus traps
  clearFocusTraps() {
    this.trapElements.forEach(({ container, handler }) => {
      container.removeEventListener('keydown', handler);
    });
    this.trapElements = [];
  }
}

// Keyboard navigation
export class KeyboardManager {
  constructor() {
    this.shortcuts = new Map();
    this.init();
  }

  init() {
    document.addEventListener('keydown', this.handleGlobalKeyDown.bind(this));
  }

  registerShortcut(key, callback, description, ctrlKey = false, altKey = false, shiftKey = false) {
    const shortcutKey = `${ctrlKey ? 'ctrl+' : ''}${altKey ? 'alt+' : ''}${shiftKey ? 'shift+' : ''}${key}`;
    this.shortcuts.set(shortcutKey, { callback, description });
  }

  unregisterShortcut(key, ctrlKey = false, altKey = false, shiftKey = false) {
    const shortcutKey = `${ctrlKey ? 'ctrl+' : ''}${altKey ? 'alt+' : ''}${shiftKey ? 'shift+' : ''}${key}`;
    this.shortcuts.delete(shortcutKey);
  }

  handleGlobalKeyDown(e) {
    const key = e.key.toLowerCase();
    const shortcutKey = `${e.ctrlKey ? 'ctrl+' : ''}${e.altKey ? 'alt+' : ''}${e.shiftKey ? 'shift+' : ''}${key}`;
    
    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      e.preventDefault();
      shortcut.callback(e);
    }

    // Handle escape key globally for modal closing
    if (e.key === 'Escape') {
      this.handleEscapeKey();
    }
  }

  handleEscapeKey() {
    // Close any open modals or dropdowns
    const openModals = document.querySelectorAll('.modal-backdrop');
    const openDropdowns = document.querySelectorAll('.dropdown-open');
    
    if (openModals.length > 0) {
      // Close the topmost modal
      const topModal = openModals[openModals.length - 1];
      const closeButton = topModal.querySelector('[data-close-modal]') || 
                         topModal.querySelector('.close-btn') ||
                         topModal.querySelector('[aria-label*="close"]');
      if (closeButton) {
        closeButton.click();
      }
    }

    if (openDropdowns.length > 0) {
      openDropdowns.forEach(dropdown => {
        dropdown.classList.remove('dropdown-open');
      });
    }
  }

  getShortcutsList() {
    const shortcuts = [];
    this.shortcuts.forEach((shortcut, key) => {
      shortcuts.push({
        key: key.replace(/\+/g, ' + ').toUpperCase(),
        description: shortcut.description
      });
    });
    return shortcuts;
  }
}

// Color contrast utilities
export class ColorContrastManager {
  // Calculate relative luminance
  static getRelativeLuminance(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Calculate contrast ratio
  static getContrastRatio(color1, color2) {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Check WCAG compliance
  static meetsWCAGAA(color1, color2, largeText = false) {
    const ratio = this.getContrastRatio(color1, color2);
    return largeText ? ratio >= 3 : ratio >= 4.5;
  }

  static meetsWCAGAAA(color1, color2, largeText = false) {
    const ratio = this.getContrastRatio(color1, color2);
    return largeText ? ratio >= 4.5 : ratio >= 7;
  }

  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Get high contrast version of a color
  static getHighContrastColor(backgroundColor, preferredColor = null) {
    const bgLuminance = this.getRelativeLuminance(backgroundColor);
    
    if (preferredColor && this.meetsWCAGAA(backgroundColor, preferredColor)) {
      return preferredColor;
    }

    // Return high contrast black or white
    return bgLuminance > 0.5 ? '#000000' : '#ffffff';
  }
}

// Validation and error handling
export class AccessibleValidation {
  static createFieldError(fieldId, errorMessage, isLive = true) {
    const errorId = `${fieldId}-error`;
    let errorElement = document.getElementById(errorId);
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = errorId;
      errorElement.className = 'field-error';
      errorElement.setAttribute('role', 'alert');
      if (isLive) {
        errorElement.setAttribute('aria-live', 'assertive');
      }
    }
    
    errorElement.textContent = errorMessage;
    
    // Link field to error
    const field = document.getElementById(fieldId);
    if (field) {
      field.setAttribute('aria-describedby', errorId);
      field.setAttribute('aria-invalid', 'true');
    }
    
    return errorElement;
  }

  static clearFieldError(fieldId) {
    const errorId = `${fieldId}-error`;
    const errorElement = document.getElementById(errorId);
    
    if (errorElement) {
      errorElement.remove();
    }
    
    const field = document.getElementById(fieldId);
    if (field) {
      field.removeAttribute('aria-describedby');
      field.removeAttribute('aria-invalid');
    }
  }

  static validateTPN(value, fieldName, min = null, max = null, unit = '') {
    const errors = [];
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      errors.push(`${fieldName} must be a valid number`);
    } else {
      if (min !== null && numValue < min) {
        errors.push(`${fieldName} must be at least ${min} ${unit}`.trim());
      }
      if (max !== null && numValue > max) {
        errors.push(`${fieldName} must not exceed ${max} ${unit}`.trim());
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      value: numValue
    };
  }
}

// Initialize global instances
export const screenReader = new ScreenReaderAnnouncer();
export const focusManager = new FocusManager();
export const keyboardManager = new KeyboardManager();

// Initialize keyboard shortcuts
keyboardManager.registerShortcut('s', () => {
  const saveButton = document.querySelector('[data-action="save"]');
  if (saveButton) saveButton.click();
}, 'Save current work', true);

keyboardManager.registerShortcut('n', () => {
  const newButton = document.querySelector('[data-action="new"]');
  if (newButton) newButton.click();
}, 'Create new document', true);

keyboardManager.registerShortcut('t', () => {
  const testButton = document.querySelector('[data-action="run-tests"]');
  if (testButton) testButton.click();
}, 'Run all tests', true);

keyboardManager.registerShortcut('k', () => {
  const keyRefButton = document.querySelector('[data-action="toggle-keys"]');
  if (keyRefButton) keyRefButton.click();
}, 'Toggle TPN key reference', true);

keyboardManager.registerShortcut('i', () => {
  const ingredientButton = document.querySelector('[data-action="ingredients"]');
  if (ingredientButton) ingredientButton.click();
}, 'Open ingredient manager', true);

// Note: Keyboard shortcuts modal is handled in App.svelte
// This creates a global shortcut registry that can be accessed by the modal

// Export default configuration
export const accessibilityConfig = {
  // Color theme with WCAG AA compliant colors
  colors: {
    primary: '#0066cc',
    primaryText: '#ffffff',
    secondary: '#6c757d',
    secondaryText: '#ffffff',
    success: '#28a745',
    successText: '#ffffff',
    warning: '#ffc107',
    warningText: '#000000',
    danger: '#dc3545',
    dangerText: '#ffffff',
    background: '#ffffff',
    text: '#212529',
    border: '#dee2e6',
    focus: '#0066cc'
  },
  
  // Font sizes and spacing
  typography: {
    baseFontSize: '16px',
    lineHeight: 1.5,
    headingScale: 1.25,
    minTouchTarget: '44px'
  },
  
  // Animation preferences
  animations: {
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    focusTransition: '150ms ease-in-out',
    modalTransition: '200ms ease-out'
  }
};