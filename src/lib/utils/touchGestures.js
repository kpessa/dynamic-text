/**
 * iOS/Mobile Touch Gesture Handler for TPN Application
 * Optimized for medical professionals using iPad and iPhone devices
 */

/**
 * Touch gesture configuration optimized for medical use
 */
export const GESTURE_CONFIG = {
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
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...GESTURE_CONFIG, ...options };
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
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
      onPinchStart: options.onPinchStart || null,
      onPinchMove: options.onPinchMove || null,
      onPinchEnd: options.onPinchEnd || null,
      onTouchStart: options.onTouchStart || null,
      onTouchMove: options.onTouchMove || null,
      onTouchEnd: options.onTouchEnd || null,
      onLongPress: options.onLongPress || null
    };
    
    // Long press timer
    this.longPressTimer = null;
    
    this.init();
  }
  
  init() {
    const passiveOption = { 
      passive: this.options.PASSIVE_LISTENERS,
      capture: false 
    };
    
    // Touch event listeners
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), passiveOption);
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), passiveOption);
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), passiveOption);
    
    // iOS-specific optimizations
    if (this.isIOS) {
      this.setupIOSOptimizations();
    }
  }
  
  setupIOSOptimizations() {
    // Prevent iOS bounce effect
    this.element.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchState.startY = e.touches[0].pageY;
        
        // Prevent rubber-band scrolling at boundaries
        const isAtTop = this.element.scrollTop === 0;
        const isAtBottom = this.element.scrollHeight - this.element.scrollTop === this.element.clientHeight;
        
        if (isAtTop || isAtBottom) {
          this.preventBounce = true;
        }
      }
    }, { passive: true });
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    this.element.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }
  
  handleTouchStart(e) {
    const touch = e.touches[0];
    const now = Date.now();
    
    // Update touch state
    this.touchState.startX = touch.pageX;
    this.touchState.startY = touch.pageY;
    this.touchState.startTime = now;
    this.touchState.isMultiTouch = e.touches.length > 1;
    
    // Handle multi-touch (pinch/zoom)
    if (e.touches.length === 2) {
      this.touchState.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.touchState.lastScale = 1;
      
      if (this.callbacks.onPinchStart) {
        this.callbacks.onPinchStart({ scale: 1, touches: e.touches });
      }
    }
    
    // Start long press timer
    if (!this.touchState.isMultiTouch) {
      this.longPressTimer = setTimeout(() => {
        if (this.callbacks.onLongPress) {
          this.callbacks.onLongPress({ 
            x: touch.pageX, 
            y: touch.pageY, 
            element: this.element 
          });
          
          // Provide haptic feedback
          this.triggerHaptic();
        }
      }, 500); // 500ms for long press
    }
    
    // Visual feedback for medical use
    this.element.classList.add('touch-active');
    
    // Callback
    if (this.callbacks.onTouchStart) {
      this.callbacks.onTouchStart(e);
    }
  }
  
  handleTouchMove(e) {
    const touch = e.touches[0];
    
    // Clear long press if user moves
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    // Handle pinch gesture
    if (e.touches.length === 2) {
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / this.touchState.initialDistance;
      
      if (Math.abs(scale - this.touchState.lastScale) > 0.01) {
        this.touchState.lastScale = scale;
        
        if (this.callbacks.onPinchMove) {
          this.callbacks.onPinchMove({ 
            scale, 
            delta: scale - 1,
            touches: e.touches 
          });
        }
      }
      
      // Prevent default to stop iOS zoom
      e.preventDefault();
      return;
    }
    
    // Prevent iOS bounce if needed
    if (this.isIOS && this.preventBounce) {
      const currentY = touch.pageY;
      const isAtTop = this.element.scrollTop === 0;
      const isAtBottom = this.element.scrollHeight - this.element.scrollTop === this.element.clientHeight;
      
      if ((isAtTop && currentY > this.touchState.startY) || 
          (isAtBottom && currentY < this.touchState.startY)) {
        e.preventDefault();
      }
    }
    
    // Callback
    if (this.callbacks.onTouchMove) {
      this.callbacks.onTouchMove(e);
    }
  }
  
  handleTouchEnd(e) {
    const touch = e.changedTouches[0];
    const endTime = Date.now();
    const elapsedTime = endTime - this.touchState.startTime;
    
    // Clear timers
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    // Remove visual feedback
    this.element.classList.remove('touch-active');
    this.preventBounce = false;
    
    // Handle pinch end
    if (this.touchState.isMultiTouch && e.touches.length <= 1) {
      if (this.callbacks.onPinchEnd) {
        this.callbacks.onPinchEnd({ 
          finalScale: this.touchState.lastScale,
          touches: e.changedTouches 
        });
      }
      this.touchState.isMultiTouch = false;
      return;
    }
    
    // Skip swipe detection if touch was too long (likely scroll)
    if (elapsedTime > this.options.SWIPE_TIME_LIMIT) {
      if (this.callbacks.onTouchEnd) {
        this.callbacks.onTouchEnd(e);
      }
      return;
    }
    
    // Calculate swipe parameters
    const distX = touch.pageX - this.touchState.startX;
    const distY = touch.pageY - this.touchState.startY;
    const absDistX = Math.abs(distX);
    const absDistY = Math.abs(distY);
    
    // Check for horizontal swipe
    if (absDistX >= this.options.SWIPE_THRESHOLD && 
        absDistY <= this.options.SWIPE_RESTRAINT) {
      
      const direction = distX > 0 ? 'right' : 'left';
      const velocity = absDistX / elapsedTime;
      
      if (velocity >= this.options.VELOCITY_THRESHOLD) {
        this.triggerHaptic();
        
        if (direction === 'right' && this.callbacks.onSwipeRight) {
          this.callbacks.onSwipeRight({ 
            distance: absDistX, 
            velocity, 
            duration: elapsedTime 
          });
        } else if (direction === 'left' && this.callbacks.onSwipeLeft) {
          this.callbacks.onSwipeLeft({ 
            distance: absDistX, 
            velocity, 
            duration: elapsedTime 
          });
        }
      }
    }
    
    // Check for vertical swipe
    else if (absDistY >= this.options.SWIPE_THRESHOLD && 
             absDistX <= this.options.SWIPE_RESTRAINT) {
      
      const direction = distY > 0 ? 'down' : 'up';
      const velocity = absDistY / elapsedTime;
      
      if (velocity >= this.options.VELOCITY_THRESHOLD) {
        this.triggerHaptic();
        
        if (direction === 'down' && this.callbacks.onSwipeDown) {
          this.callbacks.onSwipeDown({ 
            distance: absDistY, 
            velocity, 
            duration: elapsedTime 
          });
        } else if (direction === 'up' && this.callbacks.onSwipeUp) {
          this.callbacks.onSwipeUp({ 
            distance: absDistY, 
            velocity, 
            duration: elapsedTime 
          });
        }
      }
    }
    
    // Callback
    if (this.callbacks.onTouchEnd) {
      this.callbacks.onTouchEnd(e);
    }
  }
  
  handleTouchCancel(e) {
    // Clean up on touch cancel
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    this.element.classList.remove('touch-active');
    this.preventBounce = false;
    this.touchState.isMultiTouch = false;
  }
  
  getDistance(touch1, touch2) {
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  triggerHaptic() {
    if (this.options.HAPTIC_ENABLED && navigator.vibrate) {
      // Light haptic feedback for medical precision
      navigator.vibrate(10);
    }
  }
  
  destroy() {
    // Remove all event listeners
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    
    // Clear timers
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }
}

