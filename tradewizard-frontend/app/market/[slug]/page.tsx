import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMMA_API_URL } from "@/constants/api";
import MarketDetails from "@/components/Trading/Markets/MarketDetails";
import LoadingState from "@/components/shared/LoadingState";

/* 
  Since the GAMMA API doesn't seem to support direct fetch by slug in the exact way we might want 
  or we want to reuse the event structure which contains markets, we fetch from /events with the slug.
  However, the user request is to route by *market* slug. 
  
  Polymarket markets usually belong to an event. The "slug" property on a market often refers to the *event* slug 
  if it's not unique to the market, OR the market might have its own slug. 

  Let's try fetching the event by slug first, as that's the common pattern.
  If the API returns a list (search result), we take the first matching one.
*/

async function getMarketBySlug(slug: string) {
    try {
        // Try fetching as an event first
        const res = await fetch(`${GAMMA_API_URL}/events?slug=${slug}`);

        if (!res.ok) return null;

        const events = await res.json();

        if (Array.isArray(events) && events.length > 0) {
            // Find the specific market within the event, or return the first market of the event
            // If the slug passed is actually an event slug, we probably want to show the main market of that event
            // or all markets. For this task, let's assume one main market per page or handle the first one.

            const event = events[0];
            const market = event.markets?.[0]; // Taking the first market of the event for now

            if (!market) return null;

            // Enrich market with event data as we do in the markets API
            return {
                ...market,
                eventTitle: event.title,
                eventSlug: event.slug,
                eventId: event.id,
                eventIcon: event.image || event.icon,
                description: event.description,
                tags: event.tags,
            };
        }

        return null;
    } catch (error) {
        console.error("Error fetching market by slug:", error);
        return null;
    }
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function MarketPage({ params }: PageProps) {
    const { slug } = await params;
    const market = await getMarketBySlug(slug);

    if (!market) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <Suspense fallback={<LoadingState message="Loading market details..." />}>
                <MarketDetails market={market} />
            </Suspense>
        </div>
    );
}
