import { MarketCard } from "@/components/market-card";
import { Button } from "@/components/ui/button";
import { Filter, ChevronDown, Trophy, Flame } from "lucide-react";

// Mock Data
const MARKETS = [
  {
    id: "1",
    title: "Presidential Election Winner 2024",
    image: "bg-gradient-to-br from-blue-900 to-red-900", // Using gradient class instead of URL
    volume: "$345.2M",
    isNew: false,
    outcomes: [
      { name: "Trump", probability: 52, color: "yes" as const },
      { name: "Harris", probability: 39, color: "no" as const },
    ]
  },
  {
    id: "2",
    title: "Democratic VP Nominee 2024",
    image: "bg-gradient-to-br from-blue-600 to-blue-800",
    volume: "$45.1M",
    isNew: true,
    outcomes: [
      { name: "Shapiro", probability: 65, color: "yes" as const },
      { name: "Kelly", probability: 25, color: "no" as const },
    ]
  },
  {
    id: "3",
    title: "Will Congress pass the budget bill by Oct 1?",
    image: "bg-gradient-to-br from-green-800 to-green-600",
    volume: "$12.5M",
    isNew: false,
    outcomes: [
      { name: "Yes", probability: 15, color: "yes" as const },
      { name: "No", probability: 85, color: "no" as const },
    ]
  },
  {
    id: "4",
    title: "Next Supreme Court Justice Resignation?",
    image: "bg-gradient-to-br from-gray-700 to-gray-900",
    volume: "$5.2M",
    isNew: false,
    outcomes: [
      { name: "Thomas", probability: 30, color: "yes" as const },
      { name: "Alito", probability: 25, color: "no" as const },
    ]
  },
  {
    id: "5",
    title: "Fed Interest Rate Cut in September",
    image: "bg-gradient-to-br from-yellow-700 to-yellow-900",
    volume: "$89.3M",
    isNew: false,
    outcomes: [
      { name: "Yes", probability: 92, color: "yes" as const },
      { name: "No", probability: 8, color: "no" as const },
    ]
  },
  {
    id: "6",
    title: "Will TikTok be banned in the US in 2024?",
    image: "bg-gradient-to-br from-pink-600 to-purple-800",
    volume: "$22.8M",
    isNew: true,
    outcomes: [
      { name: "Yes", probability: 42, color: "yes" as const },
      { name: "No", probability: 58, color: "no" as const },
    ]
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Hero / Header Section */}
      <section className="border-b border-border/40 bg-card/30 py-8 md:py-12">
        <div className="container max-w-screen-2xl mx-auto px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">Politics</h1>
              <p className="text-muted-foreground text-lg">
                Predict the future of global politics. Real money, real time.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Top Volume
              </Button>
              <Button variant="outline" className="gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Trending
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button variant="secondary" size="sm" className="rounded-full px-4">
                All
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full px-4 text-muted-foreground hover:text-foreground">
                US Election
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full px-4 text-muted-foreground hover:text-foreground">
                Global Politics
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full px-4 text-muted-foreground hover:text-foreground">
                Congress
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full px-4 text-muted-foreground hover:text-foreground">
                Geopolitics
              </Button>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 h-8">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-2 h-8">
                Newest
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Markets Grid */}
      <section className="container max-w-screen-2xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MARKETS.map((market) => (
            <MarketCard key={market.id} {...market} />
          ))}
        </div>
      </section>
    </div>
  );
}
