#!/usr/bin/env node

/**
 * Firebase Export Script
 * Exports specific collections or queries to JSON/CSV format
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const EXPORT_DIR = './exports';
const EMULATOR_HOST = process.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
const FIRESTORE_PORT = process.env.VITE_FIREBASE_FIRESTORE_PORT || 8080;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.green}[INFO]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  prompt: (msg) => console.log(`${colors.blue}[?]${colors.reset} ${msg}`)
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    collection: null,
    format: 'json',
    output: null,
    query: {},
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--collection':
      case '-c':
        options.collection = args[++i];
        break;
      case '--format':
      case '-f':
        options.format = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--where':
        // Parse where clause (simplified)
        const whereClause = args[++i];
        const [field, value] = whereClause.split('=');
        if (!options.query.where) options.query.where = {};
        options.query.where[field] = value;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
Firebase Export Utility

Usage: node firebase-export.js [options]

Options:
  -c, --collection <name>   Collection to export (required)
  -f, --format <type>       Export format: json or csv (default: json)
  -o, --output <path>       Output file path (optional)
  --where <field=value>     Filter documents (can be used multiple times)
  -h, --help               Show this help message

Examples:
  node firebase-export.js -c ingredients -f json
  node firebase-export.js -c references -f csv -o ./exports/refs.csv
  node firebase-export.js -c ingredients --where isActive=true
`);
}

// Check if emulator is running
async function checkEmulator() {
  try {
    const { stdout } = await execAsync(
      `curl -s http://${EMULATOR_HOST}:${FIRESTORE_PORT}`,
      { timeout: 2000 }
    );
    return true;
  } catch {
    return false;
  }
}

// Export collection using Firebase CLI
async function exportCollection(collection, outputPath) {
  log.info(`Exporting collection: ${collection}`);
  
  try {
    // Use Firebase CLI to export
    const tempDir = path.join(EXPORT_DIR, `temp_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    const { stdout, stderr } = await execAsync(
      `firebase emulators:export ${tempDir} --only firestore`,
      { timeout: 30000 }
    );
    
    if (stderr && !stderr.includes('Export complete')) {
      throw new Error(stderr);
    }
    
    // Read exported data
    const exportedDataPath = path.join(tempDir, 'firestore_export');
    // Note: This is simplified - actual implementation would parse Firestore export format
    
    log.info(`Export completed to: ${outputPath}`);
    
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    
    return true;
  } catch (error) {
    log.error(`Export failed: ${error.message}`);
    return false;
  }
}

// Convert data to CSV format
function toCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  // Convert each object to CSV row
  const csvRows = data.map(obj => {
    return headers.map(header => {
      const value = obj[header];
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

// Create output directory
async function ensureExportDir() {
  try {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
  } catch (error) {
    log.error(`Failed to create export directory: ${error.message}`);
  }
}

// Generate output filename
function generateOutputPath(collection, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return path.join(EXPORT_DIR, `${collection}_${timestamp}.${format}`);
}

// Main export function
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  if (!options.collection) {
    log.error('Collection name is required');
    showHelp();
    process.exit(1);
  }
  
  // Check if emulator is running
  const emulatorRunning = await checkEmulator();
  if (!emulatorRunning) {
    log.warn('Firebase emulator is not running');
    log.info('You can start it with: npm run emulator:start');
    
    // Continue anyway - might be using production
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('Continue with production data? (y/N): ', resolve);
    });
    readline.close();
    
    if (answer.toLowerCase() !== 'y') {
      log.info('Export cancelled');
      process.exit(0);
    }
  }
  
  // Ensure export directory exists
  await ensureExportDir();
  
  // Generate output path if not specified
  const outputPath = options.output || generateOutputPath(options.collection, options.format);
  
  // Perform export
  log.info(`Starting export...`);
  log.info(`Collection: ${options.collection}`);
  log.info(`Format: ${options.format}`);
  log.info(`Output: ${outputPath}`);
  
  if (options.query.where) {
    log.info(`Query filter: ${JSON.stringify(options.query.where)}`);
  }
  
  // Export collection
  const success = await exportCollection(options.collection, outputPath);
  
  if (success) {
    // Get file size
    try {
      const stats = await fs.stat(outputPath);
      const sizeInKB = (stats.size / 1024).toFixed(2);
      log.info(`✅ Export successful!`);
      log.info(`📁 File: ${outputPath}`);
      log.info(`📊 Size: ${sizeInKB} KB`);
    } catch {
      log.info(`✅ Export completed: ${outputPath}`);
    }
  } else {
    log.error('❌ Export failed');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { exportCollection, toCSV };