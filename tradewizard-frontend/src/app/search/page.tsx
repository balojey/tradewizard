import { Suspense } from "react";
import { MarketSearchPage } from "./search-page";

/**
 * Search Page Route
 * Implements Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    order?: string;
    closed?: string;
    category?: string;
  }>;
}) {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <MarketSearchPage searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Loading skeleton for the search page
 */
function SearchPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header skeleton */}
        <div className="mb-8 space-y-4">
          <div className="h-8 bg-muted-foreground/20 rounded w-48 animate-pulse" />
          <div className="h-4 bg-muted-foreground/20 rounded w-96 animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="mb-8">
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
        </div>

        {/* Results skeleton */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-muted-foreground/20 rounded w-32 animate-pulse" />
            <div className="h-4 bg-muted-foreground/20 rounded w-24 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg overflow-hidden">
                  <div className="aspect-[1.91/1] bg-muted-foreground/10" />
                  <div className="p-3 sm:p-4 space-y-3">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                      <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-3 bg-muted-foreground/20 rounded w-12" />
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
    </div>
  );
}

export const metadata = {
  title: 'Search Markets - TradeWizard',
  description: 'Search and filter prediction markets with advanced sorting and filtering options.',
};