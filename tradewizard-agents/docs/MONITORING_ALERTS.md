# Monitoring and Alerts Configuration

This document describes the monitoring and alerting setup for the TradeWizard Automated Market Monitor.

## Table of Contents

- [Monitoring Strategy](#monitoring-strategy)
- [Health Check Monitoring](#health-check-monitoring)
- [Application Monitoring](#application-monitoring)
- [Database Monitoring](#database-monitoring)
- [Cost Monitoring](#cost-monitoring)
- [Alert Configuration](#alert-configuration)
- [Alert Routing](#alert-routing)

## Monitoring Strategy

### Monitoring Layers

1. **Infrastructure**: Server resources, network, disk
2. **Application**: Service health, errors, performance
3. **Database**: Connections, queries, performance
4. **Business**: Analysis success rate, costs, data quality
5. **External**: API availability, quota usage

### Key Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Service Uptime | 99.9% | < 99.5% | < 99% |
| Analysis Success Rate | > 95% | < 90% | < 80% |
| Response Time | < 2s | > 5s | > 10s |
| Error Rate | < 1% | > 5% | > 10% |
| Daily Cost | < $10 | > $20 | > $50 |
| Database CPU | < 50% | > 70% | > 85% |
| Memory Usage | < 70% | > 85% | > 95% |

## Health Check Monitoring

### Internal Health Check

The service exposes a health check endpoint at `/health`.


#### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "uptime": 3600,
  "database": true,
  "scheduler": true,
  "lastAnalysis": "2024-01-15T09:00:00Z",
  "nextScheduledRun": "2024-01-16T09:00:00Z",
  "quotaStatus": {
    "newsapi": { "used": 10, "limit": 100 },
    "twitter": { "used": 30, "limit": 500 },
    "reddit": { "used": 6, "limit": 60 }
  }
}
```

### External Health Check Services

#### Option 1: UptimeRobot (Free)

**Setup**:
1. Sign up at https://uptimerobot.com
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://your-domain.com/health`
   - Interval: 5 minutes
   - Expected Status Code: 200
   - Expected Response: `"status":"healthy"`

**Alerts**:
- Email when down
- SMS when down (optional)
- Slack webhook (optional)

**Configuration**:
```bash
# Alert contacts
Email: admin@example.com
SMS: +1-555-0100
Slack: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### Option 2: Pingdom

**Setup**:
1. Sign up at https://www.pingdom.com
2. Add new check:
   - Type: HTTP
   - URL: `https://your-domain.com/health`
   - Interval: 1 minute
   - Response validation: Contains "healthy"

**Alerts**:
- Email
- SMS
- PagerDuty integration
- Slack integration

#### Option 3: Custom Health Check Script

```bash
#!/bin/bash
# health-monitor.sh

HEALTH_URL="http://localhost:3000/health"
ALERT_EMAIL="admin@example.com"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Check health
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
  # Send email alert
  echo "Health check failed: HTTP $response" | \
    mail -s "TradeWizard Monitor Down" $ALERT_EMAIL
  
  # Send Slack alert
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"🚨 TradeWizard Monitor Down - HTTP $response\"}"
fi
```

Schedule with cron:
```bash
# Check every 5 minutes
*/5 * * * * /opt/scripts/health-monitor.sh
```

## Application Monitoring

### Opik Integration

Opik provides LLM tracing, cost tracking, and performance monitoring.

#### Setup

1. **Sign up at https://www.comet.com/opik**

2. **Get API key**:
   - Navigate to Settings → API Keys
   - Create new API key
   - Copy key to .env

3. **Configure environment**:
```bash
OPIK_API_KEY=your_api_key_here
OPIK_PROJECT_NAME=tradewizard-monitor-prod
OPIK_WORKSPACE=production
OPIK_TRACK_COSTS=true
OPIK_TAGS=production,v1.0
```

#### Dashboards

**Cost Dashboard**:
- Daily cost trend
- Cost per analysis
- Cost by LLM provider
- Cost by agent type

**Performance Dashboard**:
- Analysis duration
- Agent execution time
- Success rate
- Error rate

**Usage Dashboard**:
- Analyses per day
- Markets analyzed
- API calls per source
- Quota utilization

#### Alerts

Configure in Opik dashboard:

**Cost Alerts**:
- Daily cost > $20
- Analysis cost > $2
- Weekly cost > $100

**Performance Alerts**:
- Analysis duration > 5 minutes
- Error rate > 10%
- Success rate < 90%

**Usage Alerts**:
- API quota > 80%
- Analyses per day > 10
- Failed analyses > 5 per day

### Log Monitoring

#### Structured Logging

The application uses structured JSON logging:

```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "level": "info",
  "message": "Market analysis completed",
  "conditionId": "0x123...",
  "duration": 45000,
  "cost": 0.15,
  "direction": "LONG_YES"
}
```

#### Log Levels

- **debug**: Detailed debugging information
- **info**: General informational messages
- **warn**: Warning messages (non-critical)
- **error**: Error messages (requires attention)

#### Error Tracking

Monitor for these error patterns:

```bash
# Database errors
grep "Failed to connect to Supabase" /var/log/monitor.log

# API errors
grep "OpenAI API error" /var/log/monitor.log

# Analysis errors
grep "Market analysis failed" /var/log/monitor.log

# Quota errors
grep "API quota exceeded" /var/log/monitor.log
```

### Metrics Collection

#### Prometheus Integration

**Install Prometheus**:
```bash
# Docker
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /opt/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**Configure scraping**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'tradewizard-monitor'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

**Expose metrics endpoint**:
```typescript
// Add to monitor service
import promClient from 'prom-client';

const register = new promClient.Registry();

// Define metrics
const analysisCounter = new promClient.Counter({
  name: 'tradewizard_analyses_total',
  help: 'Total number of analyses',
  labelNames: ['status']
});

const analysisDuration = new promClient.Histogram({
  name: 'tradewizard_analysis_duration_seconds',
  help: 'Analysis duration in seconds',
  buckets: [10, 30, 60, 120, 300]
});

const analysisCost = new promClient.Gauge({
  name: 'tradewizard_analysis_cost_usd',
  help: 'Analysis cost in USD'
});

register.registerMetric(analysisCounter);
register.registerMetric(analysisDuration);
register.registerMetric(analysisCost);

// Expose endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Database Monitoring

### Supabase Dashboard

Monitor in Supabase dashboard:

**Database Performance**:
- CPU usage
- Memory usage
- Disk I/O
- Connection count
- Query performance

**Slow Queries**:
```sql
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

**Connection Pool**:
```sql
SELECT
  count(*) as connections,
  state
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY state;
```

**Table Sizes**:
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Database Alerts

Configure in Supabase dashboard:

**Resource Alerts**:
- CPU > 80% for 5 minutes
- Memory > 80% for 5 minutes
- Disk > 85%
- Connection pool > 90%

**Performance Alerts**:
- Slow query detected (> 5s)
- High query rate (> 1000/min)
- Deadlock detected

**Availability Alerts**:
- Database unreachable
- Backup failed
- Replication lag > 1 minute

## Cost Monitoring

### LLM API Costs

#### OpenAI

**Monitor usage**:
- Dashboard: https://platform.openai.com/usage
- API: https://api.openai.com/v1/usage

**Set budget alerts**:
1. Navigate to Settings → Billing
2. Set monthly budget: $100
3. Enable email alerts at 80% and 100%

**Track costs in application**:
```typescript
// Track OpenAI costs
const cost = (tokens / 1000) * modelPricePerK;
await recordCost('openai', cost);
```

#### Anthropic

**Monitor usage**:
- Dashboard: https://console.anthropic.com/settings/usage

**Set budget alerts**:
1. Navigate to Settings → Usage
2. Set monthly budget: $100
3. Enable email alerts

#### Google AI

**Monitor usage**:
- Dashboard: https://console.cloud.google.com/apis/dashboard

**Set budget alerts**:
1. Navigate to Billing → Budgets & alerts
2. Create budget: $100/month
3. Set alert thresholds: 50%, 80%, 100%

### Cost Tracking Database

Store costs in database:

```sql
-- Add cost tracking to analysis_history
SELECT
  DATE(created_at) as date,
  COUNT(*) as analyses,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost,
  MAX(cost_usd) as max_cost
FROM analysis_history
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Cost Alerts

**Daily Cost Alert**:
```bash
#!/bin/bash
# daily-cost-alert.sh

THRESHOLD=20
ALERT_EMAIL="admin@example.com"

# Get today's cost
cost=$(curl -s -H "apikey: $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/analysis_history?select=cost_usd&gte=created_at.$(date -I)" | \
  jq '[.[].cost_usd] | add')

if (( $(echo "$cost > $THRESHOLD" | bc -l) )); then
  echo "Daily cost ($cost) exceeded threshold ($THRESHOLD)" | \
    mail -s "Cost Alert: TradeWizard Monitor" $ALERT_EMAIL
fi
```

Schedule with cron:
```bash
# Check at 6 PM daily
0 18 * * * /opt/scripts/daily-cost-alert.sh
```

## Alert Configuration

### Alert Severity Levels

**Critical (P1)**:
- Service completely down
- Database unreachable
- Data loss detected
- Cost > $50/hour

**High (P2)**:
- Service degraded
- Error rate > 25%
- Database CPU > 85%
- Cost > $20/hour

**Medium (P3)**:
- Performance degradation
- Error rate > 10%
- Quota > 80%
- Cost > $10/hour

**Low (P4)**:
- Warnings in logs
- Quota > 60%
- Performance optimization needed

### Alert Rules

#### Service Health

```yaml
# Alert: Service Down
condition: health_check_status != 200
severity: critical
duration: 5 minutes
notification: email, sms, pagerduty

# Alert: Service Degraded
condition: error_rate > 0.25
severity: high
duration: 10 minutes
notification: email, slack

# Alert: High Error Rate
condition: error_rate > 0.10
severity: medium
duration: 15 minutes
notification: email, slack
```

#### Database Health

```yaml
# Alert: Database Unreachable
condition: database_connection == false
severity: critical
duration: 2 minutes
notification: email, sms, pagerduty

# Alert: High Database CPU
condition: database_cpu > 0.85
severity: high
duration: 5 minutes
notification: email, slack

# Alert: Connection Pool Exhausted
condition: database_connections > 0.90 * max_connections
severity: high
duration: 5 minutes
notification: email, slack
```

#### Cost Alerts

```yaml
# Alert: High Hourly Cost
condition: cost_per_hour > 50
severity: critical
duration: immediate
notification: email, sms, pagerduty

# Alert: Daily Budget Exceeded
condition: daily_cost > 20
severity: high
duration: immediate
notification: email, slack

# Alert: Weekly Budget Warning
condition: weekly_cost > 100
severity: medium
duration: immediate
notification: email
```

#### Quota Alerts

```yaml
# Alert: Quota Exceeded
condition: quota_usage > 1.0
severity: high
duration: immediate
notification: email, slack

# Alert: Quota Warning
condition: quota_usage > 0.80
severity: medium
duration: immediate
notification: email
```

## Alert Routing

### PagerDuty Integration

**Setup**:
1. Sign up at https://www.pagerduty.com
2. Create service: "TradeWizard Monitor"
3. Get integration key
4. Configure alerts

**Integration**:
```bash
# Send alert to PagerDuty
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "TradeWizard Monitor Down",
      "severity": "critical",
      "source": "monitoring",
      "custom_details": {
        "error": "Health check failed"
      }
    }
  }'
```

### Slack Integration

**Setup**:
1. Create Slack app
2. Enable Incoming Webhooks
3. Add webhook to workspace
4. Copy webhook URL

**Integration**:
```bash
# Send alert to Slack
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🚨 *TradeWizard Monitor Alert*",
    "attachments": [{
      "color": "danger",
      "fields": [
        {"title": "Severity", "value": "Critical", "short": true},
        {"title": "Status", "value": "Service Down", "short": true},
        {"title": "Time", "value": "2024-01-15 10:00 UTC", "short": false}
      ]
    }]
  }'
```

### Email Alerts

**Setup**:
```bash
# Install mailutils
sudo apt-get install mailutils

# Configure SMTP
sudo nano /etc/postfix/main.cf
# Add SMTP settings

# Test email
echo "Test alert" | mail -s "Test" admin@example.com
```

**Alert Script**:
```bash
#!/bin/bash
# send-email-alert.sh

SUBJECT="$1"
MESSAGE="$2"
TO="admin@example.com"

echo "$MESSAGE" | mail -s "$SUBJECT" $TO
```

### SMS Alerts

**Option 1: Twilio**:
```bash
# Send SMS via Twilio
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$ACCOUNT_SID/Messages.json" \
  --data-urlencode "From=$TWILIO_PHONE" \
  --data-urlencode "To=$ALERT_PHONE" \
  --data-urlencode "Body=TradeWizard Monitor Alert: Service Down" \
  -u "$ACCOUNT_SID:$AUTH_TOKEN"
```

**Option 2: AWS SNS**:
```bash
# Send SMS via AWS SNS
aws sns publish \
  --phone-number "+1-555-0100" \
  --message "TradeWizard Monitor Alert: Service Down"
```

## Alert Testing

### Test Health Check Alert

```bash
# Stop service to trigger alert
sudo systemctl stop tradewizard-monitor

# Wait for alert (should arrive within 5 minutes)

# Verify alert received
# - Check email
# - Check Slack
# - Check PagerDuty

# Restart service
sudo systemctl start tradewizard-monitor
```

### Test Cost Alert

```bash
# Manually trigger cost alert
/opt/scripts/daily-cost-alert.sh

# Verify alert received
```

### Test Database Alert

```bash
# Simulate database issue
# (In staging only!)
sudo iptables -A OUTPUT -d db.your-project.supabase.co -j DROP

# Wait for alert

# Restore connectivity
sudo iptables -D OUTPUT -d db.your-project.supabase.co -j DROP
```

## Dashboard Setup

### Grafana Dashboard

**Install Grafana**:
```bash
docker run -d \
  --name grafana \
  -p 3001:3000 \
  -v grafana-data:/var/lib/grafana \
  grafana/grafana
```

**Configure Data Sources**:
1. Add Prometheus data source
2. Add Supabase PostgreSQL data source

**Import Dashboard**:
1. Navigate to Dashboards → Import
2. Upload `grafana-dashboard.json`
3. Configure data sources

**Dashboard Panels**:
- Service uptime
- Analysis success rate
- Response time
- Error rate
- Daily cost
- Database CPU/Memory
- Quota usage

### Custom Dashboard

Create custom dashboard with:

```html
<!DOCTYPE html>
<html>
<head>
  <title>TradeWizard Monitor Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>TradeWizard Monitor Dashboard</h1>
  
  <div>
    <h2>Service Health</h2>
    <div id="health-status"></div>
  </div>
  
  <div>
    <h2>Daily Cost</h2>
    <canvas id="cost-chart"></canvas>
  </div>
  
  <div>
    <h2>Analysis Success Rate</h2>
    <canvas id="success-chart"></canvas>
  </div>
  
  <script>
    // Fetch health status
    fetch('http://localhost:3000/health')
      .then(r => r.json())
      .then(data => {
        document.getElementById('health-status').innerHTML = 
          `Status: ${data.status}<br>
           Uptime: ${data.uptime}s<br>
           Last Analysis: ${data.lastAnalysis}`;
      });
    
    // Fetch and display cost chart
    // ... (implementation)
  </script>
</body>
</html>
```

## Additional Resources

- [Runbook](./RUNBOOK.md) - Operational procedures
- [Incident Response](./INCIDENT_RESPONSE.md) - Incident handling
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md) - Deployment guide
- [Opik Documentation](https://www.comet.com/docs/opik/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
