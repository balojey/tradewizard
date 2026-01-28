"use client";

import { useTrading } from "@/providers/TradingProvider";
import Header from "@/components/Header";
import PolygonAssets from "@/components/PolygonAssets";
import TradingSession from "@/components/TradingSession";
import MarketTabs from "@/components/Trading/MarketTabs";
import GeoBlockedBanner from "@/components/GeoBlockedBanner";

export default function Home() {
  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
    eoaAddress,
    isGeoblocked,
    isGeoblockLoading,
    geoblockStatus,
  } = useTrading();

  return (
    <div className="min-h-screen flex flex-col">
      <Header onEndSession={endTradingSession} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8 pb-20">
        {/* Show geoblock banner if user is in blocked region */}
        {isGeoblocked && !isGeoblockLoading && (
          <GeoBlockedBanner geoblockStatus={geoblockStatus} />
        )}

        <PolygonAssets />

        {/* Hide trading session initialization when geoblocked */}
        {!isGeoblocked && (
          <TradingSession
            session={tradingSession}
            currentStep={currentStep}
            error={sessionError}
            isComplete={isTradingSessionComplete}
            initialize={initializeTradingSession}
            endSession={endTradingSession}
          />
        )}

        {/* Markets are viewable even when geoblocked, but trading buttons should be disabled */}
        {(isTradingSessionComplete || isGeoblocked) && eoaAddress && (
          <MarketTabs />
        )}
      </main>
    </div>
  );
}
