/**
 * Demo component showcasing enhanced MarketCard features
 * Demonstrates Requirements 1.2, 1.3, 1.4, 1.5, 1.6
 */

'use client';

import React, { useState } from 'react';
import { MarketCard } from './market-card';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface DemoState {
  showAIInsights: boolean;
  enableRealTime: boolean;
  marketVariant: 'simple' | 'featured' | 'trending' | 'new';
}

export function EnhancedMarketCardDemo() {
  const [demoState, setDemoState] = useState<DemoState>({
    showAIInsights: false,
    enableRealTime: true,
    marketVariant: 'simple'
  });

  // Mock AI insights data
  const mockAIInsights = {
    confidence: 85,
    riskLevel: 'medium' as const,
    keyFactors: [
      'Recent polling data shows momentum shift',
      'Economic indicators favor current outcome',
      'Historical patterns suggest volatility ahead'
    ],
    recommendation: 'buy' as const,
    lastUpdated: Date.now() - 120000 // 2 minutes ago
  };

  // Mock market outcomes with real-time data
  const mockOutcomes = [
    {
      name: 'Yes',
      probability: 67,
      color: 'yes' as const,
      tokenId: 'token_123',
      priceChange24h: 5.2
    },
    {
      name: 'No',
      probability: 33,
      color: 'no' as const,
      tokenId: 'token_456',
      priceChange24h: -2.8
    }
  ];

  const getMarketProps = () => {
    const baseProps = {
      id: 'demo-market-001',
      title: 'Will the Federal Reserve cut interest rates by 50+ basis points in December 2024?',
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop',
      volume: '$2.4M',
      outcomes: mockOutcomes,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      enableRealTimeUpdates: demoState.enableRealTime,
      showAIInsights: demoState.showAIInsights,
      aiInsights: demoState.showAIInsights ? mockAIInsights : undefined
    };

    switch (demoState.marketVariant) {
      case 'featured':
        return { ...baseProps, featured: true };
      case 'trending':
        return { ...baseProps, trending: true };
      case 'new':
        return { ...baseProps, isNew: true };
      default:
        return baseProps;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced MarketCard Demo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Showcasing real-time updates, AI insights, and enhanced hover effects
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demo Controls */}
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Market Variant:</label>
              <div className="flex gap-2">
                {(['simple', 'featured', 'trending', 'new'] as const).map((variant) => (
                  <Button
                    key={variant}
                    variant={demoState.marketVariant === variant ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDemoState(prev => ({ ...prev, marketVariant: variant }))}
                  >
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Features:</label>
              <div className="flex gap-2">
                <Button
                  variant={demoState.showAIInsights ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDemoState(prev => ({ ...prev, showAIInsights: !prev.showAIInsights }))}
                >
                  AI Insights
                </Button>
                <Button
                  variant={demoState.enableRealTime ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDemoState(prev => ({ ...prev, enableRealTime: !prev.enableRealTime }))}
                >
                  Real-time Updates
                </Button>
              </div>
            </div>
          </div>

          {/* Demo Market Card */}
          <div className="max-w-sm">
            <MarketCard {...getMarketProps()} />
          </div>

          {/* Feature Explanations */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enhanced Hover Effects</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Smooth elevation and shadow transitions</li>
                  <li>• Scale transform for depth perception</li>
                  <li>• Color transitions on probability bars</li>
                  <li>• AI insights reveal on hover</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Real-time Features</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Live price update indicators</li>
                  <li>• 24h price change badges</li>
                  <li>• Animated probability bars</li>
                  <li>• Connection status indicators</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Insights Integration</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Confidence level indicators</li>
                  <li>• Risk assessment display</li>
                  <li>• Trading recommendations</li>
                  <li>• Key factor analysis</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trading Features</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Featured market highlighting</li>
                  <li>• Trending market indicators</li>
                  <li>• New market badges</li>
                  <li>• Time until market ends</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}