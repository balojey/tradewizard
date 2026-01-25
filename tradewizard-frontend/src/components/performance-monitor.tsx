"use client";

import React, { useEffect, useState } from 'react';
import { Activity, Zap, Clock, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { marketCacheManager } from '@/lib/cache-manager';
import { useRenderPerformance } from '@/lib/performance-optimizer';

interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

/**
 * Performance monitoring component for development and debugging
 * Shows real-time performance metrics and cache statistics
 */
export function PerformanceMonitor({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
  className,
}: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [cacheMetrics, setCacheMetrics] = useState(marketCacheManager.getMetrics());
  const [webVitals, setWebVitals] = useState<any>({});
  
  const renderMetrics = useRenderPerformance('PerformanceMonitor');

  // Update cache metrics periodically
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setCacheMetrics(marketCacheManager.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  // Collect Web Vitals
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Use basic performance metrics
    collectBasicMetrics();
  }, [enabled]);

  const collectBasicMetrics = () => {
    if (typeof window === 'undefined' || !window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setWebVitals({
        FCP: navigation.responseEnd - navigation.fetchStart,
        LCP: navigation.loadEventEnd - navigation.fetchStart,
        TTFB: navigation.responseStart - navigation.requestStart,
      });
    }
  };

  if (!enabled) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div className={cn(
      'fixed z-50 transition-all duration-300',
      positionClasses[position],
      className
    )}>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 bg-black/80 text-white text-xs rounded-lg backdrop-blur-sm border border-white/10 hover:bg-black/90 transition-colors',
          isVisible && 'rounded-b-none'
        )}
        title="Performance Monitor"
      >
        <Activity className="h-3 w-3" />
        <span>Perf</span>
        {cacheMetrics.hitRate > 0 && (
          <span className="text-emerald-400 font-mono">
            {(cacheMetrics.hitRate * 100).toFixed(0)}%
          </span>
        )}
      </button>

      {/* Performance panel */}
      {isVisible && (
        <div className="mt-0 p-4 bg-black/90 text-white text-xs rounded-lg rounded-t-none backdrop-blur-sm border border-white/10 border-t-0 min-w-[280px] space-y-3">
          {/* Cache Metrics */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-3 w-3 text-blue-400" />
              <span className="font-semibold text-blue-400">Cache</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-gray-400">Hit Rate:</span>
                <span className="ml-1 font-mono text-emerald-400">
                  {(cacheMetrics.hitRate * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-400">Entries:</span>
                <span className="ml-1 font-mono">{cacheMetrics.entryCount}</span>
              </div>
              <div>
                <span className="text-gray-400">Size:</span>
                <span className="ml-1 font-mono">
                  {(cacheMetrics.totalSize / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>
              <div>
                <span className="text-gray-400">Evictions:</span>
                <span className="ml-1 font-mono">{cacheMetrics.evictions}</span>
              </div>
            </div>
          </div>

          {/* Render Performance */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3 w-3 text-yellow-400" />
              <span className="font-semibold text-yellow-400">Render</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-gray-400">Avg:</span>
                <span className="ml-1 font-mono">
                  {renderMetrics.averageRenderTime.toFixed(1)}ms
                </span>
              </div>
              <div>
                <span className="text-gray-400">Max:</span>
                <span className="ml-1 font-mono">
                  {renderMetrics.maxRenderTime.toFixed(1)}ms
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Slow Renders:</span>
                <span className="ml-1 font-mono text-red-400">
                  {renderMetrics.slowRenderCount}
                </span>
              </div>
            </div>
          </div>

          {/* Web Vitals */}
          {Object.keys(webVitals).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3 w-3 text-purple-400" />
                <span className="font-semibold text-purple-400">Web Vitals</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {webVitals.FCP && (
                  <div>
                    <span className="text-gray-400">FCP:</span>
                    <span className="ml-1 font-mono">
                      {webVitals.FCP.toFixed(0)}ms
                    </span>
                  </div>
                )}
                {webVitals.LCP && (
                  <div>
                    <span className="text-gray-400">LCP:</span>
                    <span className="ml-1 font-mono">
                      {webVitals.LCP.toFixed(0)}ms
                    </span>
                  </div>
                )}
                {webVitals.TTFB && (
                  <div>
                    <span className="text-gray-400">TTFB:</span>
                    <span className="ml-1 font-mono">
                      {webVitals.TTFB.toFixed(0)}ms
                    </span>
                  </div>
                )}
                {webVitals.CLS && (
                  <div>
                    <span className="text-gray-400">CLS:</span>
                    <span className="ml-1 font-mono">
                      {webVitals.CLS.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Memory Usage (if available) */}
          {typeof window !== 'undefined' && 'memory' in performance && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-3 w-3 text-green-400" />
                <span className="font-semibold text-green-400">Memory</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-gray-400">Used:</span>
                  <span className="ml-1 font-mono">
                    {((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Limit:</span>
                  <span className="ml-1 font-mono">
                    {((performance as any).memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => {
                marketCacheManager.clear();
                setCacheMetrics(marketCacheManager.getMetrics());
              }}
              className="text-[10px] px-2 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
            >
              Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to enable performance monitoring in development
 */
export function usePerformanceMonitoring(enabled: boolean = process.env.NODE_ENV === 'development') {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Log performance warnings
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' && entry.duration > 16) {
          console.warn(`Slow operation detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, [enabled]);
}

/**
 * Performance measurement utility
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return fn();
  }

  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = `${name}-duration`;

  performance.mark(startMark);

  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
    });
  } else {
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);
    return result;
  }
}