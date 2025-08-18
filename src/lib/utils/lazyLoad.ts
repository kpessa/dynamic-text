/**
 * Utility for lazy loading heavy components and libraries
 */

// Cache for loaded modules
const moduleCache = new Map<string, Promise<any>>();

/**
 * Lazy load a module with caching
 */
export async function lazyLoad<T>(
  loader: () => Promise<T>,
  cacheKey?: string
): Promise<T> {
  if (cacheKey && moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey) as Promise<T>;
  }

  const promise = loader();
  
  if (cacheKey) {
    moduleCache.set(cacheKey, promise);
  }

  return promise;
}

/**
 * Lazy load Babel standalone for code transpilation
 */
export async function loadBabel() {
  return lazyLoad(
    () => import('@babel/standalone'),
    'babel'
  );
}

/**
 * Lazy load DOMPurify for HTML sanitization
 */
export async function loadDOMPurify() {
  return lazyLoad(
    () => import('dompurify'),
    'dompurify'
  );
}

/**
 * Lazy load diff libraries
 */
export async function loadDiff() {
  return lazyLoad(
    async () => {
      const [diff, diff2html] = await Promise.all([
        import('diff'),
        import('diff2html')
      ]);
      return { diff, diff2html };
    },
    'diff'
  );
}

/**
 * Lazy load CodeMirror and its extensions
 */
export async function loadCodeMirror() {
  return lazyLoad(
    async () => {
      const [
        { EditorView, basicSetup },
        { EditorState },
        { javascript },
        { html },
        { oneDark }
      ] = await Promise.all([
        import('codemirror'),
        import('@codemirror/state'),
        import('@codemirror/lang-javascript'),
        import('@codemirror/lang-html'),
        import('@codemirror/theme-one-dark')
      ]);

      return {
        EditorView,
        EditorState,
        basicSetup,
        javascript,
        html,
        oneDark
      };
    },
    'codemirror'
  );
}

/**
 * Lazy load Firebase services
 */
export async function loadFirebase() {
  return lazyLoad(
    async () => {
      const [app, firestore, auth] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
        import('firebase/auth')
      ]);
      return { app, firestore, auth };
    },
    'firebase'
  );
}

/**
 * Lazy load Google Generative AI
 */
export async function loadGoogleAI() {
  return lazyLoad(
    () => import('@google/generative-ai'),
    'google-ai'
  );
}

/**
 * Preload a module in the background
 */
export function preloadModule(loader: () => Promise<any>, cacheKey: string) {
  if (!moduleCache.has(cacheKey)) {
    const promise = loader();
    moduleCache.set(cacheKey, promise);
  }
}

/**
 * Preload critical modules after initial render
 */
export function preloadCriticalModules() {
  // Use requestIdleCallback if available, otherwise setTimeout
  const schedulePreload = (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback);
    } else {
      setTimeout(callback, 1000);
    }
  };

  schedulePreload(() => {
    // Preload CodeMirror as it's likely to be used
    preloadModule(
      () => import('codemirror'),
      'codemirror-core'
    );
  });

  schedulePreload(() => {
    // Preload Babel for code transpilation
    preloadModule(
      () => import('@babel/standalone'),
      'babel'
    );
  });
}

/**
 * Clear the module cache (useful for testing)
 */
export function clearModuleCache() {
  moduleCache.clear();
}