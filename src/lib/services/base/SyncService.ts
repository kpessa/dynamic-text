/**
 * Sync Service - Manages real-time Firestore subscriptions with optimization
 * Provides subscription pooling, debouncing, and proper cleanup
 */

import { 
  collection, 
  doc, 
  query, 
  onSnapshot, 
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../../firebase';
import { errorService } from './ErrorService';

interface SubscriptionConfig {
  id: string;
  collectionPath: string;
  constraints?: QueryConstraint[];
  callback: (data: any[]) => void;
  errorCallback?: (error: Error) => void;
  debounceMs?: number;
  includeMetadata?: boolean;
}

interface ActiveSubscription {
  config: SubscriptionConfig;
  unsubscribe: Unsubscribe;
  lastUpdate: number;
  updateCount: number;
  debouncedCallback: (data: any[]) => void;
}

export class SyncService {
  private activeSubscriptions = new Map<string, ActiveSubscription>();
  private subscriptionPools = new Map<string, Set<string>>();
  private isOnline = true;
  private syncStats = {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalUpdates: 0,
    errors: 0
  };

  constructor() {
    this.setupNetworkMonitoring();
    this.setupPeriodicCleanup();
  }

  /**
   * Subscribe to a Firestore collection/document with optimizations
   */
  subscribe(config: SubscriptionConfig): () => void {
    const { id, collectionPath, constraints = [], callback, errorCallback, debounceMs = 300 } = config;
    
    // Check if subscription already exists
    if (this.activeSubscriptions.has(id)) {
      console.warn(`Subscription ${id} already exists. Unsubscribing previous.`);
      this.unsubscribe(id);
    }

    try {
      // Create debounced callback
      const debouncedCallback = this.createDebouncedCallback(callback, debounceMs);
      
      // Create Firestore query
      const q = constraints.length > 0 
        ? query(collection(db, collectionPath), ...constraints)
        : collection(db, collectionPath);

      // Set up subscription
      const unsubscribe = onSnapshot(
        q,
        {
          includeMetadataChanges: config.includeMetadata || false
        },
        (snapshot: QuerySnapshot) => {
          try {
            // Skip metadata-only changes unless requested
            if (!config.includeMetadata && snapshot.metadata.hasPendingWrites) {
              return;
            }

            const data = this.processSnapshot(snapshot);
            const subscription = this.activeSubscriptions.get(id);
            
            if (subscription) {
              subscription.lastUpdate = Date.now();
              subscription.updateCount++;
              this.syncStats.totalUpdates++;
              
              debouncedCallback(data);
            }
          } catch (error) {
            console.error(`Error processing snapshot for ${id}:`, error);
            const tpnError = errorService.convertToTPNError(error as Error, { subscriptionId: id });
            errorCallback?.(tpnError);
            this.syncStats.errors++;
          }
        },
        (error) => {
          console.error(`Subscription error for ${id}:`, error);
          const tpnError = errorService.convertToTPNError(error, { subscriptionId: id });
          errorCallback?.(tpnError);
          this.syncStats.errors++;
          
          // Auto-retry for retryable errors
          if (errorService.convertToTPNError(error).retryable) {
            console.log(`Retrying subscription ${id} in 5 seconds...`);
            setTimeout(() => {
              if (this.activeSubscriptions.has(id)) {
                this.subscribe(config);
              }
            }, 5000);
          }
        }
      );

      // Store subscription
      const activeSubscription: ActiveSubscription = {
        config,
        unsubscribe,
        lastUpdate: Date.now(),
        updateCount: 0,
        debouncedCallback
      };
      
      this.activeSubscriptions.set(id, activeSubscription);
      this.syncStats.totalSubscriptions++;
      this.syncStats.activeSubscriptions = this.activeSubscriptions.size;
      
      // Add to subscription pool
      this.addToPool(collectionPath, id);
      
      console.debug(`Subscription ${id} established for ${collectionPath}`);
      
      // Return unsubscribe function
      return () => this.unsubscribe(id);
      
    } catch (error) {
      console.error(`Failed to create subscription ${id}:`, error);
      const tpnError = errorService.convertToTPNError(error as Error, { subscriptionId: id });
      errorCallback?.(tpnError);
      throw tpnError;
    }
  }

  /**
   * Subscribe to a single document
   */
  subscribeToDocument(
    path: string, 
    callback: (data: any | null) => void,
    errorCallback?: (error: Error) => void,
    subscriptionId?: string
  ): () => void {
    const id = subscriptionId || `doc-${path.replace(/\//g, '-')}-${Date.now()}`;
    
    try {
      const docRef = doc(db, path);
      const debouncedCallback = this.createDebouncedCallback(callback, 100);
      
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot: DocumentSnapshot) => {
          try {
            const data = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
            
            const subscription = this.activeSubscriptions.get(id);
            if (subscription) {
              subscription.lastUpdate = Date.now();
              subscription.updateCount++;
              this.syncStats.totalUpdates++;
            }
            
            debouncedCallback(data);
          } catch (error) {
            console.error(`Error processing document snapshot for ${id}:`, error);
            const tpnError = errorService.convertToTPNError(error as Error, { subscriptionId: id });
            errorCallback?.(tpnError);
          }
        },
        (error) => {
          console.error(`Document subscription error for ${id}:`, error);
          const tpnError = errorService.convertToTPNError(error, { subscriptionId: id });
          errorCallback?.(tpnError);
        }
      );

      const activeSubscription: ActiveSubscription = {
        config: {
          id,
          collectionPath: path,
          callback,
          errorCallback
        },
        unsubscribe,
        lastUpdate: Date.now(),
        updateCount: 0,
        debouncedCallback
      };
      
      this.activeSubscriptions.set(id, activeSubscription);
      this.syncStats.totalSubscriptions++;
      this.syncStats.activeSubscriptions = this.activeSubscriptions.size;
      
      return () => this.unsubscribe(id);
      
    } catch (error) {
      console.error(`Failed to create document subscription ${id}:`, error);
      const tpnError = errorService.convertToTPNError(error as Error, { subscriptionId: id });
      errorCallback?.(tpnError);
      throw tpnError;
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    
    if (!subscription) {
      console.warn(`Subscription ${subscriptionId} not found`);
      return false;
    }
    
    try {
      subscription.unsubscribe();
      this.activeSubscriptions.delete(subscriptionId);
      this.syncStats.activeSubscriptions = this.activeSubscriptions.size;
      
      // Remove from pool
      this.removeFromPool(subscription.config.collectionPath, subscriptionId);
      
      console.debug(`Subscription ${subscriptionId} unsubscribed`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing ${subscriptionId}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe all subscriptions for a collection
   */
  unsubscribeCollection(collectionPath: string): number {
    const poolSubscriptions = this.subscriptionPools.get(collectionPath);
    
    if (!poolSubscriptions) {
      return 0;
    }
    
    let unsubscribed = 0;
    for (const subscriptionId of Array.from(poolSubscriptions)) {
      if (this.unsubscribe(subscriptionId)) {
        unsubscribed++;
      }
    }
    
    this.subscriptionPools.delete(collectionPath);
    return unsubscribed;
  }

  /**
   * Unsubscribe all active subscriptions
   */
  unsubscribeAll(): number {
    let unsubscribed = 0;
    
    for (const [subscriptionId] of this.activeSubscriptions) {
      if (this.unsubscribe(subscriptionId)) {
        unsubscribed++;
      }
    }
    
    this.subscriptionPools.clear();
    return unsubscribed;
  }

  /**
   * Get subscription statistics
   */
  getStats() {
    return {
      ...this.syncStats,
      activeSubscriptions: this.activeSubscriptions.size,
      poolCount: this.subscriptionPools.size,
      isOnline: this.isOnline
    };
  }

  /**
   * Get active subscription details
   */
  getActiveSubscriptions() {
    const subscriptions: any[] = [];
    
    for (const [id, subscription] of this.activeSubscriptions) {
      subscriptions.push({
        id,
        collectionPath: subscription.config.collectionPath,
        lastUpdate: subscription.lastUpdate,
        updateCount: subscription.updateCount,
        age: Date.now() - subscription.lastUpdate
      });
    }
    
    return subscriptions.sort((a, b) => b.lastUpdate - a.lastUpdate);
  }

  /**
   * Pause all subscriptions (useful for offline mode)
   */
  pauseAll(): void {
    // Firestore handles offline automatically, but we can track state
    console.log('Pausing all subscriptions');
  }

  /**
   * Resume all subscriptions
   */
  resumeAll(): void {
    console.log('Resuming all subscriptions');
  }

  private processSnapshot(snapshot: QuerySnapshot): any[] {
    const data: any[] = [];
    
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return data;
  }

  private createDebouncedCallback<T>(callback: (data: T) => void, delay: number): (data: T) => void {
    let timeoutId: number | null = null;
    let latestData: T;
    
    return (data: T) => {
      latestData = data;
      
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        callback(latestData);
        timeoutId = null;
      }, delay) as any;
    };
  }

  private addToPool(collectionPath: string, subscriptionId: string): void {
    if (!this.subscriptionPools.has(collectionPath)) {
      this.subscriptionPools.set(collectionPath, new Set());
    }
    
    this.subscriptionPools.get(collectionPath)!.add(subscriptionId);
  }

  private removeFromPool(collectionPath: string, subscriptionId: string): void {
    const pool = this.subscriptionPools.get(collectionPath);
    if (pool) {
      pool.delete(subscriptionId);
      
      if (pool.size === 0) {
        this.subscriptionPools.delete(collectionPath);
      }
    }
  }

  private setupNetworkMonitoring(): void {
    errorService.onNetworkStateChange((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isOnline;
      
      if (!wasOnline && state.isOnline) {
        console.log('Network restored, subscriptions will resume automatically');
      } else if (wasOnline && !state.isOnline) {
        console.log('Network lost, subscriptions paused');
      }
    });
  }

  private setupPeriodicCleanup(): void {
    // Clean up stale subscriptions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const staleThreshold = 30 * 60 * 1000; // 30 minutes
      const staleSubscriptions: string[] = [];
      
      for (const [id, subscription] of this.activeSubscriptions) {
        if (now - subscription.lastUpdate > staleThreshold && subscription.updateCount === 0) {
          staleSubscriptions.push(id);
        }
      }
      
      if (staleSubscriptions.length > 0) {
        console.log(`Cleaning up ${staleSubscriptions.length} stale subscriptions`);
        staleSubscriptions.forEach(id => this.unsubscribe(id));
      }
    }, 5 * 60 * 1000);
  }
}

// Global sync service instance
export const syncService = new SyncService();