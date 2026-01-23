/**
 * TypeScript interfaces for Polymarket events.json structure
 * Based on the actual API response format from Polymarket Gamma API
 */

// Core tag interface
export interface PolymarketTag {
  id: string;
  label: string;
  slug: string;
  forceShow?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isCarousel?: boolean;
  forceHide?: boolean;
  requiresTranslation?: boolean;
}

// Market interface with all fields from the API
export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  resolutionSource?: string;
  endDate: string;
  startDate?: string;
  image?: string;
  icon?: string;
  description?: string;
  outcomes: string; // JSON string array e.g. "[\"Yes\", \"No\"]"
  outcomePrices: string; // JSON string array e.g. "[\"0.5\", \"0.5\"]"
  volume: string;
  active: boolean;
  closed: boolean;
  marketMakerAddress?: string;
  createdAt?: string;
  updatedAt?: string;
  closedTime?: string;
  new: boolean;
  featured: boolean;
  submitted_by?: string;
  archived: boolean;
  resolvedBy?: string;
  restricted: boolean;
  groupItemTitle?: string; // Key field for complex markets (e.g., "250-500k", "Fed 50+ bps decrease")
  groupItemThreshold?: string;
  questionID?: string;
  umaEndDate?: string;
  enableOrderBook?: boolean;
  orderPriceMinTickSize?: number;
  orderMinSize?: number;
  umaResolutionStatus?: string;
  volumeNum?: number;
  liquidityNum?: number;
  endDateIso?: string;
  startDateIso?: string;
  hasReviewedDates?: boolean;
  volume24hr?: number;
  volume1wk?: number;
  volume1mo?: number;
  volume1yr?: number;
  clobTokenIds?: string;
  umaBond?: string;
  umaReward?: string;
  volume24hrClob?: number;
  volume1wkClob?: number;
  volume1moClob?: number;
  volume1yrClob?: number;
  volumeClob?: number;
  liquidityClob?: number;
  customLiveness?: number;
  acceptingOrders?: boolean;
  negRisk?: boolean;
  negRiskMarketID?: string;
  negRiskRequestID?: string;
  ready?: boolean;
  funded?: boolean;
  acceptingOrdersTimestamp?: string;
  cyom?: boolean;
  competitive?: number;
  pagerDutyNotificationEnabled?: boolean;
  approved?: boolean;
  rewardsMinSize?: number;
  rewardsMaxSpread?: number;
  spread?: number;
  automaticallyResolved?: boolean;
  oneDayPriceChange?: number;
  oneHourPriceChange?: number;
  oneWeekPriceChange?: number;
  oneMonthPriceChange?: number;
  oneYearPriceChange?: number;
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  automaticallyActive?: boolean;
  clearBookOnStart?: boolean;
  seriesColor?: string;
  showGmpSeries?: boolean;
  showGmpOutcome?: boolean;
  manualActivation?: boolean;
  negRiskOther?: boolean;
  umaResolutionStatuses?: string;
  pendingDeployment?: boolean;
  deploying?: boolean;
  deployingTimestamp?: string;
  rfqEnabled?: boolean;
  holdingRewardsEnabled?: boolean;
  feesEnabled?: boolean;
  requiresTranslation?: boolean;
  liquidity?: string;
}

// Event interface with all fields from the API
export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  resolutionSource?: string;
  startDate: string;
  creationDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  liquidity: number;
  volume: number;
  openInterest?: number;
  createdAt?: string;
  updatedAt?: string;
  competitive?: number;
  volume24hr?: number;
  volume1wk?: number;
  volume1mo?: number;
  volume1yr?: number;
  enableOrderBook?: boolean;
  liquidityClob?: number;
  negRisk?: boolean;
  negRiskMarketID?: string;
  commentCount?: number;
  markets: PolymarketMarket[];
  tags: PolymarketTag[];
  cyom?: boolean;
  showAllOutcomes?: boolean;
  showMarketImages?: boolean;
  enableNegRisk?: boolean;
  automaticallyActive?: boolean;
  gmpChartMode?: string;
  negRiskAugmented?: boolean;
  cumulativeMarkets?: boolean;
  pendingDeployment?: boolean;
  deploying?: boolean;
  requiresTranslation?: boolean;
}

// Processed outcome interface for UI consumption
export interface ProcessedOutcome {
  name: string;
  probability: number;
  color?: 'yes' | 'no' | 'neutral';
  category?: string; // For complex markets, this is the groupItemTitle
}

// Market type classification
export type MarketType = 'simple' | 'complex';

// Processed event interface for UI consumption
export interface ProcessedEvent {
  id: string;
  title: string;
  description: string;
  image: string;
  marketImage?: string; // Fallback image from market data
  volume: number;
  volumeFormatted: string; // Human-readable format (e.g., "$1.2M")
  isNew: boolean;
  active: boolean;
  closed: boolean;
  marketType: MarketType;
  outcomes: ProcessedOutcome[];
  tags: string[]; // Array of tag slugs for easy filtering
  tagLabels: string[]; // Array of tag labels for display
  endDate: string;
  startDate: string;
  // Navigation and linking
  slug: string;
  ticker: string;
}

// Error types for data processing
export interface DataProcessingError {
  type: 'parsing' | 'validation' | 'network' | 'rendering' | 'unknown';
  message: string;
  originalData?: any;
  field?: string;
}

// Result type for data processing operations
export interface ProcessingResult<T> {
  success: boolean;
  data?: T;
  error?: DataProcessingError;
  fallbackUsed?: boolean;
}

// Configuration for data processing
export interface ProcessingConfig {
  enableFallbacks: boolean;
  strictValidation: boolean;
  logErrors: boolean;
  defaultProbability: number; // Default probability for fallback outcomes (e.g., 0.5 for 50%)
}

// Default processing configuration
export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  enableFallbacks: true,
  strictValidation: false,
  logErrors: true,
  defaultProbability: 0.5,
};

// Political tag constants for filtering
export const POLITICAL_TAGS = {
  POLITICS: 'politics',
  TRUMP: 'trump',
  ELECTIONS: 'elections',
  US_POLITICS: 'u-s-politics',
  IMMIGRATION: 'immigration',
  WORLD: 'world',
  FRANCE: 'france',
  MACRON: 'macron',
} as const;

// Related political tags that should be shown in the tag bar
export const RELATED_POLITICAL_TAGS = [
  POLITICAL_TAGS.TRUMP,
  POLITICAL_TAGS.ELECTIONS,
  POLITICAL_TAGS.US_POLITICS,
  POLITICAL_TAGS.IMMIGRATION,
  POLITICAL_TAGS.WORLD,
] as const;

export type PoliticalTag = typeof POLITICAL_TAGS[keyof typeof POLITICAL_TAGS];