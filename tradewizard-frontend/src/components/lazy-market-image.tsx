"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Vote, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@/lib/performance-optimizer';

interface LazyMarketImageProps {
  eventImage?: string;
  marketImage?: string;
  title: string;
  className?: string;
  fallbackGradient?: string;
  priority?: boolean; // For above-the-fold images
  onImageLoad?: () => void;
  onImageError?: (source: 'event' | 'market' | 'fallback') => void;
  placeholder?: 'blur' | 'gradient' | 'skeleton';
  enableProgressiveLoading?: boolean;
}

/**
 * Enhanced lazy-loading market image component with performance optimizations
 * Implements Requirements 10.2, 10.4
 * 
 * Features:
 * - Intersection Observer-based lazy loading
 * - Progressive image loading with low-quality placeholders
 * - Automatic fallback chain with error handling
 * - Memory-efficient image preloading
 * - Performance metrics tracking
 */
export function LazyMarketImage({ 
  eventImage, 
  marketImage, 
  title, 
  className = "",
  fallbackGradient = "from-blue-600 via-purple-600 to-indigo-700",
  priority = false,
  onImageLoad,
  onImageError,
  placeholder = 'gradient',
  enableProgressiveLoading = true,
}: LazyMarketImageProps) {
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null);
  const [eventImageFailed, setEventImageFailed] = useState(false);
  const [marketImageFailed, setMarketImageFailed] = useState(false);
  const [progressiveImageSrc, setProgressiveImageSrc] = useState<string | null>(null);
  
  const imageRef = useRef<HTMLImageElement | null>(null);
  const preloadedImages = useRef<Set<string>>(new Set());

  // Intersection observer for lazy loading
  const { ref: intersectionRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px', // Start loading 100px before entering viewport
  });

  // Determine which image to load
  const targetImageSrc = eventImage && !eventImageFailed 
    ? eventImage 
    : marketImage && !marketImageFailed 
    ? marketImage 
    : null;

  // Combined ref for intersection observer and image element
  const combinedRef = useCallback((element: HTMLDivElement | null) => {
    intersectionRef(element);
  }, [intersectionRef]);

  // Progressive loading effect
  useEffect(() => {
    if (!enableProgressiveLoading || !targetImageSrc || !hasIntersected) return;

    // Generate low-quality version URL (if supported by the image service)
    const lowQualityUrl = generateLowQualityUrl(targetImageSrc);
    if (lowQualityUrl && lowQualityUrl !== targetImageSrc) {
      setProgressiveImageSrc(lowQualityUrl);
    }
  }, [targetImageSrc, hasIntersected, enableProgressiveLoading]);

  // Main image loading effect
  useEffect(() => {
    if (!targetImageSrc || (!priority && !hasIntersected)) return;

    // Check if image is already preloaded
    if (preloadedImages.current.has(targetImageSrc)) {
      setCurrentImageSrc(targetImageSrc);
      setLoadingState('loaded');
      onImageLoad?.();
      return;
    }

    setLoadingState('loading');

    // Preload image
    const img = new Image();
    
    img.onload = () => {
      preloadedImages.current.add(targetImageSrc);
      setCurrentImageSrc(targetImageSrc);
      setLoadingState('loaded');
      setProgressiveImageSrc(null); // Clear progressive image
      onImageLoad?.();
    };

    img.onerror = () => {
      handleImageError(targetImageSrc);
    };

    // Set loading timeout
    const timeout = setTimeout(() => {
      if (loadingState === 'loading') {
        handleImageError(targetImageSrc);
      }
    }, 10000); // 10 second timeout

    img.src = targetImageSrc;
    imageRef.current = img;

    return () => {
      clearTimeout(timeout);
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
    };
  }, [targetImageSrc, priority, hasIntersected, loadingState, onImageLoad]);

  // Handle image loading errors
  const handleImageError = useCallback((failedSrc: string) => {
    if (failedSrc === eventImage) {
      setEventImageFailed(true);
      onImageError?.('event');
    } else if (failedSrc === marketImage) {
      setMarketImageFailed(true);
      onImageError?.('market');
    }

    // Check if we have more fallbacks
    const hasMoreFallbacks = (failedSrc === eventImage && marketImage && !marketImageFailed);
    
    if (!hasMoreFallbacks) {
      setLoadingState('error');
      setCurrentImageSrc(null);
      setProgressiveImageSrc(null);
    }
  }, [eventImage, marketImage, marketImageFailed, onImageError]);

  // Reset state when images change
  useEffect(() => {
    setEventImageFailed(false);
    setMarketImageFailed(false);
    setLoadingState('idle');
    setCurrentImageSrc(null);
    setProgressiveImageSrc(null);
  }, [eventImage, marketImage]);

  // Render loading placeholder
  const renderPlaceholder = () => {
    switch (placeholder) {
      case 'blur':
        return (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center backdrop-blur-sm">
            <Vote className="h-8 w-8 text-muted-foreground/50" />
          </div>
        );
      
      case 'skeleton':
        return (
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          </div>
        );
      
      case 'gradient':
      default:
        return (
          <FallbackGradient 
            gradient={fallbackGradient} 
            title={title}
            hasImageError={false}
            isLoading={loadingState === 'loading'}
          />
        );
    }
  };

  return (
    <div 
      ref={combinedRef}
      className={cn("relative w-full h-full overflow-hidden", className)}
    >
      {/* Progressive loading image (low quality) */}
      {progressiveImageSrc && (
        <img
          src={progressiveImageSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-105 transition-opacity duration-300"
          style={{ opacity: currentImageSrc ? 0 : 1 }}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {currentImageSrc && loadingState === 'loaded' ? (
        <img
          src={currentImageSrc}
          alt={title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          role="img"
        />
      ) : (
        renderPlaceholder()
      )}

      {/* Loading indicator */}
      {loadingState === 'loading' && (
        <div className="absolute top-2 right-2 z-10">
          <div className="rounded-full bg-black/60 p-1.5 backdrop-blur-sm">
            <Loader2 className="h-3 w-3 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Error state overlay */}
      {loadingState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <div className="flex flex-col items-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <span className="text-xs text-center px-2">Image unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Enhanced fallback gradient component with loading states
 */
function FallbackGradient({ 
  gradient, 
  title, 
  hasImageError,
  isLoading = false,
}: { 
  gradient: string; 
  title: string; 
  hasImageError: boolean;
  isLoading?: boolean;
}) {
  return (
    <div 
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-gradient-to-br transition-all duration-300",
        gradient,
        isLoading && "animate-pulse"
      )}
      role="img"
      aria-label={hasImageError ? `Image unavailable for ${title}` : `Placeholder image for ${title}`}
    >
      {hasImageError ? (
        <div className="flex flex-col items-center text-white/80">
          <AlertCircle className="h-8 w-8 mb-2" />
          <span className="text-xs text-center px-2">Image unavailable</span>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center text-white/80">
          <Loader2 className="h-8 w-8 mb-2 animate-spin" />
          <span className="text-xs text-center px-2">Loading...</span>
        </div>
      ) : (
        <Vote className="h-12 w-12 text-white/80" />
      )}
    </div>
  );
}

/**
 * Generate low-quality image URL for progressive loading
 */
function generateLowQualityUrl(originalUrl: string): string | null {
  try {
    const url = new URL(originalUrl);
    
    // Common image service patterns for low-quality versions
    if (url.hostname.includes('cloudinary')) {
      // Cloudinary: add quality and blur transformations
      const pathParts = url.pathname.split('/');
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex !== -1) {
        pathParts.splice(uploadIndex + 1, 0, 'q_30,f_auto,bl_300');
        url.pathname = pathParts.join('/');
        return url.toString();
      }
    } else if (url.hostname.includes('imagekit')) {
      // ImageKit: add quality and blur parameters
      url.searchParams.set('tr', 'q-30,bl-10');
      return url.toString();
    } else if (url.hostname.includes('imgix')) {
      // Imgix: add quality and blur parameters
      url.searchParams.set('q', '30');
      url.searchParams.set('blur', '10');
      return url.toString();
    }
    
    // Generic approach: try adding common quality parameters
    const params = new URLSearchParams(url.search);
    if (!params.has('q') && !params.has('quality')) {
      params.set('q', '30');
      url.search = params.toString();
      return url.toString();
    }
  } catch {
    // Invalid URL, return null
  }
  
  return null;
}

/**
 * Preload images for better performance
 */
export function preloadMarketImages(images: string[]): Promise<void[]> {
  return Promise.all(
    images.filter(Boolean).map(src => 
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        
        const timeout = setTimeout(() => {
          reject(new Error(`Image preload timeout: ${src}`));
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Failed to preload image: ${src}`));
        };
        
        img.src = src;
      })
    )
  );
}

/**
 * Hook for managing image preloading
 */
export function useImagePreloader(images: string[]) {
  const [preloadedCount, setPreloadedCount] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadErrors, setPreloadErrors] = useState<string[]>([]);

  useEffect(() => {
    if (images.length === 0) return;

    setIsPreloading(true);
    setPreloadedCount(0);
    setPreloadErrors([]);

    const preloadPromises = images.map(async (src, index) => {
      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to preload: ${src}`));
          img.src = src;
        });
        
        setPreloadedCount(prev => prev + 1);
      } catch (error) {
        setPreloadErrors(prev => [...prev, src]);
      }
    });

    Promise.allSettled(preloadPromises).finally(() => {
      setIsPreloading(false);
    });
  }, [images]);

  return {
    preloadedCount,
    totalImages: images.length,
    isPreloading,
    preloadErrors,
    progress: images.length > 0 ? preloadedCount / images.length : 0,
  };
}