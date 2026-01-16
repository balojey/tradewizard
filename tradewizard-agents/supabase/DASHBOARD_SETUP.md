# TradeWizard Monitoring Dashboard Setup Guide

This guide explains how to set up monitoring dashboards in Supabase for the Automated Market Monitor.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installing the Monitoring Queries](#installing-the-monitoring-queries)
4. [Dashboard Views](#dashboard-views)
5. [Creating Dashboards in Supabase](#creating-dashboards-in-supabase)
6. [Query Examples](#query-examples)
7. [Troubleshooting](#troubleshooting)

## Overview

The monitoring dashboard provides real-time insights into:

- **Market Analysis Statistics** - Track analysis volume, success rates, and performance
- **Agent Performance** - Monitor individual agent behavior and signal quality
- **Cost Tracking** - Track API costs and project monthly expenses
- **Quota Usage Trends** - Monitor system capacity and usage patterns

## Prerequisites

1. Supabase project set up and running
2. Database schema migrated (see `migrations/20260115162602_initial_schema.sql`)
3. Supabase CLI installed (optional, for command-line setup)
4. Access to Supabase SQL Editor or database connection

## Installing the Monitoring Queries

### Option 1: Using Supabase CLI (Recommended)

The monitoring views and functions are included as a database migration and will be automatically applied when you push migrations:

```bash
# Navigate to your project directory
cd tradewizard-agents

# Push all migrations (including monitoring views)
npx supabase db push
```

The migration file is located at: `supabase/migrations/20260116214205_monitoring_views.sql`

### Option 2: Using Supabase SQL Editor

If you need to manually install or update the monitoring queries:

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `monitoring-queries.sql` (reference file)
5. Paste into the SQL Editor
6. Click **Run** to execute all queries
7. Verify that views and functions are created successfully

### Option 3: Using psql

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Execute the monitoring migration
\i supabase/migrations/20260116214205_monitoring_views.sql
```

## Dashboard Views

The monitoring queries create 20 views and 2 helper functions:

### Market Analysis Statistics (Views 1-5)

| View Name | Description | Key Metrics |
|-----------|-------------|-------------|
| `v_market_analysis_summary` | Overall analysis summary | Total markets, success rate, avg duration |
| `v_daily_analysis_stats` | Daily analysis trends | Daily volume, success rate, costs |
| `v_analysis_stats_by_type` | Breakdown by analysis type | Initial vs update vs manual |
| `v_most_analyzed_markets` | Most frequently analyzed markets | Analysis count, costs per market |
| `v_recent_analyses` | Recent analysis activity | Last 100 analyses with details |

### Agent Performance (Views 6-10)

| View Name | Description | Key Metrics |
|-----------|-------------|-------------|
| `v_agent_performance_summary` | Overall agent performance | Signals generated, avg confidence |
| `v_daily_agent_performance` | Daily agent activity | Signals per day per agent |
| `v_agent_confidence_distribution` | Confidence level distribution | High/medium/low confidence breakdown |
| `v_agent_direction_agreement` | Agent consensus analysis | Agreement levels on direction |
| `v_agent_usage_frequency` | Agent usage in analyses | Most frequently used agents |

### Cost Tracking (Views 11-15)

| View Name | Description | Key Metrics |
|-----------|-------------|-------------|
| `v_cost_summary` | Overall cost statistics | Total cost, avg per analysis |
| `v_daily_cost_tracking` | Daily cost trends | Daily costs and averages |
| `v_cost_by_analysis_type` | Cost breakdown by type | Cost per analysis type |
| `v_cost_by_market` | Most expensive markets | Cost per market |
| `v_monthly_cost_projection` | Monthly cost projection | Projected monthly spend |

### Quota Usage Trends (Views 16-20)

| View Name | Description | Key Metrics |
|-----------|-------------|-------------|
| `v_analysis_volume_trends` | Analysis volume over time | Daily analysis counts |
| `v_hourly_analysis_distribution` | Hourly usage patterns | Peak usage hours |
| `v_weekly_analysis_trends` | Weekly patterns | Weekly volume and costs |
| `v_market_update_frequency` | Market update intervals | Update frequency per market |
| `v_analysis_capacity_utilization` | Capacity usage | % of daily quota used |

### Helper Functions

| Function Name | Description | Parameters |
|---------------|-------------|------------|
| `get_analysis_stats_for_period` | Get stats for date range | start_date, end_date |
| `get_agent_performance_for_period` | Get agent stats for date range | start_date, end_date |

## Creating Dashboards in Supabase

### Method 1: Using Supabase Dashboard (Built-in Charts)

Supabase doesn't have a built-in dashboard builder, but you can create custom queries and visualize them:

1. **Navigate to SQL Editor**
2. **Create a new query** for each metric you want to track
3. **Save the query** with a descriptive name
4. **Export results** to CSV for external visualization tools

### Method 2: Using External Tools (Recommended)

For rich dashboards, connect external tools to your Supabase database:

#### Option A: Metabase (Open Source)

1. Install Metabase: `docker run -p 3000:3000 metabase/metabase`
2. Connect to Supabase PostgreSQL:
   - Host: `db.[YOUR-PROJECT-REF].supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: Your Supabase password
3. Create dashboards using the views

#### Option B: Grafana

1. Install Grafana
2. Add PostgreSQL data source (Supabase connection)
3. Import dashboard templates or create custom panels
4. Use the monitoring views as data sources

#### Option C: Superset

1. Install Apache Superset
2. Connect to Supabase PostgreSQL
3. Create charts and dashboards from the views

### Method 3: Custom Web Dashboard

Build a custom dashboard using the Supabase JavaScript client:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Fetch market analysis summary
const { data: summary } = await supabase
  .from('v_market_analysis_summary')
  .select('*')
  .single();

// Fetch daily stats for last 30 days
const { data: dailyStats } = await supabase
  .from('v_daily_analysis_stats')
  .select('*')
  .gte('analysis_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  .order('analysis_date', { ascending: false });

// Fetch agent performance
const { data: agentPerf } = await supabase
  .from('v_agent_performance_summary')
  .select('*')
  .order('total_signals', { ascending: false });
```

## Query Examples

### Example 1: Get Overall System Health

```sql
-- Quick health check
SELECT
  total_markets,
  active_markets,
  total_analyses,
  success_rate_pct,
  avg_duration_ms / 1000 as avg_duration_seconds,
  last_analysis_time
FROM v_market_analysis_summary;
```

### Example 2: Daily Performance Report

```sql
-- Get last 7 days of performance
SELECT
  analysis_date,
  markets_analyzed,
  successful_analyses,
  failed_analyses,
  success_rate_pct,
  total_cost_usd
FROM v_daily_analysis_stats
WHERE analysis_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY analysis_date DESC;
```

### Example 3: Agent Performance Comparison

```sql
-- Compare agent performance
SELECT
  agent_name,
  total_signals,
  avg_confidence,
  markets_analyzed,
  ROUND(100.0 * long_yes_signals / NULLIF(total_signals, 0), 2) as pct_long_yes,
  ROUND(100.0 * long_no_signals / NULLIF(total_signals, 0), 2) as pct_long_no,
  ROUND(100.0 * no_trade_signals / NULLIF(total_signals, 0), 2) as pct_no_trade
FROM v_agent_performance_summary
ORDER BY total_signals DESC;
```

### Example 4: Cost Analysis

```sql
-- Monthly cost breakdown
SELECT
  DATE_TRUNC('month', cost_date) as month,
  SUM(analyses_count) as total_analyses,
  SUM(total_cost_usd) as monthly_cost,
  ROUND(AVG(avg_cost_per_analysis), 4) as avg_cost_per_analysis
FROM v_daily_cost_tracking
GROUP BY DATE_TRUNC('month', cost_date)
ORDER BY month DESC;
```

### Example 5: Capacity Planning

```sql
-- Check capacity utilization trends
SELECT
  analysis_date,
  analyses_performed,
  configured_max_per_day,
  capacity_utilization_pct,
  utilization_status
FROM v_analysis_capacity_utilization
WHERE analysis_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY analysis_date DESC;
```

### Example 6: Agent Agreement Analysis

```sql
-- Find markets with low agent agreement
SELECT
  question,
  total_agents,
  long_yes_count,
  long_no_count,
  no_trade_count,
  agreement_level
FROM v_agent_direction_agreement
WHERE agreement_level = 'No Agreement'
ORDER BY last_signal_time DESC
LIMIT 10;
```

### Example 7: Using Helper Functions

```sql
-- Get stats for last 24 hours
SELECT * FROM get_analysis_stats_for_period(
  NOW() - INTERVAL '24 hours',
  NOW()
);

-- Get agent performance for last week
SELECT * FROM get_agent_performance_for_period(
  NOW() - INTERVAL '7 days',
  NOW()
);
```

## Dashboard Layout Recommendations

### Executive Dashboard

**Key Metrics (Top Row)**
- Total Markets Analyzed (from `v_market_analysis_summary`)
- Success Rate % (from `v_market_analysis_summary`)
- Total Cost This Month (from `v_monthly_cost_projection`)
- Capacity Utilization % (from `v_analysis_capacity_utilization`)

**Charts (Middle Section)**
- Daily Analysis Volume (line chart from `v_daily_analysis_stats`)
- Daily Cost Trend (line chart from `v_daily_cost_tracking`)
- Success Rate Trend (line chart from `v_daily_analysis_stats`)

**Tables (Bottom Section)**
- Recent Analyses (from `v_recent_analyses`)
- Most Analyzed Markets (from `v_most_analyzed_markets`)

### Agent Performance Dashboard

**Key Metrics**
- Total Agents Active
- Average Confidence Score
- Total Signals Generated

**Charts**
- Agent Signal Volume (bar chart from `v_agent_performance_summary`)
- Agent Confidence Distribution (stacked bar from `v_agent_confidence_distribution`)
- Daily Agent Activity (line chart from `v_daily_agent_performance`)

**Tables**
- Agent Performance Summary (from `v_agent_performance_summary`)
- Agent Direction Agreement (from `v_agent_direction_agreement`)

### Cost Management Dashboard

**Key Metrics**
- Total Cost (from `v_cost_summary`)
- Average Cost per Analysis
- Projected Monthly Cost

**Charts**
- Daily Cost Trend (line chart from `v_daily_cost_tracking`)
- Cost by Analysis Type (pie chart from `v_cost_by_analysis_type`)
- Cost by Market (bar chart from `v_cost_by_market`)

**Tables**
- Daily Cost Breakdown (from `v_daily_cost_tracking`)
- Most Expensive Markets (from `v_cost_by_market`)

### Operations Dashboard

**Key Metrics**
- Analyses Today
- Success Rate Today
- Current Capacity Utilization

**Charts**
- Hourly Analysis Distribution (bar chart from `v_hourly_analysis_distribution`)
- Weekly Trends (line chart from `v_weekly_analysis_trends`)
- Capacity Utilization (gauge from `v_analysis_capacity_utilization`)

**Tables**
- Recent Failures (filtered `v_recent_analyses`)
- Market Update Frequency (from `v_market_update_frequency`)

## Monitoring Alerts

Set up alerts based on these queries:

### Alert 1: High Failure Rate

```sql
-- Alert if success rate drops below 80% in last 24 hours
SELECT
  success_rate_pct
FROM v_daily_analysis_stats
WHERE analysis_date = CURRENT_DATE
  AND success_rate_pct < 80;
```

### Alert 2: Cost Overrun

```sql
-- Alert if daily cost exceeds threshold
SELECT
  total_cost_usd
FROM v_daily_cost_tracking
WHERE cost_date = CURRENT_DATE
  AND total_cost_usd > 5.00; -- Adjust threshold
```

### Alert 3: Capacity Exceeded

```sql
-- Alert if at capacity
SELECT
  utilization_status
FROM v_analysis_capacity_utilization
WHERE analysis_date = CURRENT_DATE
  AND utilization_status = 'At Capacity';
```

### Alert 4: No Recent Analysis

```sql
-- Alert if no analysis in last 25 hours (should run every 24h)
SELECT
  last_analysis_time
FROM v_market_analysis_summary
WHERE last_analysis_time < NOW() - INTERVAL '25 hours';
```

## Performance Optimization

### Indexing

The monitoring queries use indexes created in the initial schema migration. If you experience slow query performance:

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- Add additional indexes if needed
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at_status
  ON analysis_history(created_at, status);
```

### Materialized Views

For very large datasets, consider converting views to materialized views:

```sql
-- Example: Materialize daily stats
CREATE MATERIALIZED VIEW mv_daily_analysis_stats AS
SELECT * FROM v_daily_analysis_stats;

-- Refresh periodically (e.g., hourly)
REFRESH MATERIALIZED VIEW mv_daily_analysis_stats;

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void AS $
BEGIN
  REFRESH MATERIALIZED VIEW mv_daily_analysis_stats;
END;
$ LANGUAGE plpgsql;
```

### Query Optimization

For better performance on large datasets:

```sql
-- Use date ranges to limit data
SELECT * FROM v_daily_analysis_stats
WHERE analysis_date >= CURRENT_DATE - INTERVAL '90 days';

-- Use LIMIT for large result sets
SELECT * FROM v_recent_analyses LIMIT 50;

-- Use aggregation for summaries
SELECT
  DATE_TRUNC('week', analysis_date) as week,
  SUM(total_analyses) as weekly_analyses
FROM v_daily_analysis_stats
GROUP BY week
ORDER BY week DESC;
```

## Troubleshooting

### Issue: Views not created

**Solution**: Check for syntax errors in the SQL file. Run queries one at a time to identify the problematic query.

### Issue: Permission denied

**Solution**: Ensure you're using the service role key or have proper permissions:

```sql
-- Grant permissions to views
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
```

### Issue: Slow query performance

**Solution**: 
1. Check if indexes exist: `\di` in psql
2. Analyze query plans: `EXPLAIN ANALYZE SELECT * FROM v_daily_analysis_stats;`
3. Consider materialized views for frequently accessed data

### Issue: Empty results

**Solution**: Verify data exists in base tables:

```sql
SELECT COUNT(*) FROM markets;
SELECT COUNT(*) FROM analysis_history;
SELECT COUNT(*) FROM agent_signals;
```

### Issue: Incorrect calculations

**Solution**: Check for NULL values and division by zero:

```sql
-- Use NULLIF to prevent division by zero
SELECT
  ROUND(100.0 * success_count / NULLIF(total_count, 0), 2) as success_rate
FROM ...;
```

## Maintenance

### Regular Tasks

1. **Monitor view performance** - Check query execution times monthly
2. **Update materialized views** - Refresh hourly or daily as needed
3. **Archive old data** - Consider partitioning or archiving data older than 1 year
4. **Review indexes** - Analyze index usage and remove unused indexes

### Backup

Ensure your monitoring queries are version controlled:

```bash
# Backup current views
pg_dump -h db.[YOUR-PROJECT-REF].supabase.co \
  -U postgres \
  -d postgres \
  --schema-only \
  --table='v_*' \
  > monitoring-views-backup.sql
```

## Additional Resources

- [Supabase SQL Editor Documentation](https://supabase.com/docs/guides/database/sql-editor)
- [PostgreSQL Views Documentation](https://www.postgresql.org/docs/current/sql-createview.html)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Consult the TradeWizard documentation
4. Open an issue in the project repository
