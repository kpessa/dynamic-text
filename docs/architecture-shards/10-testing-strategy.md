# 10. Testing Strategy

## Test Pyramid
```
         /\
        /E2E\       20% - Critical paths
       /------\
      /Integr.\     20% - Component integration
     /----------\
    /   Unit     \  60% - Business logic
   /--------------\
```

## Testing Patterns
```typescript
// Unit Test Pattern
describe('SectionManager', () => {
  it('should add section', () => {
    const manager = new SectionManager()
    manager.addSection({ type: 'static' })
    expect(manager.sections).toHaveLength(1)
  })
})

// Integration Test Pattern
describe('Firebase Sync', () => {
  it('should save and retrieve', async () => {
    await firebaseService.save(data)
    const loaded = await firebaseService.load(id)
    expect(loaded).toEqual(data)
  })
})

// E2E Test Pattern
test('create document flow', async ({ page }) => {
  await page.goto('/')
  await page.click('button:has-text("Add Section")')
  await expect(page.locator('.section')).toBeVisible()
})
```
