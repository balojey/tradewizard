import { MarketCard } from "@/components/market-card";
import { getEvents } from "@/lib/polymarket";

// Server Component
export default async function PoliticsPage() {
    // Fetch politics events using tag_id="2"
    const events = await getEvents({
        limit: 20,
        active: true,
        closed: false,
        tag_id: "2" // Politics tag ID
    });

    return (
        <div className="min-h-screen bg-background pb-12">
            <section className="container max-w-screen-2xl mx-auto px-4 py-8">
                <h2 className="mb-6 text-xl font-bold tracking-tight">
                    Politics Markets
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {events.map((event) => {
                        const market = event.markets?.[0];
                        if (!market) return null;

                        let outcomes: any[] = [];
                        try {
                            const names = JSON.parse(market.outcomes);
                            const prices = JSON.parse(market.outcomePrices);
                            outcomes = names.map((name: string, i: number) => ({
                                name,
                                probability: Math.round(Number(prices[i]) * 100),
                                color: i === 0 ? 'yes' : 'no'
                            })).slice(0, 2);
                        } catch (e) {
                            outcomes = [{ name: "Yes", probability: 50, color: 'yes' }, { name: "No", probability: 50, color: 'no' }];
                        }

                        return (
                            <MarketCard
                                key={event.id}
                                id={event.id}
                                title={event.title}
                                image={event.image}
                                volume={`$${(event.volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact" })}`}
                                isNew={event.new}
                                outcomes={outcomes}
                            />
                        );
                    })}
                </div>

                {events.length === 0 && (
                    <div className="py-20 text-center text-muted-foreground">
                        No active politics markets found.
                    </div>
                )}
            </section>
        </div>
    );
}
