#!/usr/bin/env node

/**
 * Performance Measurement Script
 * Measures bundle sizes, loading times, and key performance metrics
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PERFORMANCE_BUDGETS = {
  // Bundle sizes (in KB)
  totalBundle: 500,
  vendorBundle: 200,
  appBundle: 200,
  cssBundle: 50,
  
  // Loading metrics (in ms)
  firstContentfulPaint: 1800,
  largestContentfulPaint: 2500,
  timeToInteractive: 3500,
  firstInputDelay: 100,
  
  // Layout stability
  cumulativeLayoutShift: 0.1
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function analyzeBundleSize() {
  console.log('\n📦 Bundle Size Analysis')
  console.log('========================')
  
  const distPath = path.join(__dirname, '../dist')
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ Build directory not found. Please run "npm run build" first.')
    return false
  }
  
  const files = fs.readdirSync(distPath, { recursive: true })
  let totalSize = 0
  const bundles = {
    js: { size: 0, files: [] },
    css: { size: 0, files: [] },
    assets: { size: 0, files: [] }
  }
  
  files.forEach(file => {
    const filePath = path.join(distPath, file)
    
    if (fs.statSync(filePath).isFile()) {
      const size = fs.statSync(filePath).size
      totalSize += size
      
      if (file.endsWith('.js')) {
        bundles.js.size += size
        bundles.js.files.push({ name: file, size })
      } else if (file.endsWith('.css')) {
        bundles.css.size += size
        bundles.css.files.push({ name: file, size })
      } else {
        bundles.assets.size += size
        bundles.assets.files.push({ name: file, size })
      }
    }
  })
  
  // Report sizes
  console.log(`Total Bundle Size: ${formatBytes(totalSize)}`)
  console.log(`JavaScript: ${formatBytes(bundles.js.size)}`)
  console.log(`CSS: ${formatBytes(bundles.css.size)}`)
  console.log(`Assets: ${formatBytes(bundles.assets.size)}`)
  
  // Check budgets
  const budgetViolations = []
  
  if (totalSize > PERFORMANCE_BUDGETS.totalBundle * 1024) {
    budgetViolations.push(`Total bundle (${formatBytes(totalSize)}) exceeds budget (${PERFORMANCE_BUDGETS.totalBundle}KB)`)
  }
  
  if (bundles.js.size > PERFORMANCE_BUDGETS.appBundle * 1024) {
    budgetViolations.push(`JavaScript bundle (${formatBytes(bundles.js.size)}) exceeds budget (${PERFORMANCE_BUDGETS.appBundle}KB)`)
  }
  
  if (bundles.css.size > PERFORMANCE_BUDGETS.cssBundle * 1024) {
    budgetViolations.push(`CSS bundle (${formatBytes(bundles.css.size)}) exceeds budget (${PERFORMANCE_BUDGETS.cssBundle}KB)`)
  }
  
  if (budgetViolations.length > 0) {
    console.log('\n⚠️  Performance Budget Violations:')
    budgetViolations.forEach(violation => console.log(`   ${violation}`))
    return false
  } else {
    console.log('\n✅ All bundle size budgets met!')
    return true
  }
}

function generatePerformanceReport() {
  console.log('\n📊 Generating Performance Report')
  console.log('=================================')
  
  const report = {
    timestamp: new Date().toISOString(),
    budgets: PERFORMANCE_BUDGETS,
    bundleAnalysis: null,
    recommendations: []
  }
  
  // Analyze bundle sizes
  const bundleAnalysisPassed = analyzeBundleSize()
  report.bundleAnalysis = { passed: bundleAnalysisPassed }
  
  // Generate recommendations
  if (!bundleAnalysisPassed) {
    report.recommendations.push(
      'Consider implementing code splitting',
      'Enable tree shaking for unused code',
      'Optimize images and assets',
      'Use lazy loading for non-critical components'
    )
  }
  
  // Add TPN-specific recommendations
  report.recommendations.push(
    'Use Web Workers for heavy TPN calculations',
    'Implement caching for medical reference data',
    'Optimize Firebase queries with indexes',
    'Consider using virtual scrolling for large ingredient lists'
  )
  
  // Save report
  const reportPath = path.join(__dirname, '../performance-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📋 Performance report saved to: ${reportPath}`)
  
  return report
}

function checkServiceWorker() {
  console.log('\n🔧 Service Worker Check')
  console.log('========================')
  
  const swPath = path.join(__dirname, '../public/sw.js')
  if (fs.existsSync(swPath)) {
    const swStats = fs.statSync(swPath)
    console.log(`✅ Service Worker found (${formatBytes(swStats.size)})`)
    return true
  } else {
    console.log('❌ Service Worker not found')
    return false
  }
}

function checkCriticalResources() {
  console.log('\n🎯 Critical Resources Check')
  console.log('===========================')
  
  const criticalFiles = [
    'public/offline.html',
    'public/workers/tpnWorker.js',
    'public/workers/codeWorker.js'
  ]
  
  let allPresent = true
  
  criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, '../', file)
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}`)
    } else {
      console.log(`❌ ${file} - Missing`)
      allPresent = false
    }
  })
  
  return allPresent
}

function runLighthouseAudit() {
  console.log('\n🏃 Running Lighthouse Audit')
  console.log('============================')
  
  try {
    console.log('Starting development server...')
    const serverProcess = execSync('npm run preview &', { stdio: 'pipe' })
    
    // Wait for server to start
    setTimeout(() => {
      try {
        execSync('npx lighthouse http://localhost:4173 --quiet --chrome-flags="--headless" --output=json --output-path=lighthouse-report.json', {
          stdio: 'inherit'
        })
        console.log('✅ Lighthouse audit completed')
        console.log('📊 Report saved to lighthouse-report.json')
      } catch (error) {
        console.log('⚠️  Lighthouse audit failed:', error.message)
      }
    }, 5000)
    
  } catch (error) {
    console.log('⚠️  Could not run Lighthouse audit:', error.message)
    console.log('💡 Make sure the app is built with "npm run build"')
  }
}

function main() {
  console.log('🚀 TPN Dynamic Text Editor - Performance Analysis')
  console.log('==================================================')
  
  // Check if build exists
  const distPath = path.join(__dirname, '../dist')
  if (!fs.existsSync(distPath)) {
    console.log('\n⚠️  No build found. Building application...')
    try {
      execSync('npm run build', { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Build failed:', error.message)
      process.exit(1)
    }
  }
  
  // Run analysis
  const bundleOk = analyzeBundleSize()
  const swOk = checkServiceWorker()
  const resourcesOk = checkCriticalResources()
  const report = generatePerformanceReport()
  
  // Summary
  console.log('\n📈 Performance Summary')
  console.log('======================')
  console.log(`Bundle Size Budget: ${bundleOk ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Service Worker: ${swOk ? '✅ PRESENT' : '❌ MISSING'}`)
  console.log(`Critical Resources: ${resourcesOk ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
  
  if (process.argv.includes('--lighthouse')) {
    runLighthouseAudit()
  }
  
  // Exit with appropriate code
  const allPassed = bundleOk && swOk && resourcesOk
  if (!allPassed) {
    console.log('\n⚠️  Some performance checks failed. See recommendations above.')
    process.exit(1)
  } else {
    console.log('\n🎉 All performance checks passed!')
    process.exit(0)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  analyzeBundleSize,
  generatePerformanceReport,
  checkServiceWorker,
  checkCriticalResources,
  PERFORMANCE_BUDGETS
}