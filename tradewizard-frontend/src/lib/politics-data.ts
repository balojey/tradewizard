import { getEvents, Event, GetEventsParams } from "./polymarket";

/**
 * Politics-focused data fetching utilities
 * Implements filtering logic for political markets and related tags
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

/**
 * Fetches political markets with proper tag filtering
 * Implements Requirements 1.1, 1.2, 1.3, 8.1, 8.2, 8.3
 */
export async function getPoliticalEvents(params: {
  tag?: string;
  limit?: number;
  active?: boolean;
  closed?: boolean;
}): Promise<Event[]> {
  const { tag = "all", limit = 20, active = true, closed = false } = params;
  
  const fetchParams: GetEventsParams = {
    limit,
    active,
    closed,
  };

  // Implement tag-based filtering logic
  if (tag === "all") {
    // Show all political markets - filter by politics tag
    fetchParams.tag_slug = "politics";
  } else if (tag in POLITICAL_TAGS) {
    // Show specific political tag
    fetchParams.tag_slug = POLITICAL_TAGS[tag as PoliticalTagSlug];
  } else {
    // Fallback to politics for unknown tags
    fetchParams.tag_slug = "politics";
  }

  try {
    const events = await getEvents(fetchParams);
    
    // Additional client-side filtering for related political tags
    // This ensures we only show markets that are truly political
    return events.filter(event => {
      if (!event.tags || event.tags.length === 0) return false;
      
      // Check if event has politics or related political tags
      const eventTagSlugs = event.tags.map(t => t.slug.toLowerCase());
      const politicalTagValues = Object.values(POLITICAL_TAGS);
      
      return eventTagSlugs.some(slug => 
        politicalTagValues.includes(slug as any) ||
        slug.includes('politic') ||
        slug.includes('election') ||
        slug.includes('trump') ||
        slug.includes('government')
      );
    });
  } catch (error) {
    console.error("Error fetching political events:", error);
    return [];
  }
}

/**
 * Validates if a tag is a valid political tag
 * Used for URL validation and filtering
 */
export function isValidPoliticalTag(tag: string): boolean {
  return tag in POLITICAL_TAGS || tag === "all";
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
    politics: "Politics Markets"
  };
  
  return tagMap[tag.toLowerCase()] || `${tag.charAt(0).toUpperCase() + tag.slice(1)} Markets`;
}