#!/usr/bin/env node

/**
 * CLI Migration Script
 * 
 * Migrates config-centric data to ingredient-centric structure
 * 
 * Usage:
 *   pnpm migrate                    # Run migration
 *   pnpm migrate --dry-run          # Preview changes without applying
 *   pnpm migrate --verify           # Verify data integrity after migration
 *   pnpm migrate --checkpoint <id>  # Resume from checkpoint
 *   pnpm migrate --rollback <id>    # Rollback to checkpoint
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { program } from 'commander';
import { migrationService } from '../src/lib/services/migrationService';
import type { MigrationProgress } from '../src/lib/services/migrationService';
import chalk from 'chalk';
import ora from 'ora';

// Configure command line interface
program
  .name('migrate-to-ingredients')
  .description('Migrate config-centric data to ingredient-centric structure')
  .version('1.0.0')
  .option('--dry-run', 'Run without making changes (preview mode)')
  .option('--verify', 'Verify data integrity after migration')
  .option('--checkpoint <id>', 'Resume from checkpoint')
  .option('--rollback <id>', 'Rollback to checkpoint')
  .option('--batch-size <size>', 'Number of configs to process at once', '10')
  .option('--verbose', 'Show detailed progress information')
  .parse(process.argv);

const options = program.opts();

// Progress bar helper
class ProgressBar {
  private spinner: any;
  private lastMessage: string = '';

  constructor() {
    this.spinner = ora('Starting migration...').start();
  }

  update(progress: MigrationProgress) {
    const bar = this.createBar(progress.percentage);
    const message = `${bar} ${progress.percentage}% (${progress.current}/${progress.total}) - ${progress.message}`;
    
    if (options.verbose || message !== this.lastMessage) {
      this.spinner.text = message;
      this.lastMessage = message;
    }
  }

  private createBar(percentage: number): string {
    const width = 30;
    const filled = Math.round((width * percentage) / 100);
    const empty = width - filled;
    return chalk.blue('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  succeed(message: string) {
    this.spinner.succeed(chalk.green(message));
  }

  fail(message: string) {
    this.spinner.fail(chalk.red(message));
  }

  info(message: string) {
    this.spinner.info(chalk.cyan(message));
  }
}

// Main migration function
async function main() {
  const progressBar = new ProgressBar();

  try {
    // Handle rollback
    if (options.rollback) {
      progressBar.info(`Rolling back to checkpoint: ${options.rollback}`);
      await migrationService.rollback(options.rollback);
      progressBar.succeed('Rollback completed successfully');
      process.exit(0);
    }

    // Handle dry-run analysis
    if (options.dryRun) {
      progressBar.info('Running analysis in dry-run mode...');
      const analysis = await migrationService.analyze({ dryRun: true });
      
      progressBar.succeed('Analysis complete');
      console.log(chalk.cyan('\n📊 Migration Analysis:'));
      console.log(chalk.white(`  • Would create: ${chalk.yellow(analysis.wouldCreate)} ingredients`));
      console.log(chalk.white(`  • Would update: ${chalk.yellow(analysis.wouldUpdate)} configs`));
      
      if (analysis.duplicatesFound) {
        console.log(chalk.white(`  • Duplicates found: ${chalk.green(analysis.duplicatesFound)} (will be deduplicated)`));
        
        if (analysis.estimatedSavings) {
          console.log(chalk.white(`  • Estimated savings: ${chalk.green(analysis.estimatedSavings)}`));
        }
      }
      
      console.log(chalk.gray('\nRun without --dry-run to apply changes'));
      process.exit(0);
    }

    // Handle checkpoint resume
    if (options.checkpoint) {
      progressBar.info(`Resuming from checkpoint: ${options.checkpoint}`);
      const result = await migrationService.resume(options.checkpoint);
      
      if (result.success) {
        progressBar.succeed(`Migration resumed and completed successfully`);
        printResults(result);
      } else {
        progressBar.fail('Migration resume failed');
        printErrors(result.errors);
      }
      process.exit(result.success ? 0 : 1);
    }

    // Normal migration
    progressBar.info('Starting migration...');
    
    const result = await migrationService.migrate({
      dryRun: false,
      verify: options.verify,
      batchSize: parseInt(options.batchSize),
      onProgress: (progress) => progressBar.update(progress)
    });

    // Display results
    if (result.success) {
      progressBar.succeed('Migration completed successfully!');
      printResults(result);
      
      // Show verification results if requested
      if (options.verify && result.verification) {
        console.log(chalk.cyan('\n✅ Verification Results:'));
        console.log(chalk.white(`  • Configs match: ${result.verification.configsMatch ? chalk.green('✓') : chalk.red('✗')}`));
        console.log(chalk.white(`  • Ingredients preserved: ${result.verification.ingredientsMatch ? chalk.green('✓') : chalk.red('✗')}`));
        console.log(chalk.white(`  • No data loss: ${result.verification.details.noDataLoss ? chalk.green('✓') : chalk.red('✗')}`));
      }
    } else {
      progressBar.fail('Migration failed');
      
      if (result.checkpoint) {
        console.log(chalk.yellow(`\n⚠️ Checkpoint saved: ${result.checkpoint}`));
        console.log(chalk.gray(`Run with --checkpoint ${result.checkpoint} to resume`));
      }
      
      printErrors(result.errors);
      process.exit(1);
    }

  } catch (error) {
    progressBar.fail('Migration error');
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
    
    if (options.verbose && error instanceof Error) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

// Helper to print results
function printResults(result: any) {
  console.log(chalk.cyan('\n📈 Migration Results:'));
  console.log(chalk.white(`  • Ingredients created: ${chalk.green(result.ingredientsCreated)}`));
  console.log(chalk.white(`  • Manifests created: ${chalk.green(result.manifestsCreated)}`));
  
  if (result.completed) {
    console.log(chalk.green('\n✨ All data successfully migrated!'));
  } else {
    console.log(chalk.yellow('\n⚠️ Migration partially complete'));
  }
}

// Helper to print errors
function printErrors(errors?: string[]) {
  if (errors && errors.length > 0) {
    console.log(chalk.red('\n❌ Errors:'));
    errors.forEach(error => {
      console.log(chalk.red(`  • ${error}`));
    });
  }
}

// Add helper information
if (!process.argv.slice(2).length) {
  program.outputHelp();
  console.log(chalk.cyan('\nExamples:'));
  console.log(chalk.gray('  $ pnpm migrate --dry-run           # Preview changes'));
  console.log(chalk.gray('  $ pnpm migrate                      # Run migration'));
  console.log(chalk.gray('  $ pnpm migrate --verify             # Migrate with verification'));
  console.log(chalk.gray('  $ pnpm migrate --rollback <id>      # Rollback to checkpoint'));
  process.exit(0);
}

// Run the migration
main().catch((error) => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});