/**
 * Pull-to-refresh implementation for mobile
 */
export class PullToRefresh {
  constructor(element, callback, options = {}) {
    this.element = element;
    this.callback = callback;
    this.options = {
      threshold: 120,
      maxPull: 200,
      refreshThreshold: 60,
      ...options
    };
    
    this.isPulling = false;
    this.pullDistance = 0;
    this.startY = 0;
    
    this.init();
  }
  
  init() {
    this.element.addEventListener('touchstart', this.handleStart.bind(this), { passive: true });
    this.element.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleEnd.bind(this), { passive: true });
  }
  
  handleStart(e) {
    if (this.element.scrollTop === 0) {
      this.startY = e.touches[0].pageY;
      this.isPulling = true;
    }
  }
  
  handleMove(e) {
    if (!this.isPulling) return;
    
    const currentY = e.touches[0].pageY;
    this.pullDistance = Math.min(currentY - this.startY, this.options.maxPull);
    
    if (this.pullDistance > 0) {
      e.preventDefault();
      
      // Update visual indicator
      this.updatePullIndicator(this.pullDistance);
    }
  }
  
  handleEnd(e) {
    if (!this.isPulling) return;
    
    this.isPulling = false;
    
    if (this.pullDistance >= this.options.refreshThreshold) {
      this.triggerRefresh();
    } else {
      this.resetPull();
    }
  }
  
  updatePullIndicator(distance) {
    const progress = Math.min(distance / this.options.threshold, 1);
    
    // Add visual feedback class
    this.element.style.setProperty('--pull-distance', `${distance}px`);
    this.element.style.setProperty('--pull-progress', progress);
    
    if (distance >= this.options.refreshThreshold) {
      this.element.classList.add('pull-ready');
    } else {
      this.element.classList.remove('pull-ready');
    }
  }
  
  triggerRefresh() {
    this.element.classList.add('pull-refreshing');
    
    // Trigger haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
    
    // Execute callback
    Promise.resolve(this.callback()).finally(() => {
      this.resetPull();
    });
  }
  
  resetPull() {
    this.element.classList.remove('pull-ready', 'pull-refreshing');
    this.element.style.removeProperty('--pull-distance');
    this.element.style.removeProperty('--pull-progress');
    this.pullDistance = 0;
  }
}

/**
 * Keyboard height detection for mobile devices
 */
export class KeyboardManager {
  constructor() {
    this.isKeyboardOpen = false;
    this.initialViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    this.callbacks = [];
    
    this.init();
  }
  
  init() {
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.handleViewportChange.bind(this));
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', this.handleWindowResize.bind(this));
    }
  }
  
  handleViewportChange() {
    const currentHeight = window.visualViewport.height;
    const heightDifference = this.initialViewportHeight - currentHeight;
    
    const wasKeyboardOpen = this.isKeyboardOpen;
    this.isKeyboardOpen = heightDifference > 150; // Threshold for keyboard detection
    
    if (wasKeyboardOpen !== this.isKeyboardOpen) {
      this.notifyCallbacks({
        isOpen: this.isKeyboardOpen,
        height: heightDifference,
        viewportHeight: currentHeight
      });
    }
  }
  
  handleWindowResize() {
    // Fallback implementation
    const currentHeight = window.innerHeight;
    const heightDifference = this.initialViewportHeight - currentHeight;
    
    const wasKeyboardOpen = this.isKeyboardOpen;
    this.isKeyboardOpen = heightDifference > 150;
    
    if (wasKeyboardOpen !== this.isKeyboardOpen) {
      this.notifyCallbacks({
        isOpen: this.isKeyboardOpen,
        height: heightDifference,
        viewportHeight: currentHeight
      });
    }
  }
  
  onKeyboardToggle(callback) {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }
  
  notifyCallbacks(data) {
    this.callbacks.forEach(callback => callback(data));
  }
}

// Initialize keyboard manager instance
export const keyboardManager = new KeyboardManager();