import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MarketDetailView } from '@/components/market-detail-view';
import { TradingPanel } from '@/components/trading-panel';
import { AIInsightsPanel } from '@/components/ai-insights-panel';
import { MarketDetailSkeleton } from '@/components/market-detail-skeleton';
import { marketDiscoveryService } from '@/lib/services/market-discovery';
import { processMarketForDetail } from '@/lib/polymarket-data-processor';
import type { DetailedMarket } from '@/lib/polymarket-api-types';

interface MarketPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Market Detail Page
 * Implements Requirements 4.1, 4.2, 4.3, 4.6
 */
export default async function MarketPage({ params }: MarketPageProps) {
  const { id } = await params;

  // Fetch market data
  const market = await getMarketData(id);
  
  if (!market) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Suspense fallback={<MarketDetailSkeleton />}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Market Detail - Takes up 2 columns on large screens */}
            <div className="lg:col-span-2">
              <MarketDetailView market={market} />
            </div>
            
            {/* Right Sidebar - Trading and AI Insights */}
            <div className="space-y-6">
              {/* Trading Panel */}
              <div className="sticky top-20">
                <TradingPanel 
                  market={market}
                  selectedOutcome={market.outcomes[0] || {
                    name: 'Yes',
                    tokenId: '',
                    probability: 50,
                    price: 0.5,
                    volume24h: 0,
                    color: 'yes' as const
                  }}
                  onClose={() => {
                    // Handle close if needed
                  }}
                  onOrderSubmit={async (order) => {
                    // Handle order submission
                    console.log('Order submitted:', order);
                  }}
                  userBalance={0} // Will be populated from wallet context
                />
              </div>
              
              {/* AI Insights Panel */}
              <AIInsightsPanel 
                insights={{
                  summary: `AI analysis for ${market.title}`,
                  confidence: 75,
                  sentiment: 'bullish' as const,
                  keyFactors: [
                    'Strong trading volume indicates high interest',
                    'Recent news events may impact outcome',
                    'Historical patterns suggest volatility'
                  ],
                  riskFactors: [
                    'Market volatility may increase near resolution',
                    'External events could impact outcome'
                  ],
                  volatilityPrediction: 'medium' as const,
                  liquidityAssessment: 'good' as const,
                  lastUpdated: Date.now(),
                  fairValueEstimate: market.outcomes[0]?.price || 0.5,
                  confidenceBand: [0.4, 0.6] as [number, number],
                  catalysts: ['Upcoming announcements', 'Market trends'],
                  headwinds: ['Regulatory uncertainty', 'Market conditions']
                }}
              />
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Fetch and process market data for detail view
 */
async function getMarketData(marketId: string): Promise<DetailedMarket | null> {
  try {
    // First try to get the market directly
    const market = await marketDiscoveryService.getMarketById(marketId);
    
    if (market) {
      return processMarketForDetail(market);
    }

    // If not found as market, try as event ID
    const event = await marketDiscoveryService.getEventById(marketId);
    
    if (event && event.markets.length > 0) {
      // Use the first market from the event
      return processMarketForDetail(event.markets[0], event);
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch market data:', error);
    return null;
  }
}

/**
 * Generate metadata for the market page
 */
export async function generateMetadata({ params }: MarketPageProps) {
  const { id } = await params;
  const market = await getMarketData(id);

  if (!market) {
    return {
      title: 'Market Not Found - TradeWizard',
      description: 'The requested market could not be found.',
    };
  }

  return {
    title: `${market.title} - TradeWizard`,
    description: market.description || `Trade on ${market.title} with AI-powered insights`,
    openGraph: {
      title: market.title,
      description: market.description,
      images: market.image ? [{ url: market.image }] : [],
    },
  };
}