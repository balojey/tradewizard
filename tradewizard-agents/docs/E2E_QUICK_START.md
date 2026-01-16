# E2E Testing Quick Start Guide

This is a condensed guide for quickly deploying and testing the Automated Market Monitor in a staging environment.

## Prerequisites

- Linux server with Node.js 18+
- Supabase staging project
- LLM API key (OpenAI, Anthropic, or Google)

## Quick Setup (15 minutes)

### 1. Clone and Build

```bash
git clone <repository-url>
cd tradewizard-agents
npm install
npm run build
```

### 2. Configure Environment

```bash
cp .env.monitor.example .env
nano .env  # Edit with your values
```

Minimum required variables:
```bash
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-your_key
LLM_SINGLE_PROVIDER=openai
OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

### 3. Run Database Migrations

```bash
# Option 1: Using Supabase CLI
supabase link --project-ref your-project-ref
supabase db push

# Option 2: Manual (copy SQL from supabase/migrations/*.sql)
# Run in Supabase SQL editor
```

### 4. Start Monitor

```bash
npm run monitor:start
```

### 5. Verify Running

```bash
npm run monitor:status
curl http://localhost:3000/health
```

## Quick Test (5 minutes)

Run automated test suite:

```bash
npm run test:e2e
```

Expected output:
```
✅ Monitor Running: Monitor service is running
✅ Health Check: Service is healthy
✅ Database Connection: Database is connected
✅ Scheduler Running: Scheduler is running
...
Passed: 8/8
```

## 48-Hour Test

### Start Continuous Monitoring

```bash
# Option 1: Automated (recommended)
npm run test:e2e:continuous

# Option 2: Manual monitoring
# Check every 6 hours:
npm run monitor:status
curl http://localhost:3000/health | jq '.'
```

### Monitor Progress

```bash
# View logs
pm2 logs tradewizard-monitor

# Check status
npm run monitor:status

# View health
npm run monitor:health

# Check database
# Run in Supabase SQL editor:
SELECT COUNT(*) FROM markets;
SELECT COUNT(*) FROM recommendations;
SELECT COUNT(*) FROM analysis_history;
```

## Common Commands

```bash
# Start monitor
npm run monitor:start

# Stop monitor
npm run monitor:stop

# Check status
npm run monitor:status

# View health
npm run monitor:health

# Trigger manual analysis
npm run monitor:trigger <conditionId>

# Run E2E tests
npm run test:e2e

# View logs (PM2)
pm2 logs tradewizard-monitor

# View logs (direct)
tail -f monitor.log
```

## Quick Verification Queries

Run these in Supabase SQL editor:

```sql
-- Check recent activity
SELECT 
  m.question,
  r.direction,
  r.confidence,
  ah.status,
  ah.created_at
FROM analysis_history ah
JOIN markets m ON ah.market_id = m.id
LEFT JOIN recommendations r ON r.market_id = m.id
ORDER BY ah.created_at DESC
LIMIT 10;

-- Check quota usage (from health endpoint)
-- curl http://localhost:3000/health | jq '.quota'

-- Check analysis success rate
SELECT 
  status,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration,
  SUM(cost_usd) as total_cost
FROM analysis_history
GROUP BY status;
```

## Troubleshooting

### Monitor Won't Start

```bash
# Check build
npm run build

# Check environment
cat .env | grep -v KEY

# Check database
curl -X POST https://your-project.supabase.co/rest/v1/markets \
  -H "apikey: your_anon_key" \
  -H "Content-Type: application/json"
```

### Health Check Fails

```bash
# Check if running
ps aux | grep monitor

# Check port
lsof -i :3000

# Check logs
pm2 logs tradewizard-monitor --lines 50
```

### Analysis Not Running

```bash
# Check scheduler
curl http://localhost:3000/health | jq '.scheduler'

# Check next run time
curl http://localhost:3000/health | jq '.nextScheduledRun'

# Trigger manually
npm run monitor:trigger <conditionId>
```

## Success Checklist

After 48 hours, verify:

- [ ] Monitor ran continuously (no crashes)
- [ ] Multiple analysis cycles completed
- [ ] Markets discovered and analyzed
- [ ] Data stored in Supabase
- [ ] Quotas respected
- [ ] Health checks accurate
- [ ] Graceful shutdown works
- [ ] No memory leaks

## Next Steps

1. Review test results: `cat e2e-test-report.json`
2. Document any issues found
3. Complete full checklist: `docs/E2E_DEPLOYMENT_CHECKLIST.md`
4. Proceed to production deployment (Task 26)

## Support

- Full guide: `docs/E2E_TESTING_GUIDE.md`
- Deployment checklist: `docs/E2E_DEPLOYMENT_CHECKLIST.md`
- Monitor CLI: `CLI-MONITOR.md`
- Deployment guide: `DEPLOYMENT.md`
