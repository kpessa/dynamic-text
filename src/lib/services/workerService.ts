/**
 * Web Worker Service for TPN Dynamic Text Editor
 * Manages Web Workers for heavy computations to maintain UI responsiveness
 */

interface WorkerMessage {
  id: string
  type: string
  payload?: any
}

interface WorkerResponse {
  id: string
  success: boolean
  result?: any
  error?: string
  stack?: string
}

class WorkerManager {
  private worker: Worker | null = null
  private pendingMessages = new Map<string, { resolve: Function, reject: Function, timestamp: number }>()
  private messageId = 0
  private isInitialized = false
  private workerPath: string
  private maxRetries = 3
  private retryDelay = 1000
  
  constructor(workerPath: string) {
    this.workerPath = workerPath
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return
    }
    
    try {
      // Create worker
      this.worker = new Worker(this.workerPath)
      
      // Set up message handling
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data)
      }
      
      this.worker.onerror = (error) => {
        console.error('[WorkerService] Worker error:', error)
        this.handleWorkerError(error)
      }
      
      // Initialize worker
      await this.sendMessage('INITIALIZE', {})
      
      this.isInitialized = true
      console.log('[WorkerService] Worker initialized successfully')
      
    } catch (error) {
      console.error('[WorkerService] Failed to initialize worker:', error)
      throw error
    }
  }
  
  private handleWorkerMessage(response: WorkerResponse) {
    const { id, success, result, error } = response
    
    const pending = this.pendingMessages.get(id)
    if (!pending) {
      console.warn('[WorkerService] Received response for unknown message:', id)
      return
    }
    
    this.pendingMessages.delete(id)
    
    if (success) {
      pending.resolve(result)
    } else {
      pending.reject(new Error(error || 'Worker operation failed'))
    }
  }
  
  private handleWorkerError(error: ErrorEvent) {
    console.error('[WorkerService] Worker error:', error)
    
    // Reject all pending messages
    this.pendingMessages.forEach(({ reject }) => {
      reject(new Error('Worker crashed'))
    })
    this.pendingMessages.clear()
    
    // Try to restart worker
    this.restart()
  }
  
  private async restart() {
    console.log('[WorkerService] Restarting worker...')
    
    this.terminate()
    this.isInitialized = false
    
    // Retry with backoff
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)))
        await this.initialize()
        console.log('[WorkerService] Worker restarted successfully')
        return
      } catch (error) {
        console.error(`[WorkerService] Restart attempt ${i + 1} failed:`, error)
      }
    }
    
    console.error('[WorkerService] Failed to restart worker after maximum retries')
  }
  
  private generateMessageId(): string {
    return `msg_${++this.messageId}_${Date.now()}`
  }
  
  async sendMessage(type: string, payload?: any, timeout: number = 10000): Promise<any> {
    if (!this.worker || !this.isInitialized) {
      await this.initialize()
    }
    
    const id = this.generateMessageId()
    const message: WorkerMessage = { id, type, payload }
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingMessages.delete(id)
        reject(new Error(`Worker message timeout: ${type}`))
      }, timeout)
      
      // Store promise resolvers
      this.pendingMessages.set(id, {
        resolve: (result: any) => {
          clearTimeout(timeoutId)
          resolve(result)
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId)
          reject(error)
        },
        timestamp: Date.now()
      })
      
      // Send message to worker
      this.worker!.postMessage(message)
    })
  }
  
  // Clean up pending messages that are too old
  private cleanupPendingMessages() {
    const now = Date.now()
    const maxAge = 30000 // 30 seconds
    
    for (const [id, { timestamp, reject }] of this.pendingMessages.entries()) {
      if (now - timestamp > maxAge) {
        reject(new Error('Message expired'))
        this.pendingMessages.delete(id)
      }
    }
  }
  
  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    
    this.pendingMessages.clear()
    this.isInitialized = false
  }
  
  isReady(): boolean {
    return this.isInitialized && this.worker !== null
  }
  
  getPendingMessageCount(): number {
    return this.pendingMessages.size
  }
}

