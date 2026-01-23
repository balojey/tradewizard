/**
 * Comprehensive data processing pipeline for Polymarket API integration
 * Implements Requirements 5.1, 5.2, 5.3, 5.6
 */

import { 
  PolymarketEvent, 
  ProcessedEvent, 
  ProcessingConfig, 
  DEFAULT_PROCESSING_CONFIG,
  ProcessingResult 
} from './polymarket-types';
import { 
  processEvent, 
  processEvents, 
  validateEventData,
  generateFallbackEvent,
  formatVolume, 
  determineMarketType,
  parseMarketOutcomes,
  parseMarketPrices
} from './polymarket-parser';

/**
 * Main data processing pipeline entry point
 * Processes raw Polymarket events into UI-ready format with comprehensive error handling
 */
export class PolymarketDataProcessor {
  private config: ProcessingConfig;

  constructor(config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG) {
    this.config = config;
  }

  /**
   * Process a single event with full error handling and fallbacks
   */
  async processEvent(event: PolymarketEvent): Promise<ProcessingResult<ProcessedEvent>> {
    try {
      // Validate event data first
      const validationResult = validateEventData(event);
      if (!validationResult.success) {
        if (this.config.enableFallbacks) {
          return {
            success: false,
            data: generateFallbackEvent(event, this.config),
            error: validationResult.error,
            fallbackUsed: true,
          };
        }
        return {
          success: false,
          error: validationResult.error,
        };
      }

      // Process the validated event
      return processEvent(validationResult.data!, this.config);
    } catch (error) {
      const errorResult: ProcessingResult<ProcessedEvent> = {
        success: false,
        error: {
          type: 'unknown',
          message: `Processing pipeline error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          originalData: event,
        },
      };

      if (this.config.enableFallbacks) {
        errorResult.data = generateFallbackEvent(event, this.config);
        errorResult.fallbackUsed = true;
      }

      return errorResult;
    }
  }

  /**
   * Process multiple events with batch error handling
   */
  async processEvents(events: PolymarketEvent[]): Promise<ProcessingResult<ProcessedEvent[]>> {
    const results: ProcessedEvent[] = [];
    const errors: any[] = [];

    for (const event of events) {
      const result = await this.processEvent(event);
      
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(result.error);
        
        // Include fallback data if available
        if (result.fallbackUsed && result.data) {
          results.push(result.data);
        }
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      error: errors.length > 0 ? {
        type: 'unknown',
        message: `Failed to process ${errors.length} out of ${events.length} events`,
      } : undefined,
    };
  }

  /**
   * Process events with political filtering
   */
  async processPoliticalEvents(events: PolymarketEvent[]): Promise<ProcessingResult<ProcessedEvent[]>> {
    // First process all events
    const processResult = await this.processEvents(events);
    
    if (!processResult.data) {
      return processResult;
    }

    // Filter for political events
    const politicalEvents = processResult.data.filter(event => {
      const politicalTags = ['politics', 'trump', 'elections', 'us-politics', 'immigration', 'world'];
      return event.tags.some(tag => 
        politicalTags.includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes('politic') ||
        tag.toLowerCase().includes('election')
      );
    });

    return {
      ...processResult,
      data: politicalEvents,
    };
  }

  /**
   * Utility method to test market outcome parsing
   */
  testMarketOutcomeParsing(outcomesJson: string, pricesJson: string): {
    outcomes: string[];
    prices: number[];
    success: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    const outcomesResult = parseMarketOutcomes(outcomesJson, this.config);
    const pricesResult = parseMarketPrices(pricesJson, 2, this.config);

    if (!outcomesResult.success && outcomesResult.error) {
      errors.push(`Outcomes: ${outcomesResult.error.message}`);
    }

    if (!pricesResult.success && pricesResult.error) {
      errors.push(`Prices: ${pricesResult.error.message}`);
    }

    return {
      outcomes: outcomesResult.data || [],
      prices: pricesResult.data || [],
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Utility method to classify market types
   */
  classifyMarketType(event: PolymarketEvent): {
    type: 'simple' | 'complex';
    reasoning: string;
    marketCount: number;
    hasGroupItems: boolean;
  } {
    const marketType = determineMarketType(event);
    const marketCount = event.markets?.length || 0;
    const hasGroupItems = event.markets?.some(m => m.groupItemTitle) || false;

    let reasoning = '';
    if (marketType === 'simple') {
      reasoning = hasGroupItems 
        ? 'Has group items but classified as simple due to other factors'
        : 'Single market type with basic Yes/No outcomes';
    } else {
      reasoning = hasGroupItems
        ? 'Multiple markets with group item titles indicating categories'
        : 'Multiple markets with different questions or threshold patterns';
    }

    return {
      type: marketType,
      reasoning,
      marketCount,
      hasGroupItems,
    };
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(events: PolymarketEvent[]): {
    total: number;
    simple: number;
    complex: number;
    withImages: number;
    withoutImages: number;
    political: number;
    averageVolume: number;
  } {
    const stats = {
      total: events.length,
      simple: 0,
      complex: 0,
      withImages: 0,
      withoutImages: 0,
      political: 0,
      averageVolume: 0,
    };

    let totalVolume = 0;

    for (const event of events) {
      const marketType = determineMarketType(event);
      if (marketType === 'simple') stats.simple++;
      else stats.complex++;

      if (event.image) stats.withImages++;
      else stats.withoutImages++;

      if (event.tags?.some(t => t.slug.toLowerCase().includes('politic'))) {
        stats.political++;
      }

      totalVolume += event.volume || 0;
    }

    stats.averageVolume = events.length > 0 ? totalVolume / events.length : 0;

    return stats;
  }
}

// Export a default instance for convenience
export const defaultProcessor = new PolymarketDataProcessor();

// Export utility functions for direct use
export { 
  formatVolume, 
  determineMarketType,
  parseMarketOutcomes,
  parseMarketPrices,
  generateFallbackEvent
} from './polymarket-parser';