"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTrading } from "@/providers/TradingProvider";
import { formatVolume, formatNumber } from "@/utils/formatting";
import type { PolymarketMarket } from "@/hooks/useMarkets";
import { isMarketEndingSoon } from "@/utils/marketFilters";

import Card from "@/components/shared/Card";
import PercentageGauge from "@/components/shared/PercentageGauge";
import OutcomeButtons from "@/components/Trading/Markets/OutcomeButtons";
import RecommendationBadge from "@/components/Trading/Markets/RecommendationBadge";
import OrderPlacementModal from "@/components/Trading/OrderModal";

interface MarketDetailsProps {
    market: PolymarketMarket;
}

export default function MarketDetails({ market }: MarketDetailsProps) {
    const { clobClient, isGeoblocked } = useTrading();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOutcome, setSelectedOutcome] = useState<{
        marketTitle: string;
        outcome: string;
        price: number;
        tokenId: string;
        negRisk: boolean;
    } | null>(null);

    const volumeUSD = parseFloat(
        String(market.volume24hr || market.volume || "0")
    );
    const liquidityUSD = parseFloat(String(market.liquidity || "0"));
    const isClosed = market.closed;
    const isActive = market.active && !market.closed;
    const isEndingSoon = isActive && isMarketEndingSoon(market);
    const disabled = isGeoblocked || !clobClient;

    const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
    const tokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
    const negRisk = market.negRisk || false;

    // Calculate outcome prices similar to MarketCard
    const outcomePrices = useMemo(() => {
        return tokenIds.map((tokenId: string) => {
            const realtimePrice = market.realtimePrices?.[tokenId]?.bidPrice;
            if (realtimePrice && realtimePrice > 0) {
                return realtimePrice;
            }

            if (market.outcomePrices) {
                try {
                    const staticPrices = JSON.parse(market.outcomePrices);
                    const tokenIndex = tokenIds.indexOf(tokenId);
                    if (tokenIndex !== -1 && staticPrices[tokenIndex]) {
                        return parseFloat(staticPrices[tokenIndex]);
                    }
                } catch (error) {
                    console.warn(`Failed to parse static prices for market ${market.id}`);
                }
            }
            return 0;
        });
    }, [market.realtimePrices, market.outcomePrices, market.id, tokenIds]);

    const yesIndex = outcomes.findIndex((o: string) => o.toLowerCase() === "yes");
    const yesPrice = yesIndex !== -1 ? (outcomePrices?.[yesIndex] || 0) : 0;
    const yesChance = Math.round(Number(yesPrice) * 100);

    const handleOutcomeClick = (
        marketTitle: string,
        outcome: string,
        price: number,
        tokenId: string,
        negRisk: boolean
    ) => {
        setSelectedOutcome({ marketTitle, outcome, price, tokenId, negRisk });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedOutcome(null);
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Back Navigation */}
            <div className="mb-6">
                <Link 
                    href="/" 
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                    <span className="text-sm font-medium">Back to Markets</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Content: Header & Chart/Graph Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-start gap-4">
                        {market.icon ? (
                            <img
                                src={market.icon}
                                alt=""
                                className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow-lg"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0" />
                        )}

                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">
                                {market.question}
                            </h1>

                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                {isClosed && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                        Closed
                                    </span>
                                )}
                                {isEndingSoon && !isClosed && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                        Ending Soon
                                    </span>
                                )}
                                {isActive && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                        Active
                                    </span>
                                )}

                                {/* Categories */}
                                {market.tags && market.tags.map((tag: any) => (
                                    <span key={tag.id} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/10">
                                        {tag.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Card className="p-6 bg-[#1C1C1E] border-white/5 min-h-[300px] flex items-center justify-center text-gray-500">
                        {/* Placeholder for Price History Chart */}
                        <div className="text-center">
                            <p className="mb-2">Price History Chart</p>
                            <p className="text-xs opacity-60">(Coming Soon)</p>
                        </div>
                    </Card>

                    {market.description && (
                        <Card className="p-6 bg-[#1C1C1E] border-white/5 space-y-2">
                            <h3 className="font-semibold text-lg">About this Market</h3>
                            <div className="prose prose-invert prose-sm max-w-none text-gray-400">
                                {market.description}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar: Trading Board & Stats */}
                <div className="space-y-6">
                    <Card className="p-5 bg-[#1C1C1E] border-white/5 sticky top-24">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-lg">Trade</h3>
                            {yesIndex !== -1 && <PercentageGauge value={yesChance} size={80} />}
                        </div>

                        <div className="space-y-4">
                            <RecommendationBadge
                                conditionId={market.conditionId || null}
                                size="md"
                                showDetails={true}
                            />

                            <OutcomeButtons
                                outcomes={outcomes}
                                outcomePrices={outcomePrices}
                                tokenIds={tokenIds}
                                isClosed={isClosed}
                                negRisk={negRisk}
                                marketQuestion={market.question}
                                disabled={disabled}
                                onOutcomeClick={handleOutcomeClick}
                                layout="vertical"
                            />
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Volume (24h)</p>
                                <p className="font-mono text-white">{formatVolume(volumeUSD)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Liquidity</p>
                                <p className="font-mono text-white">${formatNumber(liquidityUSD)}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-gray-400 mb-1">End Date</p>
                                {market.endDateIso ? (
                                    <p className="text-sm text-white">
                                        {format(new Date(market.endDateIso), "PPP p")}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-500">N/A</p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Order Modal */}
            {selectedOutcome && (
                <OrderPlacementModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    marketTitle={selectedOutcome.marketTitle}
                    outcome={selectedOutcome.outcome}
                    currentPrice={selectedOutcome.price}
                    tokenId={selectedOutcome.tokenId}
                    negRisk={selectedOutcome.negRisk}
                    clobClient={clobClient}
                />
            )}
        </div>
    );
}
