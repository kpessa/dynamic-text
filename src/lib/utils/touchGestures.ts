/**
 * iOS/Mobile Touch Gesture Handler for TPN Application
 * Optimized for medical professionals using iPad and iPhone devices
 */

interface GestureConfig {
  SWIPE_THRESHOLD: number;
  SWIPE_RESTRAINT: number;
  SWIPE_TIME_LIMIT: number;
  TOUCH_THRESHOLD: number;
  MEDICAL_TOUCH: number;
  VELOCITY_THRESHOLD: number;
  PINCH_THRESHOLD: number;
  HAPTIC_ENABLED: boolean;
  PASSIVE_LISTENERS: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isMultiTouch: boolean;
  initialDistance: number;
  lastScale: number;
}

interface GestureCallbacks {
  onSwipeLeft?: ((data: any) => void) | null;
  onSwipeRight?: ((data: any) => void) | null;
  onSwipeUp?: ((data: any) => void) | null;
  onSwipeDown?: ((data: any) => void) | null;
  onPinchIn?: ((data: any) => void) | null;
  onPinchOut?: ((data: any) => void) | null;
  onDoubleTap?: ((data: any) => void) | null;
  onLongPress?: ((data: any) => void) | null;
  onRotate?: ((data: any) => void) | null;
}

/**
 * Touch gesture configuration optimized for medical use
 */
export const GESTURE_CONFIG: GestureConfig = {
  // Swipe detection thresholds
  SWIPE_THRESHOLD: 50,     // Minimum distance for swipe
  SWIPE_RESTRAINT: 100,    // Maximum perpendicular distance
  SWIPE_TIME_LIMIT: 300,   // Maximum time for swipe gesture
  
  // Touch targets optimized for medical gloves
  TOUCH_THRESHOLD: 44,     // iOS minimum touch target
  MEDICAL_TOUCH: 56,       // Comfortable with medical gloves
  
  // Gesture sensitivity
  VELOCITY_THRESHOLD: 0.3, // Minimum velocity for gesture recognition
  PINCH_THRESHOLD: 1.1,    // Minimum scale change for pinch detection
  
  // iOS-specific optimizations
  HAPTIC_ENABLED: typeof window !== 'undefined' && 'vibrate' in navigator,
  PASSIVE_LISTENERS: true  // Use passive listeners for better scrolling
};

/**
 * Enhanced touch event handler with iOS optimizations
 */
export class TouchGestureHandler {
  private element: HTMLElement;
  private options: GestureConfig;
  private isIOS: boolean;
  private touchState: TouchState;
  private callbacks: GestureCallbacks;
  private longPressTimeout: number | null = null;
  private doubleTapTimeout: number | null = null;
  private lastTapTime = 0;

  constructor(element: HTMLElement, options: Partial<GestureConfig & GestureCallbacks> = {}) {
    this.element = element;
    this.options = { ...GESTURE_CONFIG, ...options };
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Touch state
    this.touchState = {
      startX: 0,
      startY: 0,
      startTime: 0,
      isMultiTouch: false,
      initialDistance: 0,
      lastScale: 1
    };
    
    // Gesture callbacks
    this.callbacks = {
      onSwipeLeft: options.onSwipeLeft || null,
      onSwipeRight: options.onSwipeRight || null,
      onSwipeUp: options.onSwipeUp || null,
      onSwipeDown: options.onSwipeDown || null,
      onPinchIn: options.onPinchIn || null,
      onPinchOut: options.onPinchOut || null,
      onDoubleTap: options.onDoubleTap || null,
      onLongPress: options.onLongPress || null,
      onRotate: options.onRotate || null
    };
    
    this.init();
  }

