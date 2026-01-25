/**
 * Performance Optimization Hooks
 * Implements Requirements 10.2, 10.4
 * 
 * Provides a comprehensive set of hooks for performance optimization including:
 * - Memoization with cache invalidation
 * - Debounced and throttled callbacks
 * - Intersection observer for lazy loading
 * - Virtual scrolling for large lists
 * - Image preloading and optimization
 */

import { 
  useCallback, 
  useEffect, 
  useMemo, 
  useRef, 
  useState,
  DependencyList,
} from 'react';
import { 
  useDebounced, 
  useThrottled, 
  useIntersectionObserver,
  useBatchedUpdates,
} from '@/lib/performance-optimizer';
import { marketCacheManager } from '@/lib/cache-manager';

/**
 * Enhanced useMemo with cache invalidation
 */
export function useMemoWithInvalidation<T>(
  factory: () => T,
  deps: DependencyList,
  cacheKey?: string
): [T, () => void] {
  const memoizedValue = useMemo(factory, deps);
  
  const invalidate = useCallback(() => {
    if (cacheKey) {
      marketCacheManager.invalidate(cacheKey);
    }
  }, [cacheKey]);

  return [memoizedValue, invalidate];
}

/**
 * Optimized state updates with batching
 */
export function useBatchedState<T>(
  initialState: T
): [T, (updates: Partial<T>[]) => void, (update: Partial<T>) => void] {
  const [state, setState] = useState<T>(initialState);

  const { addUpdate: addBatchedUpdate } = useBatchedUpdates<Partial<T>>(
    (updates) => {
      setState(prevState => {
        let newState = prevState;
        for (const update of updates) {
          newState = { ...newState, ...update };
        }
        return newState;
      });
    },
    {
      maxBatchSize: 10,
      maxWaitTime: 16, // ~60fps
      minWaitTime: 8,
    }
  );

  const setBatchedState = useCallback((updates: Partial<T>[]) => {
    updates.forEach(update => addBatchedUpdate(update));
  }, [addBatchedUpdate]);

  const setSingleUpdate = useCallback((update: Partial<T>) => {
    addBatchedUpdate(update);
  }, [addBatchedUpdate]);

  return [state, setBatchedState, setSingleUpdate];
}

/**
 * Optimized API data fetching with caching
 */
export function useOptimizedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
    cacheTime?: number;
  } = {}
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    enabled = true,
    refetchInterval,
    staleTime = 60000, // 1 minute
    cacheTime = 300000, // 5 minutes
  } = options;

  // Update fetcher ref
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      // Try to get from cache first
      const cached = await marketCacheManager.get(key);
      if (cached) {
        setData(cached);
        setIsLoading(false);
        return;
      }

      // Fetch fresh data
      const result = await fetcherRef.current();
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setData(result);
      marketCacheManager.set(key, result, cacheTime);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [key, enabled, cacheTime]);

  const invalidate = useCallback(() => {
    marketCacheManager.invalidate(key);
    setData(null);
  }, [key]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(fetchData, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, refetchInterval, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    invalidate,
  };
}

/**
 * Virtual scrolling for large lists
 */
export function useVirtualScrolling<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}): {
  visibleItems: Array<{ item: T; index: number }>;
  totalHeight: number;
  scrollElementProps: {
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  getItemProps: (index: number) => {
    style: React.CSSProperties;
    key: string | number;
  };
} {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({ item: items[i], index: i });
    }
    return result;
  }, [items, startIndex, endIndex]);

  const handleScroll = useThrottled((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16); // ~60fps

  const scrollElementProps = {
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
    },
  };

  const getItemProps = useCallback((index: number) => ({
    style: {
      position: 'absolute' as const,
      top: index * itemHeight,
      left: 0,
      right: 0,
      height: itemHeight,
    },
    key: index,
  }), [itemHeight]);

  return {
    visibleItems,
    totalHeight,
    scrollElementProps,
    getItemProps,
  };
}

/**
 * Optimized search with debouncing and caching
 */
