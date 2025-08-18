// Event bus for decoupled component communication

type EventCallback = (...args: any[]) => void;
type UnsubscribeFn = () => void;

class EventBus {
  private events: Map<string, Set<EventCallback>>;
  
  constructor() {
    this.events = new Map();
  }
  
  // Subscribe to an event
  on(event: string, callback: EventCallback): UnsubscribeFn {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    const callbacks = this.events.get(event)!;
    callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    };
  }
  
  // Subscribe to an event once
  once(event: string, callback: EventCallback): UnsubscribeFn {
    const unsubscribe = this.on(event, (...args) => {
      callback(...args);
      unsubscribe();
    });
    return unsubscribe;
  }
  
  // Emit an event
  emit(event: string, ...args: any[]): void {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event)!;
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        // logError(`Error in event handler for ${event}:`, error, 'Validation');
      }
    });
  }
  
  // Remove all listeners for an event
  off(event: string): void {
    this.events.delete(event);
  }
  
  // Clear all event listeners
  clear(): void {
    this.events.clear();
  }
}

// Create singleton instance
export const eventBus = new EventBus();

// Define event types as constants for consistency
export const Events = {
  // Document events
  DOCUMENT_NEW: 'document:new',
  DOCUMENT_SAVE: 'document:save',
  DOCUMENT_SAVED: 'document:saved',
  DOCUMENT_LOAD: 'document:load',
  DOCUMENT_LOADED: 'document:loaded',
  DOCUMENT_EXPORT: 'document:export',
  DOCUMENT_MODIFIED: 'document:modified',
  
  // Section events
  SECTION_ADD: 'section:add',
  SECTION_UPDATE: 'section:update',
  SECTION_DELETE: 'section:delete',
  SECTION_MOVE: 'section:move',
  SECTION_EDIT_START: 'section:edit:start',
  SECTION_EDIT_END: 'section:edit:end',
  
  // Test events
  TEST_RUN_ALL: 'test:run:all',
  TEST_RUN_SECTION: 'test:run:section',
  TEST_COMPLETE: 'test:complete',
  TEST_GENERATE: 'test:generate',
  TEST_IMPORT: 'test:import',
  
  // TPN events
  TPN_MODE_TOGGLE: 'tpn:mode:toggle',
  TPN_VALUES_CHANGE: 'tpn:values:change',
  TPN_INGREDIENT_SELECT: 'tpn:ingredient:select',
  TPN_POPULATION_CHANGE: 'tpn:population:change',
  TPN_REFERENCE_LOAD: 'tpn:reference:load',
  
  // UI events
  UI_MODAL_OPEN: 'ui:modal:open',
  UI_MODAL_CLOSE: 'ui:modal:close',
  UI_SIDEBAR_TOGGLE: 'ui:sidebar:toggle',
  UI_PREVIEW_TOGGLE: 'ui:preview:toggle',
  UI_VIEW_CHANGE: 'ui:view:change',
  UI_NOTIFICATION: 'ui:notification',
  
  // Firebase events
  FIREBASE_SYNC_START: 'firebase:sync:start',
  FIREBASE_SYNC_COMPLETE: 'firebase:sync:complete',
  FIREBASE_SYNC_ERROR: 'firebase:sync:error',
  FIREBASE_AUTH_CHANGE: 'firebase:auth:change',
  
  // Validation events
  VALIDATION_UPDATE: 'validation:update',
  VALIDATION_COMPLETE: 'validation:complete',
  
  // Configuration events
  CONFIG_ACTIVATE: 'config:activate',
  CONFIG_DEACTIVATE: 'config:deactivate',
  CONFIG_UPDATE: 'config:update'
} as const;

// Type for event names
export type EventName = typeof Events[keyof typeof Events];

// Helper function to create a typed event emitter
export function createEventEmitter(eventBus: EventBus, event: string) {
  return (...args: any[]) => eventBus.emit(event, ...args);
}

// Create pre-bound emitters for common events
export const emitDocumentSave = createEventEmitter(eventBus, Events.DOCUMENT_SAVE);
export const emitDocumentModified = createEventEmitter(eventBus, Events.DOCUMENT_MODIFIED);
export const emitSectionUpdate = createEventEmitter(eventBus, Events.SECTION_UPDATE);
export const emitTestRunAll = createEventEmitter(eventBus, Events.TEST_RUN_ALL);
export const emitUINotification = createEventEmitter(eventBus, Events.UI_NOTIFICATION);