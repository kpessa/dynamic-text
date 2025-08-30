/**
 * TPN Configuration Firebase Service
 * Extends Firebase functionality to handle full TPN configuration save/load operations
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

import { db, getCurrentUser, signInAnonymouslyUser } from '../firebase';
import { tpnConfigService, type TPNConfiguration, type ConfigMetadata, type PopulationType } from './tpnConfigService';
import { cacheService } from './base/CacheService';
import { errorService } from './base/ErrorService';

export interface TPNConfigDocument {
  id?: string;
  name: string;
  description?: string;
  populationType: PopulationType;
  configuration: TPNConfiguration;
  metadata: ConfigMetadata;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
  userId: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface TPNConfigListItem {
  id: string;
  name: string;
  description?: string;
  populationType: PopulationType;
  ingredientCount: number;
  flexCount: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// Cache keys
const CACHE_KEYS = {
  USER_CONFIGS: (userId: string) => `tpn-configs:user:${userId}`,
  CONFIG: (id: string) => `tpn-config:${id}`,
  CONFIG_LIST: 'tpn-configs:list'
};

// Cache TTLs
const CACHE_TTL = {
  CONFIG: 15 * 60 * 1000, // 15 minutes
  CONFIG_LIST: 5 * 60 * 1000 // 5 minutes
};

export class TPNConfigFirebaseService {
  private readonly COLLECTION_NAME = 'tpnConfigurations';

  /**
   * Save a TPN configuration to Firebase
   * @param name - User-friendly name for the configuration
   * @param config - The TPN configuration object
   * @param populationType - Population type (neo, child, adolescent, adult)
   * @param description - Optional description
   * @returns The saved configuration ID
   */
  async saveTPNConfiguration(
    name: string,
    config: TPNConfiguration,
    populationType: PopulationType,
    description?: string
  ): Promise<{ success: boolean; configId?: string; error?: string }> {
    try {
      // Validate configuration before saving
      const validation = tpnConfigService.validateTPNConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid configuration: ${validation.errors.join(', ')}`
        };
      }

      // Get current user
      const user = getCurrentUser() || await signInAnonymouslyUser();
      if (!user) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      if (!db) {
        return {
          success: false,
          error: 'Firebase not initialized'
        };
      }

      // Create metadata
      const metadata: ConfigMetadata = {
        name,
        populationType,
        timestamp: Date.now(),
        userId: user.uid,
        description
      };

      // Create document
      const configDoc: TPNConfigDocument = {
        name,
        description,
        populationType,
        configuration: config,
        metadata,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: user.uid,
        isPublic: false,
        tags: []
      };

      // Generate ID based on name and timestamp
      const configId = `${user.uid}_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      
      // Save to Firebase
      const docRef = doc(db, this.COLLECTION_NAME, configId);
      await setDoc(docRef, configDoc);

      // Invalidate caches
      this.invalidateCaches(user.uid);

      return {
        success: true,
        configId
      };
    } catch (error) {
      console.error('Error saving TPN configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration'
      };
    }
  }

  /**
   * Load a TPN configuration from Firebase
   * @param configId - The configuration ID
   * @returns The TPN configuration
   */
  async loadTPNConfiguration(configId: string): Promise<{
    success: boolean;
    config?: TPNConfiguration;
    metadata?: ConfigMetadata;
    error?: string;
  }> {
    try {
      if (!db) {
        return {
          success: false,
          error: 'Firebase not initialized'
        };
      }

      // Try to get from cache first
      const cached = await cacheService.get(
        CACHE_KEYS.CONFIG(configId),
        async () => {
          const docRef = doc(db!, this.COLLECTION_NAME, configId);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            return null;
          }

          return docSnap.data() as TPNConfigDocument;
        },
        CACHE_TTL.CONFIG
      );

      if (!cached) {
        return {
          success: false,
          error: 'Configuration not found'
        };
      }

      // Validate the loaded configuration
      const validation = tpnConfigService.validateTPNConfig(cached.configuration);
      if (!validation.valid) {
        console.warn('Loaded configuration has validation issues:', validation.errors);
      }

      return {
        success: true,
        config: cached.configuration,
        metadata: cached.metadata
      };
    } catch (error) {
      console.error('Error loading TPN configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load configuration'
      };
    }
  }

  /**
   * List all TPN configurations for the current user
   * @returns List of configuration summaries
   */
  async listTPNConfigurations(): Promise<{
    success: boolean;
    configurations?: TPNConfigListItem[];
    error?: string;
  }> {
    try {
      const user = getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      if (!db) {
        return {
          success: false,
          error: 'Firebase not initialized'
        };
      }

      // Try to get from cache first
      const configs = await cacheService.get(
        CACHE_KEYS.USER_CONFIGS(user.uid),
        async () => {
          const q = query(
            collection(db!, this.COLLECTION_NAME),
            where('userId', '==', user.uid),
            orderBy('updatedAt', 'desc')
          );

          const querySnapshot = await getDocs(q);
          const items: TPNConfigListItem[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data() as TPNConfigDocument;
            items.push({
              id: doc.id,
              name: data.name,
              description: data.description,
              populationType: data.populationType,
              ingredientCount: data.configuration.INGREDIENT?.length || 0,
              flexCount: data.configuration.FLEX?.length || 0,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
              userId: data.userId
            });
          });

          return items;
        },
        CACHE_TTL.CONFIG_LIST
      );

      return {
        success: true,
        configurations: configs
      };
    } catch (error) {
      console.error('Error listing TPN configurations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list configurations'
      };
    }
  }

  /**
   * Delete a TPN configuration
   * @param configId - The configuration ID to delete
   * @returns Success status
   */
  async deleteTPNConfiguration(configId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const user = getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      if (!db) {
        return {
          success: false,
          error: 'Firebase not initialized'
        };
      }

      // First, verify the user owns this configuration
      const docRef = doc(db, this.COLLECTION_NAME, configId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Configuration not found'
        };
      }

      const data = docSnap.data() as TPNConfigDocument;
      if (data.userId !== user.uid) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete your own configurations'
        };
      }

      // Delete the document
      await deleteDoc(docRef);

      // Invalidate caches
      this.invalidateCaches(user.uid, configId);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting TPN configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete configuration'
      };
    }
  }

  /**
   * Update an existing TPN configuration
   * @param configId - The configuration ID to update
   * @param config - The updated TPN configuration
   * @param name - Optional updated name
   * @param description - Optional updated description
   * @returns Success status
   */
  async updateTPNConfiguration(
    configId: string,
    config: TPNConfiguration,
    name?: string,
    description?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Validate configuration before updating
      const validation = tpnConfigService.validateTPNConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid configuration: ${validation.errors.join(', ')}`
        };
      }

      const user = getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      if (!db) {
        return {
          success: false,
          error: 'Firebase not initialized'
        };
      }

      // Get existing document to preserve metadata
      const docRef = doc(db, this.COLLECTION_NAME, configId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Configuration not found'
        };
      }

      const existingData = docSnap.data() as TPNConfigDocument;
      if (existingData.userId !== user.uid) {
        return {
          success: false,
          error: 'Unauthorized: You can only update your own configurations'
        };
      }

      // Update document
      const updates: Partial<TPNConfigDocument> = {
        configuration: config,
        updatedAt: serverTimestamp()
      };

      if (name !== undefined) {
        updates.name = name;
        updates.metadata = {
          ...existingData.metadata,
          name
        };
      }

      if (description !== undefined) {
        updates.description = description;
        updates.metadata = {
          ...existingData.metadata,
          description
        };
      }

      await setDoc(docRef, updates, { merge: true });

      // Invalidate caches
      this.invalidateCaches(user.uid, configId);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error updating TPN configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration'
      };
    }
  }

  /**
   * Search configurations by population type
   * @param populationType - The population type to filter by
   * @returns List of matching configurations
   */
  async searchByPopulationType(populationType: PopulationType): Promise<{
    success: boolean;
    configurations?: TPNConfigListItem[];
    error?: string;
  }> {
    try {
      const user = getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      if (!db) {
        return {
          success: false,
          error: 'Firebase not initialized'
        };
      }

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', user.uid),
        where('populationType', '==', populationType),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const items: TPNConfigListItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as TPNConfigDocument;
        items.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          populationType: data.populationType,
          ingredientCount: data.configuration.INGREDIENT?.length || 0,
          flexCount: data.configuration.FLEX?.length || 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          userId: data.userId
        });
      });

      return {
        success: true,
        configurations: items
      };
    } catch (error) {
      console.error('Error searching TPN configurations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search configurations'
      };
    }
  }

  /**
   * Invalidate relevant caches
   */
  private invalidateCaches(userId: string, configId?: string): void {
    cacheService.invalidate(CACHE_KEYS.USER_CONFIGS(userId));
    cacheService.invalidate(CACHE_KEYS.CONFIG_LIST);
    
    if (configId) {
      cacheService.invalidate(CACHE_KEYS.CONFIG(configId));
    }
  }

  /**
   * Check if Firebase is available
   */
  isAvailable(): boolean {
    return !!db;
  }
}

// Export singleton instance
export const tpnConfigFirebaseService = new TPNConfigFirebaseService();