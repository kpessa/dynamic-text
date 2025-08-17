#!/usr/bin/env node

/**
 * Continuous Development Server Monitor
 * Watches the dev server and reports issues in real-time
 */

import { spawn } from 'child_process';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { watch } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Configuration
const CONFIG = {
  port: 5173,
  host: 'localhost',
  checkInterval: 5000, // Check server health every 5 seconds
  errorPatterns: [
    /Failed to resolve import/i,
    /ReferenceError:/i,
    /TypeError:/i,
    /SyntaxError:/i,
    /Cannot find module/i,
    /is not defined/i,
    /Uncaught/i
  ],
  warningPatterns: [
    /warning:/i,
    /deprecated/i,
    /\[HMR\]/i
  ],
  watchPaths: [
    'src',
    'package.json',
    'vite.config.js',
    'tsconfig.json'
  ]
};

class DevServerMonitor {
  constructor() {
    this.server = null;
    this.isHealthy = true;
    this.lastHealthCheck = Date.now();
    this.errorCount = 0;
    this.warningCount = 0;
    this.restartCount = 0;
    this.compilationErrors = [];
    this.runtimeErrors = [];
    this.healthCheckInterval = null;
    this.fileWatchers = [];
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toTimeString().split(' ')[0];
    console.log(`${colors.gray}[${timestamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`);
  }

  async checkServerHealth() {
    const url = `http://${CONFIG.host}:${CONFIG.port}`;
    
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 2000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  parseServerOutput(data) {
    const output = data.toString();
    const lines = output.split('\n').filter(Boolean);
    
    lines.forEach(line => {
      // Check for errors
      const hasError = CONFIG.errorPatterns.some(pattern => pattern.test(line));
      if (hasError) {
        this.errorCount++;
        this.compilationErrors.push({
          message: line,
          timestamp: new Date()
        });
        this.log(`ERROR: ${line}`, 'red');
        return;
      }
      
      // Check for warnings
      const hasWarning = CONFIG.warningPatterns.some(pattern => pattern.test(line));
      if (hasWarning) {
        this.warningCount++;
        this.log(`WARN: ${line}`, 'yellow');
        return;
      }
      
      // Pass through normal output
      console.log(line);
    });
  }

  async startServer() {
    this.log('Starting Vite dev server...', 'blue');
    
    this.server = spawn('pnpm', ['dev'], {
      cwd: rootDir,
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    this.server.stdout.on('data', (data) => {
      this.parseServerOutput(data);
    });
    
    this.server.stderr.on('data', (data) => {
      this.parseServerOutput(data);
    });
    
    this.server.on('error', (error) => {
      this.log(`Server process error: ${error.message}`, 'red');
      this.isHealthy = false;
    });
    
    this.server.on('exit', (code, signal) => {
      if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
        this.log(`Server exited unexpectedly with code ${code}`, 'red');
        this.isHealthy = false;
        
        // Auto-restart on unexpected exit
        if (this.restartCount < 3) {
          this.restartCount++;
          this.log(`Attempting restart (${this.restartCount}/3)...`, 'yellow');
          setTimeout(() => this.startServer(), 2000);
        } else {
          this.log('Max restart attempts reached. Manual intervention required.', 'red');
        }
      }
    });
    
    // Wait for server to be ready
    await this.waitForServer();
  }

  async waitForServer(maxWait = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const healthy = await this.checkServerHealth();
      if (healthy) {
        this.log('✓ Server is ready', 'green');
        this.isHealthy = true;
        this.restartCount = 0; // Reset restart counter on successful start
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.log('Server failed to start within timeout', 'red');
    return false;
  }

  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      const healthy = await this.checkServerHealth();
      const now = Date.now();
      
      if (healthy && !this.isHealthy) {
        // Server recovered
        this.log('✓ Server recovered', 'green');
        this.isHealthy = true;
      } else if (!healthy && this.isHealthy) {
        // Server went down
        this.log('✗ Server is not responding', 'red');
        this.isHealthy = false;
      }
      
      this.lastHealthCheck = now;
    }, CONFIG.checkInterval);
  }

