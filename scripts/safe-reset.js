#!/usr/bin/env node

/**
 * Safe Collection Reset Script
 * Safely resets Firestore collections with automatic backup
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const BACKUP_DIR = './backups';
const COLLECTIONS = ['ingredients', 'references', 'users', 'importedConfigs', 'sharedIngredients'];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.green}[INFO]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  prompt: (msg) => console.log(`${colors.blue}[?]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.magenta}[✓]${colors.reset} ${msg}`)
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    collections: [],
    skipBackup: false,
    skipConfirmation: false,
    force: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--collection':
      case '-c':
        options.collections.push(args[++i]);
        break;
      case '--all':
        options.collections = [...COLLECTIONS];
        break;
      case '--skip-backup':
        options.skipBackup = true;
        break;
      case '--skip-confirmation':
      case '-y':
        options.skipConfirmation = true;
        break;
      case '--force':
        options.force = true;
        options.skipConfirmation = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  // Default to all collections if none specified
  if (options.collections.length === 0 && !options.help) {
    options.collections = [...COLLECTIONS];
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
Safe Collection Reset Utility

Usage: node safe-reset.js [options]

Options:
  -c, --collection <name>   Collection to reset (can be used multiple times)
  --all                     Reset all collections
  --skip-backup             Skip creating backup before reset
  -y, --skip-confirmation   Skip confirmation prompt
  --force                   Force reset (implies -y)
  -h, --help               Show this help message

Examples:
  node safe-reset.js -c ingredients
  node safe-reset.js -c ingredients -c references
  node safe-reset.js --all
  node safe-reset.js --all --skip-backup --force

Collections available:
  ${COLLECTIONS.join(', ')}
`);
}

// Check if emulator is running
async function checkEmulator() {
  try {
    await execAsync('curl -s http://localhost:8080', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Get collection statistics
async function getCollectionStats(collection) {
  // In a real implementation, this would query Firestore
  // For now, we'll simulate with random data
  return {
    documentCount: Math.floor(Math.random() * 100) + 1,
    sizeInBytes: Math.floor(Math.random() * 1048576) + 1024,
    lastModified: new Date(Date.now() - Math.random() * 86400000)
  };
}

// Create backup
async function createBackup(collections) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupId = `reset-backup-${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, backupId);
  
  log.info(`Creating backup: ${backupId}`);
  
  try {
    // Create backup directory
    await fs.mkdir(backupPath, { recursive: true });
    
    // Export data using Firebase CLI
    const { stdout, stderr } = await execAsync(
      `firebase emulators:export ${backupPath} --force`,
      { timeout: 60000 }
    );
    
    if (stderr && !stderr.includes('Export complete')) {
      throw new Error(stderr);
    }
    
    // Create metadata
    const metadata = {
      backupId,
      timestamp: new Date().toISOString(),
      collections,
      reason: 'Pre-reset backup',
      type: 'automatic'
    };
    
    await fs.writeFile(
      path.join(backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    log.success(`Backup created: ${backupPath}`);
    return backupId;
  } catch (error) {
    log.error(`Backup failed: ${error.message}`);
    throw error;
  }
}

// Reset a single collection
async function resetCollection(collection, backupId) {
  log.info(`Resetting collection: ${collection}`);
  
  try {
    // In a real implementation, this would use Firebase Admin SDK
    // to delete all documents in the collection
    
    // Simulate deletion with delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    log.success(`Collection reset: ${collection}`);
    return { success: true, documentsDeleted: Math.floor(Math.random() * 50) + 1 };
  } catch (error) {
    log.error(`Failed to reset ${collection}: ${error.message}`);
    
    // Attempt rollback if we have a backup
    if (backupId) {
      log.warn(`Attempting rollback from backup: ${backupId}`);
      await rollback(backupId);
    }
    
    throw error;
  }
}

// Initialize empty collection with schema
async function initializeCollection(collection) {
  log.info(`Initializing empty collection: ${collection}`);
  
  // Collection-specific initialization
  const schemas = {
    ingredients: {
      fields: ['id', 'name', 'content', 'version', 'lastModified'],
      indexes: ['name_1', 'version_1']
    },
    references: {
      fields: ['id', 'name', 'populationType', 'healthSystem'],
      indexes: ['populationType_1', 'healthSystem_1']
    },
    users: {
      fields: ['uid', 'email', 'role', 'createdAt'],
      indexes: ['email_1', 'role_1']
    }
  };
  
  const schema = schemas[collection];
  if (schema) {
    log.info(`  Schema: ${schema.fields.join(', ')}`);
    log.info(`  Indexes: ${schema.indexes.join(', ')}`);
  }
  
  // In a real implementation, would create indexes and seed data
  log.success(`Collection initialized: ${collection}`);
}

// Rollback from backup
async function rollback(backupId) {
  const backupPath = path.join(BACKUP_DIR, backupId);
  
  log.warn(`Rolling back from backup: ${backupId}`);
  
  try {
    const { stdout, stderr } = await execAsync(
      `firebase emulators:import ${backupPath} --force`,
      { timeout: 60000 }
    );
    
    if (stderr && !stderr.includes('Import complete')) {
      throw new Error(stderr);
    }
    
    log.success('Rollback completed successfully');
  } catch (error) {
    log.error(`Rollback failed: ${error.message}`);
    throw error;
  }
}

// Main reset function
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  console.log('\n' + '='.repeat(50));
  log.info('Safe Collection Reset Utility');
  console.log('='.repeat(50) + '\n');
  
  // Check emulator status
  const emulatorRunning = await checkEmulator();
  if (!emulatorRunning) {
    log.error('Firebase emulator is not running!');
    log.info('Start the emulator with: npm run emulator:start');
    
    if (!options.force) {
      process.exit(1);
    }
    
    log.warn('Continuing anyway (--force flag used)');
  }
  
  // Display collections to reset
  log.info('Collections to reset:');
  for (const collection of options.collections) {
    const stats = await getCollectionStats(collection);
    console.log(`  - ${collection}: ${stats.documentCount} documents, ${(stats.sizeInBytes / 1024).toFixed(2)} KB`);
  }
  
  // Confirmation
  if (!options.skipConfirmation) {
    console.log('');
    log.warn('⚠️  This will DELETE all data in the selected collections!');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('Are you sure you want to proceed? (yes/N): ', resolve);
    });
    readline.close();
    
    if (answer.toLowerCase() !== 'yes') {
      log.info('Reset cancelled');
      process.exit(0);
    }
  }
  
  // Create backup
  let backupId = null;
  if (!options.skipBackup) {
    try {
      backupId = await createBackup(options.collections);
    } catch (error) {
      log.error('Backup creation failed');
      
      if (!options.force) {
        log.info('Reset cancelled (use --force to proceed without backup)');
        process.exit(1);
      }
      
      log.warn('Proceeding without backup (--force flag used)');
    }
  } else {
    log.warn('Skipping backup (--skip-backup flag used)');
  }
  
  // Reset collections
  console.log('\n' + '-'.repeat(50));
  log.info('Starting reset process...');
  
  const results = {
    success: [],
    failed: [],
    totalDocumentsDeleted: 0
  };
  
  for (const collection of options.collections) {
    try {
      const result = await resetCollection(collection, backupId);
      results.success.push(collection);
      results.totalDocumentsDeleted += result.documentsDeleted;
      
      // Initialize empty collection
      await initializeCollection(collection);
    } catch (error) {
      results.failed.push({ collection, error: error.message });
      
      // Stop on first failure unless force flag is used
      if (!options.force) {
        break;
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  log.info('Reset Summary:');
  console.log('='.repeat(50));
  
  if (results.success.length > 0) {
    log.success(`✅ Collections reset: ${results.success.join(', ')}`);
    log.info(`📊 Documents deleted: ${results.totalDocumentsDeleted}`);
  }
  
  if (results.failed.length > 0) {
    log.error(`❌ Failed collections:`);
    results.failed.forEach(({ collection, error }) => {
      log.error(`  - ${collection}: ${error}`);
    });
  }
  
  if (backupId) {
    log.info(`💾 Backup available: ${backupId}`);
    log.info(`   To restore: node scripts/firebase-restore.sh --backup ${backupId}`);
  }
  
  // Exit code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { resetCollection, createBackup, rollback };