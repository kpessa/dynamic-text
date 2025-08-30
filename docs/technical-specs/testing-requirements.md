# Testing Requirements

## Unit Tests

```typescript
// tests/stories/p0-implementation.test.ts
describe('P0 Story Implementation', () => {
  describe('Story 1: Firebase Save/Load', () => {
    test('saves complete configuration', async () => {
      const config = createMockConfiguration();
      const result = await firebaseSaveService.save(config);
      
      expect(result.success).toBe(true);
      expect(result.checksum).toBeDefined();
    });
    
    test('handles save conflicts', async () => {
      const config = createMockConfiguration();
      
      // Simulate concurrent edit
      await firebaseSaveService.save(config);
      config.sections[0].content = 'modified';
      
      const result = await firebaseSaveService.save(config);
      expect(result.conflictResolved).toBe(true);
    });
    
    test('loads and restores state correctly', async () => {
      const saved = await firebaseSaveService.save(mockConfig);
      const loaded = await firebaseLoadService.load(saved.id);
      
      expect(loaded).toEqual(mockConfig);
      expect(sectionStore.sections).toEqual(mockConfig.sections);
    });
  });
  
  describe('Story 2: Dynamic Execution', () => {
    test('executes code with context', async () => {
      const code = 'return me.getValue("test")';
      const context = { values: { test: 42 } };
      
      const result = await codeExecutionService.execute(code, context);
      expect(result).toBe('42');
    });
    
    test('enforces timeout', async () => {
      const code = 'while(true) {}';
      
      await expect(
        codeExecutionService.execute(code, {}, { timeout: 100 })
      ).rejects.toThrow('TimeoutError');
    });
    
    test('prevents global access', async () => {
      const code = 'return window.location';
      
      const result = await codeExecutionService.execute(code, {});
      expect(result).toContain('undefined');
    });
  });
  
  describe('Story 3: Live Preview', () => {
    test('updates preview in real-time', async () => {
      const update = {
        sectionId: 'test-1',
        content: '<h1>Test</h1>',
        type: 'static'
      };
      
      await previewService.updatePreview(update);
      
      const preview = get(previewStore);
      expect(preview.content).toContain('<h1>Test</h1>');
      expect(preview.metrics.renderCount).toBe(1);
    });
    
    test('degrades on poor performance', async () => {
      // Simulate slow renders
      for (let i = 0; i < 5; i++) {
        await previewService.updatePreview(slowUpdate);
      }
      
      const mode = get(previewStore).mode;
      expect(mode).toBe('debounced');
    });
  });
});
```

---