// TPN Worker Service
class TPNWorkerService {
  private workerManager: WorkerManager
  private calculationCache = new Map<string, any>()
  private cacheMaxSize = 50
  
  constructor() {
    this.workerManager = new WorkerManager('/workers/tpnWorker.js')
    
    // Cleanup old pending messages periodically
    setInterval(() => {
      this.workerManager['cleanupPendingMessages']()
    }, 15000)
  }
  
  async initialize(): Promise<void> {
    await this.workerManager.initialize()
  }
  
  // Calculate TPN formulation
  async calculateTPN(patientData: any, ingredients: any[]): Promise<any> {
    // Create cache key
    const cacheKey = JSON.stringify({ patientData, ingredients })
    
    // Check local cache first
    if (this.calculationCache.has(cacheKey)) {
      console.log('[TPNWorkerService] Cache hit for TPN calculation')
      return this.calculationCache.get(cacheKey)
    }
    
    try {
      const result = await this.workerManager.sendMessage('CALCULATE_TPN', {
        patientData,
        ingredients
      })
      
      // Cache the result
      this.cacheResult(cacheKey, result)
      
      return result
    } catch (error) {
      console.error('[TPNWorkerService] TPN calculation failed:', error)
      throw error
    }
  }
  
  // Batch calculate multiple TPN scenarios
  async batchCalculate(scenarios: any[]): Promise<any[]> {
    try {
      const results = await this.workerManager.sendMessage('BATCH_CALCULATE', {
        scenarios
      })
      
      return results
    } catch (error) {
      console.error('[TPNWorkerService] Batch calculation failed:', error)
      throw error
    }
  }
  
  // Calculate base requirements
  async calculateRequirements(patientData: any): Promise<any> {
    try {
      const result = await this.workerManager.sendMessage('CALCULATE_REQUIREMENTS', {
        patientData
      })
      
      return result
    } catch (error) {
      console.error('[TPNWorkerService] Requirements calculation failed:', error)
      throw error
    }
  }
  
  // Validate TPN formulation
  async validateTPN(tpnResult: any, patientData: any): Promise<any> {
    try {
      const result = await this.workerManager.sendMessage('VALIDATE_TPN', {
        tpnResult,
        patientData
      })
      
      return result
    } catch (error) {
      console.error('[TPNWorkerService] TPN validation failed:', error)
      throw error
    }
  }
  
  // Get performance metrics from worker
  async getPerformanceMetrics(): Promise<any> {
    try {
      const metrics = await this.workerManager.sendMessage('GET_PERFORMANCE_METRICS')
      return metrics
    } catch (error) {
      console.error('[TPNWorkerService] Failed to get performance metrics:', error)
      return null
    }
  }
  
  // Clear worker cache
  async clearCache(): Promise<void> {
    try {
      await this.workerManager.sendMessage('CLEAR_CACHE')
      this.calculationCache.clear()
      console.log('[TPNWorkerService] Cache cleared')
    } catch (error) {
      console.error('[TPNWorkerService] Failed to clear cache:', error)
    }
  }
  
  private cacheResult(key: string, result: any) {
    // Implement LRU cache
    if (this.calculationCache.size >= this.cacheMaxSize) {
      const firstKey = this.calculationCache.keys().next().value
      this.calculationCache.delete(firstKey)
    }
    
    this.calculationCache.set(key, result)
  }
  
  // Get cache statistics
  getCacheStats() {
    return {
      size: this.calculationCache.size,
      maxSize: this.cacheMaxSize,
      hitRate: 0 // Would need to track hits vs misses
    }
  }
  
  isReady(): boolean {
    return this.workerManager.isReady()
  }
  
  terminate() {
    this.workerManager.terminate()
    this.calculationCache.clear()
  }
}

