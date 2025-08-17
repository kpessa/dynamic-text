#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import net from 'net';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);
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
  cyan: '\x1b[36m'
};

// Configuration
const CONFIG = {
  port: 5173,
  host: 'localhost',
  timeout: 30000, // 30 seconds max wait
  checkInterval: 1000, // Check every second
  criticalFiles: [
    'src/main.ts',
    'src/App.svelte',
    'src/lib/firebase.ts',
    'src/stores/uiStore.svelte.ts'
  ],
  requiredDependencies: [
    'svelte',
    'vite',
    'firebase',
    'codemirror'
  ]
};

// Logging utilities
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

// Utility functions
async function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is in use
      } else {
        resolve(true); // Port is available
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true); // Port is available
    });
    server.listen(port);
  });
}

async function killProcessOnPort(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pids = stdout.trim().split('\n').filter(Boolean);
    for (const pid of pids) {
      await execAsync(`kill -9 ${pid}`);
    }
    return true;
  } catch (error) {
    // No process found on port
    return false;
  }
}

async function httpGet(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);
    
    http.get(url, (res) => {
      clearTimeout(timer);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function waitForServer(url, maxWait = CONFIG.timeout) {
  const startTime = Date.now();
  process.stdout.write('Waiting for server');
  
  while (Date.now() - startTime < maxWait) {
    try {
      const response = await httpGet(url, 2000);
      if (response.status === 200) {
        process.stdout.write('\n');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, CONFIG.checkInterval));
  }
  
  process.stdout.write('\n');
  return false;
}

// Health check functions
async function checkDependencies() {
  logInfo('Checking dependencies...');
  const missingDeps = [];
  
  try {
    const packageJson = JSON.parse(await fs.readFile(join(rootDir, 'package.json'), 'utf-8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const dep of CONFIG.requiredDependencies) {
      if (!allDeps[dep]) {
        missingDeps.push(dep);
      }
    }
    
    if (missingDeps.length > 0) {
      logError(`Missing required dependencies: ${missingDeps.join(', ')}`);
      return false;
    }
    
    // Check if node_modules exists
    try {
      await fs.access(join(rootDir, 'node_modules'));
    } catch {
      logError('node_modules not found. Run "pnpm install" first.');
      return false;
    }
    
    logSuccess('All dependencies installed');
    return true;
  } catch (error) {
    logError(`Failed to check dependencies: ${error.message}`);
    return false;
  }
}

async function checkCriticalFiles() {
  logInfo('Checking critical files...');
  const missingFiles = [];
  
  for (const file of CONFIG.criticalFiles) {
    try {
      await fs.access(join(rootDir, file));
    } catch {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    logError(`Missing critical files: ${missingFiles.join(', ')}`);
    return false;
  }
  
  logSuccess('All critical files present');
  return true;
}

async function checkTypeScript() {
  logInfo('Running TypeScript check...');
  
  try {
    const { stdout, stderr } = await execAsync('pnpm run typecheck', { cwd: rootDir });
    if (stderr && !stderr.includes('Done in')) {
      throw new Error(stderr);
    }
    logSuccess('TypeScript compilation successful');
    return true;
  } catch (error) {
    logError('TypeScript compilation errors found');
    console.error(error.stdout || error.stderr || error.message);
    return false;
  }
}

async function checkSvelte() {
  logInfo('Running Svelte check...');
  
  try {
    const { stdout, stderr } = await execAsync('pnpm run check', { cwd: rootDir });
    // Svelte check may have warnings but still succeed
    if (stderr && stderr.includes('error')) {
      throw new Error(stderr);
    }
    logSuccess('Svelte compilation successful');
    return true;
  } catch (error) {
    logError('Svelte compilation errors found');
    console.error(error.stdout || error.stderr || error.message);
    return false;
  }
}

async function quickHealthCheck() {
  const url = `http://${CONFIG.host}:${CONFIG.port}`;
  
  try {
    const response = await httpGet(url, 2000);
    if (response.status === 200) {
      logSuccess(`Dev server is running at ${url}`);
      
      // Check for common issues
      if (!response.data.includes('app')) {
        logWarning('Main app element not found in response');
      }
      
      // Try to fetch Vite client
      try {
        const viteClient = await httpGet(`${url}/@vite/client`, 2000);
        if (viteClient.status === 200) {
          logSuccess('Vite HMR client is accessible');
        }
      } catch {
        logWarning('Vite HMR client not accessible');
      }
      
      return true;
    } else {
      logError(`Server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Dev server is not running at ${url}`);
    return false;
  }
}

async function startDevServer(skipChecks = false) {
  log('\n🚀 Starting development server health check...', 'blue');
  console.log('');
  
  // Pre-flight checks
  if (!skipChecks) {
    const checks = await Promise.all([
      checkDependencies(),
      checkCriticalFiles()
    ]);
    
    if (checks.some(result => !result)) {
      log('\n❌ Pre-flight checks failed. Fix the issues above and try again.', 'red');
      process.exit(1);
    }
    
    // Run compile checks sequentially as they may conflict
    const tsCheck = await checkTypeScript();
    const svelteCheck = await checkSvelte();
    
    if (!tsCheck || !svelteCheck) {
      log('\n❌ Compilation checks failed. Fix the issues above and try again.', 'red');
      process.exit(1);
    }
  }
  
  // Check port availability
  logInfo(`Checking port ${CONFIG.port}...`);
  const portAvailable = await checkPort(CONFIG.port);
  
  if (!portAvailable) {
    logWarning(`Port ${CONFIG.port} is in use`);
    logInfo('Attempting to free port...');
    const killed = await killProcessOnPort(CONFIG.port);
    if (killed) {
      logSuccess('Port freed successfully');
    } else {
      logError('Could not free port');
      process.exit(1);
    }
  } else {
    logSuccess(`Port ${CONFIG.port} is available`);
  }
  
  // Start the dev server
  log('\n📦 Starting Vite dev server...', 'blue');
  console.log('');
  
  const devServer = spawn('pnpm', ['dev'], {
    cwd: rootDir,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  
  // Capture and display server output
  devServer.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  devServer.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  devServer.on('error', (error) => {
    logError(`Failed to start dev server: ${error.message}`);
    process.exit(1);
  });
  
  // Wait for server to be ready
  const serverUrl = `http://${CONFIG.host}:${CONFIG.port}`;
  const serverReady = await waitForServer(serverUrl);
  
  if (!serverReady) {
    logError('Server failed to start within timeout');
    devServer.kill();
    process.exit(1);
  }
  
  logSuccess('Server is responding');
  
  // Perform runtime checks
  log('\n🔍 Performing runtime checks...', 'blue');
  console.log('');
  
  try {
    // Check main page loads
    const mainPage = await httpGet(serverUrl);
    if (!mainPage.data.includes('app')) {
      logWarning('Main app element not found in HTML');
    } else {
      logSuccess('Main app element found');
    }
    
    // Check for Vite client
    const viteClient = await httpGet(`${serverUrl}/@vite/client`);
    if (viteClient.status !== 200) {
      throw new Error('Vite client not loading');
    }
    logSuccess('Vite HMR client loaded');
    
    // Check main.ts loads
    if (!mainPage.data.includes('main.ts')) {
      logWarning('main.ts not referenced in HTML');
    } else {
      logSuccess('main.ts module loaded');
    }
    
  } catch (error) {
    logError(`Runtime check failed: ${error.message}`);
    devServer.kill();
    process.exit(1);
  }
  
  // Success!
  log('\n✅ Dev server is running successfully!', 'green');
  console.log('');
  log(`   🌐 Local:    ${serverUrl}`, 'cyan');
  log(`   📱 Network:  http://${getNetworkAddress()}:${CONFIG.port}`, 'cyan');
  console.log('');
  logInfo('Press Ctrl+C to stop the server\n');
  
  // Keep the server running
  process.on('SIGINT', () => {
    log('\n\n👋 Shutting down dev server...', 'yellow');
    devServer.kill();
    process.exit(0);
  });
}

function getNetworkAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'quick':
    // Quick health check of running server
    quickHealthCheck().then(healthy => {
      process.exit(healthy ? 0 : 1);
    });
    break;
    
  case 'check':
    // Just run checks without starting server
    log('🔍 Running health checks only...', 'blue');
    console.log('');
    
    Promise.all([
      checkDependencies(),
      checkCriticalFiles(),
      checkTypeScript(),
      checkSvelte()
    ]).then(results => {
      if (results.every(result => result)) {
        log('\n✅ All checks passed!', 'green');
        process.exit(0);
      } else {
        log('\n❌ Some checks failed.', 'red');
        process.exit(1);
      }
    });
    break;
    
  case 'start':
    // Start with all checks
    startDevServer(false);
    break;
    
  case 'start-quick':
    // Start without checks
    startDevServer(true);
    break;
    
  default:
    // Show usage
    console.log('Usage: node scripts/health-check.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  quick         - Quick health check of running server');
    console.log('  check         - Run all checks without starting server');
    console.log('  start         - Start server with all health checks');
    console.log('  start-quick   - Start server without checks');
    console.log('');
    console.log('If no command is provided, defaults to "start"');
    
    if (!command) {
      console.log('');
      startDevServer(false);
    }
}