import type { DocumentSnapshot } from 'firebase/firestore';

export interface PaginationState<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  totalLoaded: number;
  isLoading: boolean;
}

export interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

export class PaginationManager<T extends { id: string }> {
  private state: PaginationState<T>;
  private pageCache: Map<number, T[]> = new Map();
  private docCursors: Map<number, DocumentSnapshot> = new Map();
  
  constructor(options: PaginationOptions = {}) {
    this.state = {
      items: [],
      currentPage: options.initialPage || 1,
      pageSize: options.pageSize || 50,
      hasMore: true,
      lastDoc: null,
      totalLoaded: 0,
      isLoading: false
    };
  }
  
  /**
   * Get current pagination state
   */
  getState(): PaginationState<T> {
    return { ...this.state };
  }
  
  /**
   * Load a specific page
   */
  async loadPage(
    pageNum: number,
    fetcher: (lastDoc: DocumentSnapshot | null) => Promise<{
      data: T[];
      lastDoc: DocumentSnapshot | null;
      hasMore: boolean;
    }>
  ): Promise<T[]> {
    // Check cache first
    if (this.pageCache.has(pageNum)) {
      this.state.currentPage = pageNum;
      this.state.items = this.pageCache.get(pageNum)!;
      return this.state.items;
    }
    
    this.state.isLoading = true;
    
    try {
      // Get cursor for previous page
      const cursor = pageNum > 1 ? this.docCursors.get(pageNum - 1) || null : null;
      
      const result = await fetcher(cursor);
      
      // Cache the page
      this.pageCache.set(pageNum, result.data);
      
      // Store cursor for this page
      if (result.lastDoc) {
        this.docCursors.set(pageNum, result.lastDoc);
      }
      
      // Update state
      this.state.items = result.data;
      this.state.currentPage = pageNum;
      this.state.hasMore = result.hasMore;
      this.state.lastDoc = result.lastDoc;
      this.state.totalLoaded = this.calculateTotalLoaded();
      
      return result.data;
    } finally {
      this.state.isLoading = false;
    }
  }
  
  /**
   * Load next page
   */
  async loadNextPage(
    fetcher: (lastDoc: DocumentSnapshot | null) => Promise<{
      data: T[];
      lastDoc: DocumentSnapshot | null;
      hasMore: boolean;
    }>
  ): Promise<T[]> {
    if (!this.state.hasMore) {
      return [];
    }
    
    return this.loadPage(this.state.currentPage + 1, fetcher);
  }
  
  /**
   * Load previous page
   */
  async loadPreviousPage(
    fetcher: (lastDoc: DocumentSnapshot | null) => Promise<{
      data: T[];
      lastDoc: DocumentSnapshot | null;
      hasMore: boolean;
    }>
  ): Promise<T[]> {
    if (this.state.currentPage <= 1) {
      return this.state.items;
    }
    
    return this.loadPage(this.state.currentPage - 1, fetcher);
  }
  
  /**
   * Append items for infinite scroll
   */
  async appendNextPage(
    fetcher: (lastDoc: DocumentSnapshot | null) => Promise<{
      data: T[];
      lastDoc: DocumentSnapshot | null;
      hasMore: boolean;
    }>
  ): Promise<T[]> {
    if (!this.state.hasMore || this.state.isLoading) {
      return this.state.items;
    }
    
    this.state.isLoading = true;
    
    try {
      const result = await fetcher(this.state.lastDoc);
      
      // Append to existing items
      const newItems = [...this.state.items, ...result.data];
      
      // Deduplicate by ID
      const seen = new Set<string>();
      const deduplicated = newItems.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      
      // Update state
      this.state.items = deduplicated;
      this.state.hasMore = result.hasMore;
      this.state.lastDoc = result.lastDoc;
      this.state.totalLoaded = deduplicated.length;
      
      return this.state.items;
    } finally {
      this.state.isLoading = false;
    }
  }
  
  /**
   * Reset pagination state
   */
  reset(): void {
    this.state = {
      items: [],
      currentPage: 1,
      pageSize: this.state.pageSize,
      hasMore: true,
      lastDoc: null,
      totalLoaded: 0,
      isLoading: false
    };
    this.pageCache.clear();
    this.docCursors.clear();
  }
  
  /**
   * Update page size
   */
  setPageSize(pageSize: number): void {
    if (pageSize !== this.state.pageSize) {
      this.state.pageSize = pageSize;
      this.reset();
    }
  }
  
  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.state.isLoading;
  }
  
  /**
   * Check if more pages available
   */
  hasMorePages(): boolean {
    return this.state.hasMore;
  }
  
  /**
   * Get current page number
   */
  getCurrentPage(): number {
    return this.state.currentPage;
  }
  
  /**
   * Get total items loaded
   */
  getTotalLoaded(): number {
    return this.state.totalLoaded;
  }
  
  /**
   * Calculate total pages (if total count is known)
   */
  calculateTotalPages(totalCount: number): number {
    return Math.ceil(totalCount / this.state.pageSize);
  }
  
  /**
   * Calculate total loaded items from cache
   */
  private calculateTotalLoaded(): number {
    let total = 0;
    this.pageCache.forEach(page => {
      total += page.length;
    });
    return total;
  }
}

// Export for use in components
export function createPaginationManager<T extends { id: string }>(
  options?: PaginationOptions
): PaginationManager<T> {
  return new PaginationManager<T>(options);
}