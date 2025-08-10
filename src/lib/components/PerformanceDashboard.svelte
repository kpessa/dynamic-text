<script>
  import { onMount, onDestroy } from 'svelte'
  // Lazy load performance services to prevent blocking initialization
  // import { performanceMonitor, getPerformanceReport, checkPerformanceBudget } from '../services/performanceService'
  // import { tpnWorkerService } from '../services/workerService'
  
  let performanceService = null
  let workerService = null
  
  // Performance data state
  let performanceData = $state({
    webVitals: {},
    customMetrics: {},
    userExperience: {},
    systemInfo: {},
    workerMetrics: {},
    cacheStats: {},
    budgetCheck: { passed: true, violations: [] }
  })
  
  let isVisible = $state(false)
  let updateInterval = null
  let chartData = $state([])
  let selectedMetric = $state('lcp')
  
  // Chart configuration
  const metricConfig = {
    lcp: { name: 'Largest Contentful Paint', unit: 'ms', target: 2500, color: '#ff6b6b' },
    fid: { name: 'First Input Delay', unit: 'ms', target: 100, color: '#4ecdc4' },
    cls: { name: 'Cumulative Layout Shift', unit: '', target: 0.1, color: '#45b7d1' },
    fcp: { name: 'First Contentful Paint', unit: 'ms', target: 1800, color: '#f39c12' },
    ttfb: { name: 'Time to First Byte', unit: 'ms', target: 600, color: '#9b59b6' },
    tpnCalculation: { name: 'TPN Calculation', unit: 'ms', target: 100, color: '#e74c3c' },
    sectionRender: { name: 'Section Render', unit: 'ms', target: 50, color: '#2ecc71' }
  }
  
  onMount(async () => {
    // Lazy load performance services
    try {
      const [perfService, workService] = await Promise.all([
        import('../services/performanceService'),
        import('../services/workerService')
      ])
      
      performanceService = perfService
      workerService = workService
      
      updatePerformanceData()
      
      // Update performance data every 10 seconds
      updateInterval = setInterval(updatePerformanceData, 10000)
    } catch (error) {
      console.warn('[PerformanceDashboard] Failed to load services:', error)
    }
    
    // Listen for keyboard shortcut to toggle dashboard
    document.addEventListener('keydown', handleKeyDown)
  })
  
  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval)
    }
    document.removeEventListener('keydown', handleKeyDown)
  })
  
  function handleKeyDown(e) {
    // Ctrl/Cmd + Shift + P to toggle performance dashboard
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault()
      toggle()
    }
  }
  
  async function updatePerformanceData() {
    if (!performanceService || !workerService) {
      return // Services not loaded yet
    }
    
    try {
      const report = performanceService.getPerformanceReport()
      const budgetCheck = performanceService.checkPerformanceBudget()
      
      // Get worker metrics if available
      let workerMetrics = {}
      try {
        const tpnWorkerService = workerService.getTpnWorkerService()
        if (tpnWorkerService.isReady()) {
          workerMetrics = await tpnWorkerService.getPerformanceMetrics()
        }
      } catch (error) {
        console.warn('Failed to get worker metrics:', error)
      }
      
      // Get cache stats from service worker
      let cacheStats = {}
      try {
        const monitor = performanceService.getPerformanceMonitor()
        cacheStats = await monitor.getCacheStats() || {}
      } catch (error) {
        console.warn('Failed to get cache stats:', error)
      }
      
      performanceData = {
        ...report,
        workerMetrics,
        cacheStats,
        budgetCheck
      }
      
      // Update chart data
      updateChartData()
      
    } catch (error) {
      console.error('Failed to update performance data:', error)
    }
  }
  
  function updateChartData() {
    const metric = selectedMetric
    const value = performanceData.webVitals[metric] || performanceData.customMetrics[metric]
    
    if (value !== undefined) {
      chartData = [...chartData, {
        timestamp: Date.now(),
        value,
        metric
      }].slice(-20) // Keep last 20 data points
    }
  }
  
  function toggle() {
    isVisible = !isVisible
    if (isVisible) {
      updatePerformanceData()
    }
  }
  
  function getMetricStatus(metric, value, target) {
    if (value === undefined) return 'unknown'
    
    if (metric === 'cls') {
      return value <= target ? 'good' : value <= target * 2 ? 'needs-improvement' : 'poor'
    } else {
      return value <= target ? 'good' : value <= target * 1.5 ? 'needs-improvement' : 'poor'
    }
  }
  
  function formatValue(value, unit) {
    if (value === undefined || value === null) return 'N/A'
    
    if (unit === 'ms') {
      return `${Math.round(value)}ms`
    } else if (unit === '') {
      return value.toFixed(3)
    } else {
      return `${Math.round(value)}${unit}`
    }
  }
  
  function clearCache() {
    if (confirm('Clear all caches? This will remove stored performance data and may affect loading times.')) {
      // Service worker cache clearing disabled
      console.log('[Performance] Service worker cache clearing disabled')
      
      // Clear TPN worker cache
      if (workerService) {
        const tpnWorkerService = workerService.getTpnWorkerService()
        tpnWorkerService.clearCache()
      }
      
      alert('Caches cleared successfully')
      updatePerformanceData()
    }
  }
  
  function exportReport() {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      performanceData,
      chartData
    }
    
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-report-${Date.now()}.json`
    a.click()
    
    URL.revokeObjectURL(url)
  }
</script>

{#if isVisible}
  <div class="performance-dashboard">
    <div class="dashboard-header">
      <h3>Performance Dashboard</h3>
      <div class="dashboard-controls">
        <button class="btn-small" onclick={updatePerformanceData}>Refresh</button>
        <button class="btn-small" onclick={clearCache}>Clear Cache</button>
        <button class="btn-small" onclick={exportReport}>Export Report</button>
        <button class="btn-close" onclick={toggle}>✕</button>
      </div>
    </div>
    
    <!-- Budget Status -->
    <div class="budget-status {performanceData.budgetCheck.passed ? 'passed' : 'failed'}">
      {#if performanceData.budgetCheck.passed}
        ✅ Performance Budget: PASSED
      {:else}
        ❌ Performance Budget: FAILED ({performanceData.budgetCheck.violations.length} violations)
      {/if}
    </div>
    
    {#if !performanceData.budgetCheck.passed}
      <div class="budget-violations">
        <h4>Budget Violations:</h4>
        <ul>
          {#each performanceData.budgetCheck.violations as violation}
            <li class="violation">{violation}</li>
          {/each}
        </ul>
      </div>
    {/if}
    
    <!-- Web Vitals -->
    <div class="metrics-section">
      <h4>Core Web Vitals</h4>
      <div class="metrics-grid">
        {#each Object.entries(metricConfig) as [key, config]}
          {#if ['lcp', 'fid', 'cls'].includes(key)}
            {@const value = performanceData.webVitals[key]}
            {@const status = getMetricStatus(key, value, config.target)}
            <div 
              class="metric-card {status}" 
              class:selected={selectedMetric === key} 
              onclick={() => selectedMetric = key}
              onkeydown={(e) => e.key === 'Enter' && (selectedMetric = key)}
              role="button"
              tabindex="0"
              aria-label="Select {config.name} metric">
              <div class="metric-name">{config.name}</div>
              <div class="metric-value">{formatValue(value, config.unit)}</div>
              <div class="metric-target">Target: {formatValue(config.target, config.unit)}</div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
    
    <!-- Custom Metrics -->
    <div class="metrics-section">
      <h4>Custom Metrics</h4>
      <div class="metrics-grid">
        {#each Object.entries(metricConfig) as [key, config]}
          {#if ['fcp', 'ttfb', 'tpnCalculation', 'sectionRender'].includes(key)}
            {@const value = performanceData.webVitals[key] || performanceData.customMetrics[key]}
            {@const status = getMetricStatus(key, value, config.target)}
            <div 
              class="metric-card {status}" 
              class:selected={selectedMetric === key}
              onclick={() => selectedMetric = key}
              onkeydown={(e) => e.key === 'Enter' && (selectedMetric = key)}
              role="button"
              tabindex="0"
              aria-label="Select {config.name} metric">
              <div class="metric-name">{config.name}</div>
              <div class="metric-value">{formatValue(value, config.unit)}</div>
              <div class="metric-target">Target: {formatValue(config.target, config.unit)}</div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
    
    <!-- Chart -->
    {#if chartData.length > 0}
      <div class="chart-section">
        <h4>Performance Trend: {metricConfig[selectedMetric]?.name}</h4>
        <div class="chart-container">
          <svg width="100%" height="200" viewBox="0 0 400 200">
            <!-- Chart implementation would go here -->
            <!-- For now, showing a simple line representation -->
            {#each chartData as point, i}
              {#if i > 0}
                {@const prevPoint = chartData[i - 1]}
                {@const x1 = (i - 1) * (380 / (chartData.length - 1)) + 10}
                {@const y1 = 180 - (prevPoint.value / Math.max(...chartData.map(p => p.value)) * 160)}
                {@const x2 = i * (380 / (chartData.length - 1)) + 10}
                {@const y2 = 180 - (point.value / Math.max(...chartData.map(p => p.value)) * 160)}
                <line x1={x1} y1={y1} x2={x2} y2={y2} 
                      stroke={metricConfig[selectedMetric]?.color} stroke-width="2" />
              {/if}
            {/each}
            
            {#each chartData as point, i}
              {@const x = i * (380 / (chartData.length - 1)) + 10}
              {@const y = 180 - (point.value / Math.max(...chartData.map(p => p.value)) * 160)}
              <circle cx={x} cy={y} r="3" fill={metricConfig[selectedMetric]?.color} />
            {/each}
          </svg>
        </div>
      </div>
    {/if}
    
    <!-- System Info -->
    <div class="info-section">
      <div class="info-grid">
        <!-- Memory Usage -->
        {#if performanceData.systemInfo.memoryUsage}
          <div class="info-card">
            <h5>Memory Usage</h5>
            <div class="memory-info">
              <div>Used: {Math.round(performanceData.systemInfo.memoryUsage.used / 1024 / 1024)}MB</div>
              <div>Total: {Math.round(performanceData.systemInfo.memoryUsage.total / 1024 / 1024)}MB</div>
              <div>Limit: {Math.round(performanceData.systemInfo.memoryUsage.limit / 1024 / 1024)}MB</div>
            </div>
          </div>
        {/if}
        
        <!-- Connection Info -->
        {#if performanceData.systemInfo.connectionInfo}
          <div class="info-card">
            <h5>Connection</h5>
            <div class="connection-info">
              <div>Type: {performanceData.systemInfo.connectionInfo.effectiveType}</div>
              <div>Downlink: {performanceData.systemInfo.connectionInfo.downlink}Mbps</div>
              <div>RTT: {performanceData.systemInfo.connectionInfo.rtt}ms</div>
            </div>
          </div>
        {/if}
        
        <!-- Worker Metrics -->
        {#if performanceData.workerMetrics.calculationsPerformed}
          <div class="info-card">
            <h5>TPN Worker</h5>
            <div class="worker-info">
              <div>Calculations: {performanceData.workerMetrics.calculationsPerformed}</div>
              <div>Avg Time: {performanceData.workerMetrics.averageExecutionTime?.toFixed(2)}ms</div>
              <div>Cache Hits: {performanceData.workerMetrics.cacheHits}</div>
            </div>
          </div>
        {/if}
        
        <!-- Cache Stats -->
        {#if performanceData.cacheStats.cacheHits !== undefined}
          <div class="info-card">
            <h5>Service Worker Cache</h5>
            <div class="cache-info">
              <div>Hits: {performanceData.cacheStats.cacheHits}</div>
              <div>Misses: {performanceData.cacheStats.cacheMisses}</div>
              <div>Requests: {performanceData.cacheStats.networkRequests}</div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Toggle Button -->
{#if !isVisible}
  <button class="performance-toggle" onclick={toggle} title="Performance Dashboard (Ctrl+Shift+P)">
    📊
  </button>
{/if}

<style>
  .performance-dashboard {
    position: fixed;
    top: 10px;
    right: 10px;
    width: 600px;
    max-height: 90vh;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    z-index: 10000;
    overflow-y: auto;
    font-size: 12px;
  }
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
    border-radius: 8px 8px 0 0;
  }
  
  .dashboard-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.1rem;
  }
  
  .dashboard-controls {
    display: flex;
    gap: 0.5rem;
  }
  
  .btn-small {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .btn-small:hover {
    background: #f0f0f0;
  }
  
  .btn-close {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: none;
    background: #dc3545;
    color: white;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn-close:hover {
    background: #c82333;
  }
  
  .budget-status {
    padding: 0.75rem 1rem;
    margin: 1rem;
    border-radius: 4px;
    font-weight: 600;
  }
  
  .budget-status.passed {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .budget-status.failed {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  .budget-violations {
    margin: 0 1rem 1rem;
    padding: 0.5rem;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
  }
  
  .budget-violations h4 {
    margin: 0 0 0.5rem 0;
    color: #856404;
  }
  
  .budget-violations ul {
    margin: 0;
    padding-left: 1.2rem;
  }
  
  .violation {
    color: #856404;
    margin-bottom: 0.25rem;
  }
  
  .metrics-section {
    margin: 1rem;
  }
  
  .metrics-section h4 {
    margin: 0 0 0.75rem 0;
    color: #495057;
    font-size: 1rem;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }
  
  .metric-card {
    padding: 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
  }
  
  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .metric-card.selected {
    border-color: #007bff;
  }
  
  .metric-card.good {
    background: #d4edda;
    border-color: #28a745;
  }
  
  .metric-card.needs-improvement {
    background: #fff3cd;
    border-color: #ffc107;
  }
  
  .metric-card.poor {
    background: #f8d7da;
    border-color: #dc3545;
  }
  
  .metric-name {
    font-size: 0.7rem;
    color: #666;
    margin-bottom: 0.25rem;
  }
  
  .metric-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }
  
  .metric-target {
    font-size: 0.65rem;
    color: #888;
  }
  
  .chart-section {
    margin: 1rem;
  }
  
  .chart-section h4 {
    margin: 0 0 0.5rem 0;
    color: #495057;
  }
  
  .chart-container {
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
  }
  
  .info-section {
    margin: 1rem;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }
  
  .info-card {
    padding: 0.75rem;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
  }
  
  .info-card h5 {
    margin: 0 0 0.5rem 0;
    color: #495057;
    font-size: 0.8rem;
  }
  
  .info-card > div {
    font-size: 0.7rem;
    color: #6c757d;
  }
  
  .info-card > div > div {
    margin-bottom: 0.2rem;
  }
  
  .performance-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border: none;
    background: #007bff;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.5rem;
    box-shadow: 0 4px 12px rgba(0,123,255,0.3);
    transition: all 0.2s;
    z-index: 9999;
  }
  
  .performance-toggle:hover {
    background: #0056b3;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,123,255,0.4);
  }
  
  @media (max-width: 768px) {
    .performance-dashboard {
      width: 95vw;
      top: 5px;
      right: 5px;
    }
    
    .metrics-grid {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    }
    
    .info-grid {
      grid-template-columns: 1fr;
    }
  }
</style>