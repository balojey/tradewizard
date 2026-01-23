/**
 * Demonstration of the Polymarket data processing layer
 * This file shows how to use the new data processing utilities
 */

import {
  getPoliticalEvents,
  getEventsByPoliticalTag,
  getTrendingPoliticalEvents,
  getAvailablePoliticalTags,
  searchEvents,
  getEventById,
  getEventBySlug,
  isPoliticalTag,
  getPoliticalTagDisplayName,
} from './polymarket-data';
import {
  parseMarketOutcomes,
  parseMarketPrices,
  determineMarketType,
  formatVolume,
  processEvent,
} from './polymarket-parser';
import {
  POLITICAL_TAGS,
  ProcessingConfig,
  DEFAULT_PROCESSING_CONFIG,
} from './polymarket-types';

/**
 * Example usage of the data processing layer
 */
export async function demonstrateDataProcessing() {
  console.log('=== Polymarket Data Processing Layer Demo ===\n');

  // 1. Fetch political events
  console.log('1. Fetching political events...');
  try {
    const politicalEvents = await getPoliticalEvents({ limit: 5 });
    console.log(`Found ${politicalEvents.length} political events`);
    
    if (politicalEvents.length > 0) {
      const firstEvent = politicalEvents[0];
      console.log(`First event: "${firstEvent.title}"`);
      console.log(`Market type: ${firstEvent.marketType}`);
      console.log(`Volume: ${firstEvent.volumeFormatted}`);
      console.log(`Outcomes: ${firstEvent.outcomes.map(o => `${o.name}: ${(o.probability * 100).toFixed(1)}%`).join(', ')}`);
    }
  } catch (error) {
    console.error('Error fetching political events:', error);
  }

  console.log('\n');

  // 2. Fetch events by specific political tag
  console.log('2. Fetching Trump-related events...');
  try {
    const trumpEvents = await getEventsByPoliticalTag(POLITICAL_TAGS.TRUMP, { limit: 3 });
    console.log(`Found ${trumpEvents.length} Trump-related events`);
    
    trumpEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} (${event.volumeFormatted})`);
    });
  } catch (error) {
    console.error('Error fetching Trump events:', error);
  }

  console.log('\n');

  // 3. Get available political tags
  console.log('3. Getting available political tags...');
  try {
    const tags = await getAvailablePoliticalTags();
    console.log('Available political tags:');
    tags.forEach(tag => {
      console.log(`- ${tag.label} (${tag.slug}): ${tag.count} events`);
    });
  } catch (error) {
    console.error('Error fetching political tags:', error);
  }

  console.log('\n');

  // 4. Demonstrate parsing utilities
  console.log('4. Demonstrating parsing utilities...');
  
  // Parse market outcomes
  const outcomesResult = parseMarketOutcomes('["Yes", "No"]');
  console.log('Parsed outcomes:', outcomesResult.data);
  
  // Parse market prices
  const pricesResult = parseMarketPrices('["0.65", "0.35"]');
  console.log('Parsed prices:', pricesResult.data);
  
  // Format volume
  console.log('Formatted volumes:');
  console.log(`- ${formatVolume(1500000)} (1.5M)`);
  console.log(`- ${formatVolume(25000)} (25K)`);
  console.log(`- ${formatVolume(500)} (500)`);

  console.log('\n');

  // 5. Demonstrate error handling with malformed data
  console.log('5. Demonstrating error handling...');
  
  const config: ProcessingConfig = {
    enableFallbacks: true,
    strictValidation: false,
    logErrors: false, // Disable logging for demo
    defaultProbability: 0.5,
  };
  
  // Try parsing invalid JSON
  const invalidOutcomes = parseMarketOutcomes('invalid json', config);
  console.log('Invalid JSON fallback:', invalidOutcomes.data, '(fallback used:', invalidOutcomes.fallbackUsed, ')');
  
  const invalidPrices = parseMarketPrices('not json', 2, config);
  console.log('Invalid prices fallback:', invalidPrices.data, '(fallback used:', invalidPrices.fallbackUsed, ')');

  console.log('\n');

  // 6. Demonstrate tag utilities
  console.log('6. Tag utilities...');
  console.log(`Is "politics" a political tag? ${isPoliticalTag(POLITICAL_TAGS.POLITICS)}`);
  console.log(`Is "sports" a political tag? ${isPoliticalTag('sports')}`);
  console.log(`Display name for "u-s-politics": ${getPoliticalTagDisplayName(POLITICAL_TAGS.US_POLITICS)}`);
  console.log(`Display name for "unknown-tag": ${getPoliticalTagDisplayName('unknown-tag')}`);

  console.log('\n=== Demo Complete ===');
}

/**
 * Example of processing raw event data
 */
export function demonstrateEventProcessing() {
  console.log('=== Event Processing Demo ===\n');

  // Mock event data similar to what comes from Polymarket API
  const mockEvent = {
    id: '16282',
    ticker: 'trump-deportation-2025',
    slug: 'how-many-people-will-trump-deport-in-2025',
    title: 'How many people will Trump deport in 2025?',
    description: 'This is a market on the prediction of the number of people Trump will deport in 2025.',
    startDate: '2025-01-05T19:47:34.719608Z',
    creationDate: '2025-01-05T19:47:34.719605Z',
    endDate: '2025-12-31T12:00:00Z',
    image: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/trump-deportation.jpg',
    icon: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/trump-deportation.jpg',
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
        id: '517310',
        question: 'Will Trump deport less than 250,000?',
        conditionId: 'test-condition',
        slug: 'will-trump-deport-less-than-250000',
        endDate: '2025-12-31T12:00:00Z',
        outcomes: '["Yes", "No"]',
        outcomePrices: '["0.0245", "0.9755"]',
        volume: '968372.749512',
        active: true,
        closed: false,
        new: false,
        featured: false,
        archived: false,
        restricted: true,
        groupItemTitle: '<250k',
      },
      {
        id: '517311',
        question: 'Will Trump deport 250,000-500,000 people?',
        conditionId: 'test-condition-2',
        slug: 'will-trump-deport-250000-500000-people',
        endDate: '2025-12-31T12:00:00Z',
        outcomes: '["Yes", "No"]',
        outcomePrices: '["0.874", "0.126"]',
        volume: '1052891.072544',
        active: true,
        closed: false,
        new: false,
        featured: false,
        archived: false,
        restricted: true,
        groupItemTitle: '250-500k',
      },
    ],
    tags: [
      {
        id: '2',
        label: 'Politics',
        slug: 'politics',
      },
      {
        id: '101',
        label: 'Trump',
        slug: 'trump',
      },
      {
        id: '102',
        label: 'Immigration',
        slug: 'immigration',
      },
    ],
  } as any;

  // Process the event
  const result = processEvent(mockEvent);
  
  if (result.success && result.data) {
    const processed = result.data;
    
    console.log('Processed Event:');
    console.log(`- ID: ${processed.id}`);
    console.log(`- Title: ${processed.title}`);
    console.log(`- Market Type: ${processed.marketType}`);
    console.log(`- Volume: ${processed.volumeFormatted}`);
    console.log(`- Active: ${processed.active}`);
    console.log(`- New: ${processed.isNew}`);
    console.log(`- Tags: ${processed.tagLabels.join(', ')}`);
    console.log('- Outcomes:');
    
    processed.outcomes.forEach((outcome, index) => {
      const category = outcome.category ? ` (${outcome.category})` : '';
      console.log(`  ${index + 1}. ${outcome.name}${category}: ${(outcome.probability * 100).toFixed(1)}%`);
    });
  } else {
    console.error('Failed to process event:', result.error);
  }

  console.log('\n=== Event Processing Demo Complete ===');
}

// Export for use in other files
export {
  // Main data functions
  getPoliticalEvents,
  getEventsByPoliticalTag,
  getTrendingPoliticalEvents,
  
  // Parsing utilities
  parseMarketOutcomes,
  parseMarketPrices,
  formatVolume,
  
  // Type definitions
  POLITICAL_TAGS,
  DEFAULT_PROCESSING_CONFIG,
};