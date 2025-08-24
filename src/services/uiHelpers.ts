/**
 * UI Helpers Service
 * Utility functions for UI operations and formatting
 */

/**
 * Get color for ingredient badge based on category
 */
export function getIngredientBadgeColor(category: string): string {
  const colors: Record<string, string> = {
    'BASIC_PARAMETERS': '#007bff',
    'MACRONUTRIENTS': '#28a745',
    'ELECTROLYTES': '#ffc107',
    'ADDITIVES': '#6c757d',
    'TRACE_ELEMENTS': '#17a2b8',
    'VITAMINS': '#dc3545',
    'CALCULATED': '#6610f2',
    'CUSTOM': '#e83e8c'
  };
  return colors[category] || '#6c757d';
}

/**
 * Get population type color
 */
export function getPopulationColor(populationType: string): string {
  const colors: Record<string, string> = {
    'Neonatal': '#ff6b6b',
    'Pediatric': '#4ecdc4',
    'Adolescent': '#45b7d1',
    'Adult': '#96ceb4'
  };
  return colors[populationType] || '#6c757d';
}

/**
 * Get population display name
 */
export function getPopulationName(populationType: string): string {
  const names: Record<string, string> = {
    'Neonatal': 'Neonatal (0-1 month)',
    'Pediatric': 'Pediatric (1 month - 12 years)',
    'Adolescent': 'Adolescent (12-18 years)',
    'Adult': 'Adult (18+ years)'
  };
  return names[populationType] || populationType;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return 'Never';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Sort population types in standard order
 */
export function sortPopulationTypes(populations: any[]): any[] {
  const order = ['Neonatal', 'Pediatric', 'Adolescent', 'Adult'];
  return populations.sort((a, b) => 
    order.indexOf(a.populationType) - order.indexOf(b.populationType)
  );
}

/**
 * Check if dark mode is enabled
 */
export function isDarkMode(): boolean {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Toggle element visibility with animation
 */
export function toggleVisibility(element: HTMLElement, show: boolean): void {
  if (show) {
    element.style.display = 'block';
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.transition = 'opacity 0.2s ease-in-out';
      element.style.opacity = '1';
    }, 10);
  } else {
    element.style.transition = 'opacity 0.2s ease-in-out';
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.display = 'none';
    }, 200);
  }
}