export function useOptimizedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  options: {
    debounceMs?: number;
    minQueryLength?: number;
    cacheResults?: boolean;
  } = {}
): {
  query: string;
  setQuery: (query: string) => void;
  results: T[];
  isSearching: boolean;
  error: Error | null;
} {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    debounceMs = 300,
    minQueryLength = 2,
    cacheResults = true,
  } = options;

  const searchCache = useRef(new Map<string, T[]>());
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      return;
    }

    // Check cache first
    if (cacheResults && searchCache.current.has(searchQuery)) {
      setResults(searchCache.current.get(searchQuery)!);
      return;
    }

    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsSearching(true);
      setError(null);

      const searchResults = await searchFn(searchQuery);

      // Check if search was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setResults(searchResults);

      // Cache results
      if (cacheResults) {
        searchCache.current.set(searchQuery, searchResults);
        
        // Limit cache size
        if (searchCache.current.size > 100) {
          const firstKey = searchCache.current.keys().next().value;
          if (firstKey) {
            searchCache.current.delete(firstKey);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setIsSearching(false);
    }
  }, [searchFn, minQueryLength, cacheResults]);

  const debouncedSearch = useDebounced(performSearch, debounceMs);

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
  };
}

/**
 * Optimized image loading with preloading
 */
export function useOptimizedImages(
  images: string[],
  options: {
    preloadPriority?: number;
    lazyLoad?: boolean;
    placeholder?: string;
  } = {}
): {
  loadedImages: Set<string>;
  failedImages: Set<string>;
  isLoading: boolean;
  preloadImages: (urls: string[]) => Promise<void>;
} {
  const [loadedImages, setLoadedImages] = useState(new Set<string>());
  const [failedImages, setFailedImages] = useState(new Set<string>());
  const [isLoading, setIsLoading] = useState(false);

  const { preloadPriority = 0, lazyLoad = true } = options;

  const preloadImages = useCallback(async (urls: string[]) => {
    setIsLoading(true);

    const promises = urls.map(url => 
      new Promise<void>((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, url]));
          resolve();
        };
        
        img.onerror = () => {
          setFailedImages(prev => new Set([...prev, url]));
          resolve();
        };
        
        img.src = url;
      })
    );

    await Promise.allSettled(promises);
    setIsLoading(false);
  }, []);

  // Preload images on mount if not lazy loading
  useEffect(() => {
    if (!lazyLoad && images.length > 0) {
      preloadImages(images);
    }
  }, [images, lazyLoad, preloadImages]);

  return {
    loadedImages,
    failedImages,
    isLoading,
    preloadImages,
  };
}

/**
 * Performance-optimized component visibility tracking
 */
export function useVisibilityOptimization(
  threshold: number = 0.1
): {
  ref: React.RefCallback<Element>;
  isVisible: boolean;
  hasBeenVisible: boolean;
} {
  const { ref, isIntersecting, hasIntersected } = useIntersectionObserver({
    threshold,
    rootMargin: '50px',
  });

  return {
    ref,
    isVisible: isIntersecting,
    hasBeenVisible: hasIntersected,
  };
}

/**
 * Optimized event handlers with automatic cleanup
 */
export function useOptimizedEventHandlers() {
  const handlersRef = useRef(new Map<string, any>());

  const createHandler = useCallback(<T extends (...args: any[]) => any>(
    key: string,
    handler: T,
    options: { throttle?: number; debounce?: number } = {}
  ): T => {
    if (handlersRef.current.has(key)) {
      return handlersRef.current.get(key);
    }

    let optimizedHandler = handler;

    if (options.throttle) {
      optimizedHandler = useThrottled(handler, options.throttle) as T;
    } else if (options.debounce) {
      optimizedHandler = useDebounced(handler, options.debounce) as T;
    }

    handlersRef.current.set(key, optimizedHandler);
    return optimizedHandler;
  }, []);

  useEffect(() => {
    return () => {
      handlersRef.current.clear();
    };
  }, []);

  return { createHandler };
}