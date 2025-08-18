/**
 * Centralized logging system for the Dynamic Text Editor
 * Provides structured logging with different levels and optional remote logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
    
    // Load log level from environment or localStorage
    const envLogLevel = import.meta.env['VITE_LOG_LEVEL'];
    const storedLogLevel = typeof window !== 'undefined' 
      ? localStorage.getItem('logLevel') 
      : null;
    
    if (envLogLevel) {
      this.logLevel = LogLevel[envLogLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
    } else if (storedLogLevel) {
      this.logLevel = parseInt(storedLogLevel, 10);
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    if (typeof window !== 'undefined') {
      localStorage.setItem('logLevel', level.toString());
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}]` : '';
    return `${timestamp} ${level} ${context} ${entry.message}`;
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Add to buffer for potential remote logging
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Console output in development
    if (this.isDevelopment || entry.level >= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage(entry);
      
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, entry.data);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, entry.data);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, entry.data);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, entry.data, entry.error);
          break;
      }
    }

    // Send critical errors to monitoring service
    if (entry.level === LogLevel.ERROR && !this.isDevelopment) {
      this.sendToMonitoring(entry);
    }
  }

  private sendToMonitoring(_entry: LogEntry): void {
    // Integration point for error monitoring services (Sentry, LogRocket, etc.)
    // This is a placeholder for future implementation
    if (window.onerror) {
      // Could integrate with error tracking service here
      // Would use _entry parameter when implemented
    }
  }

  debug(message: string, context?: string, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date()
    };
    if (context !== undefined) entry.context = context;
    if (data !== undefined) entry.data = data;
    this.log(entry);
  }

  info(message: string, context?: string, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      timestamp: new Date()
    };
    if (context !== undefined) entry.context = context;
    if (data !== undefined) entry.data = data;
    this.log(entry);
  }

  warn(message: string, context?: string, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      timestamp: new Date()
    };
    if (context !== undefined) entry.context = context;
    if (data !== undefined) entry.data = data;
    this.log(entry);
  }

  error(message: string, error?: Error, context?: string, data?: any): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date()
    };
    if (context !== undefined) entry.context = context;
    if (data !== undefined) entry.data = data;
    if (error !== undefined) entry.error = error;
    this.log(entry);
  }

  // Group logging for related operations
  group(label: string): void {
    if (this.isDevelopment && this.shouldLog(LogLevel.DEBUG)) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment && this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  // Performance logging
  time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }

  // Get buffered logs for debugging
  getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Clear log buffer
  clearBuffer(): void {
    this.logBuffer = [];
  }

  // Export logs for debugging
  exportLogs(): string {
    return this.logBuffer
      .map(entry => this.formatMessage(entry))
      .join('\n');
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = (message: string, context?: string, data?: any) => 
  logger.debug(message, context, data);

export const logInfo = (message: string, context?: string, data?: any) => 
  logger.info(message, context, data);

export const logWarn = (message: string, context?: string, data?: any) => 
  logger.warn(message, context, data);

export const logError = (message: string, error?: Error, context?: string, data?: any) => 
  logger.error(message, error, context, data);

// Performance helpers
export const logPerformance = {
  start: (label: string) => logger.time(label),
  end: (label: string) => logger.timeEnd(label)
};

// Structured logging for specific domains
export const logFirebase = {
  debug: (message: string, data?: any) => logger.debug(message, 'Firebase', data),
  info: (message: string, data?: any) => logger.info(message, 'Firebase', data),
  warn: (message: string, data?: any) => logger.warn(message, 'Firebase', data),
  error: (message: string, error?: Error, data?: any) => 
    logger.error(message, error, 'Firebase', data)
};

export const logTPN = {
  debug: (message: string, data?: any) => logger.debug(message, 'TPN', data),
  info: (message: string, data?: any) => logger.info(message, 'TPN', data),
  warn: (message: string, data?: any) => logger.warn(message, 'TPN', data),
  error: (message: string, error?: Error, data?: any) => 
    logger.error(message, error, 'TPN', data)
};

export const logUI = {
  debug: (message: string, data?: any) => logger.debug(message, 'UI', data),
  info: (message: string, data?: any) => logger.info(message, 'UI', data),
  warn: (message: string, data?: any) => logger.warn(message, 'UI', data),
  error: (message: string, error?: Error, data?: any) => 
    logger.error(message, error, 'UI', data)
};