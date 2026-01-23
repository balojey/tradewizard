# Polymarket Data Processing Layer

This directory contains a comprehensive data processing layer for Polymarket API integration, designed specifically for the TradeWizard homepage redesign. The layer provides robust error handling, fallback mechanisms, and TypeScript type safety for processing political market data.

## Overview

The data processing layer transforms raw Polymarket API responses into UI-friendly data structures while handling malformed data gracefully. It supports both simple Yes/No markets and complex multi-option markets with comprehensive error recovery.

## Key Features

- **Comprehensive TypeScript Interfaces**: Full type coverage for Polymarket events.json structure
- **Robust Error Handling**: Graceful degradation with fallback mechanisms
- **Political Market Focus**: Specialized filtering and processing for political content
- **Market Type Detection**: Automatic classification of simple vs complex markets
- **Data Validation**: Input validation with detailed error reporting
- **Performance Monitoring**: Built-in API health monitoring and circuit breaker patterns
- **Backward Compatibility**: Maintains compatibility with existing polymarket.ts interfaces

## File Structure

```
src/lib/
├── polymarket-types.ts      # TypeScript interfaces and type definitions
├── polymarket-parser.ts     # Core data parsing and processing utilities
├── polymarket-data.ts       # Enhanced API integration with error handling
├── polymarket-errors.ts     # Error handling and fallback mechanisms
├── polymarket-demo.ts       # Usage examples and demonstrations
├── polymarket.ts           # Legacy API client (maintained for compatibility)
├── index.ts                # Main export file
└── README.md               # This documentation
```

## Core Components

### 1. Type Definitions (`polymarket-types.ts`)

Comprehensive TypeScript interfaces based on the actual Polymarket API structure:

- `PolymarketEvent`: Complete event structure with all API fields
- `PolymarketMarket`: Individual market data with outcomes and prices
- `ProcessedEvent`: UI-friendly processed event data
- `ProcessedOutcome`: Standardized outcome format with probabilities
- `ProcessingConfig`: Configuration for data processing behavior

### 2. Data Parser (`polymarket-parser.ts`)

Core parsing utilities with fallback mechanisms:

- `parseMarketOutcomes()`: Parse JSON outcome arrays with validation
- `parseMarketPrices()`: Parse and convert price strings to numbers
- `determineMarketType()`: Classify markets as simple or complex
- `processEvent()`: Transform raw events into UI-friendly format
- `formatVolume()`: Human-readable volume formatting
- `validateEventData()`: Input validation with detailed error reporting

### 3. Enhanced API Client (`polymarket-data.ts`)

Enhanced API integration with political market focus:

- `getPoliticalEvents()`: Fetch events filtered by politics tag
- `getEventsByPoliticalTag()`: Filter by specific political tags
- `getTrendingPoliticalEvents()`: Get popular political markets
- `getAvailablePoliticalTags()`: Discover available political categories
- `searchEvents()`: Client-side text search functionality

### 4. Error Handling (`polymarket-errors.ts`)

Comprehensive error management system:

- `PolymarketErrorHandler`: Centralized error logging and tracking
- `CircuitBreaker`: Prevent cascading failures with circuit breaker pattern
- `retryWithBackoff()`: Exponential backoff retry mechanism
- `APIHealthMonitor`: Track API performance and reliability
- `createFallbackEvent()`: Generate fallback data for complete API failures

## Usage Examples

### Basic Political Events Fetching

```typescript
import { getPoliticalEvents, POLITICAL_TAGS } from './lib';

// Fetch political events with default settings
const events = await getPoliticalEvents({ limit: 10 });

// Fetch Trump-related events
const trumpEvents = await getEventsByPoliticalTag(POLITICAL_TAGS.TRUMP);

// Get trending political markets
const trending = await getTrendingPoliticalEvents(20);
```

### Data Processing with Error Handling

```typescript
import { processEvent, DEFAULT_PROCESSING_CONFIG } from './lib';

// Process raw event data with fallbacks enabled
const config = {
  ...DEFAULT_PROCESSING_CONFIG,
  enableFallbacks: true,
  logErrors: true,
};

const result = processEvent(rawEventData, config);

if (result.success && result.data) {
  // Use processed event data
  console.log(`Market: ${result.data.title}`);
  console.log(`Type: ${result.data.marketType}`);
  console.log(`Volume: ${result.data.volumeFormatted}`);
} else {
  // Handle processing error
  console.error('Processing failed:', result.error);
}
```

### Manual Data Parsing

