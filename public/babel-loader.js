/**
 * Babel CDN Loader
 * Loads Babel from CDN instead of bundling it
 */

(function() {
  // Check if Babel is already loaded
  if (window.Babel) {
    return;
  }

  // Configuration
  const BABEL_CDN_URL = 'https://unpkg.com/@babel/standalone@7.23.5/babel.min.js';
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 1000;

  let loadAttempts = 0;

  function loadBabelFromCDN() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = BABEL_CDN_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        if (window.Babel) {
          console.log('[BabelLoader] Babel loaded successfully from CDN');
          resolve(window.Babel);
        } else {
          reject(new Error('Babel failed to initialize'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Babel from CDN'));
      };
      
      document.head.appendChild(script);
    });
  }

  function retryLoadBabel() {
    loadAttempts++;
    
    if (loadAttempts > RETRY_ATTEMPTS) {
      console.error('[BabelLoader] Failed to load Babel after', RETRY_ATTEMPTS, 'attempts');
      // Dispatch event to notify app
      window.dispatchEvent(new CustomEvent('babel-load-failed'));
      return;
    }
    
    console.log('[BabelLoader] Attempting to load Babel (attempt', loadAttempts, ')');
    
    loadBabelFromCDN()
      .then(() => {
        // Dispatch event to notify app that Babel is ready
        window.dispatchEvent(new CustomEvent('babel-loaded', { 
          detail: { babel: window.Babel } 
        }));
      })
      .catch((error) => {
        console.warn('[BabelLoader] Load attempt failed:', error);
        setTimeout(retryLoadBabel, RETRY_DELAY * loadAttempts);
      });
  }

  // Start loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', retryLoadBabel);
  } else {
    retryLoadBabel();
  }
})();