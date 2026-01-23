import { getEvents, Event, GetEventsParams } from "./polymarket";

/**
 * Politics-focused data fetching utilities
 * Implements filtering logic for political markets and related tags
 * Requirements: 1.1, 1.2, 1.3, 5.5, 8.1, 8.2, 8.3
 */

// Political tag mappings based on Polymarket data structure
export const POLITICAL_TAGS = {
  all: "politics", // Default to politics tag when "All" is selected
  trump: "trump",
  elections: "elections", 
  "us-politics": "us-politics",
  immigration: "immigration",
  world: "world",
  politics: "politics"
} as const;

export type PoliticalTagSlug = keyof typeof POLITICAL_TAGS;

// Related political tags that should be supported for filtering
export const RELATED_POLITICAL_TAGS = [
  "trump",
  "elections", 
  "us-politics",
  "immigration",
  "world",
  "france",
  "macron",
  "biden",
  "harris",
  "desantis"
] as const;

/**
 * Enhanced political events fetching with comprehensive error handling
 * Implements Requirements 1.1, 1.2, 1.3, 5.5, 8.1, 8.2, 8.3
 */
export async function getPoliticalEvents(params: {
  tag?: string;
  limit?: number;
  active?: boolean;
  closed?: boolean;
  offset?: number;
}): Promise<Event[]> {
  const { tag = "all", limit = 20, active = true, closed = false, offset = 0 } = params;
  
  try {
    const fetchParams: GetEventsParams = {
      limit,
      active,
      closed,
      offset,
    };

    // Implement tag-based filtering logic (Requirements 8.1, 8.3)
    if (tag === "all") {
      // Show all political markets - filter by politics tag (Requirement 1.1)
      fetchParams.tag_slug = "politics";
    } else if (tag in POLITICAL_TAGS) {
      // Show specific political tag (Requirement 8.2)
      fetchParams.tag_slug = POLITICAL_TAGS[tag as PoliticalTagSlug];
    } else if (RELATED_POLITICAL_TAGS.includes(tag as any)) {
      // Support for related political tags (Requirement 8.2)
      fetchParams.tag_slug = tag;
    } else {
      // Fallback to politics for unknown tags (Requirement 1.2)
      console.warn(`Unknown political tag "${tag}", falling back to politics`);
      fetchParams.tag_slug = "politics";
    }

    const events = await getEvents(fetchParams);
    
    // Additional client-side filtering for related political tags (Requirement 1.3)
    // This ensures we only show markets that are truly political
    const filteredEvents = events.filter(event => {
      if (!event.tags || event.tags.length === 0) return false;
      
      // Check if event has politics or related political tags
      const eventTagSlugs = event.tags.map(t => t.slug.toLowerCase());
      const politicalTagValues = Object.values(POLITICAL_TAGS);
      const relatedTags = [...RELATED_POLITICAL_TAGS];
      
      return eventTagSlugs.some(slug => 
        politicalTagValues.includes(slug as any) ||
        relatedTags.includes(slug as any) ||
        slug.includes('politic') ||
        slug.includes('election') ||
        slug.includes('trump') ||
        slug.includes('government') ||
        slug.includes('biden') ||
        slug.includes('harris')
      );
    });

    return filteredEvents;
  } catch (error) {
    // Enhanced error handling (Requirement 5.5)
    console.error("Error fetching political events:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      tag,
      params
    });
    
    // Return empty array as graceful fallback
    return [];
  }
}

/**
 * Get available political tags from current events
 * Helps populate the tag bar with relevant options
 */
export async function getAvailablePoliticalTags(): Promise<Array<{slug: string, label: string, count: number}>> {
  try {
    // Fetch a larger sample to analyze available tags
    const events = await getPoliticalEvents({ limit: 100 });
    
    const tagCounts = new Map<string, number>();
    
    // Count occurrences of each political tag
    events.forEach(event => {
      if (event.tags) {
        event.tags.forEach(tag => {
          const slug = tag.slug.toLowerCase();
          if (RELATED_POLITICAL_TAGS.includes(slug as any) || Object.values(POLITICAL_TAGS).includes(slug as any)) {
            tagCounts.set(slug, (tagCounts.get(slug) || 0) + 1);
          }
        });
      }
    });
    
    // Convert to array and sort by count
    return Array.from(tagCounts.entries())
      .map(([slug, count]) => ({
        slug,
        label: getPoliticalTagDisplayName(slug),
        count
      }))
      .sort((a, b) => b.count - a.count);
      
  } catch (error) {
    console.error("Error fetching available political tags:", error);
    
    // Return default tags as fallback
    return RELATED_POLITICAL_TAGS.map(slug => ({
      slug,
      label: getPoliticalTagDisplayName(slug),
      count: 0
    }));
  }
}

/**
 * Validates if a tag is a valid political tag
 * Used for URL validation and filtering
 */
export function isValidPoliticalTag(tag: string): boolean {
  return tag in POLITICAL_TAGS || 
         tag === "all" || 
         RELATED_POLITICAL_TAGS.includes(tag as any);
}

/**
 * Gets the display name for a political tag
 * Used for UI display and page titles
 */
export function getPoliticalTagDisplayName(tag: string): string {
  const tagMap: Record<string, string> = {
    all: "Political Markets",
    trump: "Trump Markets", 
    elections: "Elections Markets",
    "us-politics": "U.S. Politics Markets",
    immigration: "Immigration Markets",
    world: "World Politics Markets",
    politics: "Politics Markets",
    france: "France Markets",
    macron: "Macron Markets",
    biden: "Biden Markets",
    harris: "Harris Markets",
    desantis: "DeSantis Markets"
  };
  
  return tagMap[tag.toLowerCase()] || `${tag.charAt(0).toUpperCase() + tag.slice(1)} Markets`;
}