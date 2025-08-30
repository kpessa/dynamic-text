/**
 * Lazy Babel Loader with CDN Support
 * Loads Babel from CDN to reduce bundle size
 */

import { logInfo, logError, logWarn } from '../logger';

declare global {
  interface Window {
    Babel: any;
  }
}

let babelInstance: any = null;
let loadingPromise: Promise<any> | null = null;

// CDN sources with integrity hashes
const CDN_SOURCES = [
  {
    url: 'https://unpkg.com/@babel/standalone@7.23.5/babel.min.js',
    integrity: 'sha384-D7K4Ee8rOeGz9hiSkBnQPcnJdA7cLrUwiK/N9i5BGCfzBPz5p6lbQf2mWFhLwzHd'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@babel/standalone@7.23.5/babel.min.js',
    integrity: 'sha384-D7K4Ee8rOeGz9hiSkBnQPcnJdA7cLrUwiK/N9i5BGCfzBPz5p6lbQf2mWFhLwzHd'
  }
];

/**
 * Try loading from a specific CDN source
 */
function tryLoadFromCDN(source: typeof CDN_SOURCES[0]): Promise<any> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source.url;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.integrity = source.integrity;
    script.referrerPolicy = 'no-referrer';
    
    script.onload = () => {
      if (window.Babel) {
        babelInstance = window.Babel;
        logInfo(`Babel loaded successfully from ${new URL(source.url).hostname}`, 'lazyBabelCDN');
        resolve(babelInstance);
      } else {
        reject(new Error('Babel failed to initialize'));
      }
    };
    
    script.onerror = () => {
      reject(new Error(`Failed to load Babel from ${source.url}`));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Load Babel from CDN with fallback
 */
async function loadBabelFromCDN(): Promise<any> {
  // Check if already loaded
  if (window.Babel) {
    babelInstance = window.Babel;
    return babelInstance;
  }

  // Check if script already exists
  const existingScript = document.querySelector('script[src*="babel"]');
  if (existingScript) {
    // Wait for it to load
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.Babel) {
          clearInterval(checkInterval);
          babelInstance = window.Babel;
          resolve(babelInstance);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.Babel) {
          reject(new Error('Babel loading timeout'));
        }
      }, 10000);
    });
  }

  // Try each CDN source in order
  for (const source of CDN_SOURCES) {
    try {
      return await tryLoadFromCDN(source);
    } catch (error) {
      logWarn(`Failed to load from ${source.url}, trying next source...`, 'lazyBabelCDN');
    }
  }
  
  throw new Error('Failed to load Babel from all CDN sources');
}

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
  loadingPromise = loadBabelFromCDN()
    .catch(async (_cdnError) => {
      logWarn('CDN loading failed, falling back to bundled version', 'lazyBabelCDN');
      // Fallback to dynamic import if CDN fails
      const Babel = await import('@babel/standalone');
      babelInstance = Babel;
      return babelInstance;
    })
    .finally(() => {
      loadingPromise = null;
    });
  
  return loadingPromise;
}

/**
 * Check if Babel is loaded
 */
export function isBabelLoaded(): boolean {
  return babelInstance !== null || window.Babel !== undefined;
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
    logError('Babel transformation failed', error as Error, 'lazyBabelCDN');
    throw error;
  }
}

/**
 * Preload Babel in the background
 */
export function preloadBabel(): void {
  if (!babelInstance && !loadingPromise && typeof window !== 'undefined') {
    // Load in background without waiting
    loadBabel().catch(error => {
      logWarn('Background Babel preload failed', 'lazyBabelCDN', { error });
    });
  }
}

/**
 * Get loading status
 */
export function getBabelLoadingStatus(): 'not-loaded' | 'loading' | 'loaded' {
  if (babelInstance || window.Babel) return 'loaded';
  if (loadingPromise) return 'loading';
  return 'not-loaded';
}

// Auto-preload after a delay if in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    preloadBabel();
  }, 2000);
}