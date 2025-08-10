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
    
    // Bundle splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for stable libraries
          vendor: ['svelte'],
          
          // Heavy libraries in separate chunks
          codemirror: [
            'codemirror',
            '@codemirror/lang-html',
            '@codemirror/lang-javascript',
            '@codemirror/language',
            '@codemirror/view',
            '@codemirror/theme-one-dark',
            '@lezer/highlight'
          ],
          
          firebase: ['firebase'],
          
          ai: ['@google/generative-ai'],
          
          utils: [
            '@babel/standalone',
            'dompurify',
            'diff',
            'diff2html'
          ]
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
      '@babel/standalone',
      'dompurify'
    ],
    exclude: [
      // Exclude heavy libraries from pre-bundling
      'firebase',
      '@google/generative-ai',
      'codemirror'
    ],
    // Force include critical modules
    force: true
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
      '@lib': resolve(__dirname, 'src/lib'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@components': resolve(__dirname, 'src/lib/components')
    }
  },
  
  // Test configuration is in vitest.config.ts
})
