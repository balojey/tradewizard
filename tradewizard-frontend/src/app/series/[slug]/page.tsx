import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { SeriesDetailView } from '@/components/series-detail-view';
import { MarketDetailSkeleton } from '@/components/market-detail-skeleton';
import { marketDiscoveryService } from '@/lib/services/market-discovery';
import { processSeriesForDetail } from '@/lib/polymarket-data-processor';
import type { ProcessedSeries } from '@/lib/enhanced-polymarket-types';

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Series Detail Page with Slug-based Routing
 * Implements Requirements 13.5, 13.6, 13.7, 13.8
 */
export default async function SeriesPage({ params }: SeriesPageProps) {
  const { slug } = await params;

  // Fetch series data by slug
  const series = await getSeriesDataBySlug(slug);
  
  if (!series) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Suspense fallback={<MarketDetailSkeleton />}>
          <SeriesDetailView series={series} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Fetch and process series data by slug for detail view
 * Implements Requirements 13.5, 13.6 - series detail layout and information
 */
async function getSeriesDataBySlug(seriesSlug: string): Promise<ProcessedSeries | null> {
  try {
    // Get event by slug (series are typically events with multiple markets)
    const event = await marketDiscoveryService.getEventBySlug(seriesSlug);
    
    if (!event || !event.markets.length) {
      return null;
    }

    // Check if this event has series information
    const hasSeriesInfo = event.markets.some(market => 
      market.groupItemTitle && market.groupItemTitle.trim() !== ''
    );

    if (!hasSeriesInfo) {
      return null;
    }

    // Process the event as a series
    return processSeriesForDetail(event);
  } catch (error) {
    console.error('Failed to fetch series data by slug:', error);
    return null;
  }
}

/**
 * Generate metadata for the series page
 * Implements Requirements 13.6, 13.7 - series information and aggregate statistics
 */
export async function generateMetadata({ params }: SeriesPageProps) {
  const { slug } = await params;
  const series = await getSeriesDataBySlug(slug);

  if (!series) {
    return {
      title: 'Series Not Found - TradeWizard',
      description: 'The requested series could not be found.',
    };
  }

  const marketCount = series.marketCount;
  const totalVolume = series.totalVolumeFormatted;

  return {
    title: `${series.title} - TradeWizard`,
    description: series.description || `Trade on ${marketCount} markets in the ${series.title} series with total volume of ${totalVolume}`,
    openGraph: {
      title: series.title,
      description: series.description,
      images: series.image ? [{ url: series.image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: series.title,
      description: series.description,
      images: series.image ? [series.image] : [],
    },
    alternates: {
      canonical: `/series/${slug}`,
    },
  };
}

/**
 * Generate static params for static generation (optional)
 * Can be used for popular series
 */
export async function generateStaticParams() {
  try {
    // Get popular events that might be series
    const events = await marketDiscoveryService.getEvents({
      active: true,
      limit: 100,
      sortBy: 'volume24hr',
      order: 'desc'
    });

    const params = [];
    
    for (const event of events) {
      // Check if this event has series-like markets
      const hasSeriesInfo = event.markets.some(market => 
        market.groupItemTitle && market.groupItemTitle.trim() !== ''
      );

      if (hasSeriesInfo && event.slug) {
        params.push({ slug: event.slug });
      }
    }

    return params.slice(0, 50); // Limit to top 50 series
  } catch (error) {
    console.error('Failed to generate static params for series:', error);
    return [];
  }
}