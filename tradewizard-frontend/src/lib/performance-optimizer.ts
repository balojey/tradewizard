/**
 * Performance Optimization Utilities
 * Implements Requirements 10.2, 10.4
 * 
 * Features:
 * - Real-time update batching to prevent excessive re-renders
 * - Debounced and throttled update mechanisms
 * - Memory-efficient update queuing
 * - Performance monitoring and metrics
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  minWaitTime: number; // milliseconds
  enableMetrics: boolean;
}

export interface UpdateBatch<T> {
  updates: T[];
  timestamp: number;
  batchId: string;
}

export interface PerformanceMetrics {
  totalBatches: number;
  totalUpdates: number;
  averageBatchSize: number;
  averageWaitTime: number;
  droppedUpdates: number;
  lastBatchTime: number;
}

/**
 * Batched Update Manager for Real-time Data
 */
export class BatchedUpdateManager<T> {
  private pendingUpdates: T[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private config: BatchConfig;
  private metrics: PerformanceMetrics;
  private onBatch: (batch: UpdateBatch<T>) => void;
  private batchCounter = 0;

  constructor(
    onBatch: (batch: UpdateBatch<T>) => void,
    config: Partial<BatchConfig> = {}
  ) {
    this.onBatch = onBatch;
    this.config = {
      maxBatchSize: 50,
      maxWaitTime: 100, // 100ms max wait
      minWaitTime: 16,  // ~60fps
      enableMetrics: true,
      ...config,
    };

    this.metrics = {
      totalBatches: 0,
      totalUpdates: 0,
      averageBatchSize: 0,
      averageWaitTime: 0,
      droppedUpdates: 0,
      lastBatchTime: 0,
    };
  }

  /**
   * Add update to batch queue
   */
  addUpdate(update: T): void {
    this.pendingUpdates.push(update);

    // Immediate flush if batch is full
    if (this.pendingUpdates.length >= this.config.maxBatchSize) {
      this.flushBatch();
      return;
    }

    // Schedule batch flush if not already scheduled
    if (!this.batchTimer) {
      this.scheduleBatchFlush();
    }
  }

  /**
   * Force flush current batch
   */
  flushBatch(): void {
    if (this.pendingUpdates.length === 0) return;

    const batchStartTime = performance.now();
    const batch: UpdateBatch<T> = {
      updates: [...this.pendingUpdates],
      timestamp: Date.now(),
      batchId: `batch-${++this.batchCounter}`,
    };

    // Clear pending updates
    this.pendingUpdates = [];

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Execute batch callback
    this.onBatch(batch);

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateMetrics(batch, performance.now() - batchStartTime);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalBatches: 0,
      totalUpdates: 0,
      averageBatchSize: 0,
      averageWaitTime: 0,
      droppedUpdates: 0,
      lastBatchTime: 0,
    };
  }

  /**
   * Destroy manager and cleanup
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.pendingUpdates = [];
  }

  private scheduleBatchFlush(): void {
    const waitTime = Math.max(this.config.minWaitTime, this.config.maxWaitTime);
    
    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, waitTime);
  }

  private updateMetrics(batch: UpdateBatch<T>, processingTime: number): void {
    this.metrics.totalBatches++;
    this.metrics.totalUpdates += batch.updates.length;
    this.metrics.lastBatchTime = batch.timestamp;

    // Update averages
    this.metrics.averageBatchSize = this.metrics.totalUpdates / this.metrics.totalBatches;
    this.metrics.averageWaitTime = 
      (this.metrics.averageWaitTime * (this.metrics.totalBatches - 1) + processingTime) / 
      this.metrics.totalBatches;
  }
}

/**
 * React hook for batched updates
 */
export function useBatchedUpdates<T>(
  onBatch: (updates: T[]) => void,
  config?: Partial<BatchConfig>
): {
  addUpdate: (update: T) => void;
  flushUpdates: () => void;
  metrics: PerformanceMetrics;
} {
  const managerRef = useRef<BatchedUpdateManager<T> | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalBatches: 0,
    totalUpdates: 0,
    averageBatchSize: 0,
    averageWaitTime: 0,
    droppedUpdates: 0,
    lastBatchTime: 0,
  });

  // Initialize manager
  useEffect(() => {
    const handleBatch = (batch: UpdateBatch<T>) => {
      onBatch(batch.updates);
      setMetrics(managerRef.current?.getMetrics() || metrics);
    };

    managerRef.current = new BatchedUpdateManager(handleBatch, config);

    return () => {
      managerRef.current?.destroy();
    };
  }, [onBatch, config]);

  const addUpdate = useCallback((update: T) => {
    managerRef.current?.addUpdate(update);
  }, []);

  const flushUpdates = useCallback(() => {
    managerRef.current?.flushBatch();
  }, []);

  return { addUpdate, flushUpdates, metrics };
}