```typescript
import { parseMarketOutcomes, parseMarketPrices, formatVolume } from './lib';

// Parse market outcomes with fallback
const outcomes = parseMarketOutcomes('["Yes", "No"]');
console.log(outcomes.data); // ['Yes', 'No']

// Parse prices with validation
const prices = parseMarketPrices('["0.65", "0.35"]');
console.log(prices.data); // [0.65, 0.35]

// Format volume for display
console.log(formatVolume(1500000)); // '$1.5M'
console.log(formatVolume(25000));   // '$25.0K'
```

### Error Monitoring

```typescript
import { globalErrorHandler, apiHealthMonitor } from './lib';

// Get error statistics
const stats = globalErrorHandler.getErrorStats();
console.log(`Total errors: ${stats.total}`);
console.log(`Recoverable: ${stats.recoverable}`);

// Get API health metrics
const health = apiHealthMonitor.getHealthMetrics();
console.log(`Average response time: ${health.averageResponseTime}ms`);
console.log(`Error rate: ${(health.errorRate * 100).toFixed(1)}%`);
```

## Configuration

### Processing Configuration

The `ProcessingConfig` interface allows customization of data processing behavior:

```typescript
const config: ProcessingConfig = {
  enableFallbacks: true,      // Use fallback data for parsing errors
  strictValidation: false,    // Allow partial data processing
  logErrors: true,           // Log errors to console
  defaultProbability: 0.5,   // Default probability for fallback outcomes
};
```

### Political Tags

Pre-defined political tag constants for consistent filtering:

```typescript
import { POLITICAL_TAGS, RELATED_POLITICAL_TAGS } from './lib';

// Primary political tags
POLITICAL_TAGS.POLITICS      // 'politics'
POLITICAL_TAGS.TRUMP         // 'trump'
POLITICAL_TAGS.ELECTIONS     // 'elections'
POLITICAL_TAGS.US_POLITICS   // 'u-s-politics'
POLITICAL_TAGS.IMMIGRATION   // 'immigration'
POLITICAL_TAGS.WORLD         // 'world'

// Related tags for tag bar display
RELATED_POLITICAL_TAGS       // Array of related political tag slugs
```

## Market Types

The system automatically detects and handles two market types:

### Simple Markets
- Binary Yes/No outcomes
- Single market per event
- Example: "Will X happen by date Y?"

### Complex Markets
- Multiple option categories with Yes/No outcomes
- Multiple markets per event with `groupItemTitle`
- Example: "How many people will be deported?" with ranges like "250-500k", "500-750k"

## Error Handling Strategy

The data processing layer implements a comprehensive error handling strategy:

1. **Input Validation**: Validate data structure before processing
2. **Graceful Parsing**: Use fallbacks for malformed JSON data
3. **Fallback Generation**: Create default data when processing fails
4. **Error Logging**: Track errors with context for debugging
5. **Circuit Breaking**: Prevent cascading failures with circuit breaker pattern
6. **Retry Logic**: Exponential backoff for transient network errors

## Performance Considerations

- **Caching**: Leverage Next.js ISR with 60-second revalidation
- **Circuit Breaker**: Prevent API overload during failures
- **Health Monitoring**: Track API performance metrics
- **Efficient Parsing**: Minimize JSON parsing overhead
- **Memory Management**: Limit error history to prevent memory leaks

## Backward Compatibility

The new data processing layer maintains full backward compatibility with the existing `polymarket.ts` interfaces:

- All existing `Event`, `Market`, and `Outcome` interfaces are preserved
- `getEvents()` and `getTrendingEvents()` functions remain unchanged
- New functionality is additive and doesn't break existing code

## Testing

While comprehensive unit tests are included in the codebase, they require a test framework setup. The `polymarket-demo.ts` file provides practical examples and can be used for manual testing and validation.

## Requirements Fulfilled

This data processing layer fulfills the following requirements from the specification:

- **5.1**: Parse events.json structure with events containing markets arrays ✅
- **5.2**: Extract outcomes from JSON.parse(market.outcomes) ✅
- **5.3**: Extract probabilities from JSON.parse(market.outcomePrices) ✅
- **5.4**: Handle both negRisk and standard market types ✅
- **5.6**: Provide fallback display with default Yes/No options for malformed data ✅

## Future Enhancements

Potential improvements for future iterations:

- WebSocket integration for real-time data updates
- Advanced caching strategies with Redis or similar
- GraphQL integration for more efficient data fetching
- Enhanced analytics and performance monitoring
- Automated testing with property-based testing framework