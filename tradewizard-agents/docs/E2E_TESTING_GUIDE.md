# End-to-End Testing Guide for Automated Market Monitor

This guide provides comprehensive instructions for deploying and testing the Automated Market Monitor in a staging environment over a 48-hour period.

## Overview

The end-to-end test validates all critical functionality of the Automated Market Monitor:

1. **Market Discovery** - Discovers trending political markets from Polymarket
2. **Scheduled Analysis** - Runs analysis workflows on schedule
3. **Data Persistence** - Stores results correctly in Supabase
4. **Quota Management** - Respects API quota limits
5. **Graceful Shutdown** - Handles restarts without data loss
6. **Health Checks** - Reports accurate service status
7. **Manual Triggers** - Processes on-demand analysis requests
8. **Error Recovery** - Handles failures gracefully

## Prerequisites

### 1. Staging Environment Setup

You'll need:
- A Linux server or VM (Ubuntu 20.04+ recommended)
- Node.js 18+ installed
- PostgreSQL access (Supabase staging project)
- At least 2GB RAM and 10GB disk space
- Network access to Polymarket and external APIs

### 2. Supabase Staging Project

Create a dedicated staging Supabase project:

1. Go to https://supabase.com/dashboard
2. Create new project: `tradewizard-staging`
3. Note the project URL and keys
4. Run database migrations (see below)

### 3. API Keys

Gather all required API keys:
- Supabase URL, anon key, and service role key
- OpenAI API key (or Anthropic/Google)
- Opik API key (optional but recommended)
- NewsAPI, Twitter, Reddit keys (optional for full testing)

## Deployment Steps

### Step 1: Clone and Build

```bash
# Clone repository
git clone <repository-url>
cd tradewizard-agents

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 2: Configure Environment

Create `.env` file with staging configuration:

```bash
cp .env.monitor.example .env
```

Edit `.env` with your staging values:

```bash
# Supabase (REQUIRED)
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_KEY=your_staging_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_staging_service_role_key

# Polymarket (REQUIRED)
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com

# LLM Provider (REQUIRED - choose one)
LLM_SINGLE_PROVIDER=openai
OPENAI_API_KEY=sk-your_openai_key
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# Scheduling (for faster testing, use shorter intervals)
ANALYSIS_INTERVAL_HOURS=1  # Run every hour for testing
UPDATE_INTERVAL_HOURS=2    # Update every 2 hours
MAX_MARKETS_PER_CYCLE=2    # Analyze 2 markets per cycle

# API Quotas (conservative for testing)
NEWS_API_DAILY_QUOTA=50
TWITTER_API_DAILY_QUOTA=100
REDDIT_API_DAILY_QUOTA=30

# Service
HEALTH_CHECK_PORT=3000
ENABLE_MANUAL_TRIGGERS=true
NODE_ENV=staging
LOG_LEVEL=info

# Opik (optional but recommended)
OPIK_API_KEY=your_opik_key
OPIK_PROJECT_NAME=tradewizard-staging
OPIK_WORKSPACE=default
```

### Step 3: Run Database Migrations

```bash
# Ensure Supabase CLI is installed
npm install -g supabase

# Link to your staging project
supabase link --project-ref your-staging-project-ref

# Run migrations
supabase db push

# Or manually run migration files in Supabase dashboard
```

Verify tables were created:
- `markets`
- `recommendations`
- `agent_signals`
- `analysis_history`
- `langgraph_checkpoints`

### Step 4: Start the Monitor

```bash
# Start the monitor service
npm run monitor:start

# Verify it started
npm run monitor:status
```

Expected output:
```
✓ Monitor is running
  Process: PM2 (tradewizard-monitor)
  Uptime: 5 seconds
  Status: healthy
  Database: connected
  Scheduler: running
  Last Analysis: none
  Next Run: 2026-01-17T01:00:00.000Z
