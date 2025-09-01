import { 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  type Query,
  type DocumentSnapshot,
  type QueryConstraint
} from 'firebase/firestore';

export interface QueryOptions {
  pageSize?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  lastDoc?: DocumentSnapshot;
  filters?: Record<string, any>;
}

export interface OptimizedQuery {
  query: Query;
  constraints: QueryConstraint[];
}

export class QueryOptimizer {
  private readonly DEFAULT_PAGE_SIZE = 50;
  private readonly MAX_PAGE_SIZE = 100;
  
  /**
   * Optimize a Firestore query with pagination and indexing
   */
  optimizeQuery(
    baseQuery: Query, 
    options: QueryOptions = {}
  ): OptimizedQuery {
    const constraints: QueryConstraint[] = [];
    
    // Add filters first (for index optimization)
    if (options.filters) {
      Object.entries(options.filters).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          constraints.push(where(field, '==', value));
        }
      });
    }
    
    // Add ordering (required for pagination)
    if (options.orderByField) {
      constraints.push(
        orderBy(options.orderByField, options.orderDirection || 'asc')
      );
    }
    
    // Add pagination
    const pageSize = Math.min(
      options.pageSize || this.DEFAULT_PAGE_SIZE,
      this.MAX_PAGE_SIZE
    );
    constraints.push(limit(pageSize));
    
    // Add cursor for pagination
    if (options.lastDoc) {
      constraints.push(startAfter(options.lastDoc));
    }
    
    const optimizedQuery = query(baseQuery, ...constraints);
    
    return {
      query: optimizedQuery,
      constraints
    };
  }
  
  /**
   * Create compound index-friendly query
   */
  createIndexedQuery(
    baseQuery: Query,
    indexFields: Array<{ field: string; direction?: 'asc' | 'desc' }>
  ): Query {
    const constraints: QueryConstraint[] = [];
    
    // Build constraints in index order
    indexFields.forEach(({ field, direction = 'asc' }) => {
      constraints.push(orderBy(field, direction));
    });
    
    return query(baseQuery, ...constraints);
  }
  
  /**
   * Deduplicate query results by ID
   */
  deduplicateResults<T extends { id: string }>(results: T[]): T[] {
    const seen = new Set<string>();
    return results.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }
  
  /**
   * Batch multiple queries for parallel execution
   */
  async batchQueries<T>(
    queries: Array<() => Promise<T>>
  ): Promise<T[]> {
    return Promise.all(queries.map(q => q()));
  }
  
  /**
   * Log query performance metrics
   */
  logQueryMetrics(
    operation: string,
    startTime: number,
    resultCount: number
  ): void {
    const duration = performance.now() - startTime;
    console.log(
      `Query execution time [${operation}]: ${duration.toFixed(2)}ms, ` +
      `Results: ${resultCount}, ` +
      `Avg per item: ${(duration / Math.max(1, resultCount)).toFixed(2)}ms`
    );
  }
  
  /**
   * Check if a query would benefit from an index
   */
  analyzeIndexRequirements(constraints: QueryConstraint[]): {
    needsIndex: boolean;
    indexFields: string[];
  } {
    const whereFields: string[] = [];
    const orderByFields: string[] = [];
    
    constraints.forEach(constraint => {
      const str = constraint.toString();
      if (str.includes('where')) {
        // Extract field from where constraint
        const match = str.match(/where\(["']([^"']+)["']/);
        if (match) whereFields.push(match[1]);
      } else if (str.includes('orderBy')) {
        // Extract field from orderBy constraint
        const match = str.match(/orderBy\(["']([^"']+)["']/);
        if (match) orderByFields.push(match[1]);
      }
    });
    
    // Compound queries need indexes
    const needsIndex = whereFields.length > 0 && orderByFields.length > 0;
    const indexFields = [...whereFields, ...orderByFields];
    
    return { needsIndex, indexFields };
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();