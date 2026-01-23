import { MarketCard } from "@/components/market-card";
import { HomeHero } from "@/components/home-hero";
import { PoliticsTagBar } from "@/components/politics-tag-bar";
import { getPoliticalEvents, getPoliticalTagDisplayName, isValidPoliticalTag } from "@/lib/politics-data";
import { Suspense } from "react";

// Loading component for server-side rendering
function MarketGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-muted rounded-lg h-64 w-full" />
        </div>
      ))}
    </div>
  );
}

// Server Component with enhanced politics-focused data fetching
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const params = await searchParams;
  const tag = params.tag || "all";

  // Validate tag parameter and fallback to "all" if invalid (Requirement 8.4)
  const validatedTag = isValidPoliticalTag(tag) ? tag : "all";
  
  // Log tag validation for debugging
  if (tag !== validatedTag) {
    console.warn(`Invalid political tag "${tag}" provided, falling back to "${validatedTag}"`);
  }

  // Fetch politics-focused data using enhanced utility (Requirements 1.1, 1.4)
  const events = await getPoliticalEvents({
    tag: validatedTag,
    limit: 20,
    active: true,
    closed: false,
  });

  return (
    <div className="min-h-screen bg-background">
      <HomeHero />
      
      {/* Politics Tag Bar with current tag state (Requirements 1.4, 1.5) */}
      <PoliticsTagBar currentTag={validatedTag} />
      
      <section id="markets" className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <h2 className="mb-4 sm:mb-6 lg:mb-8 text-lg sm:text-xl lg:text-2xl font-bold tracking-tight">
          {getPoliticalTagDisplayName(validatedTag)}
        </h2>

        {/* Market Grid with Suspense for better SSR performance */}
        <Suspense fallback={<MarketGridSkeleton />}>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {events.map((event) => {
              // Enhanced market data processing with better error handling
              const market = event.markets?.[0];
              if (!market) return null;

              let outcomes: any[] = [];
              try {
                const names = JSON.parse(market.outcomes);
                const prices = JSON.parse(market.outcomePrices);
                
                // Validate parsed data structure
                if (!Array.isArray(names) || !Array.isArray(prices)) {
                  throw new Error("Invalid outcomes or prices format");
                }
                
                outcomes = names.map((name: string, i: number) => ({
                  name,
                  probability: Math.round(Number(prices[i]) * 100),
                  color: i === 0 ? 'yes' : 'no' // Simple heuristic for now
                })).slice(0, 2); // Show top 2 for card
                
              } catch (e) {
                // Enhanced fallback with logging (Requirement 9.2)
                console.warn(`Failed to parse market outcomes for event ${event.id}:`, e);
                outcomes = [
                  { name: "Yes", probability: 50, color: 'yes' }, 
                  { name: "No", probability: 50, color: 'no' }
                ];
              }

              return (
                <MarketCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  image={event.image || (market.group === "nba" ? "bg-orange-500" : "")} // Use event image
                  volume={`${(event.volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact" })}`}
                  isNew={event.new}
                  outcomes={outcomes}
                />
              );
            })}
          </div>
        </Suspense>

        {/* Enhanced empty state with tag-specific messaging */}
        {events.length === 0 && (
          <div className="py-20 text-center">
            <div className="text-muted-foreground mb-2">
              No active markets found for {getPoliticalTagDisplayName(validatedTag).toLowerCase()}.
            </div>
            <div className="text-sm text-muted-foreground">
              Try selecting a different category or check back later.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}