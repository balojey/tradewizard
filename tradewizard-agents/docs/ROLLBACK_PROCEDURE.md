# Rollback Procedure

This document describes the procedures for rolling back deployments of the TradeWizard Automated Market Monitor.

## Table of Contents

- [When to Rollback](#when-to-rollback)
- [Rollback Decision Matrix](#rollback-decision-matrix)
- [Pre-Rollback Checklist](#pre-rollback-checklist)
- [Rollback Procedures](#rollback-procedures)
- [Post-Rollback Verification](#post-rollback-verification)
- [Database Rollback](#database-rollback)
- [Rollback Testing](#rollback-testing)

## When to Rollback

Consider rollback when:

- **Critical bugs** in production affecting core functionality
- **Data corruption** or data loss occurring
- **Performance degradation** > 50% compared to previous version
- **High error rate** > 25% of requests failing
- **Security vulnerability** discovered in new deployment
- **Uncontrolled costs** exceeding budget by > 200%
- **Unable to fix forward** within acceptable timeframe

Do NOT rollback for:

- Minor bugs with workarounds available
- Cosmetic issues
- Non-critical performance issues
- Issues that can be fixed with configuration changes
- Issues affecting < 5% of functionality

## Rollback Decision Matrix

| Severity | Error Rate | Performance | Data Impact | Decision |
|----------|-----------|-------------|-------------|----------|
| Critical | > 50% | > 75% degradation | Data loss | **Immediate Rollback** |
| High | 25-50% | 50-75% degradation | Data corruption | **Rollback** |
| Medium | 10-25% | 25-50% degradation | No data impact | **Fix Forward or Rollback** |
| Low | < 10% | < 25% degradation | No data impact | **Fix Forward** |

## Pre-Rollback Checklist

Before initiating rollback:

- [ ] Confirm rollback is necessary (consult decision matrix)
- [ ] Identify last known good version
- [ ] Verify last known good version is available
- [ ] Backup current database state
- [ ] Document current issue and symptoms
- [ ] Notify stakeholders of planned rollback
- [ ] Assemble rollback team
- [ ] Prepare rollback commands
- [ ] Identify rollback verification steps
- [ ] Plan communication strategy

## Rollback Procedures

### Docker Deployment Rollback

#### 1. Identify Last Known Good Version

```bash
# List recent images
docker images tradewizard-monitor

# Example output:
# REPOSITORY              TAG       IMAGE ID       CREATED        SIZE
# tradewizard-monitor     latest    abc123def456   2 hours ago    500MB
# tradewizard-monitor     v1.2.0    def456abc789   1 day ago      498MB
# tradewizard-monitor     v1.1.0    789abc123def   3 days ago     495MB
```

#### 2. Stop Current Container

```bash
# Stop gracefully (allows current analysis to complete)
docker stop tradewizard-monitor

# Wait up to 60 seconds for graceful shutdown
# If it doesn't stop, force stop:
# docker kill tradewizard-monitor

# Remove container
docker rm tradewizard-monitor
```

#### 3. Start Previous Version

```bash
# Start container with previous version
docker run -d \
  --name tradewizard-monitor \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  tradewizard-monitor:v1.1.0

# Verify container is running
docker ps | grep tradewizard-monitor
```

#### 4. Verify Rollback

```bash
# Check health
curl http://localhost:3000/health

# Check logs
docker logs -f tradewizard-monitor --tail 50

# Trigger test analysis
curl -X POST http://localhost:3000/trigger \
  -H "Content-Type: application/json" \
  -d '{"conditionId": "test-market-id"}'
```

**Estimated Time**: 5-10 minutes

### Systemd Deployment Rollback

#### 1. Identify Last Known Good Version

```bash
# List available versions
ls -lh /opt/tradewizard-agents/releases/

# Example output:
# drwxr-xr-x 2 tradewizard tradewizard 4.0K Jan 15 10:00 v1.2.0
# drwxr-xr-x 2 tradewizard tradewizard 4.0K Jan 14 10:00 v1.1.0
# drwxr-xr-x 2 tradewizard tradewizard 4.0K Jan 13 10:00 v1.0.0
```

#### 2. Stop Service

```bash
# Stop service gracefully
sudo systemctl stop tradewizard-monitor

# Verify stopped
sudo systemctl status tradewizard-monitor
```

#### 3. Switch to Previous Version

```bash
# Backup current version
sudo mv /opt/tradewizard-agents/current \
       /opt/tradewizard-agents/rollback-$(date +%Y%m%d-%H%M%S)

# Link to previous version
sudo ln -s /opt/tradewizard-agents/releases/v1.1.0 \
           /opt/tradewizard-agents/current

# Verify link
ls -lh /opt/tradewizard-agents/current
```

#### 4. Restore Configuration (if needed)

```bash
# If configuration changed, restore previous .env
sudo cp /opt/tradewizard-agents/releases/v1.1.0/.env \
        /opt/tradewizard-agents/current/.env

# Verify configuration
cat /opt/tradewizard-agents/current/.env
```

#### 5. Start Service

```bash
# Start service
sudo systemctl start tradewizard-monitor

# Verify started
sudo systemctl status tradewizard-monitor

# Check logs
sudo journalctl -u tradewizard-monitor -f -n 50
```

#### 6. Verify Rollback

```bash
# Check health
curl http://localhost:3000/health

# Trigger test analysis
curl -X POST http://localhost:3000/trigger \
  -H "Content-Type: application/json" \
  -d '{"conditionId": "test-market-id"}'
```

**Estimated Time**: 10-15 minutes

### PM2 Deployment Rollback

#### 1. Identify Last Known Good Version

```bash
# List available versions
ls -lh /opt/tradewizard-agents/releases/

# Check PM2 process
pm2 describe tradewizard-monitor
```

#### 2. Stop Service

```bash
# Stop PM2 process
pm2 stop tradewizard-monitor

# Verify stopped
pm2 status
```

#### 3. Switch to Previous Version

```bash
# Backup current version
mv /opt/tradewizard-agents/current \
   /opt/tradewizard-agents/rollback-$(date +%Y%m%d-%H%M%S)

# Link to previous version
ln -s /opt/tradewizard-agents/releases/v1.1.0 \
      /opt/tradewizard-agents/current

# Update PM2 ecosystem file if needed
cp /opt/tradewizard-agents/releases/v1.1.0/ecosystem.config.cjs \
   /opt/tradewizard-agents/current/
```

#### 4. Start Service

```bash
# Delete old PM2 process
pm2 delete tradewizard-monitor

# Start with previous version
cd /opt/tradewizard-agents/current
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save
```

#### 5. Verify Rollback

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs tradewizard-monitor --lines 50

# Check health
curl http://localhost:3000/health
```

**Estimated Time**: 10-15 minutes

### Git-Based Rollback

If using git for deployments:

#### 1. Identify Last Known Good Commit

```bash
# View recent commits
git log --oneline -10

# Example output:
# abc123d (HEAD -> main) Fix: Update analysis logic
# def456e Deploy: v1.2.0
# 789abc1 Deploy: v1.1.0 (last known good)
# 123def4 Feature: Add new agent
```

#### 2. Checkout Previous Version

```bash
# Stop service first
sudo systemctl stop tradewizard-monitor

# Checkout previous version
cd /opt/tradewizard-agents
git checkout 789abc1

# Or checkout by tag
git checkout v1.1.0
```

#### 3. Rebuild Application

```bash
# Install dependencies
npm ci --only=production

# Build application
npm run build
```

#### 4. Start Service

```bash
# Start service
sudo systemctl start tradewizard-monitor

# Verify
curl http://localhost:3000/health
```

**Estimated Time**: 15-20 minutes

## Post-Rollback Verification

### 1. Service Health Check

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "uptime": <number>,
#   "database": true,
#   "scheduler": true,
#   "lastAnalysis": "<timestamp>",
#   "nextScheduledRun": "<timestamp>"
# }
```

### 2. Database Connectivity

```bash
# Test database connection
curl -H "apikey: $SUPABASE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/markets?select=count&limit=1"

# Expected: {"count": <number>}
```

### 3. Analysis Workflow

```bash
# Trigger test analysis
curl -X POST http://localhost:3000/trigger \
  -H "Content-Type: application/json" \
  -d '{"conditionId": "0x1234567890abcdef1234567890abcdef12345678"}'

# Monitor logs for completion
sudo journalctl -u tradewizard-monitor -f
```

### 4. Monitor for 30 Minutes

```bash
# Watch health status
watch -n 30 'curl -s http://localhost:3000/health | jq .'

# Monitor logs for errors
sudo journalctl -u tradewizard-monitor -f | grep -i error

# Check resource usage
docker stats tradewizard-monitor --no-stream
# or
pm2 monit
```

### 5. Verify Data Integrity

```bash
# Check recent analyses
curl -H "apikey: $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/analysis_history?select=*&order=created_at.desc&limit=10"

# Verify no data corruption
curl -H "apikey: $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/markets?select=count"
```

## Database Rollback

### When Database Rollback is Needed

- Schema changes in new version are incompatible
- Data corruption occurred after deployment
- Migration failed or caused issues

### Database Rollback Procedure

#### 1. Stop Service

```bash
# Stop service to prevent writes
sudo systemctl stop tradewizard-monitor
```

#### 2. Backup Current State

```bash
# Backup current database
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f /backups/pre-rollback-$(date +%Y%m%d-%H%M%S).dump
```

#### 3. Restore Previous Backup

```bash
# Restore from backup
PGPASSWORD=$DB_PASSWORD pg_restore \
  -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -c \
  /backups/pre-deployment-backup.dump

# Or restore specific tables
PGPASSWORD=$DB_PASSWORD pg_restore \
  -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -t markets \
  -t recommendations \
  /backups/pre-deployment-backup.dump
```

#### 4. Verify Database State

```bash
# Check table counts
psql "$SUPABASE_URL" -c "
SELECT 'markets' as table, count(*) FROM markets
UNION ALL
SELECT 'recommendations', count(*) FROM recommendations
UNION ALL
SELECT 'agent_signals', count(*) FROM agent_signals;
"

# Check recent data
psql "$SUPABASE_URL" -c "
SELECT * FROM markets
ORDER BY created_at DESC
LIMIT 5;
"
```

#### 5. Rollback Migrations (if needed)

```bash
# If using Supabase CLI
cd supabase

# List migrations
supabase migration list

# Rollback specific migration
supabase migration repair --status reverted <migration-id>

# Or manually run down migration
psql "$SUPABASE_URL" -f migrations/<migration-id>_down.sql
```

#### 6. Start Service

```bash
# Start service with rolled back code
sudo systemctl start tradewizard-monitor

# Verify health
curl http://localhost:3000/health
```

**Estimated Time**: 20-30 minutes

**Warning**: Database rollback may result in data loss. Always backup before proceeding.

## Rollback Testing

### Pre-Production Testing

Test rollback procedure in staging:

```bash
# 1. Deploy new version to staging
# 2. Verify deployment works
# 3. Perform rollback
# 4. Verify rollback works
# 5. Document any issues
# 6. Update rollback procedure if needed
```

### Rollback Drill

Conduct quarterly rollback drills:

1. **Schedule drill**: Announce to team
2. **Deploy test version**: Deploy a "bad" version to staging
3. **Execute rollback**: Follow rollback procedure
4. **Time the process**: Measure rollback time
5. **Document issues**: Note any problems encountered
6. **Update procedures**: Improve based on learnings

### Rollback Checklist

```markdown
## Rollback Drill Checklist

Date: ___________
Participants: ___________

- [ ] Pre-rollback backup completed
- [ ] Service stopped gracefully
- [ ] Previous version identified
- [ ] Rollback executed
- [ ] Service started successfully
- [ ] Health check passed
- [ ] Database connectivity verified
- [ ] Test analysis completed
- [ ] Monitored for 30 minutes
- [ ] No errors in logs
- [ ] Stakeholders notified

Time to Complete: _____ minutes
Issues Encountered: ___________
Improvements Needed: ___________
```

## Rollback Communication

### Internal Communication

```
ROLLBACK INITIATED

Version: v1.2.0 → v1.1.0
Reason: [Brief description]
Status: In Progress
ETA: [Estimated completion time]
Impact: [Expected downtime]

Updates will be provided every 10 minutes.
```

### Stakeholder Communication

```
Subject: Service Rollback - TradeWizard Monitor

We are rolling back the TradeWizard Monitor to the previous version due to [reason].

Current Status: [In Progress/Complete]
Expected Downtime: [Duration]
Impact: [Description]

We will notify you once the rollback is complete and service is restored.

Thank you for your patience.
```

### Post-Rollback Communication

```
ROLLBACK COMPLETE

Version: Rolled back to v1.1.0
Duration: [Total time]
Status: Service Restored
Verification: Complete

The service is now stable and operating normally.

Root Cause: [Brief description]
Next Steps: [Action items]

Post-incident review scheduled for: [Date/Time]
```

## Rollback Metrics

Track and review:

- **Rollback Time**: Time from decision to completion
- **Downtime**: Total service downtime during rollback
- **Success Rate**: Percentage of successful rollbacks
- **Data Loss**: Any data lost during rollback
- **Repeat Rollbacks**: Rollbacks of same deployment

## Prevention

To reduce need for rollbacks:

1. **Comprehensive Testing**
   - Unit tests
   - Integration tests
   - End-to-end tests
   - Performance tests

2. **Staging Environment**
   - Deploy to staging first
   - Run for 24 hours
   - Verify all functionality

3. **Gradual Rollout**
   - Deploy to single instance first
   - Monitor for issues
   - Gradually expand deployment

4. **Feature Flags**
   - Use feature flags for new features
   - Enable gradually
   - Quick disable if issues

5. **Monitoring**
   - Comprehensive monitoring
   - Automated alerts
   - Quick issue detection

## Additional Resources

- [Incident Response Plan](./INCIDENT_RESPONSE.md) - Handling incidents
- [Runbook](./RUNBOOK.md) - Operational procedures
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md) - Deployment guide
- [Deployment Guide](../DEPLOYMENT.md) - General deployment

## Contact Information

### Rollback Authority

- **Primary**: [Team Lead] - [Phone]
- **Secondary**: [Engineering Manager] - [Phone]
- **Final Authority**: [CTO] - [Phone]

### Support

- **On-Call Engineer**: [Phone]
- **Database Admin**: [Phone]
- **DevOps Lead**: [Phone]
