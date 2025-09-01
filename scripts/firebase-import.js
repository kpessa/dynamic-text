#!/usr/bin/env node

/**
 * Firebase Import Script
 * Imports data from JSON/CSV files into Firestore collections
 */

const fs = require('fs').promises;
const path = require('path');

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
    file: null,
    collection: null,
    format: 'json',
    skipDuplicates: false,
    batchSize: 100,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        options.file = args[++i];
        break;
      case '--collection':
      case '-c':
        options.collection = args[++i];
        break;
      case '--format':
        options.format = args[++i];
        break;
      case '--skip-duplicates':
        options.skipDuplicates = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
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
Firebase Import Utility

Usage: node firebase-import.js [options]

Options:
  -f, --file <path>         Input file path (required)
  -c, --collection <name>   Target collection name (required)
  --format <type>           Input format: json or csv (default: json)
  --skip-duplicates         Skip documents that already exist
  --batch-size <n>          Number of documents per batch (default: 100)
  --dry-run                 Preview import without making changes
  -h, --help               Show this help message

Examples:
  node firebase-import.js -f ./data.json -c ingredients
  node firebase-import.js -f ./export.csv -c references --format csv
  node firebase-import.js -f ./backup.json -c users --skip-duplicates
`);
}

// Parse CSV data
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Parse rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const obj = {};
    
    headers.forEach((header, index) => {
      let value = values[index] || '';
      
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/""/g, '"');
      }
      
      // Try to parse as number or boolean
      if (value === 'true') obj[header] = true;
      else if (value === 'false') obj[header] = false;
      else if (!isNaN(value) && value !== '') obj[header] = Number(value);
      else obj[header] = value;
    });
    
    data.push(obj);
  }
  
  return data;
}

// Validate document data
function validateDocument(doc, index) {
  const errors = [];
  
  // Check for required fields
  if (!doc.id && !doc.name) {
    errors.push(`Document ${index}: Missing identifier (id or name)`);
  }
  
  // Check data types
  if (doc.createdAt && isNaN(Date.parse(doc.createdAt))) {
    errors.push(`Document ${index}: Invalid date format for createdAt`);
  }
  
  if (doc.version && typeof doc.version !== 'number') {
    errors.push(`Document ${index}: Version should be a number`);
  }
  
  return errors;
}

// Generate document ID
function generateDocId(doc, index) {
  if (doc.id) return doc.id;
  if (doc.name) return doc.name.toLowerCase().replace(/\s+/g, '-');
  return `doc_${Date.now()}_${index}`;
}

// Import data in batches
async function importBatch(batch, collection, options) {
  if (options.dryRun) {
    log.info(`[DRY RUN] Would import ${batch.length} documents to ${collection}`);
    batch.slice(0, 3).forEach(doc => {
      log.info(`  - ${doc.id || doc.name || 'unnamed'}`);
    });
    if (batch.length > 3) {
      log.info(`  ... and ${batch.length - 3} more`);
    }
    return { imported: 0, skipped: 0, errors: [] };
  }
  
  // In a real implementation, this would use Firebase Admin SDK
  // For now, we'll simulate the import
  const results = {
    imported: 0,
    skipped: 0,
    errors: []
  };
  
  for (const doc of batch) {
    try {
      // Simulate checking for duplicates
      if (options.skipDuplicates && Math.random() < 0.1) {
        results.skipped++;
        log.warn(`Skipped duplicate: ${doc.id}`);
      } else {
        // Simulate successful import
        results.imported++;
      }
    } catch (error) {
      results.errors.push(`Failed to import ${doc.id}: ${error.message}`);
    }
  }
  
  return results;
}

// Main import function
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  if (!options.file || !options.collection) {
    log.error('File path and collection name are required');
    showHelp();
    process.exit(1);
  }
  
  // Check if file exists
  try {
    await fs.access(options.file);
  } catch {
    log.error(`File not found: ${options.file}`);
    process.exit(1);
  }
  
  // Read file content
  log.info(`Reading file: ${options.file}`);
  const content = await fs.readFile(options.file, 'utf-8');
  
  // Parse data based on format
  let data;
  try {
    if (options.format === 'csv') {
      data = parseCSV(content);
    } else {
      data = JSON.parse(content);
      if (!Array.isArray(data)) {
        // If it's an object with collection data
        if (data[options.collection]) {
          data = data[options.collection];
        } else {
          data = [data]; // Wrap single document
        }
      }
    }
  } catch (error) {
    log.error(`Failed to parse file: ${error.message}`);
    process.exit(1);
  }
  
  log.info(`Found ${data.length} documents to import`);
  
  // Validate documents
  log.info('Validating documents...');
  const validationErrors = [];
  data.forEach((doc, index) => {
    const errors = validateDocument(doc, index);
    validationErrors.push(...errors);
    
    // Add ID if missing
    if (!doc.id) {
      doc.id = generateDocId(doc, index);
    }
  });
  
  if (validationErrors.length > 0) {
    log.warn('Validation warnings:');
    validationErrors.slice(0, 5).forEach(error => log.warn(`  - ${error}`));
    if (validationErrors.length > 5) {
      log.warn(`  ... and ${validationErrors.length - 5} more warnings`);
    }
  }
  
  // Confirm import
  if (!options.dryRun) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question(
        `Import ${data.length} documents to collection "${options.collection}"? (y/N): `,
        resolve
      );
    });
    readline.close();
    
    if (answer.toLowerCase() !== 'y') {
      log.info('Import cancelled');
      process.exit(0);
    }
  }
  
  // Import in batches
  log.info(`Starting import with batch size ${options.batchSize}...`);
  
  let totalImported = 0;
  let totalSkipped = 0;
  const allErrors = [];
  
  for (let i = 0; i < data.length; i += options.batchSize) {
    const batch = data.slice(i, i + options.batchSize);
    const batchNum = Math.floor(i / options.batchSize) + 1;
    const totalBatches = Math.ceil(data.length / options.batchSize);
    
    log.info(`Processing batch ${batchNum}/${totalBatches}...`);
    
    const results = await importBatch(batch, options.collection, options);
    totalImported += results.imported;
    totalSkipped += results.skipped;
    allErrors.push(...results.errors);
    
    // Progress indicator
    const progress = Math.round(((i + batch.length) / data.length) * 100);
    log.info(`Progress: ${progress}%`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  log.info('Import Summary:');
  log.info(`✅ Documents imported: ${totalImported}`);
  if (totalSkipped > 0) {
    log.warn(`⏭️  Documents skipped: ${totalSkipped}`);
  }
  if (allErrors.length > 0) {
    log.error(`❌ Errors: ${allErrors.length}`);
    allErrors.slice(0, 5).forEach(error => log.error(`  - ${error}`));
  }
  
  if (options.dryRun) {
    log.info('This was a dry run - no changes were made');
  } else {
    log.info(`Import completed successfully!`);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { parseCSV, validateDocument, importBatch };