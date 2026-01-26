
/**
 * Polymarket Gamma API Client
 * Legacy interfaces maintained for backward compatibility
 * New code should use the enhanced types and functions from polymarket-data.ts
 */

export const API_BASE_URL = "https://gamma-api.polymarket.com";

// Legacy interfaces for backward compatibility
export interface Outcome {
    price: number;
    name: string;
}

export interface Market {
    id: string;
    question: string;
    conditionId: string;
    slug: string;
    endDate: string; // ISO date
    startDate?: string;
    image?: string;
    icon?: string;
    description?: string;
    outcomes: string; // JSON string array e.g. "[\"Yes\", \"No\"]"
    outcomePrices: string; // JSON string array e.g. "[\"0.5\", \"0.5\"]"
    volume: string;
    active: boolean;
    closed: boolean;
    group?: string; // Ticker or Group ID if available
    
    // Series support fields (Requirements 13.1, 13.2)
    groupItemTitle?: string; // Key field for complex markets (e.g., "250-500k", "Fed 50+ bps decrease")
    groupItemThreshold?: string;
    seriesId?: string; // Reference to parent series
    seriesTitle?: string; // Series title for display
}

export interface Event {
    id: string;
    ticker: string;
    slug: string;
    title: string;
    description: string;
    startDate: string;
    creationDate: string;
    endDate: string;
    image: string;
    icon: string;
    active: boolean;
    closed: boolean;
    archived: boolean;
    new: boolean;
    featured: boolean;
    restricted: boolean;
    volume: number;
    volume24hr: number;
    liquidity: number;
    markets: Market[];
    tags?: { id: string; label: string; slug: string }[];
}

export interface GetEventsParams {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    archived?: boolean;
    order?: "asc" | "desc";
    ascending?: boolean;
    slug?: string;
    id?: string;
    tag_slug?: string; // For filtering by category like 'politics', 'sports'
    tag_id?: string; // For filtering by specific tag ID (e.g. 2 for Politics)
}

export async function getEvents(params: GetEventsParams = {}): Promise<Event[]> {
    const searchParams = new URLSearchParams();

    // Default to politics tag if no specific tag is provided (Requirement 1.1, 1.2)
    const defaultToPolitics = !params.tag_slug && !params.tag_id && !params.slug && !params.id;
    
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.offset) searchParams.set("offset", params.offset.toString());
    if (params.active !== undefined) searchParams.set("active", params.active.toString());
    if (params.closed !== undefined) searchParams.set("closed", params.closed.toString());
    if (params.archived !== undefined) searchParams.set("archived", params.archived.toString());
    if (params.tag_slug) searchParams.set("tag_slug", params.tag_slug);
    else if (defaultToPolitics) searchParams.set("tag_slug", "politics"); // Default politics filter
    if (params.tag_id) searchParams.set("tag_id", params.tag_id);
    if (params.ascending !== undefined) searchParams.set("ascending", params.ascending.toString());
    if (params.slug) searchParams.set("slug", params.slug);
    if (params.id) searchParams.set("id", params.id);

    try {
        const res = await fetch(`${API_BASE_URL}/events?${searchParams.toString()}`, {
            next: { revalidate: 60 }, // Revalidate every 60 seconds (ISR)
        });

        if (!res.ok) {
            // Enhanced error handling for API failures (Requirement 5.5)
            const errorMessage = `Failed to fetch events: ${res.status} ${res.statusText}`;
            console.error(errorMessage);
            
            // Return empty array as graceful fallback
            return [];
        }

        const events = await res.json();
        
        // Validate response structure
        if (!Array.isArray(events)) {
            console.error("Invalid API response: expected array of events");
            return [];
        }

        return events;
    } catch (error) {
        // Enhanced error handling with specific error types (Requirement 5.5)
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error("Network error fetching events:", error.message);
        } else if (error instanceof SyntaxError) {
            console.error("JSON parsing error:", error.message);
        } else {
            console.error("Unexpected error fetching events:", error);
        }
        
        // Always return empty array as fallback to prevent UI crashes
        return [];
    }
}

export async function getTrendingEvents(limit: number = 20): Promise<Event[]> {
    // Polymarket sort by volume or has a specific 'trending' logic, but simply fetching active sorted by volume is a good proxy.
    // However, the /events endpoint default sort might be relevant. 
    // We will ask for active=true, closed=false, and rely on default sort (usually volume/liquidity/recency mix).
    return getEvents({ limit, active: true, closed: false });
}
