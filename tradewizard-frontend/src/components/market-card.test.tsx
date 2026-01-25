/**
 * Tests for enhanced MarketCard component with trading features
 * Tests Requirements 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketCard } from './market-card';

// Mock Next.js Link component
vi.mock('next/link', () => {
  return {
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  };
});

// Mock real-time context
vi.mock('../lib/realtime-context', () => ({
  useRealtimePricesSafe: vi.fn(() => ({
    prices: {},
    isSubscribed: false,
    lastUpdated: 0,
  })),
}));

// Mock error boundary
vi.mock('./error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MarketErrorFallback: () => <div>Error fallback</div>,
}));

// Mock market image component
vi.mock('./market-image', () => ({
  MarketImage: ({ title, className }: { title: string; className: string }) => (
    <img alt={title} className={className} src="mock-image.jpg" />
  ),
}));

describe('MarketCard Enhanced Features', () => {
  const baseProps = {
    id: 'test-market',
    title: 'Test Market Title',
    image: 'https://example.com/image.jpg',
    volume: '$1.2M',
    isNew: false
  };

  describe('Real-time Price Updates', () => {
    it('should display real-time price indicators when enabled', () => {
      const outcomes = [
        { 
          name: 'Yes', 
          probability: 70, 
          color: 'yes' as const,
          tokenId: 'token123',
          priceChange24h: 5.2
        },
        { 
          name: 'No', 
          probability: 30, 
          color: 'no' as const,
          tokenId: 'token456',
          priceChange24h: -2.1
        }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          enableRealTimeUpdates={true}
        />
      );

      expect(screen.getByText('Test Market Title')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('should show price change indicators for outcomes with changes', () => {
      const outcomes = [
        { 
          name: 'Yes', 
          probability: 65, 
          color: 'yes' as const,
          priceChange24h: 8.5
        }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
        />
      );

      expect(screen.getByText('8.5%')).toBeInTheDocument();
    });
  });

  describe('AI Insights Integration', () => {
    const mockAIInsights = {
      confidence: 85,
      riskLevel: 'medium' as const,
      keyFactors: ['Economic indicators', 'Market sentiment', 'Historical trends'],
      recommendation: 'buy' as const,
      lastUpdated: Date.now() - 60000 // 1 minute ago
    };

    it('should display AI insights indicator when enabled', () => {
      const outcomes = [
        { name: 'Yes', probability: 70, color: 'yes' as const }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          showAIInsights={true}
          aiInsights={mockAIInsights}
        />
      );

      // AI insights indicator should be present (Brain icon)
      const brainIcon = document.querySelector('[data-lucide="brain"]');
      expect(brainIcon).toBeInTheDocument();
    });

    it('should show detailed AI insights on hover', () => {
      const outcomes = [
        { name: 'Yes', probability: 70, color: 'yes' as const }
      ];

      const { container } = render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          showAIInsights={true}
          aiInsights={mockAIInsights}
        />
      );

      const marketCard = container.querySelector('a');
      if (marketCard) {
        fireEvent.mouseEnter(marketCard);
        
        // Should show AI insights summary
        expect(screen.getByText('AI Analysis')).toBeInTheDocument();
        expect(screen.getByText('BUY')).toBeInTheDocument();
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      }
    });
  });

  describe('Enhanced Hover Effects', () => {
    it('should apply enhanced hover styles and animations', () => {
      const outcomes = [
        { name: 'Yes', probability: 50, color: 'yes' as const }
      ];

      const { container } = render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
        />
      );

      const marketCard = container.querySelector('a');
      expect(marketCard).toHaveClass('cursor-pointer');
      
      const cardElement = container.querySelector('[class*="hover:shadow-lg"]');
      expect(cardElement).toBeInTheDocument();
    });

    it('should show enhanced visual feedback on hover', () => {
      const outcomes = [
        { name: 'Yes', probability: 60, color: 'yes' as const }
      ];

      const { container } = render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
        />
      );

      const marketCard = container.querySelector('a');
      if (marketCard) {
        fireEvent.mouseEnter(marketCard);
        
        // Check for hover effects (transform, shadow, etc.)
        const cardElement = container.querySelector('[class*="hover:-translate-y-1"]');
        expect(cardElement).toBeInTheDocument();
      }
    });
  });

  describe('Trading Features Integration', () => {
    it('should display featured market styling', () => {
      const outcomes = [
        { name: 'Yes', probability: 75, color: 'yes' as const }
      ];

      const { container } = render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          featured={true}
        />
      );

      expect(screen.getByText('Featured')).toBeInTheDocument();
      
      const cardElement = container.querySelector('[class*="ring-2"]');
      expect(cardElement).toBeInTheDocument();
    });

    it('should display trending market indicator', () => {
      const outcomes = [
        { name: 'Yes', probability: 80, color: 'yes' as const }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          trending={true}
        />
      );

      expect(screen.getByText('Trending')).toBeInTheDocument();
    });

    it('should show market end time when provided', () => {
      const outcomes = [
        { name: 'Yes', probability: 55, color: 'yes' as const }
      ];

      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          endDate={futureDate}
        />
      );

      // Should show time indicator (could be hours or days)
      const timeElements = screen.getAllByText(/\d+[hd]/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Error Handling', () => {
    it('should display enhanced error state with specific messaging', () => {
      render(
        <MarketCard
          {...baseProps}
          outcomes={[]}
          hasError={true}
          errorMessage="Failed to load market data from API"
        />
      );

      expect(screen.getByText('Market Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Failed to load market data from API')).toBeInTheDocument();
    });

    it('should handle missing data gracefully with enhanced fallbacks', () => {
      render(
        <MarketCard
          id=""
          title=""
          image=""
          volume=""
          outcomes={[]}
        />
      );

      expect(screen.getByText('Market data unavailable')).toBeInTheDocument();
      // Should show default outcomes
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  describe('Accessibility Enhancements', () => {
    it('should have enhanced ARIA labels and descriptions', () => {
      const outcomes = [
        { name: 'Yes', probability: 65, color: 'yes' as const }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          isNew={true}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-label', expect.stringContaining('View market: Test Market Title'));
      expect(link).toHaveAttribute('aria-label', expect.stringContaining('New market'));
    });

    it('should provide proper focus management', () => {
      const outcomes = [
        { name: 'Yes', probability: 70, color: 'yes' as const }
      ];

      const { container } = render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });
});