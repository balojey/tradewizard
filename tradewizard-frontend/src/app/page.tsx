import { MarketCard } from "@/components/market-card";
import { SeriesCard } from "@/components/series-card";
import { HomeHero } from "@/components/home-hero";
import { PoliticsTagBar } from "@/components/politics-tag-bar";
import { CategoriesBar } from "@/components/categories-bar";
import { getPoliticalEvents, getPoliticalTagDisplayName, isValidPoliticalTag } from "@/lib/politics-data";
import { processMarket, processSeriesForDetail } from "@/lib/polymarket-data-processor";
import { Suspense } from "react";
import { preloadImages } from "@/lib/image-utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Activity, BarChart3 } from "lucide-react";
import type { Event } from "@/lib/polymarket";
import type { PolymarketEvent } from "@/lib/polymarket-api-types";

// Type adapter function to convert legacy Event to PolymarketEvent
function adaptEventToPolymarketEvent(event: Event): PolymarketEvent {
  return {
    id: event.id,
    ticker: event.ticker,
    slug: event.slug,
    title: event.title,
    description: event.description,
    resolutionSource: '', // Not available in legacy Event
    active: event.active,
    closed: event.closed,
    archived: event.archived,
    new: event.new,
    featured: event.featured,
    restricted: event.restricted,
    startDate: event.startDate,
    creationDate: event.creationDate,
    endDate: event.endDate,
    createdAt: event.creationDate,
    updatedAt: event.creationDate,
    liquidity: event.liquidity,
    volume: event.volume,
    openInterest: 0, // Not available in legacy Event
    competitive: 0, // Not available in legacy Event
    volume24hr: event.volume24hr,
    volume1wk: 0, // Not available in legacy Event
    volume1mo: 0, // Not available in legacy Event
    volume1yr: 0, // Not available in legacy Event
    enableOrderBook: true, // Default assumption
    liquidityClob: event.liquidity,
    negRisk: false, // Default assumption
    negRiskMarketID: undefined,
    commentCount: 0, // Not available in legacy Event
    image: event.image,
    icon: event.icon,
    markets: event.markets.map(market => ({
      ...market,
      description: market.description || '',
      resolutionSource: '',
      archived: false, // Add missing property
      new: market.active || false, // Add missing property
      featured: false, // Add missing property
      restricted: false, // Add missing property
      startDate: market.startDate || event.startDate, // Ensure startDate is always a string
      liquidityNum: parseFloat(market.volume) || 0,
      volumeNum: parseFloat(market.volume) || 0,
      volume24hr: 0,
      createdAt: event.creationDate,
      updatedAt: event.creationDate,
      marketMakerAddress: '',
      submitted_by: '',
      enableOrderBook: true,
      negRisk: false,
      ready: true,
      funded: true,
      cyom: false,
      pagerDutyNotificationEnabled: false,
      approved: true,
      automaticallyActive: true,
      clearBookOnStart: false,
      seriesColor: '',
      showGmpSeries: false,
      showGmpOutcome: false,
      manualActivation: false,
      negRiskOther: false,
      pendingDeployment: false,
      deploying: false,
      rfqEnabled: false,
      holdingRewardsEnabled: false,
      feesEnabled: false,
      requiresTranslation: false,
    })),
    tags: event.tags?.map(tag => ({
      id: parseInt(tag.id),
      label: tag.label,
      slug: tag.slug,
      createdAt: event.creationDate,
      updatedAt: event.creationDate,
      requiresTranslation: false,
    })) || [],
    cyom: false,
    showAllOutcomes: false,
    showMarketImages: false,
    enableNegRisk: false,
    automaticallyActive: true,
    gmpChartMode: '',
    negRiskAugmented: false,
    cumulativeMarkets: false,
    pendingDeployment: false,
    deploying: false,
    requiresTranslation: false,
  };
}

