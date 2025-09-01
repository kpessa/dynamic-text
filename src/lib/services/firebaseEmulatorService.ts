export interface EmulatorConfig {
  enabled: boolean;
  host: string;
  ports: {
    firestore?: number;
    auth?: number;
    storage?: number;
    functions?: number;
    ui?: number;
  };
  projectId?: string;
  persistence?: boolean;
}

export interface EmulatorStatus {
  firestore: { running: boolean; port: number; host: string };
  auth: { running: boolean; port: number; host: string };
  storage: { running: boolean; port: number; host: string };
  functions: { running: boolean; port: number; host: string };
  ui: { running: boolean; port: number; host: string };
}

export class FirebaseEmulatorService {
  private config: EmulatorConfig | null = null;

  /**
   * Detect emulator configuration from environment variables
   */
  async detectEmulatorConfig(env: Record<string, string> = import.meta.env): Promise<EmulatorConfig> {
    const enabled = env.VITE_USE_FIREBASE_EMULATOR === 'true';
    
    if (!enabled) {
      return {
        enabled: false,
        host: '',
        ports: {}
      };
    }

    return {
      enabled: true,
      host: env.VITE_FIREBASE_EMULATOR_HOST || 'localhost',
      ports: {
        firestore: Number(env.VITE_FIREBASE_FIRESTORE_PORT) || 8080,
        auth: Number(env.VITE_FIREBASE_AUTH_PORT) || 9099,
        storage: Number(env.VITE_FIREBASE_STORAGE_PORT) || 9199,
        functions: Number(env.VITE_FIREBASE_FUNCTIONS_PORT) || 5001,
        ui: Number(env.VITE_FIREBASE_UI_PORT) || 4000
      },
      projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
      persistence: true
    };
  }

  /**
   * Check if emulator is running on a specific port
   */
  async isEmulatorRunning(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok || response.status === 404; // 404 means server is running but path not found
    } catch (error) {
      if (error instanceof Error && error.message.includes('Connection refused')) {
        return false;
      }
      // For other errors, we might want to throw
      if (error instanceof Error && !error.message.includes('aborted')) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Get the status of all emulator services
   */
  async getEmulatorStatus(): Promise<EmulatorStatus> {
    const config = await this.getEmulatorConfig();
    
    const checkPort = async (port: number | undefined): Promise<boolean> => {
      if (!port) return false;
      return this.isEmulatorRunning(port);
    };

    const [firestoreRunning, authRunning, storageRunning, functionsRunning, uiRunning] = 
      await Promise.all([
        checkPort(config.ports.firestore),
        checkPort(config.ports.auth),
        checkPort(config.ports.storage),
        checkPort(config.ports.functions),
        checkPort(config.ports.ui)
      ]);

    return {
      firestore: { 
        running: firestoreRunning, 
        port: config.ports.firestore || 8080, 
        host: config.host 
      },
      auth: { 
        running: authRunning, 
        port: config.ports.auth || 9099, 
        host: config.host 
      },
      storage: { 
        running: storageRunning, 
        port: config.ports.storage || 9199, 
        host: config.host 
      },
      functions: { 
        running: functionsRunning, 
        port: config.ports.functions || 5001, 
        host: config.host 
      },
      ui: { 
        running: uiRunning, 
        port: config.ports.ui || 4000, 
        host: config.host 
      }
    };
  }

  /**
   * Connect to the Firebase emulator
   */
  async connectToEmulator(services?: string[]): Promise<{ connected: boolean; services: string[] }> {
    const status = await this.getEmulatorStatus();
    const connectedServices: string[] = [];

    // Check which services to connect
    const servicesToConnect = services || ['firestore', 'auth'];

    for (const service of servicesToConnect) {
      if (service === 'firestore' && status.firestore.running) {
        connectedServices.push('firestore');
      } else if (service === 'auth' && status.auth.running) {
        connectedServices.push('auth');
      } else if (service === 'storage' && status.storage.running) {
        connectedServices.push('storage');
      } else if (service === 'functions' && status.functions.running) {
        connectedServices.push('functions');
      }
    }

    if (connectedServices.length === 0) {
      throw new Error('Emulator not running');
    }

    return {
      connected: true,
      services: connectedServices
    };
  }

  /**
   * Validate that emulator ports are available
   */
  async validateEmulatorPorts(customPorts?: Record<string, number>): Promise<{
    valid: boolean;
    conflicts: Array<{ port: number; service: string; inUseBy?: string }>;
  }> {
    const config = await this.getEmulatorConfig();
    const ports = customPorts || {
      firestore: config.ports.firestore || 8080,
      auth: config.ports.auth || 9099,
      storage: config.ports.storage || 9199,
      functions: config.ports.functions || 5001,
      ui: config.ports.ui || 4000
    };

    const conflicts: Array<{ port: number; service: string; inUseBy?: string }> = [];

    // Check each port
    for (const [service, port] of Object.entries(ports)) {
      try {
        // Try to connect to the port
        const response = await fetch(`http://localhost:${port}`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000)
        });
        
        // If we get a response, check if it's our emulator
        const isEmulator = response.headers.get('server')?.includes('Firebase') || 
                          response.headers.get('x-powered-by')?.includes('Firebase');
        
        if (!isEmulator) {
          conflicts.push({ 
            port, 
            service, 
            inUseBy: 'another-process' 
          });
        }
      } catch (error) {
        // Port is free (connection refused) - that's good
        continue;
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts
    };
  }

  /**
   * Get the complete emulator configuration
   */
  async getEmulatorConfig(): Promise<EmulatorConfig> {
    if (!this.config) {
      this.config = await this.detectEmulatorConfig();
    }
    return this.config;
  }
}

// Export a singleton instance
export const firebaseEmulatorService = new FirebaseEmulatorService();