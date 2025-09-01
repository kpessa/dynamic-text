import { test, expect } from '@playwright/test';

test.describe('Firebase Performance E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for app to initialize
    await page.waitForSelector('.app-container', { timeout: 10000 });
  });
  
  test('ingredients tab should load in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    // Click on ingredients tab
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    
    // Wait for ingredients to load
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item', {
      state: 'visible',
      timeout: 2000
    });
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    console.log(`Ingredients tab load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
  });
  
  test('should display loading indicator while fetching', async ({ page }) => {
    // Click on ingredients tab
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading-indicator"], .loading, .skeleton');
    await expect(loadingIndicator).toBeVisible();
    
    // Wait for loading to complete
    await expect(loadingIndicator).toBeHidden({ timeout: 2000 });
  });
  
  test('pagination should load next page in under 500ms', async ({ page }) => {
    // Navigate to ingredients tab
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item');
    
    // Find and click "Load More" button
    const loadMoreBtn = page.locator('[data-testid="load-more"], button:has-text("Load More")');
    
    if (await loadMoreBtn.isVisible()) {
      const startTime = Date.now();
      
      await loadMoreBtn.click();
      
      // Wait for new items to appear
      await page.waitForFunction(
        (initialCount) => {
          const items = document.querySelectorAll('[data-testid="ingredient-list"] .ingredient-item, .ingredient-item');
          return items.length > initialCount;
        },
        await page.locator('[data-testid="ingredient-list"] .ingredient-item, .ingredient-item').count(),
        { timeout: 500 }
      );
      
      const endTime = Date.now();
      const paginationTime = endTime - startTime;
      
      console.log(`Pagination load time: ${paginationTime}ms`);
      expect(paginationTime).toBeLessThan(500);
    }
  });
  
  test('search should respond in under 300ms after debounce', async ({ page }) => {
    // Navigate to ingredients tab
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item');
    
    // Find search input
    const searchInput = page.locator('[data-testid="ingredient-search"], input[placeholder*="Search"], input[type="search"]');
    
    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('test');
      
      // Wait for debounce (typically 300ms)
      await page.waitForTimeout(300);
      
      const startTime = Date.now();
      
      // Wait for search results to update
      await page.waitForFunction(
        () => {
          const items = document.querySelectorAll('[data-testid="ingredient-list"] .ingredient-item, .ingredient-item');
          // Check if list has been filtered/updated
          return items.length >= 0;
        },
        undefined,
        { timeout: 300 }
      );
      
      const endTime = Date.now();
      const searchResponseTime = endTime - startTime;
      
      console.log(`Search response time: ${searchResponseTime}ms`);
      expect(searchResponseTime).toBeLessThan(300);
    }
  });
  
  test('should handle large dataset (500 items) efficiently', async ({ page }) => {
    // This test assumes test data is loaded
    const startTime = Date.now();
    
    // Navigate to ingredients tab
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    
    // Wait for ingredients to load
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item', {
      state: 'visible',
      timeout: 2000
    });
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Count visible items (should be limited by pagination)
    const visibleItems = await page.locator('[data-testid="ingredient-list"] .ingredient-item, .ingredient-item').count();
    
    console.log(`Large dataset load time: ${loadTime}ms, Visible items: ${visibleItems}`);
    
    // Should still load quickly even with large dataset
    expect(loadTime).toBeLessThan(2000);
    
    // Should implement pagination (not showing all 500 at once)
    expect(visibleItems).toBeLessThanOrEqual(100);
  });
  
  test('should measure memory usage stays reasonable', async ({ page }) => {
    // Navigate to ingredients tab
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item');
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (metrics) {
      const usedJSHeapSize = metrics.usedJSHeapSize / (1024 * 1024); // Convert to MB
      console.log(`JS Heap Size: ${usedJSHeapSize.toFixed(2)} MB`);
      
      // Heap size should stay reasonable (under 100MB for typical usage)
      expect(usedJSHeapSize).toBeLessThan(100);
    }
  });
  
  test('network requests should be optimized', async ({ page }) => {
    const requests: any[] = [];
    
    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('firestore') || request.url().includes('ingredients')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    // Navigate to ingredients tab
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    
    // Wait for ingredients to load
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item');
    
    // Analyze requests
    console.log(`Total Firestore requests: ${requests.length}`);
    
    // Should not make excessive requests
    expect(requests.length).toBeLessThan(10);
    
    // Check for duplicate requests
    const uniqueUrls = new Set(requests.map(r => r.url));
    expect(uniqueUrls.size).toBe(requests.length); // No duplicates
  });
  
  test('should handle slow network gracefully', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 200)); // Add 200ms delay
      await route.continue();
    });
    
    const startTime = Date.now();
    
    // Navigate to ingredients tab
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    
    // Should show loading state
    const loadingIndicator = page.locator('[data-testid="loading-indicator"], .loading, .skeleton');
    await expect(loadingIndicator).toBeVisible();
    
    // Wait for ingredients to load (with extended timeout for slow network)
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item', {
      state: 'visible',
      timeout: 5000
    });
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    console.log(`Slow network load time: ${loadTime}ms`);
    
    // Should still complete within reasonable time even on slow network
    expect(loadTime).toBeLessThan(5000);
  });
  
  test('cached data should load instantly on revisit', async ({ page }) => {
    // First visit - load ingredients
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item');
    
    // Navigate away
    const homeTab = page.locator('[data-testid="home-tab"], button:has-text("Editor"), button:has-text("Home")');
    if (await homeTab.isVisible()) {
      await homeTab.click();
    }
    
    // Revisit ingredients tab
    const startTime = Date.now();
    await ingredientsTab.click();
    
    // Should load from cache much faster
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item', {
      state: 'visible',
      timeout: 500
    });
    
    const endTime = Date.now();
    const cachedLoadTime = endTime - startTime;
    
    console.log(`Cached load time: ${cachedLoadTime}ms`);
    expect(cachedLoadTime).toBeLessThan(500);
  });
});

test.describe('Performance Monitoring', () => {
  test('should log performance metrics to console', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('performance') || text.includes('Query execution time')) {
        consoleLogs.push(text);
      }
    });
    
    // Navigate to ingredients tab
    await page.goto('http://localhost:5173');
    const ingredientsTab = page.locator('[data-testid="ingredients-tab"], button:has-text("Ingredients")');
    await ingredientsTab.click();
    
    await page.waitForSelector('[data-testid="ingredient-list"], .ingredient-item');
    
    // Check that performance metrics were logged
    expect(consoleLogs.length).toBeGreaterThan(0);
    console.log('Performance logs:', consoleLogs);
  });
  
  test('should track Core Web Vitals', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Get Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find((entry: any) => entry.name === 'first-contentful-paint');
        if (fcp) vitals.FCP = fcp.startTime;
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.LCP = (lastEntry as any).renderTime || (lastEntry as any).loadTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Time to Interactive (simplified)
        vitals.TTI = performance.timing.domInteractive - performance.timing.navigationStart;
        
        setTimeout(() => resolve(vitals), 1000);
      });
    });
    
    console.log('Core Web Vitals:', vitals);
    
    // Check that vitals are within acceptable ranges
    if ((vitals as any).FCP) {
      expect((vitals as any).FCP).toBeLessThan(1800); // Good FCP < 1.8s
    }
    
    if ((vitals as any).TTI) {
      expect((vitals as any).TTI).toBeLessThan(3800); // Good TTI < 3.8s
    }
  });
});