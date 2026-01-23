/**
 * Integration example showing how to use the enhanced MarketCard with Polymarket data
 */

import { PolymarketEvent } from './polymarket-types';
import { defaultProcessor } from './polymarket-data-processor';

// Example: Simple market (single Yes/No market)
export const simpleMarketExample: PolymarketEvent = {
  id: "17549",
  ticker: "natoeu-troops-fighting-in-ukraine-in-2025",
  slug: "natoeu-troops-fighting-in-ukraine-in-2025",
  title: "NATO/EU troops fighting in Ukraine by...?",
  description: "This market will resolve to \"Yes\" if active military personnel...",
  startDate: "2025-01-31T23:41:04.062553Z",
  creationDate: "2025-01-31T23:41:04.062551Z",
  endDate: "2025-12-31T12:00:00Z",
  image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/natoeu-troops-fighting-in-ukraine-in-2025-ed2fIguRcJLj.jpg",
  icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/natoeu-troops-fighting-in-ukraine-in-2025-ed2fIguRcJLj.jpg",
  active: true,
  closed: false,
  archived: false,
  new: false,
  featured: false,
  restricted: true,
  liquidity: 11688.18323,
  volume: 218636.432778,
  markets: [
    {
      id: "521103",
      question: "NATO/EU troops fighting in Ukraine in 2025?",
      conditionId: "0x07f106c0b60e94d96a63954f0536811c1a0b054b958f26bb749689b620b72f50",
      slug: "natoeu-troops-fighting-in-ukraine-in-2025",
      endDate: "2025-12-31T12:00:00Z",
      outcomes: "[\"Yes\", \"No\"]",
      outcomePrices: "[\"0.15\", \"0.85\"]",
      volume: "170793.703881",
      active: true,
      closed: false,
      new: false,
      featured: true,
      archived: false,
      restricted: true,
      enableOrderBook: true,
      orderPriceMinTickSize: 0.001,
      orderMinSize: 5,
      volumeNum: 170793.703881,
      endDateIso: "2025-12-31",
      startDateIso: "2025-01-31",
      hasReviewedDates: true,
      acceptingOrders: false,
      negRisk: false,
      ready: false,
      funded: false,
      cyom: false,
      pagerDutyNotificationEnabled: false,
      approved: true,
      automaticallyActive: true,
      clearBookOnStart: true,
      seriesColor: "",
      showGmpSeries: false,
      showGmpOutcome: false,
      manualActivation: false,
      negRiskOther: false,
      pendingDeployment: false,
      deploying: false,
      rfqEnabled: false,
      holdingRewardsEnabled: false,
      feesEnabled: false,
      requiresTranslation: false
    }
  ],
  tags: [
    { id: "2", label: "Politics", slug: "politics", requiresTranslation: false },
    { id: "101970", label: "World", slug: "world", requiresTranslation: false }
  ],
  cyom: false,
  showAllOutcomes: true,
  showMarketImages: false,
  enableNegRisk: false,
  automaticallyActive: true,
  gmpChartMode: "default",
  negRiskAugmented: false,
  cumulativeMarkets: false,
  pendingDeployment: false,
  deploying: false,
  requiresTranslation: false
};

