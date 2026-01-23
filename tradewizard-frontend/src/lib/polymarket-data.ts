/**
 * Enhanced Polymarket API integration with data processing layer
 * Extends the existing polymarket.ts with comprehensive error handling and fallback mechanisms
 */

import {
  PolymarketEvent,
  ProcessedEvent,
  ProcessingConfig,
  DEFAULT_PROCESSING_CONFIG,
  POLITICAL_TAGS,
  RELATED_POLITICAL_TAGS,
} from './polymarket-types';
import {
  processEvents,
  filterPoliticalEvents,
  filterEventsByTag,
  validateEventData,
} from './polymarket-parser';

// Re-export the existing API base URL and interfaces for compatibility
export { API_BASE_URL, type Event, type Market, type Outcome } from './polymarket';

// Enhanced parameters interface with political filtering
export interface EnhancedGetEventsParams {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  order?: "asc" | "desc";
  ascending?: boolean;
  slug?: string;
  id?: string;
  tag_slug?: string;
  tag_id?: string;
  // Enhanced political filtering
  politicsOnly?: boolean;
  relatedPoliticalTags?: boolean;
}

/**
 * Enhanced event fetching with data processing and error handling
 */
export async function getEventsWithProcessing(
  params: EnhancedGetEventsParams = {},
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): Promise<ProcessedEvent[]> {
  const searchParams = new URLSearchParams();

  // Build search parameters
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.offset) searchParams.set("offset", params.offset.toString());
  if (params.active !== undefined) searchParams.set("active", params.active.toString());
  if (params.closed !== undefined) searchParams.set("closed", params.closed.toString());
  if (params.archived !== undefined) searchParams.set("archived", params.archived.toString());
  if (params.ascending !== undefined) searchParams.set("ascending", params.ascending.toString());
  if (params.slug) searchParams.set("slug", params.slug);
  if (params.id) searchParams.set("id", params.id);

  // Handle political filtering
  if (params.politicsOnly) {
    searchParams.set("tag_slug", POLITICAL_TAGS.POLITICS);
  } else if (params.tag_slug) {
    searchParams.set("tag_slug", params.tag_slug);
  } else if (params.tag_id) {
    searchParams.set("tag_id", params.tag_id);
  }

  try {
    const response = await fetch(`https://gamma-api.polymarket.com/events?${searchParams.toString()}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds (ISR)
    });

    if (!response.ok) {
      if (config.logErrors) {
        console.error(`Failed to fetch events: ${response.status} ${response.statusText}`);
      }
      
      // Return empty array as fallback
      return [];
    }

    const rawEvents: PolymarketEvent[] = await response.json();
    
    // Validate and process events
    const validEvents: PolymarketEvent[] = [];
    for (const event of rawEvents) {
      const validationResult = validateEventData(event);
      if (validationResult.success && validationResult.data) {
        validEvents.push(validationResult.data);
      } else if (config.logErrors && validationResult.error) {
        console.warn('Invalid event data:', validationResult.error);
      }
    }

    // Process events into UI-friendly format
    const processingResult = processEvents(validEvents, config);
    
    if (!processingResult.success && config.logErrors && processingResult.error) {
      console.warn('Event processing errors:', processingResult.error);
    }

    let processedEvents = processingResult.data || [];

    // Apply additional filtering if needed
    if (params.politicsOnly && !params.tag_slug) {
      processedEvents = filterPoliticalEvents(processedEvents);
    }

    return processedEvents;

  } catch (error) {
    if (config.logErrors) {
      console.error("Error fetching and processing events:", error);
    }
    
    // Return empty array as fallback
    return [];
  }
}

/**
 * Get political events with enhanced filtering
 */
export async function getPoliticalEvents(
  params: Omit<EnhancedGetEventsParams, 'politicsOnly'> = {},
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): Promise<ProcessedEvent[]> {
  return getEventsWithProcessing(
    { ...params, politicsOnly: true },
    config
  );
}

/**
 * Get events filtered by specific political tag
 */
export async function getEventsByPoliticalTag(
  tagSlug: string,
  params: Omit<EnhancedGetEventsParams, 'tag_slug'> = {},
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): Promise<ProcessedEvent[]> {
  // Validate that it's a political tag
  const politicalTags = Object.values(POLITICAL_TAGS);
  if (!politicalTags.includes(tagSlug as any)) {
    if (config.logErrors) {
      console.warn(`Tag "${tagSlug}" is not a recognized political tag`);
    }
  }

  return getEventsWithProcessing(
    { ...params, tag_slug: tagSlug },
    config
  );
}

/**
 * Get trending political events
 */
export async function getTrendingPoliticalEvents(
  limit: number = 20,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): Promise<ProcessedEvent[]> {
  return getPoliticalEvents(
    { 
      limit, 
      active: true, 
      closed: false,
      ascending: false // Get highest volume/most active first
    },
    config
  );
}

/**
 * Get available political tags from events
 */
export async function getAvailablePoliticalTags(
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): Promise<{ slug: string; label: string; count: number }[]> {
  try {
    // Fetch a larger sample to get tag distribution
    const events = await getPoliticalEvents({ limit: 100 }, config);
    
    const tagCounts = new Map<string, { label: string; count: number }>();
    
    for (const event of events) {
      for (let i = 0; i < event.tags.length; i++) {
        const slug = event.tags[i];
        const label = event.tagLabels[i] || slug;
        
        // Only include political tags
        if (Object.values(POLITICAL_TAGS).includes(slug as any)) {
          const current = tagCounts.get(slug) || { label, count: 0 };
          tagCounts.set(slug, { label, count: current.count + 1 });
        }
      }
    }
    
    return Array.from(tagCounts.entries())
      .map(([slug, data]) => ({ slug, ...data }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
      
  } catch (error) {
    if (config.logErrors) {
      console.error("Error fetching political tags:", error);
    }
    
    // Return default political tags as fallback
    return RELATED_POLITICAL_TAGS.map(slug => ({
      slug,
      label: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: 0,
    }));
  }
}

/**
 * Search events by title or description
 */
export async function searchEvents(
  query: string,
  params: EnhancedGetEventsParams = {},
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): Promise<ProcessedEvent[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    // Fetch events and filter client-side (Polymarket API doesn't have text search)
    const events = await getEventsWithProcessing(
      { ...params, limit: params.limit || 100 },
      config
    );
    
    const searchTerm = query.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(searchTerm) ||
      event.description.toLowerCase().includes(searchTerm)
    );
    
  } catch (error) {
    if (config.logErrors) {
      console.error("Error searching events:", error);
    }
    return [];
  }
}

/**
 * Get event by ID with processing
 */
export async function getEventById(
  id: string,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): Promise<ProcessedEvent | null> {
  try {
    const events = await getEventsWithProcessing({ id }, config);
    return events.length > 0 ? events[0] : null;
  } catch (error) {
    if (config.logErrors) {
      console.error(`Error fetching event ${id}:`, error);
    }
    return null;
  }
}

/**
 * Get event by slug with processing
 */
export async function getEventBySlug(
  slug: string,
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): Promise<ProcessedEvent | null> {
  try {
    const events = await getEventsWithProcessing({ slug }, config);
    return events.length > 0 ? events[0] : null;
  } catch (error) {
    if (config.logErrors) {
      console.error(`Error fetching event ${slug}:`, error);
    }
    return null;
  }
}

/**
 * Utility function to check if a tag is political
 */
export function isPoliticalTag(tagSlug: string): boolean {
  return Object.values(POLITICAL_TAGS).includes(tagSlug as any);
}

/**
 * Get the display name for a political tag
 */
export function getPoliticalTagDisplayName(tagSlug: string): string {
  const displayNames: Record<string, string> = {
    [POLITICAL_TAGS.POLITICS]: 'Politics',
    [POLITICAL_TAGS.TRUMP]: 'Trump',
    [POLITICAL_TAGS.ELECTIONS]: 'Elections',
    [POLITICAL_TAGS.US_POLITICS]: 'U.S. Politics',
    [POLITICAL_TAGS.IMMIGRATION]: 'Immigration',
    [POLITICAL_TAGS.WORLD]: 'World',
    [POLITICAL_TAGS.FRANCE]: 'France',
    [POLITICAL_TAGS.MACRON]: 'Macron',
  };
  
  return displayNames[tagSlug] || tagSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Backward compatibility exports
export { getEvents, getTrendingEvents } from './polymarket';