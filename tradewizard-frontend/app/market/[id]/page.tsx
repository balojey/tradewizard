"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Calendar, DollarSign, Users, TrendingUp } from "lucide-react";

import type { PolymarketMarket } from "@/hooks/useMarkets";
import { useTrading } from "@/providers/TradingProvider";
import { formatVolume, formatCurrency } from "@/utils/formatting";

import Card from "@/components/shared/Card";
import LoadingState from "@/components/shared/LoadingState";
import ErrorState from "@/components/shared/ErrorState";
import Badge from "@/components/shared/Badge";
import PercentageGauge from "@/components/shared/PercentageGauge";
import StatDisplay from "@/components/shared/StatDisplay";
import TradeRecommendation from "@/components/Trading/TradeRecommendation";
import OutcomeButtons from "@/components/Trading/Markets/OutcomeButtons";

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;

  // Placeholder function for outcome clicks
  const handleOutcomeClick = (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean
  ) => {
    console.log("Outcome clicked:", { marketTitle, outcome, price, tokenId, negRisk });
    // TODO: Implement actual trading logic
  };

  // Fetch market details
  const { data: market, isLoading, error } = useQuery({
    queryKey: ["market-detail", marketId],
    queryFn: async (): Promise<PolymarketMarket> => {
      const response = await fetch(`/api/polymarket/market-by-token?token_id=${marketId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch market details");
      }

      const markets: PolymarketMarket[] = await response.json();
      
      if (!markets || markets.length === 0) {
        throw new Error("Market not found");
      }

      return markets[0];
    },
    enabled: !!marketId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <LoadingState message="Loading market details..." />
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <ErrorState 
            error={error instanceof Error ? error.message : "Failed to load market"}
          />
        </div>
      </div>
    );
  }

  // Parse market data
  const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
  const tokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
  const outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
  
  const volumeUSD = parseFloat(String(market.volume24hr || market.volume || "0"));
  const liquidityUSD = parseFloat(String(market.liquidity || "0"));
  
  // Calculate "Yes" probability
  const yesIndex = outcomes.findIndex((o: string) => o.toLowerCase() === "yes");
  const yesPrice = yesIndex !== -1 ? (outcomePrices?.[yesIndex] || 0) : 0;
  const yesChance = Math.round(yesPrice * 100);

  const isActive = market.active && !market.closed;
  const endDate = market.endDateIso ? new Date(market.endDateIso) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Markets</span>
            </Link>
          </div>

          <div className="flex items-start gap-6">
            {/* Market Icon */}
            {market.icon ? (
              <img
                src={market.icon}
                alt=""
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0" />
            )}

            {/* Market Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
                {market.question}
              </h1>
              
              {market.description && (
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {market.description}
                </p>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                <Badge 
                  variant={isActive ? "buy" : "default"}
                  className="text-sm"
                >
                  {isActive ? "Active" : market.closed ? "Closed" : "Inactive"}
                </Badge>
                
                {endDate && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Ends {endDate.toLocaleDateString()}</span>
                  </div>
                )}

                {market.eventTitle && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{market.eventTitle}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Probability Gauge */}
            <div className="flex-shrink-0">
              <PercentageGauge 
                value={yesChance} 
                size={80}
                label="YES Probability"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Market Stats & Trading */}
          <div className="lg:col-span-1 space-y-6">
            {/* Market Statistics */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Market Statistics</h3>
              <div className="space-y-4">
                <StatDisplay
                  label="24h Volume"
                  value={formatVolume(volumeUSD)}
                />
                <StatDisplay
                  label="Liquidity"
                  value={formatCurrency(liquidityUSD)}
                />
                {market.volume && (
                  <StatDisplay
                    label="Total Volume"
                    value={formatVolume(parseFloat(String(market.volume)))}
                  />
                )}
              </div>
            </Card>

            {/* Trading Interface */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Trade Outcomes</h3>
              <OutcomeButtons
                outcomes={outcomes}
                outcomePrices={outcomePrices}
                tokenIds={tokenIds}
                isClosed={market.closed}
                negRisk={market.negRisk || false}
                marketQuestion={market.question}
                disabled={!isActive}
                onOutcomeClick={handleOutcomeClick}
              />
            </Card>

            {/* External Links */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">External Links</h3>
              <div className="space-y-2">
                <a
                  href={`https://polymarket.com/event/${market.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View on Polymarket</span>
                </a>
                {market.eventSlug && (
                  <a
                    href={`https://polymarket.com/event/${market.eventSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Event</span>
                  </a>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - AI Recommendation */}
          <div className="lg:col-span-2">
            <TradeRecommendation 
              market={market}
              className="h-fit"
            />
          </div>
        </div>
      </div>
    </div>
  );
}