  /**
   * Initialize touch event listeners
   */
  private init(): void {
    const options = this.options.PASSIVE_LISTENERS ? { passive: true } : false;
    
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), options);
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), options);
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), options);
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), options);
    
    // iOS-specific: Prevent default zoom behavior
    if (this.isIOS) {
      this.element.addEventListener('gesturestart', (e) => e.preventDefault());
      this.element.addEventListener('gesturechange', (e) => e.preventDefault());
      this.element.addEventListener('gestureend', (e) => e.preventDefault());
    }
  }

  /**
   * Handle touch start event
   */
  private handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touch) return;
    
    this.touchState.startX = touch.pageX;
    this.touchState.startY = touch.pageY;
    this.touchState.startTime = Date.now();
    this.touchState.isMultiTouch = event.touches.length > 1;
    
    // Multi-touch for pinch gesture
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      if (!touch1 || !touch2) return;
      const distance = this.getDistance(touch1, touch2);
      this.touchState.initialDistance = distance;
    }
    
    // Long press detection
    if (this.callbacks.onLongPress) {
      this.longPressTimeout = window.setTimeout(() => {
        if (this.callbacks.onLongPress) {
          this.callbacks.onLongPress({ x: touch.pageX, y: touch.pageY });
          this.triggerHaptic();
        }
      }, 500);
    }
    
    // Double tap detection
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastTapTime;
    
    if (timeDiff < 300 && timeDiff > 0) {
      if (this.callbacks.onDoubleTap) {
        this.callbacks.onDoubleTap({ x: touch.pageX, y: touch.pageY });
        this.triggerHaptic();
      }
    }
    
    this.lastTapTime = currentTime;
  }

  /**
   * Handle touch move event
   */
  private handleTouchMove(event: TouchEvent): void {
    // Clear long press if moving
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    
    // Handle pinch gesture
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      if (!touch1 || !touch2) return;
      const distance = this.getDistance(touch1, touch2);
      const scale = distance / this.touchState.initialDistance;
      
      if (Math.abs(scale - this.touchState.lastScale) > 0.01) {
        if (scale > this.options.PINCH_THRESHOLD && this.callbacks.onPinchOut) {
          this.callbacks.onPinchOut({ scale });
          this.touchState.lastScale = scale;
        } else if (scale < (1 / this.options.PINCH_THRESHOLD) && this.callbacks.onPinchIn) {
          this.callbacks.onPinchIn({ scale });
          this.touchState.lastScale = scale;
        }
      }
    }
  }

  /**
   * Handle touch end event
   */
  private handleTouchEnd(event: TouchEvent): void {
    // Clear long press
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    
    // Skip if multi-touch
    if (this.touchState.isMultiTouch) return;
    
    const touch = event.changedTouches[0];
    if (!touch) return;
    const distX = touch.pageX - this.touchState.startX;
    const distY = touch.pageY - this.touchState.startY;
    const elapsedTime = Date.now() - this.touchState.startTime;
    
    // Check if it's a swipe
    if (elapsedTime <= this.options.SWIPE_TIME_LIMIT) {
      const absDistX = Math.abs(distX);
      const absDistY = Math.abs(distY);
      
      // Horizontal swipe
      if (absDistX >= this.options.SWIPE_THRESHOLD && absDistY <= this.options.SWIPE_RESTRAINT) {
        const velocity = absDistX / elapsedTime;
        
        if (velocity >= this.options.VELOCITY_THRESHOLD) {
          if (distX < 0 && this.callbacks.onSwipeLeft) {
            this.callbacks.onSwipeLeft({ velocity, distance: absDistX });
            this.triggerHaptic();
          } else if (distX > 0 && this.callbacks.onSwipeRight) {
            this.callbacks.onSwipeRight({ velocity, distance: absDistX });
            this.triggerHaptic();
          }
        }
      }
      
      // Vertical swipe
      if (absDistY >= this.options.SWIPE_THRESHOLD && absDistX <= this.options.SWIPE_RESTRAINT) {
        const velocity = absDistY / elapsedTime;
        
        if (velocity >= this.options.VELOCITY_THRESHOLD) {
          if (distY < 0 && this.callbacks.onSwipeUp) {
            this.callbacks.onSwipeUp({ velocity, distance: absDistY });
            this.triggerHaptic();
          } else if (distY > 0 && this.callbacks.onSwipeDown) {
            this.callbacks.onSwipeDown({ velocity, distance: absDistY });
            this.triggerHaptic();
          }
        }
      }
    }
  }

  /**
   * Handle touch cancel event
   */
  private handleTouchCancel(): void {
    // Clear any pending timeouts
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    
    if (this.doubleTapTimeout) {
      clearTimeout(this.doubleTapTimeout);
      this.doubleTapTimeout = null;
    }
    
    // Reset touch state
    this.touchState = {
      startX: 0,
      startY: 0,
      startTime: 0,
      isMultiTouch: false,
      initialDistance: 0,
      lastScale: 1
    };
  }

  /**
   * Calculate distance between two touch points
   */
  private getDistance(touch1: Touch, touch2: Touch): number {
    const x = touch2.pageX - touch1.pageX;
    const y = touch2.pageY - touch1.pageY;
    return Math.sqrt(x * x + y * y);
  }

  /**
   * Trigger haptic feedback on iOS devices
   */
  private triggerHaptic(): void {
    if (this.options.HAPTIC_ENABLED && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  /**
   * Cleanup event listeners
   */
  public destroy(): void {
    const options = this.options.PASSIVE_LISTENERS ? { passive: true } : false;
    
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this), options as any);
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this), options as any);
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this), options as any);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this), options as any);
    
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
    }
    
    if (this.doubleTapTimeout) {
      clearTimeout(this.doubleTapTimeout);
    }
  }
}

/**
 * iOS-specific viewport and zoom utilities
 */
