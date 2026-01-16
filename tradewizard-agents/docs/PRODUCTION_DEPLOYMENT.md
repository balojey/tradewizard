# Production Deployment Guide

This guide covers production deployment preparation for the TradeWizard Automated Market Monitor.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Production Supabase Setup](#production-supabase-setup)
- [Environment Configuration](#environment-configuration)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Log Aggregation](#log-aggregation)
- [Deployment Checklist](#deployment-checklist)
- [Post-Deployment Verification](#post-deployment-verification)

## Prerequisites

Before deploying to production, ensure you have:

- [ ] Production Supabase project created
- [ ] LLM API keys with sufficient credits
- [ ] Opik account for observability (recommended)
- [ ] Server/infrastructure provisioned
- [ ] Domain name configured (if applicable)
- [ ] SSL certificates obtained (if applicable)
- [ ] Backup strategy defined
- [ ] Monitoring tools selected

## Production Supabase Setup

### 1. Create Production Project

1. **Sign up at [supabase.com](https://supabase.com)**

2. **Create production project**:
   - Project name: `tradewizard-monitor-prod`
   - Database password: Use strong password (save in password manager)
   - Region: Select closest to your deployment
   - Plan: Pro tier recommended for production

3. **Configure project settings**:
   - Navigate to Settings → General
   - Enable "Pause project after 1 week of inactivity": **OFF**
   - Enable "Auto-pause": **OFF** (for production)

### 2. Database Configuration

#### Run Migrations

```bash
cd tradewizard-agents/supabase

# Link to production project
supabase link --project-ref your-prod-project-ref

# Push migrations
supabase db push
```

#### Verify Schema

```bash
# Connect to production database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# List tables
\dt

# Verify indexes
\di

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph_checkpoints ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to markets" ON markets
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to recommendations" ON recommendations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to agent_signals" ON agent_signals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to analysis_history" ON analysis_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to langgraph_checkpoints" ON langgraph_checkpoints
  FOR ALL USING (auth.role() = 'service_role');

-- Public read-only access (for frontend)
CREATE POLICY "Public read markets" ON markets
  FOR SELECT USING (true);

CREATE POLICY "Public read recommendations" ON recommendations
  FOR SELECT USING (true);
```

### 4. Configure Backups

#### Automatic Backups

Supabase Pro includes:
- Daily backups (30-day retention)
- Point-in-time recovery (7 days)

Verify in: Settings → Database → Backups

#### Manual Backup Script

```bash
#!/bin/bash
# backup-production.sh

BACKUP_DIR="/backups/tradewizard-prod"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_REF="your-prod-project-ref"
DB_PASSWORD="your-db-password"

mkdir -p $BACKUP_DIR

# Backup database
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h db.$PROJECT_REF.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f $BACKUP_DIR/backup_$DATE.dump

# Compress
gzip $BACKUP_DIR/backup_$DATE.dump

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.dump.gz \
  s3://tradewizard-backups/production/

# Delete local backups older than 7 days
find $BACKUP_DIR -name "*.dump.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.dump.gz"
```

Schedule with cron:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/scripts/backup-production.sh
```

### 5. Performance Optimization

```sql
-- Create additional indexes for production workload
CREATE INDEX CONCURRENTLY idx_markets_active_trending 
  ON markets(status, trending_score DESC) 
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_recommendations_latest 
  ON recommendations(market_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_analysis_history_recent 
  ON analysis_history(created_at DESC, status);

-- Analyze tables
ANALYZE markets;
ANALYZE recommendations;
ANALYZE agent_signals;
ANALYZE analysis_history;
ANALYZE langgraph_checkpoints;
```

## Environment Configuration

### Production Environment Variables

Create `.env.production`:

```bash
# ============================================================================
# Production Configuration
# ============================================================================

NODE_ENV=production
LOG_LEVEL=info

# ============================================================================
# Supabase (Production)
# ============================================================================
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key

# ============================================================================
# LLM Configuration
# ============================================================================
# Use single provider for cost control
LLM_SINGLE_PROVIDER=openai
OPENAI_API_KEY=sk-prod-your_key_here
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# Or multi-provider for quality
# OPENAI_API_KEY=sk-prod-...
# OPENAI_DEFAULT_MODEL=gpt-4-turbo
# ANTHROPIC_API_KEY=sk-ant-prod-...
# ANTHROPIC_DEFAULT_MODEL=claude-3-sonnet-20240229

# ============================================================================
# Polymarket
# ============================================================================
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com
POLYMARKET_RATE_LIMIT_BUFFER=80

# ============================================================================
# Scheduling
# ============================================================================
ANALYSIS_INTERVAL_HOURS=24
UPDATE_INTERVAL_HOURS=24
MAX_MARKETS_PER_CYCLE=3

# ============================================================================
# API Quotas
# ============================================================================
NEWS_API_DAILY_QUOTA=100
TWITTER_API_DAILY_QUOTA=500
REDDIT_API_DAILY_QUOTA=60

# ============================================================================
# Service
# ============================================================================
HEALTH_CHECK_PORT=3000
ENABLE_MANUAL_TRIGGERS=true

# ============================================================================
# Opik (Production)
# ============================================================================
OPIK_API_KEY=your_prod_opik_key
OPIK_PROJECT_NAME=tradewizard-monitor-prod
OPIK_WORKSPACE=production
OPIK_TRACK_COSTS=true
OPIK_TAGS=production,v1.0,automated-monitor

# ============================================================================
# LangGraph
# ============================================================================
LANGGRAPH_CHECKPOINTER=postgres
LANGGRAPH_RECURSION_LIMIT=25
LANGGRAPH_STREAM_MODE=values

# ============================================================================
# Agent Configuration
# ============================================================================
AGENT_TIMEOUT_MS=10000
MIN_AGENTS_REQUIRED=2

# ============================================================================
# Consensus Configuration
# ============================================================================
MIN_EDGE_THRESHOLD=0.05
HIGH_DISAGREEMENT_THRESHOLD=0.15

# ============================================================================
# Logging
# ============================================================================
AUDIT_TRAIL_RETENTION_DAYS=90
```

### Secure Environment Variables

```bash
# Set restrictive permissions
chmod 600 .env.production
chown tradewizard:tradewizard .env.production

# Verify no secrets in version control
git status
# .env.production should be in .gitignore

# Verify no secrets in logs
grep -r "OPENAI_API_KEY" /var/log/ || echo "No secrets found"
```

### Environment Variable Validation

Create validation script:

```bash
#!/bin/bash
# validate-env.sh

required_vars=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "OPENAI_API_KEY"
  "POLYMARKET_GAMMA_API_URL"
)

missing_vars=()

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "ERROR: Missing required environment variables:"
  printf '  - %s\n' "${missing_vars[@]}"
  exit 1
fi

echo "✓ All required environment variables are set"
exit 0
```

## Monitoring and Alerts

See [MONITORING_ALERTS.md](./MONITORING_ALERTS.md) for detailed monitoring and alerting configuration.

Quick setup:

### 1. Health Check Monitoring

```bash
# UptimeRobot configuration
URL: https://your-domain.com/health
Interval: 5 minutes
Alert: Email + SMS when down
```

### 2. Opik Alerts

Configure in Opik dashboard:
- Daily cost exceeds $20
- Analysis cost exceeds $2
- Error rate exceeds 10%
- Weekly cost summary

### 3. Supabase Alerts

Configure in Supabase dashboard:
- Database CPU > 80%
- Database memory > 80%
- Connection pool exhausted
- Slow queries detected

### 4. Custom Alerts

```bash
# Install alerting script
sudo cp scripts/alert-monitor.sh /opt/scripts/
sudo chmod +x /opt/scripts/alert-monitor.sh

# Configure cron
crontab -e

# Check every 5 minutes
*/5 * * * * /opt/scripts/alert-monitor.sh
```

## Log Aggregation

See [LOG_AGGREGATION.md](./LOG_AGGREGATION.md) for detailed log aggregation setup.

Quick setup options:

### Option 1: Loki + Grafana (Recommended)

```bash
# Deploy Loki and Grafana
docker-compose -f docker-compose.logging.yml up -d

# Access Grafana at http://localhost:3001
# Default credentials: admin/admin
```

### Option 2: CloudWatch (AWS)

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

### Option 3: ELK Stack

```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.0.0-amd64.deb
sudo dpkg -i filebeat-8.0.0-amd64.deb

# Configure Filebeat
sudo nano /etc/filebeat/filebeat.yml

# Start Filebeat
sudo systemctl start filebeat
sudo systemctl enable filebeat
```

## Deployment Checklist

### Pre-Deployment

- [ ] Production Supabase project created and configured
- [ ] Database schema migrated and verified
- [ ] Row Level Security enabled
- [ ] Backups configured and tested
- [ ] Production environment variables configured
- [ ] Environment variable validation passed
- [ ] SSL certificates obtained (if applicable)
- [ ] Firewall rules configured
- [ ] Monitoring tools configured
- [ ] Alerting configured
- [ ] Log aggregation configured
- [ ] Runbook reviewed by team
- [ ] Incident response plan reviewed
- [ ] Rollback procedure tested

### Deployment

- [ ] Application built: `npm run build`
- [ ] Dependencies installed: `npm ci --only=production`
- [ ] Service deployed (Docker/systemd/PM2)
- [ ] Service started successfully
- [ ] Health check returns 200 OK
- [ ] Database connection verified
- [ ] First analysis cycle completed
- [ ] Logs are being written
- [ ] Metrics are being collected
- [ ] Alerts are active

### Post-Deployment

- [ ] Monitor service for 24 hours
- [ ] Verify scheduled analysis runs
- [ ] Verify data is stored in Supabase
- [ ] Verify quota limits are respected
- [ ] Verify graceful shutdown works
- [ ] Verify service restarts automatically
- [ ] Review logs for errors
- [ ] Review Opik traces
- [ ] Review cost metrics
- [ ] Document any issues found
- [ ] Update runbook if needed

## Post-Deployment Verification

### 1. Service Health

```bash
# Check service status
curl https://your-domain.com/health

# Expected response:
# {
#   "status": "healthy",
#   "uptime": 3600,
#   "database": true,
#   "scheduler": true,
#   "lastAnalysis": "2024-01-15T10:00:00Z",
#   "nextScheduledRun": "2024-01-16T10:00:00Z"
# }
```

### 2. Database Connectivity

```bash
# Query markets table
curl -H "apikey: $SUPABASE_KEY" \
     -H "Authorization: Bearer $SUPABASE_KEY" \
     "https://your-prod-project.supabase.co/rest/v1/markets?select=*&limit=5"
```

### 3. Analysis Workflow

```bash
# Trigger manual analysis
curl -X POST https://your-domain.com/trigger \
  -H "Content-Type: application/json" \
  -d '{"conditionId": "test-market-id"}'

# Check logs
sudo journalctl -u tradewizard-monitor -n 100
```

### 4. Monitoring

```bash
# Check Opik traces
# Visit: https://www.comet.com/opik

# Check Grafana dashboards
# Visit: http://your-grafana-url:3001

# Check alerts
# Verify test alert is received
```

### 5. Performance

```bash
# Monitor resource usage
docker stats tradewizard-monitor
# or
pm2 monit
# or
systemctl status tradewizard-monitor

# Check database performance
# Visit Supabase dashboard → Database → Performance
```

## Next Steps

After successful deployment:

1. **Monitor for 48 hours**: Watch for any issues or unexpected behavior
2. **Review costs**: Check LLM API usage and Opik cost tracking
3. **Optimize if needed**: Adjust market count or analysis interval
4. **Document learnings**: Update runbook with any new findings
5. **Schedule review**: Plan weekly review of service health and costs

## Additional Resources

- [Runbook](./RUNBOOK.md) - Common operations and troubleshooting
- [Incident Response Plan](./INCIDENT_RESPONSE.md) - Handling production incidents
- [Rollback Procedure](./ROLLBACK_PROCEDURE.md) - Rolling back deployments
- [Monitoring and Alerts](./MONITORING_ALERTS.md) - Detailed monitoring setup
- [Log Aggregation](./LOG_AGGREGATION.md) - Detailed logging setup
- [Deployment Guide](../DEPLOYMENT.md) - General deployment instructions

## Support

For production issues:
1. Check [Runbook](./RUNBOOK.md) for common issues
2. Follow [Incident Response Plan](./INCIDENT_RESPONSE.md)
3. Contact on-call engineer
4. Escalate to team lead if needed
