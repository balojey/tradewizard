/**
 * Comprehensive accessibility utilities for TradeWizard frontend
 * Implements Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { useEffect, useState, useCallback } from 'react';

/**
 * ARIA live region types for dynamic content updates
 */
export type AriaLiveType = 'off' | 'polite' | 'assertive';

/**
 * Screen reader announcement priorities
 */
export type AnnouncementPriority = 'low' | 'medium' | 'high';

/**
 * Accessibility preferences interface
 */
export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

/**
 * Focus management utilities
 */
export class FocusManager {
  private static focusStack: HTMLElement[] = [];
  private static trapStack: HTMLElement[] = [];

  /**
   * Save current focus and set new focus
   */
  static saveFocus(newFocus?: HTMLElement): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus && currentFocus !== document.body) {
      this.focusStack.push(currentFocus);
    }
    
    if (newFocus) {
      // Use setTimeout to ensure the element is rendered
      setTimeout(() => {
        newFocus.focus();
      }, 0);
    }
  }

  /**
   * Restore previously saved focus
   */
  static restoreFocus(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const previousFocus = this.focusStack.pop();
    if (previousFocus && document.contains(previousFocus)) {
      setTimeout(() => {
        previousFocus.focus();
      }, 0);
    }
  }

  /**
   * Trap focus within a container element
   */
  static trapFocus(container: HTMLElement): () => void {
    this.trapStack.push(container);
    
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    firstElement.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      this.trapStack.pop();
    };
  }

  /**
   * Get all focusable elements within a container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    if (typeof window === 'undefined' || typeof document === 'undefined') return [];
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    
    return elements.filter(element => {
      return element.offsetWidth > 0 && 
             element.offsetHeight > 0 && 
             !element.hasAttribute('hidden') &&
             window.getComputedStyle(element).visibility !== 'hidden';
    });
  }

  /**
   * Move focus to next focusable element
   */
  static focusNext(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const focusableElements = this.getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }

  /**
   * Move focus to previous focusable element
   */
  static focusPrevious(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const focusableElements = this.getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[prevIndex]?.focus();
  }
}

