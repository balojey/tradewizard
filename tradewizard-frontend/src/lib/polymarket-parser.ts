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
 */
export function determineMarketType(event: PolymarketEvent): MarketType {
  if (!event.markets || event.markets.length === 0) {
    return 'simple';
  }

  // Check if any market has a groupItemTitle - indicates complex market
  const hasGroupItems = event.markets.some(market => 
    market.groupItemTitle && market.groupItemTitle.trim() !== ''
  );

  return hasGroupItems ? 'complex' : 'simple';
}

/**
 * Process outcomes for simple markets (Yes/No)
 */
function processSimpleOutcomes(
  market: PolymarketMarket,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessedOutcome[] {
  const outcomesResult = parseMarketOutcomes(market.outcomes, config);
  const pricesResult = parseMarketPrices(market.outcomePrices, outcomesResult.data?.length || 2, config);

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
 */
function processComplexOutcomes(
  event: PolymarketEvent,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessedOutcome[] {
  const outcomes: ProcessedOutcome[] = [];

  for (const market of event.markets) {
    if (!market.groupItemTitle) continue;

    const outcomesResult = parseMarketOutcomes(market.outcomes, config);
    const pricesResult = parseMarketPrices(market.outcomePrices, outcomesResult.data?.length || 2, config);

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
  }

  return outcomes;
}

/**
 * Format volume number to human-readable string
 */
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
 */
export function processEvent(
  event: PolymarketEvent,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessingResult<ProcessedEvent> {
  try {
    const marketType = determineMarketType(event);
    
    let outcomes: ProcessedOutcome[];
    if (marketType === 'simple' && event.markets.length > 0) {
      outcomes = processSimpleOutcomes(event.markets[0], config);
    } else if (marketType === 'complex') {
      outcomes = processComplexOutcomes(event, config);
    } else {
      // Fallback for events without markets
      outcomes = [
        { name: 'Yes', probability: config.defaultProbability, color: 'yes' },
        { name: 'No', probability: config.defaultProbability, color: 'no' },
      ];
    }

    const processedEvent: ProcessedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      image: event.image || event.icon || '',
      volume: event.volume,
      volumeFormatted: formatVolume(event.volume),
      isNew: event.new,
      active: event.active,
      closed: event.closed,
      marketType,
      outcomes,
      tags: event.tags?.map(tag => tag.slug) || [],
      tagLabels: event.tags?.map(tag => tag.label) || [],
      endDate: event.endDate,
      startDate: event.startDate,
      slug: event.slug,
      ticker: event.ticker,
    };

    return { success: true, data: processedEvent };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'unknown',
        message: `Failed to process event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalData: event,
      },
    };
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