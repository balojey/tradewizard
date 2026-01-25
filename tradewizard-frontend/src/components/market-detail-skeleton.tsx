"use client";

import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Market Detail Skeleton Loading Component
 * Provides loading state for market detail view
 */
export function MarketDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 bg-muted rounded-lg" />
          <div className="space-y-2 flex-1">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-24" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Skeleton */}
                <div className="aspect-video bg-muted rounded-lg" />
                
                {/* Outcomes Skeleton */}
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded w-32" />
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="p-3 border rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="h-5 bg-muted rounded w-16" />
                          <div className="h-6 bg-muted rounded w-12" />
                        </div>
                        <div className="h-2 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="h-10 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="h-6 bg-muted rounded w-40" />
                <div className="flex gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 w-12 bg-muted rounded" />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted rounded" />
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-16" />
                    <div className="h-6 bg-muted rounded w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights Card */}
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-28" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-3 bg-muted rounded w-2/3" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Order Book Card */}
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order book header */}
              <div className="grid grid-cols-3 gap-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
              </div>
              
              {/* Asks */}
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <div className="h-3 bg-red-100 rounded" />
                    <div className="h-3 bg-red-100 rounded" />
                    <div className="h-3 bg-red-100 rounded" />
                  </div>
                ))}
              </div>
              
              {/* Spread */}
              <div className="h-6 bg-muted rounded mx-4" />
              
              {/* Bids */}
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <div className="h-3 bg-green-100 rounded" />
                    <div className="h-3 bg-green-100 rounded" />
                    <div className="h-3 bg-green-100 rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades Card */}
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-muted rounded-full" />
                    <div className="h-3 bg-muted rounded w-12" />
                  </div>
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-3 bg-muted rounded w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}