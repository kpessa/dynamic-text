import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  
  // Performance optimizations
  build: {
    target: 'esnext',
    minify: 'terser',
    cssMinify: true,
    reportCompressedSize: false, // Speeds up build
    chunkSizeWarningLimit: 500, // Warn for chunks over 500KB
    sourcemap: false, // Disable sourcemaps in production
    
    // Bundle splitting for better caching
    rollupOptions: {
      external: ['@babel/standalone'],
      output: {
        manualChunks: (id) => {
          // Babel should be excluded from bundle (loaded from CDN)
          if (id.includes('@babel/standalone')) {
            return false; // Don't include in any chunk
          }
          
          // Vendor chunk for stable libraries
          if (id.includes('node_modules/svelte')) {
            return 'vendor';
          }
          
          // Heavy libraries in separate chunks
          if (id.includes('codemirror') || id.includes('@codemirror') || id.includes('@lezer')) {
            return 'codemirror';
          }
          
          if (id.includes('firebase')) {
            return 'firebase';
          }
          
          if (id.includes('@google/generative-ai')) {
            return 'ai';
          }
          
          if (id.includes('dompurify')) {
            return 'sanitizer';
          }
          
          if (id.includes('diff') || id.includes('diff2html')) {
            return 'diff';
          }
          
          // KPT namespace utilities
          if (id.includes('kptNamespace') || id.includes('kptPersistence')) {
            return 'kptNamespace';
          }
        },
        
        // Optimize chunk names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace(/\.(.*)/g, '') : 'chunk'
          return `js/[name]-[hash].js`
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name]-[hash].css'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    },
    
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    }
  },
  
  server: {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'svelte',
      'dompurify'
    ],
    exclude: [
      // Exclude heavy libraries from pre-bundling
      '@babel/standalone', // Load dynamically
      'firebase/app',
      'firebase/firestore', 
      'firebase/auth',
      '@google/generative-ai',
      'codemirror'
    ]
  },
  
  // Enable experimental features for better performance
  experimental: {
    renderBuiltUrl(filename) {
      return `/${filename}`
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '$lib': resolve(__dirname, 'src/lib'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@components': resolve(__dirname, 'src/lib/components')
    }
  },
  
  // Test configuration is in vitest.config.ts
})