```

## Testing Checklist

### Test 1: Initial Startup ✓

**Objective**: Verify the monitor starts successfully and initializes all components.

**Steps**:
1. Start the monitor: `npm run monitor:start`
2. Check status: `npm run monitor:status`
3. Check health: `npm run monitor:health`
4. View logs: `pm2 logs tradewizard-monitor` (or check console output)

**Expected Results**:
- ✓ Monitor starts without errors
- ✓ Database connection established
- ✓ Scheduler initialized
- ✓ Health check returns `"status": "healthy"`
- ✓ Next scheduled run is set

**Verification**:
```bash
# Should return status 200 and "healthy"
curl http://localhost:3000/health | jq '.status'
```

### Test 2: Market Discovery ✓

**Objective**: Verify the monitor discovers and ranks political markets.

**Steps**:
1. Wait for first scheduled run (or trigger manually)
2. Monitor logs for discovery messages
3. Check Supabase `markets` table

**Expected Results**:
- ✓ Markets are fetched from Polymarket
- ✓ Markets are filtered for political events
- ✓ Markets are ranked by trending score
- ✓ Top N markets are selected (based on MAX_MARKETS_PER_CYCLE)
- ✓ Markets are stored in database

**Verification**:
```sql
-- Run in Supabase SQL editor
SELECT 
  condition_id,
  question,
  trending_score,
  created_at
FROM markets
ORDER BY created_at DESC
LIMIT 10;
```

### Test 3: Market Analysis ✓

**Objective**: Verify the Market Intelligence Engine analyzes markets correctly.

**Steps**:
1. Wait for analysis to complete
2. Monitor logs for analysis progress
3. Check Supabase tables for results

**Expected Results**:
- ✓ Analysis workflow executes for each market
- ✓ Trade recommendations are generated
- ✓ Agent signals are collected
- ✓ Results are stored in database
- ✓ Analysis history is recorded

**Verification**:
```sql
-- Check recommendations
SELECT 
  r.direction,
  r.confidence,
  r.fair_probability,
  r.market_edge,
  m.question
FROM recommendations r
JOIN markets m ON r.market_id = m.id
ORDER BY r.created_at DESC
LIMIT 5;

-- Check agent signals
SELECT 
  agent_name,
  agent_type,
  fair_probability,
  confidence,
  direction
FROM agent_signals
ORDER BY created_at DESC
LIMIT 10;

-- Check analysis history
SELECT 
  analysis_type,
  status,
  duration_ms,
  cost_usd,
  agents_used
FROM analysis_history
ORDER BY created_at DESC
LIMIT 5;
```

### Test 4: Scheduled Execution ✓

**Objective**: Verify the scheduler triggers analysis at configured intervals.

**Steps**:
1. Note the "Next Run" time from health check
2. Wait for that time to pass
3. Verify analysis runs automatically
4. Check that next run is scheduled

**Expected Results**:
- ✓ Analysis runs at scheduled time (within 5% tolerance)
- ✓ New markets are discovered each cycle
- ✓ Existing markets are updated
- ✓ Next run is rescheduled

**Verification**:
```bash
# Monitor the next run time
watch -n 10 'curl -s http://localhost:3000/health | jq ".nextScheduledRun"'

# Check analysis history for multiple cycles
# Should see entries at regular intervals
```

### Test 5: API Quota Management ✓

**Objective**: Verify quota limits are respected and enforced.

**Steps**:
1. Check initial quota status
2. Run multiple analysis cycles
3. Monitor quota usage
4. Verify market count adjusts when approaching limits

**Expected Results**:
- ✓ Quota usage is tracked per API source
- ✓ Market count reduces when quota is low
- ✓ Analysis continues with reduced scope
- ✓ Quota resets at midnight UTC

**Verification**:
```bash
# Check quota status
curl -s http://localhost:3000/health | jq '.quota'

# Should show usage increasing over time
# Should show recommendedMarkets decreasing as quota is consumed
```

### Test 6: Data Persistence ✓

**Objective**: Verify all data is stored correctly in Supabase.

**Steps**:
1. Run several analysis cycles
2. Query all tables in Supabase
3. Verify data integrity and relationships

**Expected Results**:
- ✓ Markets table has complete market data
- ✓ Recommendations table has trade recommendations
- ✓ Agent signals table has all agent outputs
- ✓ Analysis history tracks all runs
- ✓ Foreign key relationships are maintained
- ✓ Timestamps are accurate

**Verification**:
```sql
-- Verify data completeness
SELECT 
  (SELECT COUNT(*) FROM markets) as market_count,
  (SELECT COUNT(*) FROM recommendations) as recommendation_count,
  (SELECT COUNT(*) FROM agent_signals) as signal_count,
  (SELECT COUNT(*) FROM analysis_history) as history_count;

