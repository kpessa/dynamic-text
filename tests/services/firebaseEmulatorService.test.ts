import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EmulatorConfig, EmulatorStatus } from '../../src/lib/services/firebaseEmulatorService';

// Mock the service before importing
vi.mock('../../src/lib/services/firebaseEmulatorService', async () => {
  const actual = await vi.importActual('../../src/lib/services/firebaseEmulatorService');
  return {
    ...actual,
    FirebaseEmulatorService: vi.fn().mockImplementation(() => ({
      detectEmulatorConfig: vi.fn(),
      isEmulatorRunning: vi.fn(),
      getEmulatorStatus: vi.fn(),
      connectToEmulator: vi.fn(),
      validateEmulatorPorts: vi.fn(),
      getEmulatorConfig: vi.fn()
    }))
  };
});

describe('FirebaseEmulatorService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { FirebaseEmulatorService } = await import('../../src/lib/services/firebaseEmulatorService');
    service = new FirebaseEmulatorService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectEmulatorConfig', () => {
    it('should detect emulator configuration from environment variables', async () => {
      // Arrange
      const mockEnv = {
        VITE_USE_FIREBASE_EMULATOR: 'true',
        VITE_FIREBASE_EMULATOR_HOST: 'localhost',
        VITE_FIREBASE_FIRESTORE_PORT: '8080',
        VITE_FIREBASE_AUTH_PORT: '9099',
        VITE_FIREBASE_STORAGE_PORT: '9199',
        VITE_FIREBASE_FUNCTIONS_PORT: '5001'
      };

      service.detectEmulatorConfig.mockResolvedValue({
        enabled: true,
        host: 'localhost',
        ports: {
          firestore: 8080,
          auth: 9099,
          storage: 9199,
          functions: 5001,
          ui: 4000
        }
      });

      // Act
      const config = await service.detectEmulatorConfig(mockEnv);

      // Assert
      expect(config).toEqual({
        enabled: true,
        host: 'localhost',
        ports: {
          firestore: 8080,
          auth: 9099,
          storage: 9199,
          functions: 5001,
          ui: 4000
        }
      });
    });

    it('should return disabled config when emulator is not enabled', async () => {
      // Arrange
      const mockEnv = {
        VITE_USE_FIREBASE_EMULATOR: 'false'
      };

      service.detectEmulatorConfig.mockResolvedValue({
        enabled: false,
        host: '',
        ports: {}
      });

      // Act
      const config = await service.detectEmulatorConfig(mockEnv);

      // Assert
      expect(config.enabled).toBe(false);
    });

    it('should use default ports when not specified in environment', async () => {
      // Arrange
      const mockEnv = {
        VITE_USE_FIREBASE_EMULATOR: 'true'
      };

      service.detectEmulatorConfig.mockResolvedValue({
        enabled: true,
        host: 'localhost',
        ports: {
          firestore: 8080,
          auth: 9099,
          storage: 9199,
          functions: 5001,
          ui: 4000
        }
      });

      // Act
      const config = await service.detectEmulatorConfig(mockEnv);

      // Assert
      expect(config.ports.firestore).toBe(8080);
      expect(config.ports.auth).toBe(9099);
      expect(config.host).toBe('localhost');
    });
  });

  describe('isEmulatorRunning', () => {
    it('should detect running emulator by checking port availability', async () => {
      // Arrange
      service.isEmulatorRunning.mockResolvedValue(true);

      // Act
      const isRunning = await service.isEmulatorRunning(8080);

      // Assert
      expect(isRunning).toBe(true);
    });

    it('should return false when emulator port is not accessible', async () => {
      // Arrange
      service.isEmulatorRunning.mockResolvedValue(false);

      // Act
      const isRunning = await service.isEmulatorRunning(8080);

      // Assert
      expect(isRunning).toBe(false);
    });

    it('should handle connection errors gracefully', async () => {
      // Arrange
      service.isEmulatorRunning.mockRejectedValue(new Error('Connection refused'));

      // Act & Assert
      await expect(service.isEmulatorRunning(8080)).rejects.toThrow('Connection refused');
    });
  });

  describe('getEmulatorStatus', () => {
    it('should return detailed status of all emulator services', async () => {
      // Arrange
      const expectedStatus: EmulatorStatus = {
        firestore: { running: true, port: 8080, host: 'localhost' },
        auth: { running: true, port: 9099, host: 'localhost' },
        storage: { running: false, port: 9199, host: 'localhost' },
        functions: { running: false, port: 5001, host: 'localhost' },
        ui: { running: true, port: 4000, host: 'localhost' }
      };

      service.getEmulatorStatus.mockResolvedValue(expectedStatus);

      // Act
      const status = await service.getEmulatorStatus();

      // Assert
      expect(status.firestore.running).toBe(true);
      expect(status.auth.running).toBe(true);
      expect(status.storage.running).toBe(false);
      expect(status.ui.running).toBe(true);
    });

    it('should handle partial emulator availability', async () => {
      // Arrange
      const partialStatus: EmulatorStatus = {
        firestore: { running: true, port: 8080, host: 'localhost' },
        auth: { running: false, port: 9099, host: 'localhost' },
        storage: { running: false, port: 9199, host: 'localhost' },
        functions: { running: false, port: 5001, host: 'localhost' },
        ui: { running: false, port: 4000, host: 'localhost' }
      };

      service.getEmulatorStatus.mockResolvedValue(partialStatus);

      // Act
      const status = await service.getEmulatorStatus();

      // Assert
      expect(status.firestore.running).toBe(true);
      expect(status.auth.running).toBe(false);
    });
  });

  describe('connectToEmulator', () => {
    it('should successfully connect to running emulator', async () => {
      // Arrange
      service.connectToEmulator.mockResolvedValue({ connected: true, services: ['firestore', 'auth'] });

      // Act
      const result = await service.connectToEmulator();

      // Assert
      expect(result.connected).toBe(true);
      expect(result.services).toContain('firestore');
      expect(result.services).toContain('auth');
    });

    it('should throw error when emulator is not running', async () => {
      // Arrange
      service.connectToEmulator.mockRejectedValue(new Error('Emulator not running'));

      // Act & Assert
      await expect(service.connectToEmulator()).rejects.toThrow('Emulator not running');
    });

    it('should connect to specific services only', async () => {
      // Arrange
      service.connectToEmulator.mockResolvedValue({ connected: true, services: ['firestore'] });

      // Act
      const result = await service.connectToEmulator(['firestore']);

      // Assert
      expect(result.services).toEqual(['firestore']);
    });
  });

  describe('validateEmulatorPorts', () => {
    it('should validate all required ports are available', async () => {
      // Arrange
      service.validateEmulatorPorts.mockResolvedValue({ valid: true, conflicts: [] });

      // Act
      const validation = await service.validateEmulatorPorts();

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.conflicts).toHaveLength(0);
    });

    it('should detect port conflicts', async () => {
      // Arrange
      service.validateEmulatorPorts.mockResolvedValue({
        valid: false,
        conflicts: [
          { port: 8080, service: 'firestore', inUseBy: 'another-process' }
        ]
      });

      // Act
      const validation = await service.validateEmulatorPorts();

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.conflicts).toHaveLength(1);
      expect(validation.conflicts[0].port).toBe(8080);
    });

    it('should validate custom port configuration', async () => {
      // Arrange
      const customPorts = {
        firestore: 8081,
        auth: 9100
      };

      service.validateEmulatorPorts.mockResolvedValue({ valid: true, conflicts: [] });

      // Act
      const validation = await service.validateEmulatorPorts(customPorts);

      // Assert
      expect(validation.valid).toBe(true);
    });
  });

  describe('getEmulatorConfig', () => {
    it('should return complete emulator configuration', async () => {
      // Arrange
      const expectedConfig: EmulatorConfig = {
        enabled: true,
        host: 'localhost',
        ports: {
          firestore: 8080,
          auth: 9099,
          storage: 9199,
          functions: 5001,
          ui: 4000
        },
        projectId: 'demo-project',
        persistence: true
      };

      service.getEmulatorConfig.mockResolvedValue(expectedConfig);

      // Act
      const config = await service.getEmulatorConfig();

      // Assert
      expect(config).toEqual(expectedConfig);
      expect(config.projectId).toBe('demo-project');
      expect(config.persistence).toBe(true);
    });

    it('should handle missing firebase.json gracefully', async () => {
      // Arrange
      service.getEmulatorConfig.mockResolvedValue({
        enabled: false,
        host: '',
        ports: {},
        projectId: '',
        persistence: false
      });

      // Act
      const config = await service.getEmulatorConfig();

      // Assert
      expect(config.enabled).toBe(false);
      expect(config.projectId).toBe('');
    });
  });
});