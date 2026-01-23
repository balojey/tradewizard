/**
 * Image utilities for market image handling and optimization
 * Implements Requirements 6.2, 7.3, 9.1
 */

export interface ImageLoadResult {
  src: string;
  success: boolean;
  error?: string;
  loadTime: number;
}

export interface ImagePreloadOptions {
  timeout?: number; // Timeout in milliseconds
  priority?: 'high' | 'low';
  sizes?: string;
}

/**
 * Preload a single image with timeout and error handling
 */
export function preloadImage(
  src: string, 
  options: ImagePreloadOptions = {}
): Promise<ImageLoadResult> {
  const { timeout = 10000 } = options;
  const startTime = Date.now();

  return new Promise((resolve) => {
    const img = new Image();
    let resolved = false;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    const resolveResult = (success: boolean, error?: string) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      
      resolve({
        src,
        success,
        error,
        loadTime: Date.now() - startTime,
      });
    };

    // Set up timeout
    const timeoutId = setTimeout(() => {
      resolveResult(false, `Timeout after ${timeout}ms`);
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolveResult(true);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolveResult(false, 'Failed to load image');
    };

    // Start loading
    img.src = src;
  });
}

/**
 * Preload multiple images with priority handling
 */
export async function preloadImages(
  sources: string[], 
  options: ImagePreloadOptions = {}
): Promise<ImageLoadResult[]> {
  const validSources = sources.filter(Boolean);
  
  if (validSources.length === 0) {
    return [];
  }

  // Load images in parallel
  const promises = validSources.map(src => preloadImage(src, options));
  
  try {
    return await Promise.all(promises);
  } catch (error) {
    // This shouldn't happen since preloadImage always resolves
    console.error('Unexpected error in preloadImages:', error);
    return validSources.map(src => ({
      src,
      success: false,
      error: 'Unexpected error',
      loadTime: 0,
    }));
  }
}

/**
 * Get the best available image from a list of sources
 */
export async function getBestImage(
  sources: string[], 
  options: ImagePreloadOptions = {}
): Promise<string | null> {
  const results = await preloadImages(sources, options);
  
  // Return the first successfully loaded image
  const successfulResult = results.find(result => result.success);
  return successfulResult?.src || null;
}

/**
 * Create optimized image URLs with size parameters
 */
export function optimizeImageUrl(
  url: string, 
  width?: number, 
  height?: number, 
  quality?: number
): string {
  if (!url) return url;

  try {
    const urlObj = new URL(url);
    
    // Add optimization parameters if supported
    if (width) urlObj.searchParams.set('w', width.toString());
    if (height) urlObj.searchParams.set('h', height.toString());
    if (quality) urlObj.searchParams.set('q', quality.toString());
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Generate responsive image sizes for different viewports
 */
export function generateResponsiveImages(
  baseUrl: string,
  sizes: { width: number; height?: number; quality?: number }[]
): { src: string; width: number; height?: number }[] {
  if (!baseUrl) return [];

  return sizes.map(({ width, height, quality = 80 }) => ({
    src: optimizeImageUrl(baseUrl, width, height, quality),
    width,
    height,
  }));
}

/**
 * Check if an image URL is likely to be valid
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
    
    // Check for common image extensions
    const pathname = urlObj.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    
    // Also accept URLs that might be dynamic image endpoints
    const isDynamicImage = pathname.includes('image') || 
                          urlObj.searchParams.has('format') ||
                          urlObj.searchParams.has('w') ||
                          urlObj.searchParams.has('width');
    
    return hasImageExtension || isDynamicImage;
  } catch (error) {
    return false;
  }
}

/**
 * Filter and prioritize image sources
 */
export function prioritizeImageSources(
  eventImage?: string,
  marketImage?: string,
  fallbackImages: string[] = []
): string[] {
  const sources: string[] = [];
  
  // Add event image (highest priority)
  if (eventImage && isValidImageUrl(eventImage)) {
    sources.push(eventImage);
  }
  
  // Add market image (medium priority)
  if (marketImage && isValidImageUrl(marketImage)) {
    sources.push(marketImage);
  }
  
  // Add fallback images (lowest priority)
  fallbackImages.forEach(img => {
    if (img && isValidImageUrl(img) && !sources.includes(img)) {
      sources.push(img);
    }
  });
  
  return sources;
}

/**
 * Create a data URL for a solid color fallback
 */
export function createColorFallback(color: string = '#6366f1'): string {
  // Create a 1x1 pixel data URL with the specified color
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return canvas.toDataURL();
  }
  
  // Fallback to SVG data URL if canvas fails
  const svg = `<svg width="1" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Image loading hook for React components
 */
export function useImageLoader(sources: string[], options: ImagePreloadOptions = {}) {
  const [currentImage, setCurrentImage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [loadResults, setLoadResults] = React.useState<ImageLoadResult[]>([]);

  React.useEffect(() => {
    if (sources.length === 0) {
      setCurrentImage(null);
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    preloadImages(sources, options).then(results => {
      setLoadResults(results);
      
      const successfulResult = results.find(result => result.success);
      if (successfulResult) {
        setCurrentImage(successfulResult.src);
        setHasError(false);
      } else {
        setCurrentImage(null);
        setHasError(true);
      }
      
      setIsLoading(false);
    });
  }, [sources.join(','), options.timeout]);

  return {
    currentImage,
    isLoading,
    hasError,
    loadResults,
    successCount: loadResults.filter(r => r.success).length,
    failureCount: loadResults.filter(r => !r.success).length,
  };
}

// Re-export React for the hook
import React from 'react';