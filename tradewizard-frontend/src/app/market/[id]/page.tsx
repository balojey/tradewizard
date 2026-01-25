import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MarketDetailView } from '@/components/market-detail-view';
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
          <MarketDetailView market={market} />
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