-- Verify relationships
SELECT 
  m.question,
  r.direction,
  COUNT(a.id) as signal_count
FROM markets m
LEFT JOIN recommendations r ON r.market_id = m.id
LEFT JOIN agent_signals a ON a.market_id = m.id
GROUP BY m.id, m.question, r.direction
ORDER BY m.created_at DESC;
```

### Test 7: Market Updates ✓

**Objective**: Verify existing markets are re-analyzed at update intervals.

**Steps**:
1. Wait for UPDATE_INTERVAL_HOURS to pass
2. Verify markets are re-analyzed
3. Check that recommendations are updated

**Expected Results**:
- ✓ Markets are re-analyzed after update interval
- ✓ New recommendations are created
- ✓ `last_analyzed_at` timestamp is updated
- ✓ Resolved markets are detected and skipped

**Verification**:
```sql
-- Check market update history
SELECT 
  m.condition_id,
  m.question,
  m.last_analyzed_at,
  COUNT(r.id) as recommendation_count
FROM markets m
LEFT JOIN recommendations r ON r.market_id = m.id
GROUP BY m.id
ORDER BY m.last_analyzed_at DESC;
```

### Test 8: Graceful Shutdown ✓

**Objective**: Verify the monitor shuts down gracefully without data loss.

**Steps**:
1. Trigger analysis manually or wait for scheduled run
2. While analysis is running, send SIGTERM: `npm run monitor:stop`
3. Verify analysis completes before shutdown
4. Check database for partial records

**Expected Results**:
- ✓ Current analysis completes before shutdown
- ✓ No partial records in database
- ✓ Scheduler stops cleanly
- ✓ Database connections close properly
- ✓ Process exits with code 0

**Verification**:
```bash
# Stop during analysis
npm run monitor:stop

# Check logs for graceful shutdown messages
pm2 logs tradewizard-monitor --lines 50

# Verify no orphaned processes
ps aux | grep monitor
```

### Test 9: Service Restart ✓

**Objective**: Verify the monitor restarts correctly and resumes operations.

**Steps**:
1. Stop the monitor: `npm run monitor:stop`
2. Wait 30 seconds
3. Start the monitor: `npm run monitor:start`
4. Verify it resumes normal operations

**Expected Results**:
- ✓ Monitor starts successfully
- ✓ Database connection re-established
- ✓ Scheduler resumes with correct next run time
- ✓ No duplicate analysis runs
- ✓ Quota counters persist (or reset if past midnight)

**Verification**:
```bash
# Restart sequence
npm run monitor:stop
sleep 30
npm run monitor:start
npm run monitor:status

# Verify health
curl http://localhost:3000/health | jq '.'
```

### Test 10: Health Check Accuracy ✓

**Objective**: Verify health check endpoint reports accurate status.

**Steps**:
1. Query health check in various states
2. Verify all fields are accurate
3. Test health check during failures

**Expected Results**:
- ✓ Status reflects actual service health
- ✓ Uptime is accurate
- ✓ Database status is current
- ✓ Scheduler status is current
- ✓ Quota information is accurate
- ✓ Timestamps are valid

**Verification**:
```bash
# Get full health status
curl -s http://localhost:3000/health | jq '.'