  async startFileWatching() {
    this.log('Starting file watchers...', 'cyan');
    
    for (const watchPath of CONFIG.watchPaths) {
      const fullPath = join(rootDir, watchPath);
      
      try {
        const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
          if (filename) {
            // Ignore node_modules and build artifacts
            if (filename.includes('node_modules') || 
                filename.includes('dist') || 
                filename.includes('.git')) {
              return;
            }
            
            this.log(`File ${eventType}: ${filename}`, 'gray');
            
            // Track specific file types
            if (filename.endsWith('.ts') || filename.endsWith('.svelte')) {
              // TypeScript/Svelte files changed - expect recompilation
              this.compilationErrors = []; // Clear old errors
            }
          }
        });
        
        this.fileWatchers.push(watcher);
      } catch (error) {
        this.log(`Failed to watch ${watchPath}: ${error.message}`, 'yellow');
      }
    }
  }

  showStatus() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    console.log('\n' + '═'.repeat(50));
    console.log('📊 DEV SERVER STATUS');
    console.log('─'.repeat(50));
    console.log(`Status:     ${this.isHealthy ? '🟢 Healthy' : '🔴 Unhealthy'}`);
    console.log(`Uptime:     ${hours}h ${minutes}m ${seconds}s`);
    console.log(`Errors:     ${this.errorCount}`);
    console.log(`Warnings:   ${this.warningCount}`);
    console.log(`Restarts:   ${this.restartCount}`);
    console.log(`URL:        http://${CONFIG.host}:${CONFIG.port}`);
    console.log('═'.repeat(50) + '\n');
  }

  async start() {
    this.startTime = Date.now();
    
    console.log('🚀 DEV SERVER CONTINUOUS MONITOR');
    console.log('═'.repeat(50));
    console.log('Monitoring configuration:');
    console.log(`  Port:           ${CONFIG.port}`);
    console.log(`  Health checks:  Every ${CONFIG.checkInterval / 1000}s`);
    console.log(`  Watch paths:    ${CONFIG.watchPaths.join(', ')}`);
    console.log('═'.repeat(50) + '\n');
    
    // Start the dev server
    await this.startServer();
    
    // Start monitoring
    this.startHealthMonitoring();
    await this.startFileWatching();
    
    // Show status periodically
    setInterval(() => this.showStatus(), 60000); // Every minute
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    
    // Handle keyboard input for interactive commands
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.on('data', (key) => {
        const char = key.toString();
        
        switch (char) {
          case 's': // Show status
            this.showStatus();
            break;
          case 'r': // Restart server
            this.log('Restarting server...', 'yellow');
            this.restartServer();
            break;
          case 'c': // Clear console
            console.clear();
            break;
          case 'q': // Quit
          case '\x03': // Ctrl+C
            this.shutdown();
            break;
          case 'h': // Help
            console.log('\n📖 COMMANDS:');
            console.log('  s - Show status');
            console.log('  r - Restart server');
            console.log('  c - Clear console');
            console.log('  h - Show this help');
            console.log('  q - Quit\n');
            break;
        }
      });
    }
    
    this.log('Monitor started. Press \'h\' for help, \'q\' to quit.', 'cyan');
  }

  async restartServer() {
    if (this.server) {
      this.server.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await this.startServer();
  }

  shutdown() {
    this.log('\nShutting down monitor...', 'yellow');
    
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Stop file watchers
    this.fileWatchers.forEach(watcher => watcher.close());
    
    // Stop server
    if (this.server) {
      this.server.kill('SIGTERM');
    }
    
    // Show final stats
    this.showStatus();
    
    this.log('Monitor stopped.', 'cyan');
    process.exit(0);
  }
}

// Start the monitor
const monitor = new DevServerMonitor();
monitor.start().catch(error => {
  console.error('Failed to start monitor:', error);
  process.exit(1);
});