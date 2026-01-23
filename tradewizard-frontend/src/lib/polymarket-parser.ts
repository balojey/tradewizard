/**
 * Data parsing utilities for Polymarket API responses
 * Handles market outcomes, probabilities, and data validation with fallback mechanisms
 */

import {
  PolymarketEvent,
  PolymarketMarket,
  ProcessedEvent,
  ProcessedOutcome,
  MarketType,
  ProcessingResult,
  DataProcessingError,
  ProcessingConfig,
  DEFAULT_PROCESSING_CONFIG,
  POLITICAL_TAGS,
} from './polymarket-types';

/**
 * Safely parse JSON string with fallback
 */
function safeJsonParse<T>(jsonString: string, fallback: T): ProcessingResult<T> {
  try {
    const parsed = JSON.parse(jsonString);
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      data: fallback,
      error: {
        type: 'parsing',
        message: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalData: jsonString,
      },
      fallbackUsed: true,
    };
  }
}

/**
 * Parse market outcomes from JSON string
 */
export function parseMarketOutcomes(
  outcomesJson: string,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessingResult<string[]> {
  if (!outcomesJson || typeof outcomesJson !== 'string') {
    const fallback = ['Yes', 'No'];
    return {
      success: false,
      data: fallback,
      error: {
        type: 'validation',
        message: 'Invalid outcomes JSON string',
        originalData: outcomesJson,
        field: 'outcomes',
      },
      fallbackUsed: config.enableFallbacks,
    };
  }

  const parseResult = safeJsonParse(outcomesJson, ['Yes', 'No']);
  
  if (!parseResult.success && config.enableFallbacks) {
    if (config.logErrors) {
      console.warn('Failed to parse market outcomes, using fallback:', parseResult.error);
    }
    return parseResult;
  }

  // Validate that we have an array of strings
  if (!Array.isArray(parseResult.data) || parseResult.data.some(item => typeof item !== 'string')) {
    const fallback = ['Yes', 'No'];
    return {
      success: false,
      data: fallback,
      error: {
        type: 'validation',
        message: 'Outcomes must be an array of strings',
        originalData: parseResult.data,
        field: 'outcomes',
      },
      fallbackUsed: config.enableFallbacks,
    };
  }

  return parseResult;
}

/**
 * Parse market outcome prices from JSON string
 */
export function parseMarketPrices(
  pricesJson: string,
  expectedLength: number = 2,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessingResult<number[]> {
  if (!pricesJson || typeof pricesJson !== 'string') {
    const fallback = Array(expectedLength).fill(config.defaultProbability);
    return {
      success: false,
      data: fallback,
      error: {
        type: 'validation',
        message: 'Invalid prices JSON string',
        originalData: pricesJson,
        field: 'outcomePrices',
      },
      fallbackUsed: config.enableFallbacks,
    };
  }

  const parseResult = safeJsonParse(pricesJson, Array(expectedLength).fill(config.defaultProbability));
  
  if (!parseResult.success && config.enableFallbacks) {
    if (config.logErrors) {
      console.warn('Failed to parse market prices, using fallback:', parseResult.error);
    }
    return parseResult;
  }

  // Validate and convert to numbers
  if (!Array.isArray(parseResult.data)) {
    const fallback = Array(expectedLength).fill(config.defaultProbability);
    return {
      success: false,
      data: fallback,
      error: {
        type: 'validation',
        message: 'Prices must be an array',
        originalData: parseResult.data,
        field: 'outcomePrices',
      },
      fallbackUsed: config.enableFallbacks,
    };
  }

  const numbers = parseResult.data.map((price: any) => {
    const num = typeof price === 'string' ? parseFloat(price) : Number(price);
    return isNaN(num) ? config.defaultProbability : num;
  });

  // Ensure we have the expected number of prices
  while (numbers.length < expectedLength) {
    numbers.push(config.defaultProbability);
  }

  return { success: true, data: numbers };
}

/**
 * Determine market type based on market structure
 * Enhanced logic for better classification (Requirements 5.1, 5.2)
 */
export function determineMarketType(event: PolymarketEvent): MarketType {
  if (!event.markets || event.markets.length === 0) {
    return 'simple';
  }

  // Check if any market has a groupItemTitle - indicates complex market
  const hasGroupItems = event.markets.some(market => 
    market.groupItemTitle && market.groupItemTitle.trim() !== ''
  );

  // Additional classification logic for complex markets
  if (hasGroupItems) {
    return 'complex';
  }

  // Check if there are multiple markets with different questions - also indicates complex
  const uniqueQuestions = new Set(event.markets.map(m => m.question));
  if (uniqueQuestions.size > 1) {
    return 'complex';
  }

  // Check for threshold-based markets (common pattern in complex markets)
  const hasThresholds = event.markets.some(market =>
    market.question.includes('>=') ||
    market.question.includes('<=') ||
    market.question.includes('between') ||
    market.question.includes('range') ||
    market.groupItemThreshold
  );

  return hasThresholds ? 'complex' : 'simple';
}

/**
 * Process outcomes for simple markets (Yes/No)
 * Enhanced with better fallback handling (Requirements 5.3, 5.6)
 */
function processSimpleOutcomes(
  market: PolymarketMarket,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessedOutcome[] {
  const outcomesResult = parseMarketOutcomes(market.outcomes, config);
  const pricesResult = parseMarketPrices(market.outcomePrices, outcomesResult.data?.length || 2, config);

  // Use fallback if parsing failed
  if (!outcomesResult.success || !pricesResult.success) {
    if (config.logErrors) {
      console.warn('Using fallback outcomes for simple market:', market.id);
    }
    return generateFallbackOutcomes('simple', config);
  }

  const outcomes = outcomesResult.data || ['Yes', 'No'];
  const prices = pricesResult.data || [config.defaultProbability, config.defaultProbability];

  return outcomes.map((name, index) => ({
    name,
    probability: prices[index] || config.defaultProbability,
    color: name.toLowerCase() === 'yes' ? 'yes' as const : 
           name.toLowerCase() === 'no' ? 'no' as const : 'neutral' as const,
  }));
}

/**
 * Process outcomes for complex markets (multiple categories with Yes/No)
 * Enhanced with better fallback handling (Requirements 5.3, 5.6)
 */
function processComplexOutcomes(
  event: PolymarketEvent,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessedOutcome[] {
  const outcomes: ProcessedOutcome[] = [];
  let hasValidOutcomes = false;

  for (const market of event.markets) {
    if (!market.groupItemTitle) continue;

    const outcomesResult = parseMarketOutcomes(market.outcomes, config);
    const pricesResult = parseMarketPrices(market.outcomePrices, outcomesResult.data?.length || 2, config);

    if (outcomesResult.success && pricesResult.success) {
      hasValidOutcomes = true;
      const marketOutcomes = outcomesResult.data || ['Yes', 'No'];
      const prices = pricesResult.data || [config.defaultProbability, config.defaultProbability];

      // For complex markets, we typically want to show the "Yes" probability for each category
      const yesIndex = marketOutcomes.findIndex(outcome => outcome.toLowerCase() === 'yes');
      const yesProbability = yesIndex >= 0 ? prices[yesIndex] : config.defaultProbability;

      outcomes.push({
        name: 'Yes',
        probability: yesProbability,
        color: 'yes',
        category: market.groupItemTitle,
      });
    } else if (config.logErrors) {
      console.warn('Failed to process complex market outcome:', market.id);
    }
  }

  // Use fallback if no valid outcomes were processed
  if (!hasValidOutcomes || outcomes.length === 0) {
    if (config.logErrors) {
      console.warn('Using fallback outcomes for complex market:', event.id);
    }
    return generateFallbackOutcomes('complex', config);
  }

  return outcomes;
}

/**
 * Generate fallback outcomes for malformed or missing data
 * Implements Requirements 5.3, 5.6
 */
export function generateFallbackOutcomes(
  marketType: MarketType = 'simple',
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessedOutcome[] {
  if (marketType === 'simple') {
    return [
      { 
        name: 'Yes', 
        probability: config.defaultProbability, 
        color: 'yes' 
      },
      { 
        name: 'No', 
        probability: 1 - config.defaultProbability, 
        color: 'no' 
      }
    ];
  } else {
    // For complex markets, provide multiple category fallbacks
    const categories = ['Option A', 'Option B', 'Option C'];
    return categories.map(category => ({
      name: 'Yes',
      probability: config.defaultProbability,
      color: 'yes' as const,
      category
    }));
  }
}

/**
 * Enhanced fallback event generation for complete API failures
 * Implements Requirements 5.6, 9.2, 9.4
 */
export function generateFallbackEvent(
  partialData?: Partial<PolymarketEvent>,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessedEvent {
  const fallbackId = partialData?.id || `fallback-${Date.now()}`;
  const fallbackTitle = partialData?.title || 'Market data unavailable';
  
  return {
    id: fallbackId,
    title: fallbackTitle,
    description: partialData?.description || 'Market information could not be loaded',
    image: partialData?.image || '',
    volume: partialData?.volume || 0,
    volumeFormatted: formatVolume(partialData?.volume || 0),
    isNew: partialData?.new || false,
    active: partialData?.active || false,
    closed: partialData?.closed || true,
    marketType: 'simple',
    outcomes: generateFallbackOutcomes('simple', config),
    tags: partialData?.tags?.map(t => t.slug) || ['politics'],
    tagLabels: partialData?.tags?.map(t => t.label) || ['Politics'],
    endDate: partialData?.endDate || new Date().toISOString(),
    startDate: partialData?.startDate || new Date().toISOString(),
    slug: partialData?.slug || fallbackId,
    ticker: partialData?.ticker || fallbackId.toUpperCase(),
  };
}
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  } else {
    return `$${volume.toFixed(0)}`;
  }
}

/**
 * Check if event contains political content
 */
export function isPoliticalEvent(event: PolymarketEvent): boolean {
  if (!event.tags || event.tags.length === 0) {
    return false;
  }

  const politicalSlugs = Object.values(POLITICAL_TAGS);
  return event.tags.some(tag => politicalSlugs.includes(tag.slug as any));
}

/**
 * Process a single Polymarket event into UI-friendly format
 * Enhanced with comprehensive fallback handling (Requirements 5.1, 5.2, 5.3, 5.6)
 */
export function processEvent(
  event: PolymarketEvent,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessingResult<ProcessedEvent> {
  try {
    // Validate event has minimum required data
    if (!event.id || !event.title) {
      if (config.enableFallbacks) {
        return {
          success: false,
          data: generateFallbackEvent(event, config),
          error: {
            type: 'validation',
            message: 'Event missing required fields (id, title)',
            originalData: event,
          },
          fallbackUsed: true,
        };
      } else {
        return {
          success: false,
          error: {
            type: 'validation',
            message: 'Event missing required fields (id, title)',
            originalData: event,
          },
        };
      }
    }

    const marketType = determineMarketType(event);
    
    let outcomes: ProcessedOutcome[];
    if (marketType === 'simple' && event.markets && event.markets.length > 0) {
      outcomes = processSimpleOutcomes(event.markets[0], config);
    } else if (marketType === 'complex' && event.markets && event.markets.length > 0) {
      outcomes = processComplexOutcomes(event, config);
    } else {
      // Fallback for events without markets or invalid market data
      if (config.logErrors) {
        console.warn('Event has no valid markets, using fallback outcomes:', event.id);
      }
      outcomes = generateFallbackOutcomes(marketType, config);
    }

    // Ensure we have at least some outcomes
    if (!outcomes || outcomes.length === 0) {
      outcomes = generateFallbackOutcomes(marketType, config);
    }

    const processedEvent: ProcessedEvent = {
      id: event.id,
      title: event.title,
      description: event.description || '',
      image: event.image || event.icon || '',
      volume: event.volume || 0,
      volumeFormatted: formatVolume(event.volume || 0),
      isNew: event.new || false,
      active: event.active || false,
      closed: event.closed || false,
      marketType,
      outcomes,
      tags: event.tags?.map(tag => tag.slug) || [],
      tagLabels: event.tags?.map(tag => tag.label) || [],
      endDate: event.endDate || new Date().toISOString(),
      startDate: event.startDate || new Date().toISOString(),
      slug: event.slug || event.id,
      ticker: event.ticker || event.id.toUpperCase(),
    };

    return { success: true, data: processedEvent };
  } catch (error) {
    // Enhanced error handling with fallback generation
    const errorResult: ProcessingResult<ProcessedEvent> = {
      success: false,
      error: {
        type: 'unknown',
        message: `Failed to process event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalData: event,
      },
    };

    // Provide fallback if enabled
    if (config.enableFallbacks) {
      errorResult.data = generateFallbackEvent(event, config);
      errorResult.fallbackUsed = true;
    }

    return errorResult;
  }
}

/**
 * Process multiple Polymarket events
 */
export function processEvents(
  events: PolymarketEvent[],
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessingResult<ProcessedEvent[]> {
  const processedEvents: ProcessedEvent[] = [];
  const errors: DataProcessingError[] = [];

  for (const event of events) {
    const result = processEvent(event, config);
    
    if (result.success && result.data) {
      processedEvents.push(result.data);
    } else if (result.error) {
      errors.push(result.error);
      if (config.logErrors) {
        console.warn('Failed to process event:', result.error);
      }
    }
  }

  return {
    success: errors.length === 0,
    data: processedEvents,
    error: errors.length > 0 ? {
      type: 'unknown',
      message: `Failed to process ${errors.length} out of ${events.length} events`,
    } : undefined,
  };
}

/**
 * Filter events by political tags
 */
export function filterPoliticalEvents(events: ProcessedEvent[]): ProcessedEvent[] {
  return events.filter(event => 
    event.tags.some(tag => Object.values(POLITICAL_TAGS).includes(tag as any))
  );
}

/**
 * Filter events by specific tag
 */
export function filterEventsByTag(events: ProcessedEvent[], tagSlug: string): ProcessedEvent[] {
  if (!tagSlug || tagSlug === 'all') {
    return events;
  }
  
  return events.filter(event => event.tags.includes(tagSlug));
}

/**
 * Validate market data structure
 */
export function validateMarketData(market: PolymarketMarket): ProcessingResult<PolymarketMarket> {
  const errors: string[] = [];

  if (!market.id) errors.push('Missing market ID');
  if (!market.question) errors.push('Missing market question');
  if (!market.outcomes) errors.push('Missing market outcomes');
  if (!market.outcomePrices) errors.push('Missing market outcome prices');

  if (errors.length > 0) {
    return {
      success: false,
      error: {
        type: 'validation',
        message: `Market validation failed: ${errors.join(', ')}`,
        originalData: market,
      },
    };
  }

  return { success: true, data: market };
}

/**
 * Validate event data structure
 */
export function validateEventData(event: PolymarketEvent): ProcessingResult<PolymarketEvent> {
  const errors: string[] = [];

  if (!event.id) errors.push('Missing event ID');
  if (!event.title) errors.push('Missing event title');
  if (!event.markets || !Array.isArray(event.markets)) errors.push('Missing or invalid markets array');

  if (errors.length > 0) {
    return {
      success: false,
      error: {
        type: 'validation',
        message: `Event validation failed: ${errors.join(', ')}`,
        originalData: event,
      },
    };
  }

  return { success: true, data: event };
}