/**
 * Screen reader announcement manager
 */
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private liveRegions: Map<AnnouncementPriority, HTMLElement> = new Map();
  private announcementQueue: Array<{ message: string; priority: AnnouncementPriority }> = [];
  private isProcessing = false;

  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }

  constructor() {
    // Only create live regions on the client side
    if (typeof window !== 'undefined') {
      this.createLiveRegions();
    }
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: AnnouncementPriority = 'medium'): void {
    if (!message.trim()) return;

    this.announcementQueue.push({ message, priority });
    this.processQueue();
  }

  /**
   * Announce market price change
   */
  announceMarketUpdate(marketTitle: string, oldPrice: number, newPrice: number): void {
    const change = newPrice - oldPrice;
    const direction = change > 0 ? 'increased' : 'decreased';
    const percentage = Math.abs((change / oldPrice) * 100).toFixed(1);
    
    const message = `${marketTitle} price ${direction} by ${percentage}% to ${newPrice}%`;
    this.announce(message, 'low');
  }

  /**
   * Announce trading action result
   */
  announceTradingResult(action: string, success: boolean, details?: string): void {
    const message = success 
      ? `${action} completed successfully${details ? `: ${details}` : ''}`
      : `${action} failed${details ? `: ${details}` : ''}`;
    
    this.announce(message, success ? 'medium' : 'high');
  }

  /**
   * Announce navigation change
   */
  announceNavigation(pageName: string, itemCount?: number): void {
    const message = itemCount !== undefined 
      ? `Navigated to ${pageName} page with ${itemCount} items`
      : `Navigated to ${pageName} page`;
    
    this.announce(message, 'low');
  }

  /**
   * Create ARIA live regions for announcements
   */
  private createLiveRegions(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const priorities: Array<{ priority: AnnouncementPriority; politeness: AriaLiveType }> = [
      { priority: 'low', politeness: 'polite' },
      { priority: 'medium', politeness: 'polite' },
      { priority: 'high', politeness: 'assertive' }
    ];

    priorities.forEach(({ priority, politeness }) => {
      const region = document.createElement('div');
      region.setAttribute('aria-live', politeness);
      region.setAttribute('aria-atomic', 'true');
      region.setAttribute('class', 'sr-only');
      region.setAttribute('id', `live-region-${priority}`);
      
      document.body.appendChild(region);
      this.liveRegions.set(priority, region);
    });
  }

  /**
   * Process announcement queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.announcementQueue.length === 0) return;

    this.isProcessing = true;

    while (this.announcementQueue.length > 0) {
      const { message, priority } = this.announcementQueue.shift()!;
      const region = this.liveRegions.get(priority);
      
      if (region) {
        // Clear previous message
        region.textContent = '';
        
        // Small delay to ensure screen readers notice the change
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set new message
        region.textContent = message;
        
        // Wait before processing next message
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessing = false;
  }
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
  private static handlers: Map<string, (event: KeyboardEvent) => void> = new Map();

  /**
   * Register global keyboard shortcut
   */
  static registerShortcut(
    key: string, 
    handler: (event: KeyboardEvent) => void,
    options: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}
  ): () => void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return () => {}; // Return no-op cleanup function
    }
    
    const shortcutKey = this.createShortcutKey(key, options);
    
    const wrappedHandler = (event: KeyboardEvent) => {
      if (this.matchesShortcut(event, key, options)) {
        event.preventDefault();
        handler(event);
      }
    };

    this.handlers.set(shortcutKey, wrappedHandler);
    document.addEventListener('keydown', wrappedHandler);

    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', wrappedHandler);
      this.handlers.delete(shortcutKey);
    };
  }

  /**
   * Handle arrow key navigation for grids
   */
  static handleGridNavigation(
    event: KeyboardEvent,
    container: HTMLElement,
    columns: number
  ): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const focusableElements = FocusManager.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        newIndex = Math.min(currentIndex + 1, focusableElements.length - 1);
        break;
      case 'ArrowLeft':
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        newIndex = Math.min(currentIndex + columns, focusableElements.length - 1);
        break;
      case 'ArrowUp':
        newIndex = Math.max(currentIndex - columns, 0);
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = focusableElements.length - 1;
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      event.preventDefault();
      focusableElements[newIndex]?.focus();
    }
  }

  /**
   * Handle list navigation with type-ahead
   */
  static handleListNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    onSelect?: (item: HTMLElement) => void
  ): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        newIndex = Math.min(currentIndex + 1, items.length - 1);
        break;
      case 'ArrowUp':
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        if (currentIndex >= 0 && onSelect) {
          event.preventDefault();
          onSelect(items[currentIndex]);
        }
        return;
      default:
        return;
    }

    if (newIndex !== currentIndex && newIndex >= 0) {
      event.preventDefault();
      items[newIndex]?.focus();
    }
  }

  private static createShortcutKey(
    key: string, 
    options: { ctrl?: boolean; alt?: boolean; shift?: boolean }
  ): string {
    const modifiers = [];
    if (options.ctrl) modifiers.push('ctrl');
    if (options.alt) modifiers.push('alt');
    if (options.shift) modifiers.push('shift');
    return `${modifiers.join('+')}-${key.toLowerCase()}`;
  }

  private static matchesShortcut(
    event: KeyboardEvent,
    key: string,
    options: { ctrl?: boolean; alt?: boolean; shift?: boolean }
  ): boolean {
    return event.key.toLowerCase() === key.toLowerCase() &&
           event.ctrlKey === !!options.ctrl &&
           event.altKey === !!options.alt &&
           event.shiftKey === !!options.shift;
  }
}

/**
 * Accessibility hooks
 */

/**
 * Hook for managing accessibility preferences
 */