// Loading component for server-side rendering with enhanced skeleton - Enhanced responsive grid with series support
function MarketGridSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Series Section Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted-foreground/20 rounded animate-pulse" />
          <div className="h-6 bg-muted-foreground/20 rounded w-32 animate-pulse" />
          <div className="h-4 bg-muted-foreground/20 rounded w-8 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={`series-${i}`} className="animate-pulse">
              <div className="bg-muted rounded-lg overflow-hidden">
                {/* Series image skeleton */}
                <div className="aspect-[2/1] bg-muted-foreground/10" />
                {/* Series content skeleton */}
                <div className="p-4 space-y-4">
                  {/* Series title */}
                  <div className="space-y-2">
                    <div className="h-3 bg-muted-foreground/20 rounded w-20" />
                    <div className="h-5 bg-muted-foreground/20 rounded w-3/4" />
                    <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
                  </div>
                  {/* Series stats */}
                  <div className="grid grid-cols-3 gap-3 py-2 border-y border-border/30">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="text-center space-y-1">
                        <div className="h-6 bg-muted-foreground/20 rounded w-8 mx-auto" />
                        <div className="h-3 bg-muted-foreground/20 rounded w-12 mx-auto" />
                      </div>
                    ))}
                  </div>
                  {/* Market previews */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-muted-foreground/20 rounded w-16" />
                      <div className="h-4 w-4 bg-muted-foreground/20 rounded" />
                    </div>
                    {Array.from({ length: 2 }).map((_, k) => (
                      <div key={k} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
                          <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <div className="text-right space-y-1">
                            <div className="h-3 bg-muted-foreground/20 rounded w-8" />
                            <div className="h-3 bg-muted-foreground/20 rounded w-6" />
                          </div>
                          <div className="h-3 w-3 bg-muted-foreground/20 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Markets Section Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted-foreground/20 rounded animate-pulse" />
          <div className="h-6 bg-muted-foreground/20 rounded w-40 animate-pulse" />
          <div className="h-4 bg-muted-foreground/20 rounded w-8 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`market-${i}`} className="animate-pulse">
              <div className="bg-muted rounded-lg overflow-hidden">
                {/* Image skeleton */}
                <div className="aspect-[1.91/1] bg-muted-foreground/10" />
                {/* Content skeleton */}
                <div className="p-3 sm:p-4 space-y-3">
                  {/* Title skeleton */}
                  <div className="space-y-2">
                    <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                    <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
                  </div>
                  {/* Outcomes skeleton */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 bg-muted-foreground/20 rounded w-12" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-8" />
                    </div>
                    <div className="h-2 bg-muted-foreground/10 rounded" />
                    <div className="flex justify-between">
                      <div className="h-3 bg-muted-foreground/20 rounded w-10" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-8" />
                    </div>
                    <div className="h-2 bg-muted-foreground/10 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Server Component with enhanced politics-focused data fetching and series detection
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const params = await searchParams;
  const tag = params.tag || "all";

  // Validate tag parameter and fallback to "all" if invalid (Requirement 8.4)
  const validatedTag = isValidPoliticalTag(tag) ? tag : "all";
  
  // Log tag validation for debugging
  if (tag !== validatedTag) {
    console.warn(`Invalid political tag "${tag}" provided, falling back to "${validatedTag}"`);
  }

  // Fetch politics-focused data using enhanced utility (Requirements 1.1, 1.4)
  const events = await getPoliticalEvents({
    tag: validatedTag,
    limit: 20,
    active: true,
    closed: false,
  });

  // Process events and detect series vs individual markets (Requirements 13.1, 13.6)
  const processedData = events.map(event => {
    // Check if this event has series information (Requirements 13.1, 13.2)
    const hasSeriesInfo = event.markets.some(market => 
      market.groupItemTitle && market.groupItemTitle.trim() !== ''
    );

    if (hasSeriesInfo && event.markets.length > 1) {
      // Process as series
      return {
        type: 'series' as const,
        data: processSeriesForDetail(adaptEventToPolymarketEvent(event)),
      };
    } else {
      // Process as individual market(s)
      const adaptedEvent = adaptEventToPolymarketEvent(event);
      return {
        type: 'markets' as const,
        data: adaptedEvent.markets.map(market => processMarket(market, adaptedEvent)),
      };
    }
  });

  // Separate series and individual markets for display
  const seriesItems = processedData
    .filter(item => item.type === 'series')
    .map(item => item.data);
  
  const individualMarkets = processedData
    .filter(item => item.type === 'markets')
    .flatMap(item => item.data);

  // Combine for total count and volume calculations
  const allMarkets = [...individualMarkets, ...seriesItems.flatMap(series => series.markets)];
  const totalVolume = allMarkets.reduce((sum, market) => sum + (market.volume24h || 0), 0);

  // Preload critical images for better performance (Requirements 10.2, 10.4)
  const criticalImages = [
    ...seriesItems.slice(0, 2).map(series => series.image).filter(Boolean),
    ...individualMarkets.slice(0, 4).map(market => market.image).filter(Boolean)
  ];
  
  if (criticalImages.length > 0) {
    // Fire and forget - don't await to avoid blocking render
    preloadImages(criticalImages, { priority: 'high', timeout: 5000 }).catch(() => {
      // Silently handle preload failures
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeHero />
      
      {/* Enhanced Category Navigation with both Politics and General Categories */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="container max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          {/* Politics Tag Bar for political markets */}
          <PoliticsTagBar currentTag={validatedTag} />
          
          {/* General Categories Bar for broader market categories */}
          <div className="py-2">
            <CategoriesBar />
          </div>
        </div>
      </div>
      
      <section id="markets" className="container max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 xl:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              {getPoliticalTagDisplayName(validatedTag)}
            </h2>
            
            {/* Market Stats - Enhanced with series information */}
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                <span>{allMarkets.length} markets</span>
              </div>
              {seriesItems.length > 0 && (
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{seriesItems.length} series</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>
                  ${totalVolume.toLocaleString(undefined, { 
                    maximumFractionDigits: 0, 
                    notation: "compact" 
                  })} volume
                </span>
              </div>
            </div>
          </div>
          
          {/* Search Button - Enhanced mobile layout */}
          <Link href="/search">
            <Button variant="outline" className="gap-2 h-10 sm:h-9 px-4 sm:px-3">
              <Search className="h-4 w-4" />
              <span className="hidden xs:inline">Search Markets</span>
              <span className="xs:hidden">Search</span>
            </Button>
          </Link>
        </div>

        {/* Market Grid with Series and Individual Markets - Enhanced responsive grid */}
        <Suspense fallback={<MarketGridSkeleton />}>
          <div 
            className="space-y-6 sm:space-y-8"
            role="main"
            aria-label={`${getPoliticalTagDisplayName(validatedTag)} markets and series`}
            id={`markets-${validatedTag}`}
          >
            {/* Series Section */}
            {seriesItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Market Series</h3>
                  <span className="text-sm text-muted-foreground">({seriesItems.length})</span>
                </div>
                <div 
                  className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-2 xl:grid-cols-3"
                  role="grid"
                  aria-label="Market series"
                >
                  {seriesItems.map((series) => (
                    <div key={series.id} role="gridcell">
                      <SeriesCard
                        series={series}
                        showAIInsights={true}
                        enableRealTimeUpdates={true}
                        showMarketPreviews={true}
                        maxMarketPreviews={3}
                        featured={series.totalVolume > 500000}
                        trending={series.totalVolume > 1000000}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Markets Section */}
            {individualMarkets.length > 0 && (
              <div className="space-y-4">
                {seriesItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Individual Markets</h3>
                    <span className="text-sm text-muted-foreground">({individualMarkets.length})</span>
                  </div>
                )}
                <div 
                  className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  role="grid"
                  aria-label="Individual markets"
                >
                  {individualMarkets.map((market) => (
                    <div key={market.id} role="gridcell">
                      <MarketCard
                        market={market}
                        showAIInsights={true}
                        enableRealTimeUpdates={true}
                        featured={market.featured}
                        trending={market.volume24h > 100000}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Suspense>

        {/* Enhanced empty state with tag-specific messaging */}
        {allMarkets.length === 0 && (
          <div className="py-20 text-center" role="status" aria-live="polite">
            <div className="text-muted-foreground mb-2">
              No active markets found for {getPoliticalTagDisplayName(validatedTag).toLowerCase()}.
            </div>
            <div className="text-sm text-muted-foreground">
              Try selecting a different category or check back later.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}