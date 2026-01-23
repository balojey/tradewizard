/**
 * Tests for enhanced MarketCard component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarketCard } from './market-card';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('MarketCard', () => {
  const baseProps = {
    id: 'test-market',
    title: 'Test Market Title',
    image: 'https://example.com/image.jpg',
    volume: '$1.2M',
    isNew: false
  };

  describe('Simple Market Type', () => {
    it('should render simple market with Yes/No outcomes', () => {
      const outcomes = [
        { name: 'Yes', probability: 70, color: 'yes' as const },
        { name: 'No', probability: 30, color: 'no' as const }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          marketType="simple"
        />
      );

      expect(screen.getByText('Test Market Title')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('should render with default simple market type when not specified', () => {
      const outcomes = [
        { name: 'Yes', probability: 60, color: 'yes' as const },
        { name: 'No', probability: 40, color: 'no' as const }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
        />
      );

      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  describe('Complex Market Type', () => {
    it('should render complex market with category outcomes', () => {
      const outcomes = [
        { name: 'Yes', probability: 80, color: 'yes' as const, category: '250-500k' },
        { name: 'Yes', probability: 30, color: 'yes' as const, category: '500-750k' },
        { name: 'Yes', probability: 15, color: 'yes' as const, category: '750k-1m' }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          marketType="complex"
        />
      );

      expect(screen.getByText('Test Market Title')).toBeInTheDocument();
      expect(screen.getByText('250-500k')).toBeInTheDocument();
      expect(screen.getByText('500-750k')).toBeInTheDocument();
      expect(screen.getByText('750k-1m')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('should show "Yes" labels for complex market outcomes', () => {
      const outcomes = [
        { name: 'Yes', probability: 50, color: 'yes' as const, category: 'Option A' }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          marketType="complex"
        />
      );

      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('should show "New" badge when isNew is true', () => {
      const outcomes = [
        { name: 'Yes', probability: 50, color: 'yes' as const }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          isNew={true}
        />
      );

      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should display volume with trending icon', () => {
      const outcomes = [
        { name: 'Yes', probability: 50, color: 'yes' as const }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
          volume="$2.5M"
        />
      );

      expect(screen.getByText('$2.5M')).toBeInTheDocument();
    });

    it('should have correct link href', () => {
      const outcomes = [
        { name: 'Yes', probability: 50, color: 'yes' as const }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/market/test-market');
    });
  });

  describe('Accessibility', () => {
    it('should have cursor-pointer class for interactivity', () => {
      const outcomes = [
        { name: 'Yes', probability: 50, color: 'yes' as const }
      ];

      const { container } = render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
        />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('cursor-pointer');
    });

    it('should have proper image alt text', () => {
      const outcomes = [
        { name: 'Yes', probability: 50, color: 'yes' as const }
      ];

      render(
        <MarketCard
          {...baseProps}
          outcomes={outcomes}
        />
      );

      const image = screen.getByAltText('Test Market Title');
      expect(image).toBeInTheDocument();
    });
  });
});