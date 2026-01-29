"use client";

import { useTrading } from "@/providers/TradingProvider";
import Header from "@/components/Header";
import MarketTabs from "@/components/Trading/MarketTabs";
import GeoBlockedBanner from "@/components/GeoBlockedBanner";
import FeaturedQuickTrade from "@/components/Home/FeaturedQuickTrade";

export default function Home() {
  const {
    endTradingSession,
    isGeoblocked,
    isGeoblockLoading,
    geoblockStatus,
  } = useTrading();

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white selection:bg-indigo-500/30">
      <Header onEndSession={endTradingSession} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Show geoblock banner if user is in blocked region */}
        {isGeoblocked && !isGeoblockLoading && (
          <GeoBlockedBanner geoblockStatus={geoblockStatus} />
        )}

        <div className="flex flex-col gap-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Explore Markets</h2>
              <p className="text-gray-400 text-sm">Find the hottest opportunities right now.</p>
            </div>
          </div>

          {/* Featured Trade Widget */}
          <FeaturedQuickTrade />

          <MarketTabs />
        </div>
      </main>
    </div>
  );
}