// Code Execution Worker Service
class CodeExecutionWorkerService {
  private workerManager: WorkerManager
  
  constructor() {
    this.workerManager = new WorkerManager('/workers/codeWorker.js')
  }
  
  async initialize(): Promise<void> {
    await this.workerManager.initialize()
  }
  
  async executeCode(code: string, context: any): Promise<any> {
    try {
      const result = await this.workerManager.sendMessage('EXECUTE_CODE', {
        code,
        context
      })
      
      return result
    } catch (error) {
      console.error('[CodeExecutionWorkerService] Code execution failed:', error)
      throw error
    }
  }
  
  async batchExecute(codeBlocks: Array<{ code: string, context: any }>): Promise<any[]> {
    try {
      const results = await this.workerManager.sendMessage('BATCH_EXECUTE', {
        codeBlocks
      })
      
      return results
    } catch (error) {
      console.error('[CodeExecutionWorkerService] Batch execution failed:', error)
      throw error
    }
  }
  
  terminate() {
    this.workerManager.terminate()
  }
}

// Lazy initialization instances
let _tpnWorkerService: TPNWorkerService | null = null
let _codeExecutionWorkerService: CodeExecutionWorkerService | null = null

// Export lazy-initialized services
export function getTpnWorkerService(): TPNWorkerService {
  if (!_tpnWorkerService) {
    _tpnWorkerService = new TPNWorkerService()
  }
  return _tpnWorkerService
}

export function getCodeExecutionWorkerService(): CodeExecutionWorkerService {
  if (!_codeExecutionWorkerService) {
    _codeExecutionWorkerService = new CodeExecutionWorkerService()
  }
  return _codeExecutionWorkerService
}

// Legacy exports for backward compatibility (but lazy)
export const tpnWorkerService = new Proxy({} as TPNWorkerService, {
  get(target, prop) {
    return getTpnWorkerService()[prop as keyof TPNWorkerService]
  }
})

export const codeExecutionWorkerService = new Proxy({} as CodeExecutionWorkerService, {
  get(target, prop) {
    return getCodeExecutionWorkerService()[prop as keyof CodeExecutionWorkerService]
  }
})

// Optional initialization with proper error handling and timeout
export async function initializeWorkers(timeout: number = 5000): Promise<{ tpn: boolean, code: boolean }> {
  if (typeof window === 'undefined') {
    console.warn('[WorkerService] Workers not available in server environment')
    return { tpn: false, code: false }
  }

  const results = { tpn: false, code: false }

  try {
    // Initialize TPN worker with timeout
    const tpnPromise = Promise.race([
      getTpnWorkerService().initialize(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TPN worker initialization timeout')), timeout)
      )
    ])

    await tpnPromise
    results.tpn = true
    console.log('[WorkerService] TPN worker initialized successfully')
  } catch (error) {
    console.warn('[WorkerService] Failed to initialize TPN worker:', error)
  }

  try {
    // Initialize code execution worker with timeout
    const codePromise = Promise.race([
      getCodeExecutionWorkerService().initialize(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Code worker initialization timeout')), timeout)
      )
    ])

    await codePromise
    results.code = true
    console.log('[WorkerService] Code execution worker initialized successfully')
  } catch (error) {
    console.warn('[WorkerService] Failed to initialize code execution worker:', error)
  }

  return results
}

// Cleanup function for page unload
export function terminateAllWorkers(): void {
  try {
    if (_tpnWorkerService) {
      _tpnWorkerService.terminate()
      _tpnWorkerService = null
    }
    if (_codeExecutionWorkerService) {
      _codeExecutionWorkerService.terminate()
      _codeExecutionWorkerService = null
    }
    console.log('[WorkerService] All workers terminated')
  } catch (error) {
    console.warn('[WorkerService] Error terminating workers:', error)
  }
}

// Setup cleanup listener only if in browser
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', terminateAllWorkers)
}

// Export types
export type { WorkerMessage, WorkerResponse }