export class IOSViewportManager {
  private metaViewport: HTMLMetaElement | null;
  private originalContent: string;

  constructor() {
    this.metaViewport = document.querySelector('meta[name="viewport"]');
    this.originalContent = this.metaViewport?.content || '';
  }

  /**
   * Prevent iOS zoom on input focus
   */
  public preventZoomOnFocus(): void {
    if (!this.metaViewport) return;
    
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        this.metaViewport!.content = 'width=device-width, initial-scale=1, maximum-scale=1';
      });
      
      input.addEventListener('blur', () => {
        this.metaViewport!.content = this.originalContent;
      });
    });
  }

  /**
   * Lock viewport to prevent unwanted scrolling/zooming
   */
  public lockViewport(): void {
    if (!this.metaViewport) return;
    
    this.metaViewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    
    // Prevent bounce scrolling on iOS
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';
  }

  /**
   * Unlock viewport to restore normal behavior
   */
  public unlockViewport(): void {
    if (!this.metaViewport) return;
    
    this.metaViewport.content = this.originalContent;
    
    // Restore normal scrolling
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.overflow = '';
  }
}

/**
 * Medical-specific touch optimizations
 */
export class MedicalTouchOptimizer {
  /**
   * Enhance touch targets for medical use
   */
  public static enhanceTouchTargets(container: HTMLElement): void {
    const buttons = container.querySelectorAll('button, a, [role="button"]');
    
    buttons.forEach(button => {
      const element = button as HTMLElement;
      const rect = element.getBoundingClientRect();
      
      // Ensure minimum touch target size
      if (rect.width < GESTURE_CONFIG.MEDICAL_TOUCH || rect.height < GESTURE_CONFIG.MEDICAL_TOUCH) {
        element.style.minWidth = `${GESTURE_CONFIG.MEDICAL_TOUCH}px`;
        element.style.minHeight = `${GESTURE_CONFIG.MEDICAL_TOUCH}px`;
        element.style.padding = '12px';
      }
    });
  }

  /**
   * Add visual feedback for touches
   */
  public static addTouchFeedback(element: HTMLElement): void {
    element.addEventListener('touchstart', () => {
      element.style.opacity = '0.7';
      element.style.transform = 'scale(0.98)';
    });
    
    element.addEventListener('touchend', () => {
      element.style.opacity = '';
      element.style.transform = '';
    });
    
    element.addEventListener('touchcancel', () => {
      element.style.opacity = '';
      element.style.transform = '';
    });
  }

  /**
   * Optimize scrolling for medical lists
   */
  public static optimizeScrolling(container: HTMLElement): void {
    // Enable momentum scrolling on iOS
    (container.style as any).webkitOverflowScrolling = 'touch';
    container.style.overflowY = 'auto';
    
    // Add scroll indicators
    let scrollTimeout: number | null = null;
    
    container.addEventListener('scroll', () => {
      container.classList.add('scrolling');
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = window.setTimeout(() => {
        container.classList.remove('scrolling');
      }, 150);
    }, { passive: true });
  }
}

/**
 * Factory function to create gesture handler
 */
export function createGestureHandler(
  element: HTMLElement,
  callbacks: GestureCallbacks
): TouchGestureHandler {
  return new TouchGestureHandler(element, callbacks);
}

/**
 * Utility to detect iOS device capabilities
 */
export function getIOSCapabilities(): {
  isIOS: boolean;
  hasTouch: boolean;
  hasHaptic: boolean;
  screenSize: 'phone' | 'tablet' | 'desktop';
} {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const hasTouch = 'ontouchstart' in window;
  const hasHaptic = 'vibrate' in navigator;
  
  let screenSize: 'phone' | 'tablet' | 'desktop' = 'desktop';
  
  if (window.innerWidth < 768) {
    screenSize = 'phone';
  } else if (window.innerWidth < 1024) {
    screenSize = 'tablet';
  }
  
  return { isIOS, hasTouch, hasHaptic, screenSize };
}

/**
 * Apply iOS-specific optimizations
 */
export function applyIOSOptimizations(): void {
  const capabilities = getIOSCapabilities();
  
  if (capabilities.isIOS) {
    // Apply viewport optimizations
    const viewportManager = new IOSViewportManager();
    viewportManager.preventZoomOnFocus();
    
    // Enhance touch targets
    MedicalTouchOptimizer.enhanceTouchTargets(document.body);
    
    // Optimize scrolling
    const scrollContainers = document.querySelectorAll('.scroll-container');
    scrollContainers.forEach(container => {
      MedicalTouchOptimizer.optimizeScrolling(container as HTMLElement);
    });
    
    // Add iOS-specific class for CSS targeting
    document.body.classList.add('ios-device');
    document.body.classList.add(`screen-${capabilities.screenSize}`);
  }
}