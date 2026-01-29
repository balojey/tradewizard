"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ChevronLeft, Brain, Activity, Users, TrendingUp, BarChart3 } from "lucide-react";
import { useTrading } from "@/providers/TradingProvider";
import { formatVolume, formatNumber } from "@/utils/formatting";
import type { PolymarketMarket } from "@/hooks/useMarkets";
import { isMarketEndingSoon } from "@/utils/marketFilters";
import { useTradeRecommendation } from "@/hooks/useTradeRecommendation";

import Card from "@/components/shared/Card";
import PercentageGauge from "@/components/shared/PercentageGauge";
import OutcomeButtons from "@/components/Trading/Markets/OutcomeButtons";
import RecommendationBadge from "@/components/Trading/Markets/RecommendationBadge";
import OrderPlacementModal from "@/components/Trading/OrderModal";
import AIInsightsPanel from "@/components/Trading/Markets/AIInsightsPanel";
import MarketSentimentAnalysis from "@/components/Trading/Markets/MarketSentimentAnalysis";
import PriceHistoryChart from "@/components/Trading/Markets/PriceHistoryChart";
import RealAgentDebatePanel from "@/components/Trading/Markets/RealAgentDebatePanel";

interface MarketDetailsProps {
    market: PolymarketMarket;
}

type TabType = 'overview' | 'ai-insights' | 'sentiment' | 'debate' | 'chart';

export default function MarketDetails({ market }: MarketDetailsProps) {
    const { clobClient, isGeoblocked } = useTrading();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('ai-insights');
    const [selectedOutcome, setSelectedOutcome] = useState<{
        marketTitle: string;
        outcome: string;
        price: number;
        tokenId: string;
        negRisk: boolean;
    } | null>(null);

    const { data: recommendation } = useTradeRecommendation(market.conditionId || null, {
        enabled: !!market.conditionId,
    });

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

    const tabs = [
        { id: 'overview' as TabType, label: 'Overview', icon: BarChart3 },
        { id: 'ai-insights' as TabType, label: 'AI Insights', icon: Brain },
        { id: 'debate' as TabType, label: 'Agent Debate', icon: Users },
        // Disabled until real data sources are available
        // { id: 'sentiment' as TabType, label: 'Sentiment', icon: Activity },
        // { id: 'chart' as TabType, label: 'Price Chart', icon: TrendingUp },
    ];

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
        <div className="max-w-7xl mx-auto">
            {/* Back Navigation */}
            <div className="mb-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Markets
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Market Header */}
                    <Card className="p-6">
                        <div className="flex items-start gap-4">
                            {(market.icon || market.image || market.eventIcon) && (
                                <img
                                    src={market.icon || market.image || market.eventIcon}
                                    alt=""
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl font-bold text-white mb-2">
                                    {market.question}
                                </h1>
                                
                                {/* Status Badges */}
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <RecommendationBadge 
                                        conditionId={market.conditionId || null} 
                                        size="md"
                                        showDetails={true}
                                    />
                                    
                                    {isEndingSoon && (
                                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-500/30">
                                            Ending Soon
                                        </span>
                                    )}
                                    
                                    {isClosed && (
                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full border border-red-500/30">
                                            Closed
                                        </span>
                                    )}
                                    
                                    {negRisk && (
                                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-full border border-indigo-500/30">
                                            Neg Risk
                                        </span>
                                    )}
                                </div>

                                {/* Tags */}
                                {market.events?.[0]?.tags && (
                                    <div className="flex flex-wrap gap-1">
                                        {market.events[0].tags.slice(0, 3).map((tag: any) => (
                                            <span
                                                key={tag.id}
                                                className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded-full border border-white/10"
                                            >
                                                {tag.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* AI Insights Tabs */}
                    <Card className="overflow-hidden">
                        <div className="border-b border-white/10 bg-white/5">
                            <div className="flex overflow-x-auto">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                                                activeTab === tab.id
                                                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* About Market */}
                                    {market.description && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4 text-white">About This Market</h3>
                                            <p className="text-gray-300 leading-relaxed">
                                                {market.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Market Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                                            <div className="text-2xl font-bold text-white">
                                                {yesChance}%
                                            </div>
                                            <div className="text-sm text-gray-400">Current Price</div>
                                        </div>
                                        <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                                            <div className="text-2xl font-bold text-white">
                                                ${formatVolume(volumeUSD)}
                                            </div>
                                            <div className="text-sm text-gray-400">24h Volume</div>
                                        </div>
                                        <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                                            <div className="text-2xl font-bold text-white">
                                                ${formatVolume(liquidityUSD)}
                                            </div>
                                            <div className="text-sm text-gray-400">Liquidity</div>
                                        </div>
                                        <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                                            <div className="text-2xl font-bold text-white">
                                                {market.endDate ? format(new Date(market.endDate), "MMM d") : "TBD"}
                                            </div>
                                            <div className="text-sm text-gray-400">End Date</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ai-insights' && (
                                <AIInsightsPanel 
                                    conditionId={market.conditionId || null}
                                    marketPrice={yesPrice}
                                    volume24h={volumeUSD}
                                    liquidity={liquidityUSD}
                                />
                            )}

                            {activeTab === 'debate' && (
                                <RealAgentDebatePanel 
                                    conditionId={market.conditionId || null}
                                    marketQuestion={market.question}
                                />
                            )}

                            {/* Disabled tabs - uncomment when real data sources are available */}
                            {/*
                            {activeTab === 'sentiment' && (
                                <MarketSentimentAnalysis 
                                    conditionId={market.conditionId || null}
                                    marketQuestion={market.question}
                                />
                            )}

                            {activeTab === 'chart' && (
                                <PriceHistoryChart 
                                    conditionId={market.conditionId || null}
                                    currentPrice={yesPrice}
                                    aiRecommendation={recommendation ? {
                                        entryZone: recommendation.entryZone,
                                        targetZone: recommendation.targetZone,
                                        consensusProbability: recommendation.metadata.consensusProbability
                                    } : undefined}
                                />
                            )}
                            */}
                        </div>
                    </Card>
                </div>

                {/* Sidebar: Trading Panel */}
                <div className="space-y-6">
                    <Card className="p-5 sticky top-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-lg">Trade</h3>
                            {yesIndex !== -1 && <PercentageGauge value={yesChance} size={80} />}
                        </div>

                        <div className="space-y-4">
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

                        <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Volume (24h)</p>
                                    <p className="font-mono text-white">${formatVolume(volumeUSD)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Liquidity</p>
                                    <p className="font-mono text-white">${formatNumber(liquidityUSD)}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">End Date</p>
                                {market.endDateIso ? (
                                    <p className="text-sm text-white">
                                        {format(new Date(market.endDateIso), "PPP p")}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-400">N/A</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Quick AI Summary Card */}
                    {recommendation && (
                        <Card className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="w-4 h-4 text-indigo-400" />
                                <h4 className="font-medium text-indigo-300">AI Quick Take</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-indigo-300">Action:</span>
                                    <span className="font-medium text-white">
                                        {recommendation.action.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-indigo-300">Expected Value:</span>
                                    <span className="font-medium text-white">
                                        ${recommendation.expectedValue.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-indigo-300">Win Probability:</span>
                                    <span className="font-medium text-white">
                                        {(recommendation.winProbability * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveTab('ai-insights')}
                                className="w-full mt-3 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
                            >
                                View Full Analysis
                            </button>
                        </Card>
                    )}
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