"use client";

import React, { useState, useCallback } from 'react';
import { Vote, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketImageProps {
  eventImage?: string;
  marketImage?: string;
  title: string;
  className?: string;
  fallbackGradient?: string;
  onImageLoad?: () => void;
  onImageError?: (source: 'event' | 'market' | 'fallback') => void;
}

/**
 * Enhanced market image component with priority-based fallback system
 * Implements Requirements 6.2, 7.3, 9.1
 * 
 * Priority order:
 * 1. event.image (highest priority)
 * 2. market.image (fallback)
 * 3. gradient background (final fallback)
 */
export function MarketImage({ 
  eventImage, 
  marketImage, 
  title, 
  className = "",
  fallbackGradient = "from-blue-600 via-purple-600 to-indigo-700",
  onImageLoad,
  onImageError
}: MarketImageProps) {
  const [eventImageFailed, setEventImageFailed] = useState(false);
  const [marketImageFailed, setMarketImageFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine which image to show
  const currentImageSrc = eventImage && !eventImageFailed 
    ? eventImage 
    : marketImage && !marketImageFailed 
    ? marketImage 
    : null;

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    onImageLoad?.();
  }, [onImageLoad]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const failedSrc = e.currentTarget.src;
    
    if (failedSrc === eventImage) {
      setEventImageFailed(true);
      onImageError?.('event');
    } else if (failedSrc === marketImage) {
      setMarketImageFailed(true);
      onImageError?.('market');
    }
    
    // If we still have a fallback image, keep loading state
    // Otherwise, stop loading
    const hasMoreFallbacks = (failedSrc === eventImage && marketImage && !marketImageFailed);
    if (!hasMoreFallbacks) {
      setIsLoading(false);
    }
  }, [eventImage, marketImage, marketImageFailed, onImageError]);

  // Reset state when images change
  React.useEffect(() => {
    setEventImageFailed(false);
    setMarketImageFailed(false);
    setIsLoading(!!currentImageSrc); // Only set loading if we have an image to load
  }, [eventImage, marketImage]);

  // Update loading state when current image source changes
  React.useEffect(() => {
    if (currentImageSrc) {
      setIsLoading(true);
    }
  }, [currentImageSrc]);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {currentImageSrc ? (
        <div className="relative w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentImageSrc} // Force re-render when source changes
            src={currentImageSrc}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
            role="img"
          />
          
          {/* Loading state overlay - only show when actually loading */}
          {isLoading && (
            <div 
              className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center z-10"
              aria-label="Loading market image"
              role="status"
            >
              <Vote className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            </div>
          )}
        </div>
      ) : (
        /* Fallback gradient background */
        <FallbackGradient 
          gradient={fallbackGradient} 
          title={title}
          hasImageError={eventImageFailed || marketImageFailed}
        />
      )}
    </div>
  );
}

/**
 * Fallback gradient component
 */
function FallbackGradient({ 
  gradient, 
  title, 
  hasImageError 
}: { 
  gradient: string; 
  title: string; 
  hasImageError: boolean;
}) {
  return (
    <div 
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-gradient-to-br",
        gradient
      )}
      role="img"
      aria-label={hasImageError ? `Image unavailable for ${title}` : `Placeholder image for ${title}`}
    >
      {hasImageError ? (
        <div className="flex flex-col items-center text-white/80">
          <AlertCircle className="h-8 w-8 mb-2" aria-hidden="true" />
          <span className="text-xs text-center px-2" aria-hidden="true">Image unavailable</span>
        </div>
      ) : (
        <Vote className="h-12 w-12 text-white/80" aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * Hook for managing image loading state across multiple images
 */
export function useImageFallback(images: string[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const currentImage = images[currentIndex];
  const hasMoreImages = currentIndex < images.length - 1;

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleImageError = useCallback(() => {
    const newFailedIndices = new Set(failedIndices);
    newFailedIndices.add(currentIndex);
    setFailedIndices(newFailedIndices);

    if (hasMoreImages) {
      // Try next image
      setCurrentIndex(currentIndex + 1);
      setIsLoading(true);
    } else {
      // All images failed
      setIsLoading(false);
      setHasError(true);
    }
  }, [currentIndex, failedIndices, hasMoreImages]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setFailedIndices(new Set());
    setIsLoading(true);
    setHasError(false);
  }, []);

  return {
    currentImage,
    isLoading,
    hasError,
    handleImageLoad,
    handleImageError,
    reset,
    failedCount: failedIndices.size,
  };
}

/**
 * Advanced market image component with multiple fallback sources
 */
export function AdvancedMarketImage({
  images,
  title,
  className = "",
  fallbackGradient = "from-blue-600 via-purple-600 to-indigo-700",
  onAllImagesFailed,
}: {
  images: string[];
  title: string;
  className?: string;
  fallbackGradient?: string;
  onAllImagesFailed?: () => void;
}) {
  const {
    currentImage,
    isLoading,
    hasError,
    handleImageLoad,
    handleImageError,
    failedCount,
  } = useImageFallback(images.filter(Boolean));

  React.useEffect(() => {
    if (hasError && onAllImagesFailed) {
      onAllImagesFailed();
    }
  }, [hasError, onAllImagesFailed]);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {currentImage && !hasError ? (
        <div className="relative w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentImage} // Force re-render when source changes
            src={currentImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
          
          {/* Loading state overlay - only show when actually loading */}
          {isLoading && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center z-10">
              <Vote className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>
      ) : (
        <FallbackGradient 
          gradient={fallbackGradient} 
          title={title}
          hasImageError={failedCount > 0}
        />
      )}
    </div>
  );
}

/**
 * Utility function to get image sources in priority order
 */
export function getImageSources(eventImage?: string, marketImage?: string): string[] {
  const sources: string[] = [];
  
  if (eventImage) sources.push(eventImage);
  if (marketImage) sources.push(marketImage);
  
  return sources;
}

/**
 * Preload images for better UX
 */
export function preloadImages(images: string[]): Promise<void[]> {
  return Promise.all(
    images.filter(Boolean).map(src => 
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
      })
    )
  );
}