# Performance Testing Guide

This guide covers performance testing and optimization for the Automated Market Monitor.

## Overview

The monitor is designed to run continuously for extended periods (24+ hours) while maintaining stable resource usage. Performance testing validates:

- Memory usage remains stable (no memory leaks)
- CPU usage is efficient during analysis and idle periods
- Database queries are optimized
- Caching reduces redundant operations
- System scales with different market counts

## Running Performance Tests

### Quick Performance Test Suite

Run the automated performance test suite:

```bash
npm run test:performance
```

This runs a comprehensive suite of performance tests including:
- Memory leak detection
- CPU usage monitoring
- Database query performance
- Scalability tests (1, 3, 10 markets)
- Resource cleanup validation

### 24-Hour Continuous Operation Test

Run the monitor for 24 hours with performance monitoring:

```bash
npm run test:24h
```

Or specify a custom duration (in hours):

```bash
npm run test:24h 12  # Run for 12 hours
npm run test:24h 48  # Run for 48 hours
```

This test:
- Runs the monitor continuously for the specified duration
- Captures performance snapshots every minute
- Tracks all operations and their timings
- Generates a detailed performance report at the end
- Saves the report to `./performance-reports/`

### Manual Performance Monitoring

You can also integrate performance monitoring into your own scripts:

```typescript
import { createPerformanceMonitor } from './utils/performance-monitor.js';

const perfMonitor = createPerformanceMonitor('./my-report.json');
perfMonitor.start(60000); // Snapshot every 60 seconds

// ... run your operations ...

perfMonitor.recordOperation('analyzeMarket', duration, success);

// Stop and generate report
const report = perfMonitor.stop();
```

## Performance Metrics

### Memory Usage

**Target**: Memory growth < 50% over 24 hours

The monitor tracks:
- Heap used
- Heap total
- External memory
- RSS (Resident Set Size)

**Optimization strategies**:
- Explicit cleanup after analysis
- Garbage collection hints
- Limited cache sizes
- Stream processing for large datasets

### CPU Usage

**Target**: 
- Idle: < 1% CPU
- During analysis: < 50% CPU average

The monitor tracks:
- User CPU time
- System CPU time
- CPU usage during idle periods
- CPU spikes during analysis

**Optimization strategies**:
- Asynchronous operations
- Sequential processing (not parallel) to limit concurrency
- Efficient algorithms
- Minimal polling

### Database Query Performance

**Target**:
- Average query time: < 500ms
- Max query time: < 2s

The monitor tracks:
- Query execution time
- Row counts
- Slow query detection
- Query patterns

**Optimization strategies**:
- Proper indexing
- Query result caching
- Pagination for large result sets
- Connection pooling

### Caching Effectiveness

**Target**: Cache hit rate > 60%

The monitor tracks:
- Cache hits
- Cache misses
- Hit rate percentage
- Cache size

**Optimization strategies**:
- Multi-level caching (L1/L2)
- Appropriate TTL values
- Cache eviction policies
- Cache warming

## Database Query Optimization

### Analyzing Query Performance

Use the query optimizer to track and analyze database queries:

```typescript
import { createQueryOptimizer } from './database/query-optimizer.js';

const optimizer = createQueryOptimizer(1000); // 1000ms slow query threshold

// Track a query
await optimizer.trackQuery(
  'getMarketsForUpdate',
  () => database.getMarketsForUpdate(updateInterval),
  (result) => result.length
);

// Generate report
optimizer.logReport();
```

### Index Recommendations

The query optimizer can analyze slow queries and recommend indexes:

```typescript
import { analyzeIndexNeeds, generateIndexSQL } from './database/query-optimizer.js';

const report = optimizer.getReport();
const recommendations = analyzeIndexNeeds(report.slowQueries);
const sqlStatements = generateIndexSQL(recommendations);

console.log('Recommended indexes:');
sqlStatements.forEach(sql => console.log(sql));
```

### Existing Indexes

The database schema includes these indexes:

```sql
-- Markets table
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_last_analyzed ON markets(last_analyzed_at);
CREATE INDEX idx_markets_trending_score ON markets(trending_score DESC);

-- Recommendations table
CREATE INDEX idx_recommendations_market_id ON recommendations(market_id);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);

-- Agent signals table
CREATE INDEX idx_agent_signals_market_id ON agent_signals(market_id);
CREATE INDEX idx_agent_signals_recommendation_id ON agent_signals(recommendation_id);

-- Analysis history table
CREATE INDEX idx_analysis_history_market_id ON analysis_history(market_id);
CREATE INDEX idx_analysis_history_created_at ON analysis_history(created_at DESC);

-- LangGraph checkpoints table
CREATE INDEX idx_langgraph_checkpoints_thread_id ON langgraph_checkpoints(thread_id);
```

## Caching Strategy

### Cache Manager

The monitor uses a multi-level caching strategy:

