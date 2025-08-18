import { logError } from '$lib/logger';
/**
 * Event Bus for component communication
 * Provides a simple pub/sub pattern for decoupled component interaction
 */

type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();
  
  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }
  
  /**
   * Subscribe to an event once
   */
  once(event: string, callback: EventCallback): () => void {
    const wrappedCallback = (...args: any[]) => {
      callback(...args);
      this.off(event, wrappedCallback);
    };
    
    return this.on(event, wrappedCallback);
  }
  
  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }
  
  /**
   * Emit an event
   */
  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          logError(`Error in event handler for ${event}:`, error, 'Validation');
        }
      });
    }
  }
  
  /**
   * Clear all event listeners
   */
  clear(): void {
    this.events.clear();
  }
  
  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }
  
  /**
   * Get all event names
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Export convenience functions
export const on = eventBus.on.bind(eventBus);
export const once = eventBus.once.bind(eventBus);
export const off = eventBus.off.bind(eventBus);
export const emit = eventBus.emit.bind(eventBus);