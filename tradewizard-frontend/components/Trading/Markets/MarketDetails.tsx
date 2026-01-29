"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ChevronLeft, Brain, Activity, Users, TrendingUp, BarChart3, Clock, DollarSign, Wallet, Info } from "lucide-react";
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
import AgentWorkflowDiagram from "@/components/Trading/Markets/AgentWorkflowDiagram";
import AgentInteractionNetwork from "@/components/Trading/Markets/AgentInteractionNetwork";
import ConsensusFormationTimeline from "@/components/Trading/Markets/ConsensusFormationTimeline";
import AgentOutputComparison from "@/components/Trading/Markets/AgentOutputComparison";

interface MarketDetailsProps {
    market: PolymarketMarket;
}

type TabType = 'overview' | 'ai-insights' | 'debate' | 'data-flow' | 'sentiment' | 'chart';

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
        { id: 'data-flow' as TabType, label: 'Data Flow', icon: Activity },
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
        <div className="max-w-7xl mx-auto pb-12">
            {/* Back Navigation */}
            <div className="mb-8 pt-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors group"
                >
                    <div className="p-1 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Back to Markets</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Market Header Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]">
                        {/* Background gradient effect */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl opacity-50 -z-10" />

                        <div className="p-8">
                            <div className="flex gap-6 items-start">
                                {(market.icon || market.image || market.eventIcon) && (
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                                            <img
                                                src={market.icon || market.image || market.eventIcon}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {isActive && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-[3px] border-[#0A0A0A]" />
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0 pt-1">
                                    <h1 className="text-3xl font-bold text-white mb-3 leading-tight tracking-tight">
                                        {market.question}
                                    </h1>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <RecommendationBadge
                                            conditionId={market.conditionId || null}
                                            size="md"
                                            showDetails={true}
                                        />

                                        {isEndingSoon && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/20">
                                                <Clock className="w-3 h-3" />
                                                Ending Soon
                                            </div>
                                        )}

                                        {isClosed && (
                                            <div className="px-3 py-1 bg-gray-800 text-gray-400 text-xs font-semibold rounded-full border border-gray-700">
                                                Market Closed
                                            </div>
                                        )}

                                        {negRisk && (
                                            <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/20">
                                                Neg Risk
                                            </div>
                                        )}

                                        {market.events?.[0]?.tags?.slice(0, 3).map((tag: any) => (
                                            <span
                                                key={tag.id}
                                                className="px-2.5 py-1 bg-white/5 text-gray-400 text-xs font-medium rounded-full border border-white/5 hover:bg-white/10 hover:text-gray-200 transition-colors cursor-default"
                                            >
                                                {tag.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/5">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1.5">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        <span>Yes Price</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
                                        {yesChance}%
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1.5">
                                        <Activity className="w-3.5 h-3.5" />
                                        <span>24h Volume</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
                                        ${formatVolume(volumeUSD)}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1.5">
                                        <Wallet className="w-3.5 h-3.5" />
                                        <span>Liquidity</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
                                        ${formatVolume(liquidityUSD)}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>End Date</span>
                                    </div>
                                    <div className="text-xl font-bold text-white tracking-tight truncate">
                                        {market.endDate ? format(new Date(market.endDate), "MMM d") : "TBD"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Tabs */}
                    <div className="space-y-6">
                        <div className="border-b border-white/10">
                            <div className="flex overflow-x-auto no-scrollbar gap-6">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`
                                                group relative flex items-center gap-2 pb-4 text-sm font-medium transition-all
                                                ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
                                            `}
                                        >
                                            <div className={`
                                                p-1.5 rounded-lg transition-colors
                                                ${isActive ? 'bg-white/10 text-indigo-400' : 'bg-transparent group-hover:bg-white/5'}
                                            `}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            {tab.label}

                                            {isActive && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="min-h-[400px]">
                            {activeTab === 'overview' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {market.description ? (
                                        <div className="prose prose-invert max-w-none">
                                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                                <Info className="w-4 h-4 text-indigo-400" />
                                                About This Market
                                            </h3>
                                            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-gray-300 leading-relaxed text-base">
                                                {market.description}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                            <Info className="w-8 h-8 mb-3 opacity-50" />
                                            <p>No description available for this market.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'ai-insights' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <AIInsightsPanel
                                        conditionId={market.conditionId || null}
                                        marketPrice={yesPrice}
                                        volume24h={volumeUSD}
                                        liquidity={liquidityUSD}
                                    />
                                </div>
                            )}

                            {activeTab === 'debate' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <RealAgentDebatePanel
                                        conditionId={market.conditionId || null}
                                        marketQuestion={market.question}
                                    />
                                </div>
                            )}

                            {activeTab === 'data-flow' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <AgentWorkflowDiagram
                                        conditionId={market.conditionId || null}
                                        marketQuestion={market.question}
                                    />
                                    <AgentInteractionNetwork
                                        conditionId={market.conditionId || null}
                                        marketQuestion={market.question}
                                    />
                                    <ConsensusFormationTimeline
                                        conditionId={market.conditionId || null}
                                        marketQuestion={market.question}
                                    />
                                    <AgentOutputComparison
                                        conditionId={market.conditionId || null}
                                        marketQuestion={market.question}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Trading Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-6 space-y-6">
                        <Card className="p-6 border-indigo-500/20 shadow-[0_0_50px_-12px_rgba(79,70,229,0.1)]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-bold text-xl text-white">Place Order</h3>
                                {yesIndex !== -1 && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                        <span className="text-xs font-medium text-gray-400">Live</span>
                                    </div>
                                )}
                            </div>

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

                            <div className="mt-8 pt-6 border-t border-white/10">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Your Balance</span>
                                        <span className="text-white font-mono">$0.00</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Liquidity Depth</span>
                                        <span className="text-green-400 font-mono">High</span>
                                    </div>
                                </div>
                                <button className="w-full mt-6 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                    <Wallet className="w-4 h-4" />
                                    Connect Wallet to Trade
                                </button>
                            </div>
                        </Card>

                        {/* Quick AI Summary Card */}
                        {recommendation && (
                            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-[#0A0A0A] to-purple-500/10 p-1">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] -z-10" />

                                <div className="bg-[#0A0A0A]/80 backdrop-blur-xl rounded-xl p-5">
                                    <div className="flex items-center gap-2.5 mb-4">
                                        <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                                            <Brain className="w-4 h-4" />
                                        </div>
                                        <h4 className="font-bold text-white">AI Analysis</h4>
                                        <span className="ml-auto text-xs font-mono text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
                                            LIVE
                                        </span>
                                    </div>

                                    <div className="space-y-3 mb-5">
                                        <div className="flex justify-between items-baseline p-2 rounded-lg bg-white/5">
                                            <span className="text-sm text-gray-400">Signal</span>
                                            <span className="font-bold text-green-400">
                                                {recommendation.action.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-baseline p-2 rounded-lg bg-white/5">
                                            <span className="text-sm text-gray-400">Exp. Value</span>
                                            <span className="font-mono text-white">
                                                ${recommendation.expectedValue.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-baseline p-2 rounded-lg bg-white/5">
                                            <span className="text-sm text-gray-400">Win Rate</span>
                                            <span className="font-mono text-white">
                                                {(recommendation.winProbability * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setActiveTab('ai-insights')}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        View Full Report
                                        <ChevronLeft className="w-4 h-4 rotate-180 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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