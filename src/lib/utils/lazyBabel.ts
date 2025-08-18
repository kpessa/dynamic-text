/**
 * Lazy Babel Loader
 * Dynamically loads Babel only when needed to reduce initial bundle size
 */

import { logger } from '../logger';

let babelInstance: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Load Babel dynamically
 */
export async function loadBabel(): Promise<any> {
  // Return existing instance if already loaded
  if (babelInstance) {
    return babelInstance;
  }
  
  // Return existing loading promise if in progress
  if (loadingPromise) {
    return loadingPromise;
  }
  
  // Start loading
  loadingPromise = new Promise(async (resolve, reject) => {
    try {
      logger.info('Loading Babel standalone...', 'lazyBabel');
      
      // Dynamically import Babel
      const Babel = await import('@babel/standalone');
      babelInstance = Babel;
      
      logger.info('Babel loaded successfully', 'lazyBabel');
      resolve(babelInstance);
    } catch (error) {
      logger.error('Failed to load Babel', error as Error, 'lazyBabel');
      loadingPromise = null;
      reject(error);
    }
  });
  
  return loadingPromise;
}

/**
 * Check if Babel is loaded
 */
export function isBabelLoaded(): boolean {
  return babelInstance !== null;
}

/**
 * Transform code with lazy-loaded Babel
 */
export async function transformCode(code: string, options?: any): Promise<string> {
  const Babel = await loadBabel();
  
  try {
    const result = Babel.transform(code, {
      presets: ['env'],
      plugins: [],
      ...options
    });
    
    return result.code || '';
  } catch (error) {
    logger.error('Babel transformation failed', error as Error, 'lazyBabel');
    throw error;
  }
}

/**
 * Preload Babel in the background
 */
export function preloadBabel(): void {
  if (!babelInstance && !loadingPromise) {
    // Load in background without waiting
    loadBabel().catch(error => {
      logger.warn('Background Babel preload failed', 'lazyBabel', { error });
    });
  }
}

/**
 * Get loading status
 */
export function getBabelLoadingStatus(): 'not-loaded' | 'loading' | 'loaded' {
  if (babelInstance) return 'loaded';
  if (loadingPromise) return 'loading';
  return 'not-loaded';
}