# Expected structure:
# {
#   "status": "healthy",
#   "timestamp": "2026-01-17T00:00:00.000Z",
#   "uptime": 3600,
#   "lastAnalysis": "2026-01-16T23:00:00.000Z",
#   "nextScheduledRun": "2026-01-17T01:00:00.000Z",
#   "database": {
#     "connected": true,
#     "lastCheck": "2026-01-17T00:00:00.000Z"
#   },
#   "scheduler": {
#     "running": true,
#     "executing": false
#   },
#   "quota": {
#     "newsapi": { "used": 10, "limit": 50 },
#     "twitter": { "used": 30, "limit": 100 },
#     "reddit": { "used": 15, "limit": 30 },
#     "recommendedMarkets": 2
#   }
# }
```

### Test 11: Manual Triggers ✓

**Objective**: Verify manual analysis triggers work correctly.

**Steps**:
1. Find a valid condition ID from Polymarket
2. Trigger manual analysis: `npm run monitor:trigger <conditionId>`
3. Verify analysis runs immediately
4. Check results in database

**Expected Results**:
- ✓ Manual trigger is accepted
- ✓ Analysis runs immediately (not scheduled)
- ✓ Results are returned to caller
- ✓ Results are stored in database
- ✓ Quota is updated

**Verification**:
```bash
# Get a condition ID from recent markets
CONDITION_ID=$(curl -s http://localhost:3000/health | jq -r '.lastAnalysis')

# Trigger manual analysis
npm run monitor:trigger $CONDITION_ID

# Should return trade recommendation
```

### Test 12: Error Recovery ✓

**Objective**: Verify the monitor recovers from various error conditions.

**Test Scenarios**:

#### 12a. Database Connection Loss
1. Temporarily block Supabase connection (firewall rule)
2. Verify monitor continues running
3. Restore connection
4. Verify monitor reconnects and resumes

#### 12b. API Failures
1. Simulate Polymarket API failure (invalid endpoint)
2. Verify monitor retries with backoff
3. Verify other markets continue processing

#### 12c. Analysis Failures
1. Trigger analysis for invalid market
2. Verify error is logged
3. Verify other markets continue processing
4. Verify service remains healthy

**Expected Results**:
- ✓ Errors are logged with full context
- ✓ Retry logic activates for transient failures
- ✓ Service continues running despite errors
- ✓ Failed markets don't block other markets
- ✓ Health status reflects degraded state when appropriate

### Test 13: 48-Hour Continuous Operation ✓

**Objective**: Verify the monitor runs reliably for extended periods.

**Steps**:
1. Start the monitor
2. Let it run for 48 hours
3. Monitor periodically (every 6 hours)
4. Collect metrics and logs

**Expected Results**:
- ✓ No crashes or unexpected restarts
- ✓ Memory usage remains stable (no leaks)
- ✓ CPU usage is reasonable
- ✓ All scheduled runs execute
- ✓ Database grows steadily
- ✓ Quota resets occur at midnight UTC

**Monitoring Commands**:
```bash
# Check status every 6 hours
watch -n 21600 'npm run monitor:status'

# Monitor resource usage
watch -n 300 'pm2 show tradewizard-monitor'

# Track database growth
# Run in Supabase SQL editor every 6 hours
SELECT 
  (SELECT COUNT(*) FROM markets) as markets,
  (SELECT COUNT(*) FROM recommendations) as recommendations,
  (SELECT COUNT(*) FROM analysis_history) as analyses,
  NOW() as checked_at;
```

## Metrics to Collect

During the 48-hour test, collect these metrics:

### Service Metrics
- Total uptime
- Number of restarts (should be 0 for unplanned)
- Number of crashes (should be 0)
- Average memory usage
- Peak memory usage
- Average CPU usage

### Analysis Metrics
- Total analysis cycles completed
- Total markets discovered
- Total markets analyzed
- Average analysis duration
- Analysis success rate
- Total cost (from Opik)

### Database Metrics
- Total markets stored
- Total recommendations generated
- Total agent signals recorded
- Database size growth
- Query performance

### Quota Metrics
- API calls per source
- Quota resets executed
- Times quota limit was reached
- Market count adjustments

### Error Metrics
- Total errors logged
- Error types and frequencies
- Recovery success rate
- Failed analyses

## Success Criteria

The 48-hour test is considered successful if:

1. ✓ **Uptime**: Monitor runs continuously for 48 hours with no unplanned restarts
2. ✓ **Discovery**: Markets are discovered in every scheduled cycle
3. ✓ **Analysis**: At least 80% of markets are analyzed successfully
4. ✓ **Persistence**: All successful analyses are stored in database
5. ✓ **Quotas**: API quotas are respected (no overages)
6. ✓ **Shutdown**: Graceful shutdown completes without data loss
7. ✓ **Health**: Health checks return accurate status throughout
8. ✓ **Triggers**: Manual triggers work when tested
9. ✓ **Recovery**: Service recovers from simulated failures
10. ✓ **Performance**: Memory usage remains stable (no leaks)

## Issue Documentation

If any issues are found during testing, document them using this template:

```markdown
### Issue #N: [Brief Description]

**Severity**: Critical / High / Medium / Low

**Test**: [Which test revealed the issue]

**Description**: [Detailed description of the issue]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**: [What should happen]

**Actual Behavior**: [What actually happened]

**Logs**: [Relevant log excerpts]

**Database State**: [Relevant database queries/results]

**Environment**:
- Node version: X.X.X
- OS: Ubuntu 20.04
- Memory: XGB
- Supabase region: us-east-1

**Proposed Fix**: [If known]

**Workaround**: [If available]
```

## Cleanup

After testing is complete:

```bash
# Stop the monitor
npm run monitor:stop

# Optional: Clean up staging data
# Run in Supabase SQL editor
TRUNCATE TABLE agent_signals CASCADE;
TRUNCATE TABLE recommendations CASCADE;
TRUNCATE TABLE analysis_history CASCADE;
TRUNCATE TABLE markets CASCADE;
TRUNCATE TABLE langgraph_checkpoints CASCADE;

# Optional: Delete staging Supabase project
# (via Supabase dashboard)
```

## Next Steps

After successful 48-hour testing:

1. Document any issues found and their resolutions
2. Update deployment documentation with lessons learned
3. Create production deployment plan (Task 26)
4. Set up production monitoring and alerts
5. Prepare rollback procedures
6. Schedule production deployment

## Troubleshooting

### Monitor Won't Start

**Symptoms**: `npm run monitor:start` fails

**Checks**:
1. Verify build is up to date: `npm run build`
2. Check environment variables: `cat .env`
3. Test database connection: `npm run test:db`
4. Check port availability: `lsof -i :3000`

### Analysis Fails

**Symptoms**: Markets discovered but analysis fails

**Checks**:
1. Check LLM API keys are valid
2. Verify Polymarket API is accessible
3. Check Opik configuration (if enabled)
4. Review error logs for specific failures

### Database Connection Issues

**Symptoms**: "Database connection failed" errors

**Checks**:
1. Verify Supabase URL and keys
2. Check network connectivity to Supabase
3. Verify database migrations ran successfully
4. Check Supabase project status (not paused)

### Memory Leaks

**Symptoms**: Memory usage grows continuously

**Checks**:
1. Monitor with: `pm2 monit`
2. Check for unclosed connections
3. Verify cleanup in analysis cycles
4. Review LangGraph checkpoint cleanup

## Support

For issues during testing:
1. Check logs: `pm2 logs tradewizard-monitor`
2. Review this guide's troubleshooting section
3. Check GitHub issues
4. Contact development team

## Appendix: Useful Queries

### Market Analysis Summary
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_analyses,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  AVG(duration_ms) as avg_duration_ms,
  SUM(cost_usd) as total_cost_usd
FROM analysis_history
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Agent Performance
```sql
SELECT 
  agent_name,
  agent_type,
  COUNT(*) as signal_count,
  AVG(confidence) as avg_confidence,
  AVG(fair_probability) as avg_probability
FROM agent_signals
GROUP BY agent_name, agent_type
ORDER BY signal_count DESC;
```

### Market Recommendation Distribution
```sql
SELECT 
  direction,
  confidence,
  COUNT(*) as count
FROM recommendations
GROUP BY direction, confidence
ORDER BY count DESC;
```

### Recent Activity
```sql
SELECT 
  m.question,
  r.direction,
  r.confidence,
  ah.status,
  ah.duration_ms,
  ah.created_at
FROM analysis_history ah
JOIN markets m ON ah.market_id = m.id
LEFT JOIN recommendations r ON r.market_id = m.id
ORDER BY ah.created_at DESC
LIMIT 20;
```
