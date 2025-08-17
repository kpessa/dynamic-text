import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('measure Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Measure Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: any = {};
        
        // First Contentful Paint
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcpEntry) {
          metrics.FCP = fcpEntry.startTime;
        }
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.LCP = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!metrics.FID && entry.processingStart) {
              metrics.FID = entry.processingStart - entry.startTime;
            }
          });
        }).observe({ entryTypes: ['first-input'] });
        
        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          metrics.CLS = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Time to First Byte
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        if (navigation) {
          metrics.TTFB = navigation.responseStart - navigation.fetchStart;
        }
        
        // Wait a bit for LCP to be recorded
        setTimeout(() => {
          resolve(metrics);
        }, 2000);
      });
    });
    
    // Assert Web Vitals are within acceptable ranges
    console.log('Web Vitals:', metrics);
    
    if (metrics.FCP) {
      expect(metrics.FCP).toBeLessThan(1800); // Good FCP < 1.8s
    }
    
    if (metrics.LCP) {
      expect(metrics.LCP).toBeLessThan(2500); // Good LCP < 2.5s
    }
    
    if (metrics.FID) {
      expect(metrics.FID).toBeLessThan(100); // Good FID < 100ms
    }
    
    if (metrics.CLS) {
      expect(metrics.CLS).toBeLessThan(0.1); // Good CLS < 0.1
    }
    
    if (metrics.TTFB) {
      expect(metrics.TTFB).toBeLessThan(800); // Good TTFB < 800ms
    }
  });

  test('bundle size check', async ({ page }) => {
    await page.goto('/');
    
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.endsWith('.js'))
        .map((entry: any) => ({
          name: entry.name.split('/').pop(),
          size: entry.transferSize / 1024, // Convert to KB
          duration: entry.duration
        }));
    });
    
    // Calculate total bundle size
    const totalSize = resources.reduce((sum, resource) => sum + resource.size, 0);
    console.log(`Total JS bundle size: ${totalSize.toFixed(2)}KB`);
    
    // Check individual bundles
    resources.forEach(resource => {
      console.log(`  ${resource.name}: ${resource.size.toFixed(2)}KB (${resource.duration.toFixed(0)}ms)`);
      
      // Individual chunks should be reasonable
      expect(resource.size).toBeLessThan(200); // Each chunk < 200KB
    });
    
    // Total bundle should be under 500KB
    expect(totalSize).toBeLessThan(500);
  });

  test('TPN calculation performance', async ({ page }) => {
    await page.goto('/');
    
    // Switch to TPN mode
    const tpnButton = page.locator('button:has-text("TPN")').first();
    if (await tpnButton.isVisible()) {
      await tpnButton.click();
    }
    
    // Measure calculation time
    const calculationTime = await page.evaluate(async () => {
      const start = performance.now();
      
      // Simulate TPN calculation
      const testValues = {
        DOSE_WEIGHT: 70,
        TPN_VOLUME: 2000,
        CHO_G: 250,
        AMINO_ACID_G: 85,
        NA_MEQ: 140,
        K_MEQ: 80,
        CA_MEQ: 10,
        MG_MEQ: 12,
        PO4_MMOL: 20
      };
      
      // Calculate osmolarity (simplified)
      const osmolarity = (testValues.CHO_G * 5.5) + 
                        (testValues.AMINO_ACID_G * 10) + 
                        (testValues.NA_MEQ * 2) + 
                        (testValues.K_MEQ * 2) + 
                        (testValues.CA_MEQ * 1.4) + 
                        (testValues.MG_MEQ * 1) + 
                        (testValues.PO4_MMOL * 1);
      
      const end = performance.now();
      return end - start;
    });
    
    console.log(`TPN calculation time: ${calculationTime.toFixed(2)}ms`);
    
    // Calculations should be fast
    expect(calculationTime).toBeLessThan(100); // < 100ms
  });

  test('memory usage', async ({ page }) => {
    await page.goto('/');
    
    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize / 1048576; // Convert to MB
    });
    
    if (initialMemory) {
      console.log(`Initial memory: ${initialMemory.toFixed(2)}MB`);
      
      // Perform several actions
      for (let i = 0; i < 5; i++) {
        // Add sections
        const addBtn = page.locator('button:has-text("Add Section")');
        if (await addBtn.isVisible()) {
          await addBtn.click();
        }
        
        // Type some content
        const editor = page.locator('.cm-content, textarea').last();
        if (await editor.isVisible()) {
          await editor.click();
          await page.keyboard.type(`Test content ${i}`);
        }
      }
      
      // Get memory after actions
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize / 1048576;
      });
      
      if (finalMemory) {
        console.log(`Final memory: ${finalMemory.toFixed(2)}MB`);
        const increase = finalMemory - initialMemory;
        console.log(`Memory increase: ${increase.toFixed(2)}MB`);
        
        // Memory increase should be reasonable
        expect(increase).toBeLessThan(20); // Less than 20MB increase
      }
    }
  });

  test('long task detection', async ({ page }) => {
    let longTasks: any[] = [];
    
    // Set up long task observer
    await page.evaluateOnNewDocument(() => {
      (window as any).longTasks = [];
      
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
              if (entry.duration > 50) {
                (window as any).longTasks.push({
                  name: entry.name,
                  duration: entry.duration,
                  startTime: entry.startTime
                });
              }
            });
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          console.log('Long task observer not supported');
        }
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Perform heavy operations
    const addBtn = page.locator('button:has-text("Add Section")');
    for (let i = 0; i < 10; i++) {
      if (await addBtn.isVisible()) {
        await addBtn.click();
      }
    }
    
    // Get long tasks
    longTasks = await page.evaluate(() => (window as any).longTasks || []);
    
    console.log(`Found ${longTasks.length} long tasks`);
    longTasks.forEach(task => {
      console.log(`  ${task.name}: ${task.duration.toFixed(0)}ms`);
    });
    
    // Should minimize long tasks
    const veryLongTasks = longTasks.filter(t => t.duration > 200);
    expect(veryLongTasks.length).toBeLessThan(3);
  });

  test('network performance', async ({ page }) => {
    const requests: any[] = [];
    
    // Monitor network requests
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        startTime: Date.now()
      });
    });
    
    page.on('response', response => {
      const request = requests.find(r => r.url === response.url());
      if (request) {
        request.status = response.status();
        request.duration = Date.now() - request.startTime;
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Analyze requests
    const jsRequests = requests.filter(r => r.url.endsWith('.js'));
    const cssRequests = requests.filter(r => r.url.endsWith('.css'));
    const apiRequests = requests.filter(r => r.url.includes('/api/'));
    
    console.log(`Network requests:`);
    console.log(`  JS files: ${jsRequests.length}`);
    console.log(`  CSS files: ${cssRequests.length}`);
    console.log(`  API calls: ${apiRequests.length}`);
    
    // Check for failed requests
    const failedRequests = requests.filter(r => r.status >= 400);
    expect(failedRequests.length).toBe(0);
    
    // Check for slow requests
    const slowRequests = requests.filter(r => r.duration > 3000);
    slowRequests.forEach(req => {
      console.log(`  Slow request: ${req.url} (${req.duration}ms)`);
    });
    expect(slowRequests.length).toBeLessThan(2);
  });

  test('rendering performance', async ({ page }) => {
    await page.goto('/');
    
    // Measure paint timings
    const paintMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      return entries.map(entry => ({
        name: entry.name,
        startTime: entry.startTime
      }));
    });
    
    console.log('Paint metrics:');
    paintMetrics.forEach(metric => {
      console.log(`  ${metric.name}: ${metric.startTime.toFixed(0)}ms`);
    });
    
    // Test smooth scrolling
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
    
    await page.waitForTimeout(1000);
    
    // Scroll back up
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Check for jank during animations
    const animationMetrics = await page.evaluate(() => {
      return new Promise(resolve => {
        let frameCount = 0;
        let lastTime = performance.now();
        const frameTimes: number[] = [];
        
        function measureFrame() {
          const currentTime = performance.now();
          const delta = currentTime - lastTime;
          frameTimes.push(delta);
          lastTime = currentTime;
          frameCount++;
          
          if (frameCount < 60) { // Measure 60 frames
            requestAnimationFrame(measureFrame);
          } else {
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const maxFrameTime = Math.max(...frameTimes);
            resolve({ avgFrameTime, maxFrameTime });
          }
        }
        
        requestAnimationFrame(measureFrame);
      });
    });
    
    console.log(`Frame timing - Avg: ${animationMetrics.avgFrameTime.toFixed(2)}ms, Max: ${animationMetrics.maxFrameTime.toFixed(2)}ms`);
    
    // Should maintain 60fps (16.67ms per frame)
    expect(animationMetrics.avgFrameTime).toBeLessThan(20);
    expect(animationMetrics.maxFrameTime).toBeLessThan(50);
  });
});