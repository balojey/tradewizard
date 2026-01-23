/**
 * Data processing utilities for transforming Polymarket events into UI-ready format
 */

import { 
  PolymarketEvent, 
  ProcessedEvent, 
  ProcessingResult, 
  ProcessingConfig,
  DEFAULT_PROCESSING_CONFIG 
} from './polymarket-types';
import { 
  processMarketOutcomes, 
  formatVolume, 
  getTagSlugs, 
  getTagLabels 
} from './market-type-detection';

/**
 * Processes a single Polymarket event into UI-ready format
 */
export function processPolymarketEvent(
  event: PolymarketEvent, 
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessingResult<ProcessedEvent> {
  try {
    // Process market outcomes and determine type
    const { marketType, outcomes } = processMarketOutcomes(event);

    // Create processed event
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
      tags: getTagSlugs(event),
      tagLabels: getTagLabels(event),
      endDate: event.endDate,
      startDate: event.startDate,
      slug: event.slug,
      ticker: event.ticker
    };

    return {
      success: true,
      data: processedEvent,
      fallbackUsed: false
    };

  } catch (error) {
    if (config.logErrors) {
      console.error('Error processing Polymarket event:', error);
    }

    if (config.enableFallbacks) {
      // Create fallback event
      const fallbackEvent: ProcessedEvent = {
        id: event.id,
        title: event.title || 'Unknown Market',
        description: event.description || '',
        image: event.image || event.icon || '',
        volume: event.volume || 0,
        volumeFormatted: formatVolume(event.volume || 0),
        isNew: event.new || false,
        active: event.active || false,
        closed: event.closed || false,
        marketType: 'simple',
        outcomes: [
          { name: 'Yes', probability: 50, color: 'yes' },
          { name: 'No', probability: 50, color: 'no' }
        ],
        tags: getTagSlugs(event),
        tagLabels: getTagLabels(event),
        endDate: event.endDate || '',
        startDate: event.startDate || '',
        slug: event.slug || '',
        ticker: event.ticker || ''
      };

      return {
        success: true,
        data: fallbackEvent,
        fallbackUsed: true
      };
    }

    return {
      success: false,
      error: {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        originalData: event
      }
    };
  }
}

/**
 * Processes multiple Polymarket events
 */
export function processPolymarketEvents(
  events: PolymarketEvent[], 
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessingResult<ProcessedEvent[]> {
  const processedEvents: ProcessedEvent[] = [];
  const errors: any[] = [];
  let fallbacksUsed = 0;

  for (const event of events) {
    const result = processPolymarketEvent(event, config);
    
    if (result.success && result.data) {
      processedEvents.push(result.data);
      if (result.fallbackUsed) {
        fallbacksUsed++;
      }
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  if (processedEvents.length === 0 && errors.length > 0) {
    return {
      success: false,
      error: {
        type: 'unknown',
        message: `Failed to process any events. ${errors.length} errors occurred.`,
        originalData: events
      }
    };
  }

  return {
    success: true,
    data: processedEvents,
    fallbackUsed: fallbacksUsed > 0
  };
}

/**
 * Filters events by political tags
 */
export function filterPoliticalEvents(events: ProcessedEvent[]): ProcessedEvent[] {
  return events.filter(event => 
    event.tags.includes('politics') || 
    event.tags.some(tag => 
      ['trump', 'elections', 'u-s-politics', 'immigration', 'world', 'france', 'macron'].includes(tag)
    )
  );
}

/**
 * Filters events by specific tag
 */
export function filterEventsByTag(events: ProcessedEvent[], tagSlug: string): ProcessedEvent[] {
  if (tagSlug === 'all' || !tagSlug) {
    return events;
  }
  
  return events.filter(event => event.tags.includes(tagSlug));
}

/**
 * Sorts events by volume (descending)
 */
export function sortEventsByVolume(events: ProcessedEvent[]): ProcessedEvent[] {
  return [...events].sort((a, b) => b.volume - a.volume);
}

/**
 * Sorts events by creation date (newest first)
 */
export function sortEventsByDate(events: ProcessedEvent[]): ProcessedEvent[] {
  return [...events].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
}

/**
 * Gets unique political tags from events
 */
export function getUniquePoliticalTags(events: ProcessedEvent[]): Array<{slug: string, label: string, count: number}> {
  const tagCounts = new Map<string, {label: string, count: number}>();
  
  events.forEach(event => {
    event.tags.forEach((tagSlug, index) => {
      const tagLabel = event.tagLabels[index] || tagSlug;
      
      // Only include political tags
      if (['politics', 'trump', 'elections', 'u-s-politics', 'immigration', 'world', 'france', 'macron'].includes(tagSlug)) {
        const existing = tagCounts.get(tagSlug);
        if (existing) {
          existing.count++;
        } else {
          tagCounts.set(tagSlug, { label: tagLabel, count: 1 });
        }
      }
    });
  });

  return Array.from(tagCounts.entries())
    .map(([slug, {label, count}]) => ({slug, label, count}))
    .sort((a, b) => b.count - a.count);
}

/**
 * Validates that an event has minimum required data
 */
export function validateEventData(event: PolymarketEvent): boolean {
  return !!(
    event.id &&
    event.title &&
    event.markets &&
    event.markets.length > 0 &&
    event.tags &&
    event.tags.length > 0
  );
}

/**
 * Transforms ProcessedEvent to MarketCard props format
 */
export function eventToMarketCardProps(event: ProcessedEvent) {
  return {
    id: event.id,
    title: event.title,
    image: event.image,
    volume: event.volumeFormatted,
    outcomes: event.outcomes.map(outcome => ({
      name: outcome.name,
      probability: outcome.probability,
      color: outcome.color || 'neutral' as const,
      category: outcome.category
    })),
    isNew: event.isNew,
    marketType: event.marketType
  };
}