/**
 * Debounced function utility
 */
export function useDebounced<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    }) as T,
    [func, delay]
  );
}

/**
 * Throttled function utility
 */
export function useThrottled<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        // Execute immediately
        lastCallRef.current = now;
        func(...args);
      } else {
        // Schedule for later
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          func(...args);
        }, delay - timeSinceLastCall);
      }
    }) as T,
    [func, delay]
  );
}

/**
 * Request Animation Frame utility for smooth updates
 */
export function useAnimationFrame<T extends (...args: any[]) => any>(
  func: T
): T {
  const rafRef = useRef<number | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        func(...args);
      });
    }) as T,
    [func]
  );
}

/**
 * Memory-efficient update queue with size limits
 */
export class MemoryEfficientQueue<T> {
  private queue: T[] = [];
  private maxSize: number;
  private onOverflow?: (droppedItems: T[]) => void;

  constructor(maxSize: number = 1000, onOverflow?: (droppedItems: T[]) => void) {
    this.maxSize = maxSize;
    this.onOverflow = onOverflow;
  }

  enqueue(item: T): void {
    this.queue.push(item);

    if (this.queue.length > this.maxSize) {
      const dropped = this.queue.splice(0, this.queue.length - this.maxSize);
      this.onOverflow?.(dropped);
    }
  }

  dequeue(): T | undefined {
    return this.queue.shift();
  }

  peek(): T | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  clear(): T[] {
    const items = [...this.queue];
    this.queue = [];
    return items;
  }

  toArray(): T[] {
    return [...this.queue];
  }
}

/**
 * Performance monitor for tracking render performance
 */
export class RenderPerformanceMonitor {
  private renderTimes: number[] = [];
  private maxSamples: number;
  private onSlowRender?: (renderTime: number) => void;
  private slowRenderThreshold: number;

  constructor(
    maxSamples: number = 100,
    slowRenderThreshold: number = 16, // 16ms = 60fps
    onSlowRender?: (renderTime: number) => void
  ) {
    this.maxSamples = maxSamples;
    this.slowRenderThreshold = slowRenderThreshold;
    this.onSlowRender = onSlowRender;
  }

  startRender(): () => void {
    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      this.recordRenderTime(renderTime);

      if (renderTime > this.slowRenderThreshold) {
        this.onSlowRender?.(renderTime);
      }
    };
  }

  getAverageRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;
  }

  getMaxRenderTime(): number {
    return Math.max(...this.renderTimes, 0);
  }

  getSlowRenderCount(): number {
    return this.renderTimes.filter(time => time > this.slowRenderThreshold).length;
  }

  reset(): void {
    this.renderTimes = [];
  }

  private recordRenderTime(renderTime: number): void {
    this.renderTimes.push(renderTime);

    if (this.renderTimes.length > this.maxSamples) {
      this.renderTimes.shift();
    }
  }
}

/**
 * React hook for monitoring component render performance
 */
export function useRenderPerformance(componentName?: string): {
  averageRenderTime: number;
  maxRenderTime: number;
  slowRenderCount: number;
} {
  const monitorRef = useRef<RenderPerformanceMonitor | null>(null);
  const [metrics, setMetrics] = useState({
    averageRenderTime: 0,
    maxRenderTime: 0,
    slowRenderCount: 0,
  });

  useEffect(() => {
    if (!monitorRef.current) {
      monitorRef.current = new RenderPerformanceMonitor(
        100,
        16,
        (renderTime) => {
          if (componentName && process.env.NODE_ENV === 'development') {
            console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
          }
        }
      );
    }

    const endRender = monitorRef.current.startRender();

    return () => {
      endRender();
      setMetrics({
        averageRenderTime: monitorRef.current!.getAverageRenderTime(),
        maxRenderTime: monitorRef.current!.getMaxRenderTime(),
        slowRenderCount: monitorRef.current!.getSlowRenderCount(),
      });
    };
  });

  return metrics;
}

/**
 * Intersection Observer hook for lazy loading optimization
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): {
  ref: React.RefCallback<Element>;
  isIntersecting: boolean;
  hasIntersected: boolean;
} {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((element: Element | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (element) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          const intersecting = entry.isIntersecting;
          setIsIntersecting(intersecting);
          
          if (intersecting && !hasIntersected) {
            setHasIntersected(true);
          }
        },
        {
          threshold: 0.1,
          rootMargin: '50px',
          ...options,
        }
      );

      observerRef.current.observe(element);
    }
  }, [hasIntersected, options]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { ref, isIntersecting, hasIntersected };
}