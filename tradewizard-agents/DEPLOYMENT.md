# TradeWizard Automated Market Monitor - Deployment Guide

This guide covers all deployment options for the TradeWizard Automated Market Monitor service.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Deployment Options](#deployment-options)
  - [Docker Deployment](#docker-deployment)
  - [Docker Compose](#docker-compose)
  - [Systemd Service (Linux)](#systemd-service-linux)
  - [PM2 (Node.js Process Manager)](#pm2-nodejs-process-manager)
  - [Manual Deployment](#manual-deployment)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the monitor, ensure you have:

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **LLM API Keys**: At least one of:
   - OpenAI API key
   - Anthropic API key
   - Google AI API key
3. **Opik Account** (optional but recommended): For observability at [comet.com/opik](https://www.comet.com/opik)
4. **Node.js 18+**: For non-Docker deployments

## Supabase Setup and Configuration

### Overview

The Automated Market Monitor uses Supabase PostgreSQL for:
- Persistent storage of market data and recommendations
- LangGraph workflow checkpointing
- Analysis history and audit trails
- Agent signal storage

### 1. Create Supabase Project

#### Option A: Supabase Cloud (Recommended)

1. **Sign up at [supabase.com](https://supabase.com)**

2. **Create a new project**:
   - Click "New Project"
   - Choose organization
   - Enter project name: `tradewizard-monitor`
   - Set database password (save this securely!)
   - Select region (choose closest to your deployment)
   - Click "Create new project"

3. **Wait for provisioning** (1-2 minutes)

4. **Get connection details**:
   - Navigate to Settings → API
   - Copy `Project URL` (SUPABASE_URL)
   - Copy `anon public` key (SUPABASE_KEY)
   - Copy `service_role` key (SUPABASE_SERVICE_ROLE_KEY)

#### Option B: Self-Hosted Supabase

```bash
# Clone Supabase
git clone --depth 1 https://github.com/supabase/supabase

# Navigate to docker directory
cd supabase/docker

# Copy example env file
cp .env.example .env

# Generate secure secrets
sed -i "s/your-super-secret-jwt-token-with-at-least-32-characters-long/$(openssl rand -base64 32)/g" .env
sed -i "s/your-super-secret-and-long-postgres-password/$(openssl rand -base64 32)/g" .env

# Start Supabase
docker-compose up -d

# Access at http://localhost:8000
```

### 2. Set Up Database Schema

#### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI**:

```bash
# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

2. **Link to your project**:

```bash
cd tradewizard-agents
supabase link --project-ref your-project-ref
```

3. **Run migrations**:

```bash
cd supabase
supabase db push
```

This will create all required tables:
- `markets` - Market data and metadata
- `recommendations` - Trade recommendations
- `agent_signals` - Individual agent signals
- `analysis_history` - Analysis execution history
- `langgraph_checkpoints` - LangGraph workflow state

#### Option B: Manual SQL Execution

1. **Access SQL Editor**:
   - Go to Supabase Dashboard
   - Navigate to SQL Editor
   - Click "New Query"

2. **Run migration SQL**:

Copy and paste the contents of `supabase/migrations/20260115162602_initial_schema.sql`:

```sql
-- Markets table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id TEXT UNIQUE NOT NULL,
  question TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  market_probability DECIMAL(5,4),
  volume_24h DECIMAL(20,2),
  liquidity DECIMAL(20,2),
  status TEXT NOT NULL DEFAULT 'active',
  resolved_outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  trending_score DECIMAL(10,4)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_last_analyzed ON markets(last_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_markets_trending_score ON markets(trending_score DESC);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  fair_probability DECIMAL(5,4),
  market_edge DECIMAL(5,4),
  expected_value DECIMAL(10,4),
  confidence TEXT NOT NULL,
  entry_zone_min DECIMAL(5,4),
  entry_zone_max DECIMAL(5,4),
  target_zone_min DECIMAL(5,4),
  target_zone_max DECIMAL(5,4),
  explanation TEXT,
  catalysts JSONB,
  risks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_market_id ON recommendations(market_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);

-- Agent signals table
CREATE TABLE IF NOT EXISTS agent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  fair_probability DECIMAL(5,4),
  confidence DECIMAL(3,2),
  direction TEXT NOT NULL,
  key_drivers JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_signals_market_id ON agent_signals(market_id);
CREATE INDEX IF NOT EXISTS idx_agent_signals_recommendation_id ON agent_signals(recommendation_id);

-- Analysis history table
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  cost_usd DECIMAL(10,4),
  agents_used JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_history_market_id ON analysis_history(market_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON analysis_history(created_at DESC);

-- LangGraph checkpoints table
CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  checkpoint JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_langgraph_checkpoints_thread_id ON langgraph_checkpoints(thread_id);
```

3. **Click "Run"** to execute the migration

### 3. Verify Database Setup

```bash
# Test connection
curl -H "apikey: YOUR_SUPABASE_KEY" \
     -H "Authorization: Bearer YOUR_SUPABASE_KEY" \
     "https://your-project.supabase.co/rest/v1/markets?select=*&limit=1"

# Should return: []
```

### 4. Configure Row Level Security (Optional but Recommended)

```sql
-- Enable RLS on all tables
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph_checkpoints ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (full access)
CREATE POLICY "Service role has full access to markets" ON markets
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to recommendations" ON recommendations
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to agent_signals" ON agent_signals
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to analysis_history" ON analysis_history
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to langgraph_checkpoints" ON langgraph_checkpoints
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create policy for anon key (read-only access to markets and recommendations)
CREATE POLICY "Public read access to markets" ON markets
  FOR SELECT
  USING (true);

CREATE POLICY "Public read access to recommendations" ON recommendations
  FOR SELECT
  USING (true);
```

### 5. Set Up Realtime (Optional)

If you want real-time updates for the frontend:

```sql
-- Enable realtime for markets table
ALTER PUBLICATION supabase_realtime ADD TABLE markets;
ALTER PUBLICATION supabase_realtime ADD TABLE recommendations;
```

### 6. Configure Backups

#### Supabase Cloud

Backups are automatic:
- **Free tier**: Daily backups (7-day retention)
- **Pro tier**: Daily backups (30-day retention) + Point-in-time recovery (7 days)

#### Self-Hosted

Set up automated backups:

```bash
#!/bin/bash
# backup-supabase.sh

BACKUP_DIR="/backups/supabase"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker exec supabase-db pg_dump -U postgres postgres > \
  $BACKUP_DIR/supabase_$DATE.sql

# Compress
gzip $BACKUP_DIR/supabase_$DATE.sql

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: supabase_$DATE.sql.gz"
```

Schedule with cron:

```bash
# Daily backup at 2 AM
0 2 * * * /opt/scripts/backup-supabase.sh
```

### 7. Monitor Database Performance

#### Supabase Dashboard

- Navigate to Database → Performance
- Monitor query performance
- Check slow queries
- Review index usage

#### SQL Queries

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Check slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Troubleshooting Supabase Connection

#### Connection Refused

```bash
# Check if Supabase is accessible
curl -I https://your-project.supabase.co

# Check DNS resolution
nslookup your-project.supabase.co

# Check firewall rules
sudo iptables -L -n | grep 443
```

#### Authentication Errors

```bash
# Verify API keys
echo $SUPABASE_KEY | wc -c  # Should be ~200+ characters
echo $SUPABASE_SERVICE_ROLE_KEY | wc -c  # Should be ~200+ characters

# Test with curl
curl -H "apikey: $SUPABASE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "https://your-project.supabase.co/rest/v1/"
```

#### Migration Errors

```bash
# Check migration status
supabase migration list

# Repair migrations
supabase migration repair

# Reset database (CAUTION: deletes all data)
supabase db reset
```

## Configuration

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.monitor.example .env
```

Edit `.env` and configure the following required variables:

```bash
# Supabase (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LLM Provider (REQUIRED - choose one)
LLM_SINGLE_PROVIDER=openai
OPENAI_API_KEY=sk-your_key_here
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# Polymarket (REQUIRED)
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com

# Scheduling (OPTIONAL - defaults shown)
ANALYSIS_INTERVAL_HOURS=24
MAX_MARKETS_PER_CYCLE=3
```

### 3. Build the Application

```bash
npm install
npm run build
```

## Deployment Options

### Docker Deployment

**Best for**: Production deployments, cloud platforms, containerized environments

#### Build the Docker Image

```bash
npm run docker:build
# or
docker build -t tradewizard-monitor .
```

#### Run the Container

```bash
docker run -d \
  --name tradewizard-monitor \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  tradewizard-monitor
```

#### Check Container Status

```bash
docker ps
docker logs tradewizard-monitor
docker logs -f tradewizard-monitor  # Follow logs
```

#### Stop the Container

```bash
docker stop tradewizard-monitor
docker rm tradewizard-monitor
```

### Docker Compose

**Best for**: Local development, testing, multi-container setups

#### Start the Service

```bash
npm run docker:run
# or
docker-compose up -d
```

#### View Logs

```bash
npm run docker:logs
# or
docker-compose logs -f market-monitor
```

#### Stop the Service

```bash
npm run docker:stop
# or
docker-compose down
```

#### Configuration

Edit `docker-compose.yml` to customize:
- Port mappings
- Volume mounts
- Resource limits
- Network configuration

### Systemd Service (Linux)

**Best for**: Linux servers, VPS, dedicated hosting

#### 1. Create Service User

```bash
sudo useradd -r -s /bin/false tradewizard
```

#### 2. Install Application

```bash
sudo mkdir -p /opt/tradewizard-agents
sudo cp -r . /opt/tradewizard-agents/
sudo chown -R tradewizard:tradewizard /opt/tradewizard-agents
```

#### 3. Install Systemd Service

```bash
sudo cp tradewizard-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload
```

#### 4. Configure Environment

```bash
sudo cp .env /opt/tradewizard-agents/.env
sudo chown tradewizard:tradewizard /opt/tradewizard-agents/.env
sudo chmod 600 /opt/tradewizard-agents/.env
```

#### 5. Start the Service

```bash
sudo systemctl start tradewizard-monitor
sudo systemctl enable tradewizard-monitor  # Start on boot
```

#### 6. Manage the Service

```bash
# Check status
sudo systemctl status tradewizard-monitor

# View logs
sudo journalctl -u tradewizard-monitor -f

# Restart
sudo systemctl restart tradewizard-monitor

# Stop
sudo systemctl stop tradewizard-monitor
```

### PM2 (Node.js Process Manager)

**Best for**: Node.js environments, shared hosting, development servers

#### 1. Install PM2

```bash
npm install -g pm2
```

#### 2. Start the Monitor

```bash
pm2 start ecosystem.config.cjs
```

#### 3. Manage the Process

```bash
# View status
pm2 status
pm2 list

# View logs
pm2 logs tradewizard-monitor
pm2 logs tradewizard-monitor --lines 100

# Monitor resources
pm2 monit

# Restart
pm2 restart tradewizard-monitor

# Stop
pm2 stop tradewizard-monitor

# Delete
pm2 delete tradewizard-monitor
```

#### 4. Enable Startup Script

```bash
pm2 startup
pm2 save
```

#### 5. Update Application

```bash
git pull
npm install
npm run build
pm2 reload tradewizard-monitor
```

### Manual Deployment

**Best for**: Development, testing, debugging

#### CLI Commands

The monitor includes a comprehensive CLI for management. See [CLI-MONITOR.md](CLI-MONITOR.md) for full documentation.

Quick reference:
```bash
# Start the monitor
npm run monitor:start

# Check status
npm run monitor:status

# Get health check
npm run monitor:health

# Stop the monitor
npm run monitor:stop

# Trigger manual analysis
npm run monitor:trigger <conditionId>
```

#### Start the Monitor

```bash
npm run monitor:start
# or
node dist/monitor.js
```

#### Development Mode (with auto-reload)

```bash
npm run monitor:dev
```

## Monitoring and Health Checks

### Health Check Endpoint

The monitor exposes a health check endpoint at `http://localhost:3000/health`.

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "lastAnalysis": "2024-01-15T09:00:00.000Z",
  "nextScheduledRun": "2024-01-16T09:00:00.000Z",
  "database": true,
  "quotaStatus": {
    "newsapi": { "used": 10, "limit": 100 },
    "twitter": { "used": 30, "limit": 500 },
    "reddit": { "used": 6, "limit": 60 }
  }
}
```

### Monitoring with Opik

If Opik is configured, view traces and costs at:
- Cloud: https://www.comet.com/opik
- Self-hosted: Your Opik instance URL

### Log Files

Logs are written to:
- **Docker**: `docker logs tradewizard-monitor`
- **Systemd**: `journalctl -u tradewizard-monitor`
- **PM2**: `pm2 logs tradewizard-monitor` or `./logs/pm2-*.log`
- **Manual**: stdout/stderr

## Troubleshooting

### Service Won't Start

1. **Check environment variables**:
   ```bash
   # Verify .env file exists and has correct values
   cat .env | grep -v "^#" | grep -v "^$"
   ```

2. **Check database connection**:
   ```bash
   # Test Supabase connection
   curl -H "apikey: YOUR_SUPABASE_KEY" \
        "https://your-project.supabase.co/rest/v1/"
   ```

3. **Check logs for errors**:
   ```bash
   # Docker
   docker logs tradewizard-monitor --tail 50
   
   # Systemd
   sudo journalctl -u tradewizard-monitor -n 50
   
   # PM2
   pm2 logs tradewizard-monitor --lines 50
   ```

### Database Connection Errors

1. **Verify Supabase credentials**:
   - Check `SUPABASE_URL` is correct
   - Check `SUPABASE_SERVICE_ROLE_KEY` has proper permissions

2. **Check network connectivity**:
   ```bash
   curl -I https://your-project.supabase.co
   ```

3. **Verify database schema**:
   ```bash
   # Run migrations
   cd supabase
   supabase db push
   ```

### API Quota Exceeded

1. **Check current usage**:
   ```bash
   curl http://localhost:3000/health | jq '.quotaStatus'
   ```

2. **Reduce market count**:
   ```bash
   # Edit .env
   MAX_MARKETS_PER_CYCLE=1
   
   # Restart service
   ```

3. **Increase quotas** (if you have paid API plans):
   ```bash
   # Edit .env
   NEWS_API_DAILY_QUOTA=500
   TWITTER_API_DAILY_QUOTA=2000
   ```

### High Memory Usage

1. **Check current usage**:
   ```bash
   # Docker
   docker stats tradewizard-monitor
   
   # PM2
   pm2 monit
   
   # Systemd
   systemctl status tradewizard-monitor
   ```

2. **Reduce concurrent operations**:
   ```bash
   # Edit .env
   MAX_MARKETS_PER_CYCLE=1
   ```

3. **Restart service** to clear memory:
   ```bash
   # Docker
   docker restart tradewizard-monitor
   
   # Systemd
   sudo systemctl restart tradewizard-monitor
   
   # PM2
   pm2 restart tradewizard-monitor
   ```

### Service Crashes Repeatedly

1. **Check for unhandled errors**:
   ```bash
   # View full logs
   docker logs tradewizard-monitor --tail 200
   ```

2. **Verify LLM API keys are valid**:
   ```bash
   # Test OpenAI
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

3. **Check disk space**:
   ```bash
   df -h
   ```

4. **Increase restart delay** (systemd):
   ```bash
   # Edit /etc/systemd/system/tradewizard-monitor.service
   RestartSec=30
   
   sudo systemctl daemon-reload
   sudo systemctl restart tradewizard-monitor
   ```

### Manual Trigger Not Working

1. **Verify manual triggers are enabled**:
   ```bash
   # Check .env
   grep ENABLE_MANUAL_TRIGGERS .env
   ```

2. **Test the endpoint**:
   ```bash
   curl -X POST http://localhost:3000/trigger \
     -H "Content-Type: application/json" \
     -d '{"conditionId": "your-market-id"}'
   ```

## Production Checklist

Before deploying to production:

- [ ] Supabase database schema is created
- [ ] All required environment variables are set
- [ ] LLM API keys are valid and have sufficient credits
- [ ] API quotas are configured appropriately
- [ ] Health check endpoint is accessible
- [ ] Logs are being written and rotated
- [ ] Service restarts automatically on failure
- [ ] Monitoring/alerting is configured (Opik, etc.)
- [ ] Backup strategy is in place for database
- [ ] Security: non-root user, firewall rules, etc.

## Deployment Scenarios

### Scenario 1: Development/Testing

**Use Case**: Local development and testing

**Configuration**:
```bash
# .env
NODE_ENV=development
LOG_LEVEL=debug
ANALYSIS_INTERVAL_HOURS=1
MAX_MARKETS_PER_CYCLE=1
LLM_SINGLE_PROVIDER=openai
OPENAI_DEFAULT_MODEL=gpt-4o-mini
LANGGRAPH_CHECKPOINTER=memory
```

**Deployment Method**: Manual or Docker Compose

**Pros**:
- Fast iteration
- Low cost (minimal API usage)
- Easy debugging

**Cons**:
- No persistence
- Not production-ready

### Scenario 2: Small Production (Single Server)

**Use Case**: Personal use, small-scale monitoring (1-3 markets)

**Configuration**:
```bash
# .env
NODE_ENV=production
LOG_LEVEL=info
ANALYSIS_INTERVAL_HOURS=24
MAX_MARKETS_PER_CYCLE=3
LLM_SINGLE_PROVIDER=openai
OPENAI_DEFAULT_MODEL=gpt-4o-mini
LANGGRAPH_CHECKPOINTER=postgres
SUPABASE_URL=https://your-project.supabase.co
```

**Deployment Method**: Systemd or PM2

**Infrastructure**:
- VPS (2GB RAM, 1 vCPU)
- Supabase free tier
- OpenAI API (pay-as-you-go)

**Estimated Cost**: $10-30/month

### Scenario 3: Medium Production (Cloud)

**Use Case**: Team use, moderate-scale monitoring (5-10 markets)

**Configuration**:
```bash
# .env
NODE_ENV=production
LOG_LEVEL=info
ANALYSIS_INTERVAL_HOURS=12
MAX_MARKETS_PER_CYCLE=5
# Multi-provider for better quality
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...
LANGGRAPH_CHECKPOINTER=postgres
OPIK_TRACK_COSTS=true
```

**Deployment Method**: Docker on cloud platform (AWS ECS, GCP Cloud Run)

**Infrastructure**:
- Container service (2GB RAM, 2 vCPU)
- Supabase Pro tier
- Multiple LLM providers
- Opik for monitoring

**Estimated Cost**: $50-150/month

### Scenario 4: Enterprise Production (High Availability)

**Use Case**: Business use, high-scale monitoring (10+ markets)

**Configuration**:
```bash
# .env
NODE_ENV=production
LOG_LEVEL=info
ANALYSIS_INTERVAL_HOURS=6
MAX_MARKETS_PER_CYCLE=10
# Multi-provider with premium models
OPENAI_DEFAULT_MODEL=gpt-4-turbo
ANTHROPIC_DEFAULT_MODEL=claude-3-opus
LANGGRAPH_CHECKPOINTER=postgres
OPIK_TRACK_COSTS=true
# Higher quotas
NEWS_API_DAILY_QUOTA=500
TWITTER_API_DAILY_QUOTA=2000
```

**Deployment Method**: Kubernetes or managed container service with auto-scaling

**Infrastructure**:
- Multiple container instances (4GB RAM, 4 vCPU each)
- Supabase Team/Enterprise tier
- Premium LLM API plans
- Opik Pro for monitoring
- Load balancer
- Redis for caching

**Estimated Cost**: $300-1000+/month

## Backup and Disaster Recovery

### Database Backups

#### Supabase Backups

Supabase provides automatic backups:

**Free Tier**:
- Daily backups (7-day retention)
- Point-in-time recovery (not available)

**Pro Tier**:
- Daily backups (30-day retention)
- Point-in-time recovery (7 days)

**Manual Backup**:

```bash
# Export database
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f backup_$(date +%Y%m%d).sql

# Restore database
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f backup_20240115.sql
```

#### LangGraph Checkpoints

If using PostgreSQL checkpointer, checkpoints are stored in Supabase and backed up automatically.

If using SQLite checkpointer:

```bash
# Backup script
#!/bin/bash
BACKUP_DIR="/opt/tradewizard-agents/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup SQLite database
cp /opt/tradewizard-agents/data/langgraph.db \
   $BACKUP_DIR/langgraph_$DATE.db

# Compress old backups
find $BACKUP_DIR -name "*.db" -mtime +7 -exec gzip {} \;

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.db.gz" -mtime +30 -delete

echo "Backup completed: langgraph_$DATE.db"
```

Schedule with cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/tradewizard-agents/scripts/backup.sh
```

### Disaster Recovery Plan

#### Recovery Time Objective (RTO)

Target time to restore service after failure:
- Development: 1-2 hours
- Production: 15-30 minutes
- Enterprise: 5-15 minutes

#### Recovery Point Objective (RPO)

Maximum acceptable data loss:
- Development: 24 hours
- Production: 1 hour
- Enterprise: 5 minutes

#### Recovery Procedures

**Scenario 1: Service Crash**

```bash
# Check service status
systemctl status tradewizard-monitor
# or
pm2 status

# View recent logs
journalctl -u tradewizard-monitor -n 100
# or
pm2 logs tradewizard-monitor --lines 100

# Restart service
systemctl restart tradewizard-monitor
# or
pm2 restart tradewizard-monitor
```

**Scenario 2: Database Connection Lost**

```bash
# Check Supabase status
curl -I https://your-project.supabase.co

# Check database connectivity
psql -h db.your-project.supabase.co -U postgres -c "SELECT 1"

# If Supabase is down, wait for recovery
# Service will automatically reconnect when available
```

**Scenario 3: Complete Server Failure**

```bash
# 1. Provision new server
# 2. Install dependencies
# 3. Restore application code
git clone <repo>
cd tradewizard-agents
npm ci --only=production
npm run build

# 4. Restore configuration
cp /backup/.env /opt/tradewizard-agents/.env

# 5. Restore database (if using SQLite)
cp /backup/langgraph.db /opt/tradewizard-agents/data/

# 6. Start service
systemctl start tradewizard-monitor
# or
pm2 start ecosystem.config.cjs

# 7. Verify health
curl http://localhost:3000/health
```

**Scenario 4: Data Corruption**

```bash
# 1. Stop service
systemctl stop tradewizard-monitor

# 2. Restore from backup
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f /backup/backup_20240115.sql

# 3. Restart service
systemctl start tradewizard-monitor

# 4. Verify data integrity
npm run cli -- verify-data
```

## Security Hardening

### Application Security

#### Environment Variable Security

```bash
# Set restrictive permissions on .env
chmod 600 .env
chown tradewizard:tradewizard .env

# Verify no secrets in logs
grep -r "OPENAI_API_KEY" /var/log/
# Should return no results
```

#### Process Isolation

```bash
# Run as non-root user
sudo useradd -r -s /bin/false tradewizard

# Set file ownership
sudo chown -R tradewizard:tradewizard /opt/tradewizard-agents

# Restrict file permissions
sudo chmod -R 750 /opt/tradewizard-agents
sudo chmod 600 /opt/tradewizard-agents/.env
```

#### Network Security

```bash
# Configure firewall (UFW example)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 3000/tcp  # Health check (if needed)
sudo ufw enable

# Or use iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT
```

### Supabase Security

#### Row Level Security (RLS)

Enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policies (example: service role has full access)
CREATE POLICY "Service role has full access" ON markets
  FOR ALL
  USING (auth.role() = 'service_role');

-- Repeat for other tables
```

#### API Key Rotation

```bash
# 1. Generate new service role key in Supabase dashboard
# 2. Update .env with new key
SUPABASE_SERVICE_ROLE_KEY=new_key_here

# 3. Restart service
systemctl restart tradewizard-monitor

# 4. Verify connection
curl http://localhost:3000/health

# 5. Revoke old key in Supabase dashboard
```

### LLM API Key Security

#### Key Rotation Schedule

- OpenAI: Rotate every 90 days
- Anthropic: Rotate every 90 days
- Google: Rotate every 90 days

#### Key Monitoring

```bash
# Monitor API key usage
# OpenAI: https://platform.openai.com/usage
# Anthropic: https://console.anthropic.com/settings/usage
# Google: https://console.cloud.google.com/apis/dashboard

# Set up usage alerts
# Alert when usage exceeds 80% of budget
```

## Performance Optimization

### Database Optimization

#### Index Optimization

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_markets_condition_id 
  ON markets(condition_id);

CREATE INDEX CONCURRENTLY idx_recommendations_market_created 
  ON recommendations(market_id, created_at DESC);

-- Analyze tables
ANALYZE markets;
ANALYZE recommendations;
ANALYZE agent_signals;
```

#### Query Optimization

```sql
-- Optimize getMarketsForUpdate query
EXPLAIN ANALYZE
SELECT * FROM markets
WHERE status = 'active'
  AND last_analyzed_at < NOW() - INTERVAL '24 hours'
ORDER BY trending_score DESC
LIMIT 10;

-- Add covering index if needed
CREATE INDEX CONCURRENTLY idx_markets_update_query
  ON markets(status, last_analyzed_at, trending_score DESC)
  WHERE status = 'active';
```

### Application Optimization

#### Memory Management

```bash
# Monitor memory usage
pm2 monit

# Set memory limit
NODE_OPTIONS="--max-old-space-size=2048" node dist/monitor.js

# Enable garbage collection logging
NODE_OPTIONS="--trace-gc" node dist/monitor.js
```

#### Caching Strategy

```typescript
// Implement in-memory cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedMarket(conditionId: string) {
  const cached = cache.get(conditionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchMarket(conditionId);
  cache.set(conditionId, { data, timestamp: Date.now() });
  return data;
}
```

#### Connection Pooling

```typescript
// Configure Supabase connection pool
const supabase = createClient(url, key, {
  db: {
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    }
  }
});
```

## Monitoring and Alerting

### Health Check Monitoring

#### External Monitoring Services

**UptimeRobot** (Free):

```bash
# Monitor health endpoint
URL: http://your-server:3000/health
Interval: 5 minutes
Alert: Email/SMS when down
```

**Pingdom**:

```bash
# Monitor health endpoint
URL: http://your-server:3000/health
Interval: 1 minute
Alert: Email/SMS/Slack when down
```

**Custom Script**:

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:3000/health"
ALERT_EMAIL="admin@example.com"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
  echo "Health check failed: HTTP $response" | \
    mail -s "TradeWizard Monitor Down" $ALERT_EMAIL
fi
```

Schedule with cron:

```bash
# Check every 5 minutes
*/5 * * * * /opt/tradewizard-agents/scripts/health-check.sh
```

### Log Monitoring

#### Log Aggregation

**Loki + Grafana**:

```yaml
# docker-compose.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
```

**ELK Stack**:

```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.0.0-amd64.deb
sudo dpkg -i filebeat-8.0.0-amd64.deb

# Configure Filebeat
sudo nano /etc/filebeat/filebeat.yml
# Add log paths and Elasticsearch output

# Start Filebeat
sudo systemctl start filebeat
sudo systemctl enable filebeat
```

#### Log Alerts

```bash
# Alert on error patterns
grep -i "error" /var/log/tradewizard-monitor.log | \
  mail -s "TradeWizard Errors Detected" admin@example.com
```

### Cost Monitoring

#### Opik Cost Alerts

Configure in Opik dashboard:
- Alert when daily cost exceeds $10
- Alert when analysis cost exceeds $1
- Weekly cost summary email

#### Custom Cost Tracking

```typescript
// Track costs in database
async function recordCost(analysisId: string, cost: number) {
  await supabase
    .from('analysis_history')
    .update({ cost_usd: cost })
    .eq('id', analysisId);
  
  // Check daily total
  const { data } = await supabase
    .from('analysis_history')
    .select('cost_usd')
    .gte('created_at', new Date().toISOString().split('T')[0]);
  
  const dailyTotal = data.reduce((sum, row) => sum + row.cost_usd, 0);
  
  if (dailyTotal > 50) {
    await sendAlert('Daily cost limit exceeded', dailyTotal);
  }
}
```

## Support

For issues and questions:
- Check logs first
- Review this troubleshooting guide
- Check GitHub issues
- Contact support team

## Additional Resources

- [Market Intelligence Engine Documentation](./README.md)
- [CLI Documentation](./CLI.md)
- [Supabase Documentation](https://supabase.com/docs)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Opik Documentation](https://www.comet.com/docs/opik/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Docker Documentation](https://docs.docker.com/)

## Changelog

### Version 1.0.0 (January 2026)
- Initial deployment documentation
- Docker, systemd, and PM2 deployment options
- Supabase integration guide
- Health check and monitoring setup
- Troubleshooting guide
- Security hardening recommendations
- Performance optimization tips
- Backup and disaster recovery procedures
