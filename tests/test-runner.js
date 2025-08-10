#!/usr/bin/env node

/**
 * Custom test runner for medical safety validation
 * Ensures critical medical calculations are thoroughly tested
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logHeader(message) {
  log('cyan', `\n${'='.repeat(60)}`);
  log('cyan', `  ${message}`);
  log('cyan', `${'='.repeat(60)}\n`);
}

function logSuccess(message) {
  log('green', `✅ ${message}`);
}

function logError(message) {
  log('red', `❌ ${message}`);
}

function logWarning(message) {
  log('yellow', `⚠️  ${message}`);
}

function logInfo(message) {
  log('blue', `ℹ️  ${message}`);
}

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      e2e: { passed: 0, failed: 0, total: 0 },
      medical: { passed: 0, failed: 0, total: 0 }
    };
    this.medicalSafetyIssues = [];
  }

  async runUnitTests() {
    logHeader('Running Unit Tests');
    
    try {
      const output = execSync('pnpm test:unit --reporter=json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const results = JSON.parse(output.split('\n').filter(line => 
        line.trim().startsWith('{') && line.includes('"testResults"')
      ).pop() || '{}');
      
      this.results.unit.total = results.numTotalTests || 0;
      this.results.unit.passed = results.numPassedTests || 0;
      this.results.unit.failed = results.numFailedTests || 0;
      
      logSuccess(`Unit tests completed: ${this.results.unit.passed}/${this.results.unit.total} passed`);
      return true;
    } catch (error) {
      logError(`Unit tests failed: ${error.message}`);
      return false;
    }
  }

  async runMedicalSafetyTests() {
    logHeader('Running Medical Safety & TPN Calculation Tests');
    
    const criticalTests = [
      'TPN.*[Cc]alculation',
      'Medical.*Safety',
      'Safety.*Validation',
      'Osmolarity.*Validation',
      'Dextrose.*Safety'
    ];
    
    let allPassed = true;
    
    for (const testPattern of criticalTests) {
      logInfo(`Running ${testPattern} tests...`);
      
      try {
        const output = execSync(`pnpm test:unit --testNamePattern="${testPattern}" --verbose`, {
          encoding: 'utf8'
        });
        
        if (output.includes('FAIL') || output.includes('failed')) {
          this.medicalSafetyIssues.push(`Critical test pattern ${testPattern} has failures`);
          allPassed = false;
          logError(`Critical medical safety tests failed for pattern: ${testPattern}`);
        } else {
          logSuccess(`Medical safety tests passed for pattern: ${testPattern}`);
        }
      } catch (error) {
        this.medicalSafetyIssues.push(`Critical test pattern ${testPattern} failed to execute: ${error.message}`);
        allPassed = false;
        logError(`Failed to run tests for pattern: ${testPattern}`);
      }
    }
    
    return allPassed;
  }

  async runIntegrationTests() {
    logHeader('Running Integration Tests');
    
    try {
      execSync('pnpm test:unit --testPathPattern="integration"', { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      
      logSuccess('Integration tests completed');
      return true;
    } catch (error) {
      logError(`Integration tests failed: ${error.message}`);
      return false;
    }
  }

  async runE2ETests() {
    logHeader('Running End-to-End Tests');
    
    try {
      execSync('pnpm test:e2e', { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      
      logSuccess('E2E tests completed');
      return true;
    } catch (error) {
      logError(`E2E tests failed: ${error.message}`);
      return false;
    }
  }

  async checkCoverage() {
    logHeader('Checking Test Coverage');
    
    try {
      execSync('pnpm test:coverage', { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      
      // Check coverage thresholds
      const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
      
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const total = coverage.total;
        
        const thresholds = {
          lines: 75,
          functions: 75,
          branches: 75,
          statements: 75
        };
        
        let coveragePassed = true;
        
        for (const [metric, threshold] of Object.entries(thresholds)) {
          const actual = total[metric].pct;
          
          if (actual >= threshold) {
            logSuccess(`${metric}: ${actual}% (threshold: ${threshold}%)`);
          } else {
            logError(`${metric}: ${actual}% (below threshold: ${threshold}%)`);
            coveragePassed = false;
          }
        }
        
        return coveragePassed;
      } else {
        logWarning('Coverage report not found');
        return false;
      }
    } catch (error) {
      logError(`Coverage check failed: ${error.message}`);
      return false;
    }
  }

  async validateMedicalConfiguration() {
    logHeader('Validating Medical Configuration');
    
    // Check for critical medical validation files
    const requiredFiles = [
      'src/lib/tpnLegacy.ts',
      'tests/integration/tpn-calculations.test.ts',
      'tests/utils/test-helpers.ts'
    ];
    
    let allFilesExist = true;
    
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        logSuccess(`Required file exists: ${file}`);
      } else {
        logError(`Missing required file: ${file}`);
        allFilesExist = false;
      }
    }
    
    // Validate medical calculation constants
    try {
      const tpnLegacyPath = path.join(__dirname, '..', 'src', 'lib', 'tpnLegacy.ts');
      const tpnLegacyContent = fs.readFileSync(tpnLegacyPath, 'utf8');
      
      const requiredConstants = [
        'PERIPHERAL_OSMOLARITY_MAXIMUM',
        'DexPercent',
        'OsmoValue',
        'TotalVolume'
      ];
      
      for (const constant of requiredConstants) {
        if (tpnLegacyContent.includes(constant)) {
          logSuccess(`Medical constant defined: ${constant}`);
        } else {
          logWarning(`Medical constant may be missing: ${constant}`);
        }
      }
    } catch (error) {
      logError(`Error validating medical configuration: ${error.message}`);
      allFilesExist = false;
    }
    
    return allFilesExist;
  }

  generateReport() {
    logHeader('Test Summary Report');
    
    const totalTests = Object.values(this.results).reduce((sum, result) => sum + result.total, 0);
    const totalPassed = Object.values(this.results).reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = Object.values(this.results).reduce((sum, result) => sum + result.failed, 0);
    
    console.log(`
Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%\n`);
    
    // Medical safety issues
    if (this.medicalSafetyIssues.length > 0) {
      logError('\nMEDICAL SAFETY ISSUES DETECTED:');
      for (const issue of this.medicalSafetyIssues) {
        logError(`  • ${issue}`);
      }
      console.log('');
    }
    
    // Generate detailed report file
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      medicalSafetyIssues: this.medicalSafetyIssues,
      summary: {
        total: totalTests,
        passed: totalPassed,
        failed: totalFailed,
        successRate: ((totalPassed / totalTests) * 100).toFixed(1)
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    logInfo('Detailed report saved to test-report.json');
    
    return this.medicalSafetyIssues.length === 0 && totalFailed === 0;
  }

  async run() {
    logHeader('🧪 TPN Dynamic Text Testing Suite');
    logInfo('Testing medical TPN calculation and content management system');
    
    const results = {
      validation: await this.validateMedicalConfiguration(),
      unit: await this.runUnitTests(),
      medical: await this.runMedicalSafetyTests(),
      integration: await this.runIntegrationTests(),
      coverage: await this.checkCoverage()
    };
    
    // E2E tests are optional for CI/local development
    if (process.env.RUN_E2E === 'true' || process.argv.includes('--e2e')) {
      results.e2e = await this.runE2ETests();
    }
    
    const success = this.generateReport();
    
    if (success && Object.values(results).every(result => result)) {
      logSuccess('\n🎉 All tests passed! Medical safety validated.');
      process.exit(0);
    } else {
      logError('\n💥 Some tests failed. Please review and fix issues.');
      
      if (this.medicalSafetyIssues.length > 0) {
        logError('\n⚠️  CRITICAL: Medical safety issues detected. Do not deploy!');
      }
      
      process.exit(1);
    }
  }
}

// CLI entry point
if (process.argv[1] === __filename) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

export default TestRunner;