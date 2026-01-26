import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MarketDetailView } from '@/components/market-detail-view';
import { TradingPanel } from '@/components/trading-panel';
import { AIInsightsPanel } from '@/components/ai-insights-panel';
import { MarketDetailSkeleton } from '@/components/market-detail-skeleton';
import { marketDiscoveryService } from '@/lib/services/market-discovery';
import { processMarketForDetail } from '@/lib/polymarket-data-processor';
import type { DetailedMarket } from '@/lib/enhanced-polymarket-types';

interface MarketPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Market Detail Page with Slug-based Routing
 * Implements Requirements 4.1, 4.2, 4.3, 4.6, 4.8, 4.9
 */
export default async function MarketPage({ params }: MarketPageProps) {
  const { slug } = await params;

  // Fetch market data by slug
  const market = await getMarketDataBySlug(slug);
  
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
 * Fetch and process market data by slug for detail view
 * Implements Requirements 4.8, 4.9 - slug-based routing
 */
async function getMarketDataBySlug(marketSlug: string): Promise<DetailedMarket | null> {
  try {
    // First try to get the market directly by slug
    const market = await marketDiscoveryService.getMarketBySlug(marketSlug);
    
    if (market) {
      return processMarketForDetail(market);
    }

    // If not found as market slug, try as event slug
    const event = await marketDiscoveryService.getEventBySlug(marketSlug);
    
    if (event && event.markets.length > 0) {
      // Use the first market from the event
      return processMarketForDetail(event.markets[0], event);
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch market data by slug:', error);
    return null;
  }
}

/**
 * Generate metadata for the market page
 * Implements Requirements 4.2, 4.3 - comprehensive information display
 */
export async function generateMetadata({ params }: MarketPageProps) {
  const { slug } = await params;
  const market = await getMarketDataBySlug(slug);

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
    twitter: {
      card: 'summary_large_image',
      title: market.title,
      description: market.description,
      images: market.image ? [market.image] : [],
    },
    alternates: {
      canonical: `/market/${slug}`,
    },
  };
}

/**
 * Generate static params for static generation (optional)
 * Can be used for popular markets
 */
export async function generateStaticParams() {
  try {
    // Get popular markets for static generation
    const events = await marketDiscoveryService.getEvents({
      active: true,
      limit: 50,
      sortBy: 'volume24hr',
      order: 'desc'
    });

    const params = [];
    
    for (const event of events) {
      for (const market of event.markets) {
        if (market.slug) {
          params.push({ slug: market.slug });
        }
      }
    }

    return params.slice(0, 100); // Limit to top 100 markets
  } catch (error) {
    console.error('Failed to generate static params:', error);
    return [];
  }
}