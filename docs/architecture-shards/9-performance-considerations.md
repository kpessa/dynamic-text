# 9. Performance Considerations

## Bundle Optimization
```javascript
// Vite Configuration
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['svelte', 'firebase'],
          'editor': ['@codemirror/core'],
          'babel': ['@babel/standalone']
        }
      }
    }
  }
}
```

## Lazy Loading
```javascript
// Dynamic imports for heavy components
const CodeEditor = lazy(() => import('./lib/CodeEditor.svelte'))
const DiffViewer = lazy(() => import('./lib/IngredientDiffViewer.svelte'))
```

## Performance Targets
- Initial Load: <3s on 3G
- Time to Interactive: <5s
- Bundle Size: <1MB (currently 1.5MB)
- Lighthouse Score: >80