export function useAccessibilityPreferences(): AccessibilityPreferences {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
    keyboardNavigation: false,
  });

  useEffect(() => {
    // Check for prefers-reduced-motion
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPreferences(prev => ({ ...prev, reduceMotion: reduceMotionQuery.matches }));

    const handleReduceMotionChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, reduceMotion: e.matches }));
    };

    reduceMotionQuery.addEventListener('change', handleReduceMotionChange);

    // Check for prefers-contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setPreferences(prev => ({ ...prev, highContrast: contrastQuery.matches }));

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, highContrast: e.matches }));
    };

    contrastQuery.addEventListener('change', handleContrastChange);

    // Detect screen reader usage
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasScreenReader = !!(
        window.navigator.userAgent.includes('NVDA') ||
        window.navigator.userAgent.includes('JAWS') ||
        window.speechSynthesis ||
        document.querySelector('[aria-live]')
      );
      
      setPreferences(prev => ({ ...prev, screenReader: hasScreenReader }));
    };

    detectScreenReader();

    // Detect keyboard navigation preference
    const handleFirstTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setPreferences(prev => ({ ...prev, keyboardNavigation: true }));
        document.removeEventListener('keydown', handleFirstTab);
      }
    };

    document.addEventListener('keydown', handleFirstTab);

    return () => {
      reduceMotionQuery.removeEventListener('change', handleReduceMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
      document.removeEventListener('keydown', handleFirstTab);
    };
  }, []);

  return preferences;
}

/**
 * Hook for screen reader announcements
 */
export function useScreenReader() {
  const announcer = ScreenReaderAnnouncer.getInstance();

  return {
    announce: announcer.announce.bind(announcer),
    announceMarketUpdate: announcer.announceMarketUpdate.bind(announcer),
    announceTradingResult: announcer.announceTradingResult.bind(announcer),
    announceNavigation: announcer.announceNavigation.bind(announcer),
  };
}

/**
 * Hook for focus management
 */
export function useFocusManagement() {
  return {
    saveFocus: FocusManager.saveFocus,
    restoreFocus: FocusManager.restoreFocus,
    trapFocus: FocusManager.trapFocus,
    focusNext: FocusManager.focusNext,
    focusPrevious: FocusManager.focusPrevious,
  };
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{
    key: string;
    handler: (event: KeyboardEvent) => void;
    options?: { ctrl?: boolean; alt?: boolean; shift?: boolean };
  }>
) {
  useEffect(() => {
    const cleanupFunctions = shortcuts.map(({ key, handler, options }) =>
      KeyboardNavigation.registerShortcut(key, handler, options)
    );

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [shortcuts]);
}

/**
 * Utility functions for ARIA attributes
 */
export const AriaUtils = {
  /**
   * Generate unique ID for ARIA relationships
   */
  generateId: (prefix: string = 'aria'): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create ARIA label for market probability
   */
  createProbabilityLabel: (outcome: string, probability: number): string => {
    return `${outcome} outcome has ${probability}% probability`;
  },

  /**
   * Create ARIA label for market volume
   */
  createVolumeLabel: (volume: string): string => {
    return `Trading volume: ${volume}`;
  },

  /**
   * Create ARIA label for price change
   */
  createPriceChangeLabel: (change: number): string => {
    const direction = change > 0 ? 'increased' : 'decreased';
    const percentage = Math.abs(change).toFixed(1);
    return `Price ${direction} by ${percentage}%`;
  },

  /**
   * Create ARIA description for market status
   */
  createMarketStatusLabel: (active: boolean, closed: boolean, endDate?: string): string => {
    if (closed) return 'Market is closed';
    if (!active) return 'Market is inactive';
    if (endDate) {
      const date = new Date(endDate);
      return `Market closes on ${date.toLocaleDateString()}`;
    }
    return 'Market is active';
  },
};

/**
 * Color contrast utilities
 */
export const ContrastUtils = {
  /**
   * Calculate color contrast ratio
   */
  getContrastRatio: (color1: string, color2: string): number => {
    const getLuminance = (color: string): number => {
      // Simplified luminance calculation
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;
      
      const [r, g, b] = rgb.map(c => {
        const val = parseInt(c) / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  },

  /**
   * Check if color combination meets WCAG AA standards
   */
  meetsWCAGAA: (color1: string, color2: string): boolean => {
    return ContrastUtils.getContrastRatio(color1, color2) >= 4.5;
  },

  /**
   * Check if color combination meets WCAG AAA standards
   */
  meetsWCAGAAA: (color1: string, color2: string): boolean => {
    return ContrastUtils.getContrastRatio(color1, color2) >= 7;
  },
};

// Export singleton instances
export const screenReader = ScreenReaderAnnouncer.getInstance();
export const focusManager = FocusManager;
export const keyboardNav = KeyboardNavigation;