```typescript
import { createMultiLevelCache } from './utils/cache-manager.js';

const cache = createMultiLevelCache(
  100,   // L1 max size
  60000, // L1 TTL (1 minute)
  1000,  // L2 max size
  900000 // L2 TTL (15 minutes)
);

// Get or set with factory
const data = await cache.getOrSet('key', async () => {
  return await fetchExpensiveData();
});

// Check statistics
cache.logStats();
```

### Cache Levels

**L1 Cache** (Fast, Small):
- Size: 100 entries
- TTL: 1 minute
- Use for: Frequently accessed data

**L2 Cache** (Slower, Larger):
- Size: 1000 entries
- TTL: 15 minutes
- Use for: Less frequently accessed data

### What to Cache

- Market data from Polymarket API
- External data API responses (news, sentiment)
- Database query results
- Computed metrics and scores

### Cache Invalidation

Caches are automatically invalidated based on TTL. Manual invalidation:

```typescript
cache.clear(); // Clear all caches
cache.delete('specific-key'); // Delete specific entry
cache.evictExpired(); // Remove expired entries
```

## Scalability Testing

### Testing with Different Market Counts

The performance test suite includes scalability tests:

```typescript
// Test with 1 market
await monitor.analyzeMarket('market-1');

// Test with 3 markets (default)
await Promise.all([
  monitor.analyzeMarket('market-1'),
  monitor.analyzeMarket('market-2'),
  monitor.analyzeMarket('market-3'),
]);

// Test with 10 markets (stress test)
const promises = Array.from({ length: 10 }, (_, i) =>
  monitor.analyzeMarket(`market-${i}`)
);
await Promise.all(promises);
```

### Expected Performance

| Market Count | Expected Duration | Memory Growth | CPU Usage |
|--------------|-------------------|---------------|-----------|
| 1            | < 60s             | < 10%         | < 30%     |
| 3            | < 180s            | < 30%         | < 50%     |
| 10           | < 600s            | < 50%         | < 70%     |

## Monitoring in Production

### Health Check Endpoint

The monitor exposes a health check endpoint with performance metrics:

```bash
curl http://localhost:3000/health
```

Response includes:
- Service status
- Uptime
- Last analysis timestamp
- Database connection status
- Quota usage
- Memory usage (if enabled)

### Opik Integration

All analysis workflows are traced in Opik for performance monitoring:

- View traces in Opik dashboard
- Track costs per analysis cycle
- Monitor agent performance
- Identify bottlenecks

### Log Analysis

The monitor logs performance metrics:

```
[MonitorService] Cycle metrics:
  Duration: 45.2s
  Markets Analyzed: 3
  Success Rate: 100%
  Total Cost: $0.15
  Avg Analysis Time: 15.1s
```

## Troubleshooting

### High Memory Usage

**Symptoms**: Memory grows continuously over time

**Solutions**:
1. Check for memory leaks in custom code
2. Reduce cache sizes
3. Enable garbage collection hints
4. Limit concurrent operations

### Slow Database Queries

**Symptoms**: Queries take > 2 seconds

**Solutions**:
1. Run query optimizer analysis
2. Add recommended indexes
3. Enable query result caching
4. Use pagination for large result sets

### High CPU Usage

**Symptoms**: CPU usage > 80% during idle

**Solutions**:
1. Check for infinite loops
2. Reduce polling frequency
3. Optimize analysis algorithms
4. Use asynchronous operations

### Cache Misses

**Symptoms**: Cache hit rate < 40%

**Solutions**:
1. Increase cache sizes
2. Adjust TTL values
3. Implement cache warming
4. Review cache key strategy

## Performance Benchmarks

### Baseline Performance (1 Market)

- Analysis time: 30-60 seconds
- Memory usage: 150-200 MB
- CPU usage: 20-40%
- Database queries: 5-10
- API calls: 10-15

### Scaled Performance (3 Markets)

- Analysis time: 90-180 seconds
- Memory usage: 200-300 MB
- CPU usage: 40-60%
- Database queries: 15-30
- API calls: 30-45

### 24-Hour Operation

- Memory growth: < 50%
- Average CPU: < 5%
- Total analyses: 24-72 (depending on interval)
- Success rate: > 95%
- Database queries: 500-1500

## Best Practices

1. **Run performance tests regularly**: Before each release
2. **Monitor production metrics**: Use Opik and health checks
3. **Optimize database queries**: Use query optimizer
4. **Implement caching**: Reduce redundant operations
5. **Test at scale**: Validate with 10+ markets
6. **Profile memory usage**: Check for leaks
7. **Review logs**: Identify slow operations
8. **Set up alerts**: Monitor for degradation

## Resources

- [Performance Test Suite](../src/monitor.performance.test.ts)
- [Performance Monitor](../src/utils/performance-monitor.ts)
- [Query Optimizer](../src/database/query-optimizer.ts)
- [Cache Manager](../src/utils/cache-manager.ts)
- [24-Hour Test Script](../scripts/run-24h-test.ts)
