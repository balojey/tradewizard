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

## Configuration

### 1. Set Up Supabase Database

Run the database migration to create required tables:

```bash
cd tradewizard-agents/supabase
supabase db push
```

Or manually run the migration SQL from `supabase/migrations/20260115162602_initial_schema.sql`.

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

## Support

For issues and questions:
- Check logs first
- Review this troubleshooting guide
- Check GitHub issues
- Contact support team
