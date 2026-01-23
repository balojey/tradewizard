import { MarketCard } from "@/components/market-card";
import { HomeHero } from "@/components/home-hero";
import { PoliticsTagBar } from "@/components/politics-tag-bar";
import { getPoliticalEvents, getPoliticalTagDisplayName } from "@/lib/politics-data";

// Server Component
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const params = await searchParams;
  const tag = params.tag || "all";

  // Fetch politics-focused data using the new utility
  const events = await getPoliticalEvents({
    tag,
    limit: 20,
    active: true,
    closed: false,
  });

  return (
    <div className="min-h-screen bg-background">
      <HomeHero />
      <PoliticsTagBar currentTag={tag} />
      
      <section id="markets" className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <h2 className="mb-4 sm:mb-6 lg:mb-8 text-lg sm:text-xl lg:text-2xl font-bold tracking-tight">
          {getPoliticalTagDisplayName(tag)}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {events.map((event) => {
            // Parsing outcomes from the first market in the event for display
            // Polymarket events group markets. Usually the main market is relevant.
            const market = event.markets?.[0];
            if (!market) return null;

            let outcomes: any[] = [];
            try {
              const names = JSON.parse(market.outcomes);
              const prices = JSON.parse(market.outcomePrices);
              outcomes = names.map((name: string, i: number) => ({
                name,
                probability: Math.round(Number(prices[i]) * 100),
                color: i === 0 ? 'yes' : 'no' // Simple heuristic for now
              })).slice(0, 2); // Show top 2 for card
            } catch (e) {
              // Fallback
              outcomes = [{ name: "Yes", probability: 50, color: 'yes' }, { name: "No", probability: 50, color: 'no' }];
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

        {events.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            No active markets found for this category.
          </div>
        )}
      </section>
    </div>
  );
}