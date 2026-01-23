/**
 * Market type detection utilities for Polymarket events
 * Determines whether a market is simple (Yes/No) or complex (multi-option)
 */

import { PolymarketEvent, PolymarketMarket, MarketType, ProcessedOutcome } from './polymarket-types';

/**
 * Determines if an event represents a simple or complex market
 * 
 * Simple markets:
 * - Have only one active market OR multiple markets with same/empty groupItemTitle
 * - Typically just Yes/No outcomes
 * 
 * Complex markets:
 * - Have multiple markets with different groupItemTitle values
 * - Each groupItemTitle represents a different option category
 * - Each category has Yes/No outcomes
 */
export function determineMarketType(event: PolymarketEvent): MarketType {
  const activeMarkets = event.markets.filter(market => market.active && !market.archived);
  
  if (activeMarkets.length <= 1) {
    return 'simple';
  }

  // Get unique groupItemTitle values (excluding empty/null)
  const uniqueGroupTitles = new Set(
    activeMarkets
      .map(market => market.groupItemTitle?.trim())
      .filter(title => title && title.length > 0)
  );

  // If we have multiple markets with different groupItemTitle values, it's complex
  if (uniqueGroupTitles.size > 1) {
    return 'complex';
  }

  // If all markets have the same or no groupItemTitle, it's simple
  return 'simple';
}

/**
 * Parses market outcomes from JSON string with error handling
 */
export function parseMarketOutcomes(outcomesJson: string): string[] {
  try {
    const parsed = JSON.parse(outcomesJson);
    if (Array.isArray(parsed)) {
      return parsed.map(outcome => String(outcome));
    }
    return ['Yes', 'No']; // Fallback
  } catch (error) {
    console.warn('Failed to parse market outcomes:', error);
    return ['Yes', 'No']; // Fallback
  }
}

/**
 * Parses market prices from JSON string with error handling
 */
export function parseMarketPrices(pricesJson: string): number[] {
  try {
    const parsed = JSON.parse(pricesJson);
    if (Array.isArray(parsed)) {
      return parsed.map(price => {
        const num = parseFloat(String(price));
        return isNaN(num) ? 0.5 : num; // Default to 50% if invalid
      });
    }
    return [0.5, 0.5]; // Fallback
  } catch (error) {
    console.warn('Failed to parse market prices:', error);
    return [0.5, 0.5]; // Fallback
  }
}

/**
 * Processes outcomes for simple markets
 * Takes the first active market and extracts Yes/No outcomes
 */
export function processSimpleMarketOutcomes(event: PolymarketEvent): ProcessedOutcome[] {
  const activeMarkets = event.markets.filter(market => market.active && !market.archived);
  
  if (activeMarkets.length === 0) {
    return [
      { name: 'Yes', probability: 50, color: 'yes' },
      { name: 'No', probability: 50, color: 'no' }
    ];
  }

  const market = activeMarkets[0];
  const outcomes = parseMarketOutcomes(market.outcomes);
  const prices = parseMarketPrices(market.outcomePrices);

  return outcomes.map((outcome, index) => ({
    name: outcome,
    probability: Math.round((prices[index] || 0.5) * 100),
    color: outcome.toLowerCase() === 'yes' ? 'yes' as const : 
           outcome.toLowerCase() === 'no' ? 'no' as const : 'neutral' as const
  }));
}

/**
 * Processes outcomes for complex markets
 * Groups markets by groupItemTitle and shows category + Yes/No for each
 */
export function processComplexMarketOutcomes(event: PolymarketEvent): ProcessedOutcome[] {
  const activeMarkets = event.markets.filter(market => market.active && !market.archived);
  
  if (activeMarkets.length === 0) {
    return [
      { name: 'Yes', probability: 50, color: 'yes' },
      { name: 'No', probability: 50, color: 'no' }
    ];
  }

  const outcomes: ProcessedOutcome[] = [];

  // Group markets by groupItemTitle
  const marketsByGroup = new Map<string, PolymarketMarket>();
  
  activeMarkets.forEach(market => {
    const groupTitle = market.groupItemTitle?.trim() || 'Unknown';
    marketsByGroup.set(groupTitle, market);
  });

  // Sort by groupItemThreshold if available, otherwise alphabetically
  const sortedGroups = Array.from(marketsByGroup.entries()).sort(([, a], [, b]) => {
    const thresholdA = parseInt(a.groupItemThreshold || '0');
    const thresholdB = parseInt(b.groupItemThreshold || '0');
    
    if (thresholdA !== thresholdB) {
      return thresholdA - thresholdB;
    }
    
    return a.groupItemTitle?.localeCompare(b.groupItemTitle || '') || 0;
  });

  // Process each group
  sortedGroups.forEach(([groupTitle, market]) => {
    const marketOutcomes = parseMarketOutcomes(market.outcomes);
    const prices = parseMarketPrices(market.outcomePrices);

    // For complex markets, we typically want to show the "Yes" probability for each category
    const yesIndex = marketOutcomes.findIndex(outcome => 
      outcome.toLowerCase() === 'yes'
    );
    
    if (yesIndex !== -1) {
      outcomes.push({
        name: 'Yes',
        probability: Math.round((prices[yesIndex] || 0.5) * 100),
        color: 'yes',
        category: groupTitle
      });
    } else {
      // Fallback if no "Yes" outcome found
      outcomes.push({
        name: marketOutcomes[0] || 'Yes',
        probability: Math.round((prices[0] || 0.5) * 100),
        color: 'neutral',
        category: groupTitle
      });
    }
  });

  return outcomes;
}

/**
 * Main function to process market outcomes based on market type
 */
export function processMarketOutcomes(event: PolymarketEvent): {
  marketType: MarketType;
  outcomes: ProcessedOutcome[];
} {
  const marketType = determineMarketType(event);
  
  const outcomes = marketType === 'simple' 
    ? processSimpleMarketOutcomes(event)
    : processComplexMarketOutcomes(event);

  return { marketType, outcomes };
}

/**
 * Utility function to format volume for display
 */
export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  } else {
    return `$${volume.toFixed(0)}`;
  }
}

/**
 * Utility function to get tag slugs from event
 */
export function getTagSlugs(event: PolymarketEvent): string[] {
  return event.tags.map(tag => tag.slug);
}

/**
 * Utility function to get tag labels from event
 */
export function getTagLabels(event: PolymarketEvent): string[] {
  return event.tags.map(tag => tag.label);
}