// Example: Complex market (multiple option categories)
export const complexMarketExample: PolymarketEvent = {
  id: "16282",
  ticker: "how-many-people-will-trump-deport-in-2025",
  slug: "how-many-people-will-trump-deport-in-2025",
  title: "How many people will Trump deport in 2025?",
  description: "This is a market on the prediction of the number of people Trump will deport in 2025.",
  startDate: "2025-01-05T19:47:34.719608Z",
  creationDate: "2025-01-05T19:47:34.719605Z",
  endDate: "2025-12-31T12:00:00Z",
  image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/how-many-people-will-trump-deport-in-2025-0f3mpbc_YDbk.jpg",
  icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/how-many-people-will-trump-deport-in-2025-0f3mpbc_YDbk.jpg",
  active: true,
  closed: false,
  archived: false,
  new: false,
  featured: false,
  restricted: true,
  liquidity: 82427.13687,
  volume: 4561108.452017,
  markets: [
    {
      id: "517310",
      question: "Will Trump deport less than 250,000?",
      conditionId: "0xaf9d0e448129a9f657f851d49495ba4742055d80e0ef1166ba0ee81d4d594214",
      slug: "will-trump-deport-less-than-250000",
      endDate: "2025-12-31T12:00:00Z",
      outcomes: "[\"Yes\", \"No\"]",
      outcomePrices: "[\"0.0245\", \"0.9755\"]",
      volume: "968372.749512",
      active: true,
      closed: false,
      new: false,
      featured: false,
      archived: false,
      restricted: true,
      groupItemTitle: "<250k",
      groupItemThreshold: "0",
      enableOrderBook: true,
      orderPriceMinTickSize: 0.001,
      orderMinSize: 5,
      volumeNum: 968372.749512,
      endDateIso: "2025-12-31",
      startDateIso: "2025-01-05",
      hasReviewedDates: true,
      acceptingOrders: true,
      negRisk: true,
      ready: false,
      funded: false,
      cyom: false,
      pagerDutyNotificationEnabled: false,
      approved: true,
      automaticallyActive: true,
      clearBookOnStart: true,
      seriesColor: "",
      showGmpSeries: false,
      showGmpOutcome: false,
      manualActivation: false,
      negRiskOther: false,
      pendingDeployment: false,
      deploying: false,
      rfqEnabled: false,
      holdingRewardsEnabled: false,
      feesEnabled: false,
      requiresTranslation: false
    },
    {
      id: "517311",
      question: "Will Trump deport 250,000-500,000 people?",
      conditionId: "0x49686d26fb712515cd5e12c23f0a1c7e10214c7faa3cb0a730aabe0c33694082",
      slug: "will-trump-deport-250000-500000-people",
      endDate: "2025-12-31T12:00:00Z",
      outcomes: "[\"Yes\", \"No\"]",
      outcomePrices: "[\"0.874\", \"0.126\"]",
      volume: "1052891.072544",
      active: true,
      closed: false,
      new: false,
      featured: false,
      archived: false,
      restricted: true,
      groupItemTitle: "250-500k",
      groupItemThreshold: "1",
      enableOrderBook: true,
      orderPriceMinTickSize: 0.001,
      orderMinSize: 5,
      volumeNum: 1052891.072544,
      endDateIso: "2025-12-31",
      startDateIso: "2025-01-05",
      hasReviewedDates: true,
      acceptingOrders: true,
      negRisk: true,
      ready: false,
      funded: false,
      cyom: false,
      pagerDutyNotificationEnabled: false,
      approved: true,
      automaticallyActive: true,
      clearBookOnStart: true,
      seriesColor: "",
      showGmpSeries: false,
      showGmpOutcome: false,
      manualActivation: false,
      negRiskOther: false,
      pendingDeployment: false,
      deploying: false,
      rfqEnabled: false,
      holdingRewardsEnabled: false,
      feesEnabled: false,
      requiresTranslation: false
    },
    {
      id: "517313",
      question: "Will Trump deport 500,000-750,000- people?",
      conditionId: "0x2393ed0b0fdc450054c7b9071907eca75cf4fc36e385adf4a0a5f99ee62243e8",
      slug: "will-trump-deport-500000-750000-people",
      endDate: "2025-12-31T12:00:00Z",
      outcomes: "[\"Yes\", \"No\"]",
      outcomePrices: "[\"0.0445\", \"0.9555\"]",
      volume: "446436.285463",
      active: true,
      closed: false,
      new: false,
      featured: false,
      archived: false,
      restricted: true,
      groupItemTitle: "500-750k",
      groupItemThreshold: "2",
      enableOrderBook: true,
      orderPriceMinTickSize: 0.001,
      orderMinSize: 5,
      volumeNum: 446436.285463,
      endDateIso: "2025-12-31",
      startDateIso: "2025-01-05",
      hasReviewedDates: true,
      acceptingOrders: true,
      negRisk: true,
      ready: false,
      funded: false,
      cyom: false,
      pagerDutyNotificationEnabled: false,
      approved: true,
      automaticallyActive: true,
      clearBookOnStart: true,
      seriesColor: "",
      showGmpSeries: false,
      showGmpOutcome: false,
      manualActivation: false,
      negRiskOther: false,
      pendingDeployment: false,
      deploying: false,
      rfqEnabled: false,
      holdingRewardsEnabled: false,
      feesEnabled: false,
      requiresTranslation: false
    }
  ],
  tags: [
    { id: "2", label: "Politics", slug: "politics", requiresTranslation: false },
    { id: "101588", label: "2025 Predictions", slug: "2025-predictions", requiresTranslation: false },
    { id: "101970", label: "World", slug: "world", requiresTranslation: false }
  ],
  cyom: false,
  showAllOutcomes: true,
  showMarketImages: false,
  enableNegRisk: true,
  automaticallyActive: true,
  gmpChartMode: "default",
  negRiskAugmented: false,
  cumulativeMarkets: false,
  pendingDeployment: false,
  deploying: false,
  requiresTranslation: false
};

/**
 * Example usage: Processing and rendering simple market
 */
export async function getSimpleMarketCardProps() {
  const result = await defaultProcessor.processEvent(simpleMarketExample);
  
  if (result.success && result.data) {
    return {
      id: result.data.id,
      title: result.data.title,
      image: result.data.image,
      volume: result.data.volumeFormatted,
      isNew: result.data.isNew,
      outcomes: result.data.outcomes.map(outcome => ({
        name: outcome.name,
        probability: Math.round(outcome.probability * 100),
        color: outcome.color
      }))
    };
  }
  
  throw new Error('Failed to process simple market example');
}

/**
 * Example usage: Processing and rendering complex market
 */
export async function getComplexMarketCardProps() {
  const result = await defaultProcessor.processEvent(complexMarketExample);
  
  if (result.success && result.data) {
    return {
      id: result.data.id,
      title: result.data.title,
      image: result.data.image,
      volume: result.data.volumeFormatted,
      isNew: result.data.isNew,
      outcomes: result.data.outcomes.map(outcome => ({
        name: outcome.name,
        probability: Math.round(outcome.probability * 100),
        color: outcome.color,
        category: outcome.category
      }))
    };
  }
  
  throw new Error('Failed to process complex market example');
}

/**
 * Example usage in a React component:
 * 
 * ```tsx
 * import { MarketCard } from '@/components/market-card';
 * import { getSimpleMarketCardProps, getComplexMarketCardProps } from '@/lib/market-card-integration-example';
 * 
 * export async function ExampleMarketGrid() {
 *   const simpleProps = await getSimpleMarketCardProps();
 *   const complexProps = await getComplexMarketCardProps();
 *   
 *   return (
 *     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 *       <MarketCard {...simpleProps} />
 *       <MarketCard {...complexProps} />
 *     </div>
 *   );
 * }
 * ```
 */