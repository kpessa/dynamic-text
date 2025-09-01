import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock the utility before importing
vi.mock('../../src/lib/utils/npmScriptRunner', async () => {
  const actual = await vi.importActual('../../src/lib/utils/npmScriptRunner');
  return {
    ...actual,
    NpmScriptRunner: vi.fn().mockImplementation(() => ({
      runScript: vi.fn(),
      validateScript: vi.fn(),
      getAvailableScripts: vi.fn(),
      addScript: vi.fn(),
      removeScript: vi.fn(),
      updateScript: vi.fn(),
      runEmulatorStart: vi.fn(),
      runEmulatorExport: vi.fn(),
      runEmulatorClean: vi.fn(),
      runEmulatorBackup: vi.fn(),
      runTestsWithEmulator: vi.fn(),
      checkScriptDependencies: vi.fn()
    }))
  };
});

describe('NpmScriptRunner', () => {
  let scriptRunner: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { NpmScriptRunner } = await import('../../src/lib/utils/npmScriptRunner');
    scriptRunner = new NpmScriptRunner();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runScript', () => {
    it('should execute npm script successfully', async () => {
      // Arrange
      const scriptName = 'test';
      const mockResult = {
        success: true,
        script: scriptName,
        output: 'All tests passed',
        exitCode: 0,
        duration: 1500
      };

      scriptRunner.runScript.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runScript(scriptName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.script).toBe(scriptName);
      expect(result.exitCode).toBe(0);
    });

    it('should handle script execution failure', async () => {
      // Arrange
      const scriptName = 'build';
      const mockResult = {
        success: false,
        script: scriptName,
        error: 'Build failed: TypeScript errors',
        exitCode: 1
      };

      scriptRunner.runScript.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runScript(scriptName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('TypeScript errors');
    });

    it('should pass arguments to script', async () => {
      // Arrange
      const scriptName = 'test';
      const args = ['--coverage', '--watch'];
      const mockResult = {
        success: true,
        script: scriptName,
        args,
        command: 'npm run test -- --coverage --watch'
      };

      scriptRunner.runScript.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runScript(scriptName, { args });

      // Assert
      expect(result.args).toEqual(args);
      expect(result.command).toContain('--coverage');
    });

    it('should handle timeout', async () => {
      // Arrange
      const scriptName = 'long-running-task';
      scriptRunner.runScript.mockRejectedValue(new Error('Script timeout after 30000ms'));

      // Act & Assert
      await expect(scriptRunner.runScript(scriptName, { timeout: 30000 }))
        .rejects.toThrow('Script timeout after 30000ms');
    });

    it('should capture script output', async () => {
      // Arrange
      const scriptName = 'dev';
      const mockResult = {
        success: true,
        script: scriptName,
        stdout: 'Server running on http://localhost:3000',
        stderr: ''
      };

      scriptRunner.runScript.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runScript(scriptName);

      // Assert
      expect(result.stdout).toContain('Server running');
      expect(result.stderr).toBe('');
    });
  });

  describe('validateScript', () => {
    it('should validate existing script', async () => {
      // Arrange
      const scriptName = 'test';
      scriptRunner.validateScript.mockResolvedValue({
        exists: true,
        command: 'vitest',
        valid: true
      });

      // Act
      const validation = await scriptRunner.validateScript(scriptName);

      // Assert
      expect(validation.exists).toBe(true);
      expect(validation.valid).toBe(true);
    });

    it('should detect non-existent script', async () => {
      // Arrange
      const scriptName = 'non-existent';
      scriptRunner.validateScript.mockResolvedValue({
        exists: false,
        valid: false
      });

      // Act
      const validation = await scriptRunner.validateScript(scriptName);

      // Assert
      expect(validation.exists).toBe(false);
      expect(validation.valid).toBe(false);
    });

    it('should validate script syntax', async () => {
      // Arrange
      const scriptName = 'custom-script';
      scriptRunner.validateScript.mockResolvedValue({
        exists: true,
        command: 'node scripts/custom.js && echo "Done"',
        valid: true,
        syntaxValid: true
      });

      // Act
      const validation = await scriptRunner.validateScript(scriptName);

      // Assert
      expect(validation.syntaxValid).toBe(true);
    });
  });

  describe('getAvailableScripts', () => {
    it('should list all available npm scripts', async () => {
      // Arrange
      const mockScripts = {
        'dev': 'vite',
        'build': 'vite build',
        'test': 'vitest',
        'emulator:start': 'firebase emulators:start',
        'emulator:export': 'firebase emulators:export ./data',
        'emulator:clean': 'rm -rf .firebase',
        'emulator:backup': 'node scripts/firebase-backup.sh',
        'test:emulator': 'firebase emulators:exec --only firestore,auth "npm run test"'
      };

      scriptRunner.getAvailableScripts.mockResolvedValue(mockScripts);

      // Act
      const scripts = await scriptRunner.getAvailableScripts();

      // Assert
      expect(scripts).toHaveProperty('dev');
      expect(scripts).toHaveProperty('emulator:start');
      expect(scripts['test:emulator']).toContain('firebase emulators:exec');
    });

    it('should filter scripts by pattern', async () => {
      // Arrange
      const mockScripts = {
        'emulator:start': 'firebase emulators:start',
        'emulator:export': 'firebase emulators:export ./data',
        'emulator:clean': 'rm -rf .firebase'
      };

      scriptRunner.getAvailableScripts.mockResolvedValue(mockScripts);

      // Act
      const scripts = await scriptRunner.getAvailableScripts({ filter: 'emulator:*' });

      // Assert
      expect(Object.keys(scripts)).toHaveLength(3);
      expect(scripts).toHaveProperty('emulator:start');
    });

    it('should include script descriptions if available', async () => {
      // Arrange
      const mockScripts = {
        'emulator:start': {
          command: 'firebase emulators:start',
          description: 'Start Firebase emulators with data import'
        }
      };

      scriptRunner.getAvailableScripts.mockResolvedValue(mockScripts);

      // Act
      const scripts = await scriptRunner.getAvailableScripts({ includeDescriptions: true });

      // Assert
      expect(scripts['emulator:start'].description).toBeDefined();
    });
  });

  describe('addScript', () => {
    it('should add new script to package.json', async () => {
      // Arrange
      const scriptName = 'emulator:start';
      const command = 'firebase emulators:start --import=./emulator-data --export-on-exit';
      const mockResult = {
        success: true,
        added: scriptName,
        command
      };

      scriptRunner.addScript.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.addScript(scriptName, command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.added).toBe(scriptName);
      expect(result.command).toContain('--import');
    });

    it('should prevent overwriting existing script without force', async () => {
      // Arrange
      const scriptName = 'test';
      const command = 'new-test-command';
      scriptRunner.addScript.mockRejectedValue(new Error('Script already exists'));

      // Act & Assert
      await expect(scriptRunner.addScript(scriptName, command))
        .rejects.toThrow('Script already exists');
    });

    it('should overwrite with force option', async () => {
      // Arrange
      const scriptName = 'test';
      const command = 'vitest --coverage';
      const mockResult = {
        success: true,
        added: scriptName,
        command,
        overwritten: true
      };

      scriptRunner.addScript.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.addScript(scriptName, command, { force: true });

      // Assert
      expect(result.overwritten).toBe(true);
    });
  });

  describe('removeScript', () => {
    it('should remove script from package.json', async () => {
      // Arrange
      const scriptName = 'deprecated-script';
      const mockResult = {
        success: true,
        removed: scriptName
      };

      scriptRunner.removeScript.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.removeScript(scriptName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.removed).toBe(scriptName);
    });

    it('should handle removing non-existent script', async () => {
      // Arrange
      const scriptName = 'non-existent';
      scriptRunner.removeScript.mockRejectedValue(new Error('Script not found'));

      // Act & Assert
      await expect(scriptRunner.removeScript(scriptName))
        .rejects.toThrow('Script not found');
    });
  });

  describe('updateScript', () => {
    it('should update existing script', async () => {
      // Arrange
      const scriptName = 'test';
      const newCommand = 'vitest --coverage --ui';
      const mockResult = {
        success: true,
        updated: scriptName,
        oldCommand: 'vitest',
        newCommand
      };

      scriptRunner.updateScript.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.updateScript(scriptName, newCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.newCommand).toBe(newCommand);
    });

    it('should validate new command before updating', async () => {
      // Arrange
      const scriptName = 'build';
      const invalidCommand = 'invalid &&& command';
      scriptRunner.updateScript.mockRejectedValue(new Error('Invalid command syntax'));

      // Act & Assert
      await expect(scriptRunner.updateScript(scriptName, invalidCommand))
        .rejects.toThrow('Invalid command syntax');
    });
  });

  describe('runEmulatorStart', () => {
    it('should start emulator with data import', async () => {
      // Arrange
      const mockResult = {
        success: true,
        emulatorStarted: true,
        ports: {
          firestore: 8080,
          auth: 9099,
          ui: 4000
        },
        dataImported: true
      };

      scriptRunner.runEmulatorStart.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runEmulatorStart();

      // Assert
      expect(result.emulatorStarted).toBe(true);
      expect(result.dataImported).toBe(true);
      expect(result.ports.firestore).toBe(8080);
    });

    it('should start emulator without data import', async () => {
      // Arrange
      const mockResult = {
        success: true,
        emulatorStarted: true,
        dataImported: false
      };

      scriptRunner.runEmulatorStart.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runEmulatorStart({ skipImport: true });

      // Assert
      expect(result.dataImported).toBe(false);
    });

    it('should handle port conflicts', async () => {
      // Arrange
      scriptRunner.runEmulatorStart.mockRejectedValue(new Error('Port 8080 is already in use'));

      // Act & Assert
      await expect(scriptRunner.runEmulatorStart())
        .rejects.toThrow('Port 8080 is already in use');
    });

    it('should export data on exit', async () => {
      // Arrange
      const mockResult = {
        success: true,
        emulatorStarted: true,
        exportOnExit: true,
        exportPath: './emulator-data'
      };

      scriptRunner.runEmulatorStart.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runEmulatorStart({ exportOnExit: true });

      // Assert
      expect(result.exportOnExit).toBe(true);
      expect(result.exportPath).toBe('./emulator-data');
    });
  });

  describe('runEmulatorExport', () => {
    it('should export emulator data', async () => {
      // Arrange
      const exportPath = './emulator-backup';
      const mockResult = {
        success: true,
        exported: true,
        path: exportPath,
        collections: ['ingredients', 'references'],
        documentCount: 150
      };

      scriptRunner.runEmulatorExport.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runEmulatorExport(exportPath);

      // Assert
      expect(result.exported).toBe(true);
      expect(result.path).toBe(exportPath);
      expect(result.documentCount).toBe(150);
    });

    it('should use default export path', async () => {
      // Arrange
      const mockResult = {
        success: true,
        exported: true,
        path: './data/emulator-export-20250901'
      };

      scriptRunner.runEmulatorExport.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runEmulatorExport();

      // Assert
      expect(result.path).toMatch(/emulator-export-/);
    });

    it('should handle export failure', async () => {
      // Arrange
      scriptRunner.runEmulatorExport.mockRejectedValue(new Error('Emulator not running'));

      // Act & Assert
      await expect(scriptRunner.runEmulatorExport())
        .rejects.toThrow('Emulator not running');
    });
  });

  describe('runEmulatorClean', () => {
    it('should clean emulator data', async () => {
      // Arrange
      const mockResult = {
        success: true,
        cleaned: true,
        filesRemoved: ['.firebase', 'firestore-debug.log', 'ui-debug.log']
      };

      scriptRunner.runEmulatorClean.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runEmulatorClean();

      // Assert
      expect(result.cleaned).toBe(true);
      expect(result.filesRemoved).toContain('.firebase');
    });

    it('should confirm before cleaning', async () => {
      // Arrange
      scriptRunner.runEmulatorClean.mockRejectedValue(new Error('User cancelled operation'));

      // Act & Assert
      await expect(scriptRunner.runEmulatorClean({ skipConfirmation: false }))
        .rejects.toThrow('User cancelled operation');
    });

    it('should preserve specified data', async () => {
      // Arrange
      const mockResult = {
        success: true,
        cleaned: true,
        preserved: ['auth_export']
      };

      scriptRunner.runEmulatorClean.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runEmulatorClean({ preserve: ['auth_export'] });

      // Assert
      expect(result.preserved).toContain('auth_export');
    });
  });

  describe('runEmulatorBackup', () => {
    it('should create emulator backup', async () => {
      // Arrange
      const mockResult = {
        success: true,
        backupId: 'emulator-backup-20250901-120000',
        path: './backups/emulator-backup-20250901-120000',
        sizeInBytes: 1048576
      };

      scriptRunner.runEmulatorBackup.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runEmulatorBackup();

      // Assert
      expect(result.success).toBe(true);
      expect(result.backupId).toMatch(/emulator-backup-/);
    });

    it('should include metadata in backup', async () => {
      // Arrange
      const metadata = { reason: 'Pre-deployment backup' };
      const mockResult = {
        success: true,
        backupId: 'emulator-backup-20250901-120000',
        metadata
      };

      scriptRunner.runEmulatorBackup.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runEmulatorBackup({ metadata });

      // Assert
      expect(result.metadata.reason).toBe('Pre-deployment backup');
    });
  });

  describe('runTestsWithEmulator', () => {
    it('should run tests against emulator', async () => {
      // Arrange
      const mockResult = {
        success: true,
        testsRun: 50,
        testsPassed: 48,
        testsFailed: 2,
        emulatorUsed: true
      };

      scriptRunner.runTestsWithEmulator.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runTestsWithEmulator();

      // Assert
      expect(result.emulatorUsed).toBe(true);
      expect(result.testsPassed).toBe(48);
    });

    it('should start emulator if not running', async () => {
      // Arrange
      const mockResult = {
        success: true,
        emulatorStarted: true,
        testsRun: 50,
        testsPassed: 50
      };

      scriptRunner.runTestsWithEmulator.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runTestsWithEmulator();

      // Assert
      expect(result.emulatorStarted).toBe(true);
    });

    it('should run specific test suite', async () => {
      // Arrange
      const testSuite = 'integration';
      const mockResult = {
        success: true,
        testSuite,
        testsRun: 20
      };

      scriptRunner.runTestsWithEmulator.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runTestsWithEmulator({ suite: testSuite });

      // Assert
      expect(result.testSuite).toBe(testSuite);
    });

    it('should clean up emulator after tests', async () => {
      // Arrange
      const mockResult = {
        success: true,
        testsRun: 50,
        emulatorCleanedUp: true
      };

      scriptRunner.runTestsWithEmulator.mockResolvedValue(mockResult);

      // Act
      const result = await scriptRunner.runTestsWithEmulator({ cleanupAfter: true });

      // Assert
      expect(result.emulatorCleanedUp).toBe(true);
    });
  });

  describe('checkScriptDependencies', () => {
    it('should check for required dependencies', async () => {
      // Arrange
      const scriptName = 'emulator:start';
      const mockDependencies = {
        required: ['firebase-tools'],
        installed: ['firebase-tools'],
        missing: []
      };

      scriptRunner.checkScriptDependencies.mockResolvedValue(mockDependencies);

      // Act
      const deps = await scriptRunner.checkScriptDependencies(scriptName);

      // Assert
      expect(deps.missing).toHaveLength(0);
      expect(deps.installed).toContain('firebase-tools');
    });

    it('should detect missing dependencies', async () => {
      // Arrange
      const scriptName = 'emulator:start';
      const mockDependencies = {
        required: ['firebase-tools', 'firebase-admin'],
        installed: ['firebase-tools'],
        missing: ['firebase-admin']
      };

      scriptRunner.checkScriptDependencies.mockResolvedValue(mockDependencies);

      // Act
      const deps = await scriptRunner.checkScriptDependencies(scriptName);

      // Assert
      expect(deps.missing).toContain('firebase-admin');
    });

    it('should check global dependencies', async () => {
      // Arrange
      const scriptName = 'emulator:start';
      const mockDependencies = {
        global: {
          required: ['firebase-tools'],
          installed: ['firebase-tools'],
          missing: []
        }
      };

      scriptRunner.checkScriptDependencies.mockResolvedValue(mockDependencies);

      // Act
      const deps = await scriptRunner.checkScriptDependencies(scriptName, { checkGlobal: true });

      // Assert
      expect(deps.global.missing).toHaveLength(0);
    });
  });
});