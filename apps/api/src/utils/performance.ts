/**
 * Performance monitoring utilities for tracking query and operation timings
 */

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private enabled: boolean;

  constructor() {
    // Enable in development or when PERF_MONITOR env var is set
    this.enabled = process.env.NODE_ENV === 'development' || process.env.PERF_MONITOR === 'true';
  }

  /**
   * Measure the execution time of an async function
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.record(operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(operation, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  record(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: new Date(),
      metadata,
    };

    this.metrics.push(metric);

    // Log slow operations (> 1000ms)
    if (duration > 1000) {
      console.warn(`⚠️  Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`, metadata);
    } else if (duration > 500) {
      console.log(`⏱️  ${operation}: ${duration.toFixed(2)}ms`, metadata);
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsFor(operation: string): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.operation === operation);
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetricsFor(operation);
    if (operationMetrics.length === 0) return 0;
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalOperations: number;
    slowOperations: PerformanceMetrics[];
    averageDurations: Record<string, number>;
  } {
    const slowOperations = this.metrics.filter((m) => m.duration > 1000);
    const operations = new Set(this.metrics.map((m) => m.operation));
    const averageDurations: Record<string, number> = {};

    operations.forEach((op) => {
      averageDurations[op] = this.getAverageDuration(op);
    });

    return {
      totalOperations: this.metrics.length,
      slowOperations,
      averageDurations,
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator/wrapper for measuring Prisma queries
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return performanceMonitor.measure(`query:${queryName}`, queryFn, metadata);
}

/**
 * Measure multiple queries in parallel
 */
export async function measureParallelQueries<T extends Record<string, Promise<unknown>>>(
  queries: T,
  metadata?: Record<string, unknown>
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const start = performance.now();
  const queryNames = Object.keys(queries);
  
  try {
    const results = await Promise.all(Object.values(queries));
    const duration = performance.now() - start;
    
    const resultMap = {} as { [K in keyof T]: Awaited<T[K]> };
    queryNames.forEach((key, index) => {
      resultMap[key as keyof T] = results[index] as Awaited<T[keyof T]>;
    });

    performanceMonitor.record(
      `parallel:${queryNames.join('+')}`,
      duration,
      { queryCount: queryNames.length, ...metadata }
    );

    return resultMap;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.record(
      `parallel:${queryNames.join('+')}`,
      duration,
      { queryCount: queryNames.length, error: true, ...metadata }
    );
    throw error;
  }
}
