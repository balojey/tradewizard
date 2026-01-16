# Incident Response Plan

This document outlines the incident response procedures for the TradeWizard Automated Market Monitor.

## Table of Contents

- [Incident Severity Levels](#incident-severity-levels)
- [Incident Response Team](#incident-response-team)
- [Response Procedures](#response-procedures)
- [Incident Types](#incident-types)
- [Communication Plan](#communication-plan)
- [Post-Incident Review](#post-incident-review)

## Incident Severity Levels

### Severity 1 (Critical)

**Definition**: Complete service outage or data loss affecting production

**Examples**:
- Service completely down for > 15 minutes
- Database corruption or data loss
- Security breach or unauthorized access
- Complete loss of analysis capability
- Uncontrolled cost escalation (> $100/hour)

**Response Time**: Immediate (< 5 minutes)

**Escalation**: Immediate notification to all team members and management

### Severity 2 (High)

**Definition**: Significant service degradation affecting functionality

**Examples**:
- Service intermittently failing
- Analysis success rate < 50%
- Database connection issues
- High error rate (> 25%)
- Cost escalation (> $50/hour)

**Response Time**: < 15 minutes

**Escalation**: Notification to on-call engineer and team lead

### Severity 3 (Medium)

**Definition**: Minor service degradation with workaround available

**Examples**:
- Single market analysis failing
- Slow response times
- Non-critical errors in logs
- Quota approaching limits (> 90%)
- Moderate cost increase

**Response Time**: < 1 hour

**Escalation**: Notification to on-call engineer

### Severity 4 (Low)

**Definition**: Minor issues with no immediate impact

**Examples**:
- Cosmetic issues
- Non-critical warnings in logs
- Performance optimization opportunities
- Documentation updates needed

**Response Time**: Next business day

**Escalation**: Create ticket for backlog

## Incident Response Team

### Roles and Responsibilities

#### Incident Commander (IC)

**Responsibilities**:
- Declare incident and severity level
- Coordinate response efforts
- Make critical decisions
- Communicate with stakeholders
- Lead post-incident review

**Primary**: [Name] - [Phone] - [Email]
**Secondary**: [Name] - [Phone] - [Email]

#### Technical Lead

**Responsibilities**:
- Diagnose technical issues
- Implement fixes
- Coordinate with engineers
- Document technical details

**Primary**: [Name] - [Phone] - [Email]
**Secondary**: [Name] - [Phone] - [Email]

#### Communications Lead

**Responsibilities**:
- Update status page
- Notify stakeholders
- Prepare communications
- Manage external inquiries

**Primary**: [Name] - [Phone] - [Email]
**Secondary**: [Name] - [Phone] - [Email]

### On-Call Schedule

| Week | Primary | Secondary | Escalation |
|------|---------|-----------|------------|
| Week 1 | [Name] | [Name] | [Team Lead] |
| Week 2 | [Name] | [Name] | [Team Lead] |
| Week 3 | [Name] | [Name] | [Team Lead] |
| Week 4 | [Name] | [Name] | [Team Lead] |

## Response Procedures

### Initial Response (First 5 Minutes)

1. **Acknowledge the incident**
   ```bash
   # Respond to alert
   # Acknowledge in PagerDuty/Opsgenie
   ```

2. **Assess severity**
   ```bash
   # Check service health
   curl http://localhost:3000/health
   
   # Check recent logs
   sudo journalctl -u tradewizard-monitor -n 100
   
   # Check Opik for errors
   # Visit: https://www.comet.com/opik
   ```

3. **Declare incident**
   ```bash
   # Create incident channel
   # Slack: #incident-YYYY-MM-DD-description
   
   # Post initial status
   "INCIDENT DECLARED: [Severity] - [Brief Description]
   IC: [Name]
   Status: Investigating"
   ```

4. **Assemble team**
   ```bash
   # Page on-call engineers
   # Notify team lead for Sev 1/2
   # Notify management for Sev 1
   ```

### Investigation Phase (5-30 Minutes)

1. **Gather information**
   ```bash
   # Service status
   systemctl status tradewizard-monitor
   
   # Recent logs
   sudo journalctl -u tradewizard-monitor -n 500 > /tmp/incident-logs.txt
   
   # Database status
   curl -I $SUPABASE_URL
   
   # Resource usage
   docker stats tradewizard-monitor --no-stream
   
   # Recent analyses
   curl -H "apikey: $SUPABASE_KEY" \
     "$SUPABASE_URL/rest/v1/analysis_history?select=*&order=created_at.desc&limit=10"
   ```

2. **Identify root cause**
   ```bash
   # Check for common issues
   # - Database connection
   # - API key issues
   # - Resource exhaustion
   # - Configuration errors
   # - External service outages
   ```

3. **Update stakeholders**
   ```bash
   # Post update every 15 minutes
   "UPDATE: [Time]
   Status: [Investigating/Identified/Fixing]
   Impact: [Description]
   ETA: [Estimate]"
   ```

### Mitigation Phase (30-60 Minutes)

1. **Implement fix**
   ```bash
   # Follow runbook procedures
   # See: docs/RUNBOOK.md
   
   # Common fixes:
   # - Restart service
   # - Rollback deployment
   # - Adjust configuration
   # - Scale resources
   ```

2. **Verify fix**
   ```bash
   # Check service health
   curl http://localhost:3000/health
   
   # Trigger test analysis
   curl -X POST http://localhost:3000/trigger \
     -H "Content-Type: application/json" \
     -d '{"conditionId": "test-market-id"}'
   
   # Monitor for 15 minutes
   watch -n 30 'curl -s http://localhost:3000/health | jq .'
   ```

3. **Update stakeholders**
   ```bash
   "UPDATE: [Time]
   Status: Fix implemented
   Verification: In progress
   Monitoring: 15 minutes"
   ```

### Resolution Phase (60+ Minutes)

1. **Confirm resolution**
   ```bash
   # Service stable for 30+ minutes
   # No errors in logs
   # All metrics normal
   # Stakeholders notified
   ```

2. **Close incident**
   ```bash
   "INCIDENT RESOLVED: [Time]
   Duration: [Total time]
   Root Cause: [Brief description]
   Fix: [What was done]
   Follow-up: [Action items]"
   ```

3. **Schedule post-incident review**
   ```bash
   # Within 48 hours
   # All team members invited
   # Prepare incident timeline
   ```

## Incident Types

### Service Outage

**Symptoms**:
- Health check returns 500 or times out
- Service not responding
- Container/process not running

**Response**:

```bash
# 1. Check if service is running
systemctl status tradewizard-monitor

# 2. Check recent logs for errors
sudo journalctl -u tradewizard-monitor -n 200

# 3. Restart service
sudo systemctl restart tradewizard-monitor

# 4. If restart fails, check:
# - Environment variables
# - Database connectivity
# - Disk space
# - Memory availability

# 5. If issue persists, rollback to last known good version
# See: docs/ROLLBACK_PROCEDURE.md
```

### Database Issues

**Symptoms**:
- Health check shows `"database": false`
- Errors: "Failed to connect to Supabase"
- Analysis fails to store results

**Response**:

```bash
# 1. Check Supabase status
curl -I $SUPABASE_URL
# Visit: https://status.supabase.com

# 2. Check database connectivity
psql "$SUPABASE_URL" -c "SELECT 1"

# 3. Check connection pool
psql "$SUPABASE_URL" -c "
SELECT count(*) as connections
FROM pg_stat_activity
WHERE datname = 'postgres';
"

# 4. If Supabase is down:
# - Service will queue writes and retry
# - Monitor Supabase status page
# - Notify stakeholders of degraded service

# 5. If connection pool exhausted:
# - Restart service to reset connections
# - Review connection pool settings
# - Check for connection leaks

# 6. If data corruption:
# - Stop service immediately
# - Follow data corruption procedure
# - Restore from backup if needed
```

### API Failures

**Symptoms**:
- Analysis fails with API errors
- Errors: "OpenAI API error", "Rate limit exceeded"
- High failure rate in Opik

**Response**:

```bash
# 1. Check API status
# OpenAI: https://status.openai.com
# Anthropic: https://status.anthropic.com

# 2. Verify API keys
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 3. Check API credits/quota
# OpenAI: https://platform.openai.com/usage
# Anthropic: https://console.anthropic.com/settings/usage

# 4. If rate limited:
# - Reduce MAX_MARKETS_PER_CYCLE
# - Increase ANALYSIS_INTERVAL_HOURS
# - Restart service

# 5. If API key invalid:
# - Rotate API key
# - Update .env
# - Restart service

# 6. If API is down:
# - Switch to backup provider (if multi-provider)
# - Or pause service until API recovers
```

### High Costs

**Symptoms**:
- Cost alert triggered
- Opik shows high costs
- Unexpected API usage

**Response**:

```bash
# 1. Stop service immediately
sudo systemctl stop tradewizard-monitor

# 2. Review recent analyses
curl -H "apikey: $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/analysis_history?select=*&order=created_at.desc&limit=50"

# 3. Check Opik for cost breakdown
# Visit: https://www.comet.com/opik

# 4. Identify cause:
# - Too many markets analyzed
# - Expensive model used
# - Infinite loop/retry
# - Configuration error

# 5. Adjust configuration:
nano .env
# Set MAX_MARKETS_PER_CYCLE=1
# Set ANALYSIS_INTERVAL_HOURS=48
# Use cheaper model: OPENAI_DEFAULT_MODEL=gpt-4o-mini

# 6. Restart service with monitoring
sudo systemctl start tradewizard-monitor

# 7. Monitor costs closely for 24 hours
```

### Security Incident

**Symptoms**:
- Unauthorized access detected
- Suspicious activity in logs
- API keys compromised
- Data breach suspected

**Response**:

```bash
# 1. STOP SERVICE IMMEDIATELY
sudo systemctl stop tradewizard-monitor

# 2. Isolate affected systems
# - Disable network access if needed
# - Revoke compromised credentials

# 3. Rotate all credentials
# - API keys (OpenAI, Anthropic, etc.)
# - Supabase keys
# - Database passwords

# 4. Review access logs
sudo journalctl -u tradewizard-monitor --since "24 hours ago" > /tmp/security-logs.txt

# 5. Check for data exfiltration
# - Review database access logs
# - Check Supabase audit logs
# - Review API usage patterns

# 6. Notify security team
# - Provide incident details
# - Share logs and evidence
# - Follow security incident procedures

# 7. Do NOT restart service until:
# - All credentials rotated
# - Security team approves
# - Vulnerability patched
```

## Communication Plan

### Internal Communication

#### Incident Channel

Create dedicated Slack channel:
```
#incident-YYYY-MM-DD-brief-description
```

#### Status Updates

Post updates every 15 minutes:

```
UPDATE: [HH:MM UTC]
Status: [Investigating/Identified/Fixing/Monitoring/Resolved]
Impact: [Description of user impact]
Actions: [What we're doing]
ETA: [Estimated resolution time]
Next Update: [Time]
```

#### Escalation

**Severity 1**:
- Immediate: Page all on-call engineers
- Within 5 min: Notify team lead
- Within 10 min: Notify management
- Within 15 min: Notify stakeholders

**Severity 2**:
- Immediate: Page primary on-call
- Within 15 min: Notify team lead
- Within 30 min: Notify stakeholders if not resolved

**Severity 3**:
- Immediate: Notify primary on-call
- Within 1 hour: Update team lead
- No stakeholder notification unless prolonged

### External Communication

#### Status Page

Update status page:
```
https://status.tradewizard.com

Status: [Operational/Degraded/Outage]
Component: Automated Market Monitor
Message: [Brief description]
Last Updated: [Time]
```

#### Stakeholder Notification

**Email Template**:

```
Subject: [Severity] Incident - TradeWizard Monitor

Dear Stakeholders,

We are currently experiencing [brief description of issue].

Impact: [What is affected]
Status: [Current status]
ETA: [Estimated resolution]

We will provide updates every [frequency].

For real-time updates, visit: https://status.tradewizard.com

Thank you for your patience.

TradeWizard Team
```

#### Social Media

For Severity 1 incidents:
```
We're aware of an issue affecting the TradeWizard Monitor.
Our team is investigating. Updates: https://status.tradewizard.com
```

## Post-Incident Review

### Timeline

Schedule within 48 hours of incident resolution.

### Attendees

- Incident Commander
- Technical Lead
- All responders
- Team Lead
- Product Manager (for Sev 1/2)

### Agenda

1. **Incident Overview** (5 min)
   - What happened
   - When it happened
   - Who was affected

2. **Timeline Review** (10 min)
   - Detection time
   - Response time
   - Resolution time
   - Key events

3. **Root Cause Analysis** (15 min)
   - What caused the incident
   - Why it wasn't caught earlier
   - Contributing factors

4. **Response Evaluation** (10 min)
   - What went well
   - What could be improved
   - Communication effectiveness

5. **Action Items** (15 min)
   - Preventive measures
   - Process improvements
   - Documentation updates
   - Monitoring enhancements

6. **Follow-up** (5 min)
   - Assign owners
   - Set deadlines
   - Schedule review

### Post-Incident Report Template

```markdown
# Post-Incident Report

## Incident Summary

- **Incident ID**: INC-YYYY-MM-DD-NNN
- **Severity**: [1/2/3/4]
- **Duration**: [Total time]
- **Impact**: [Description]
- **Root Cause**: [Brief description]

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Incident detected |
| HH:MM | Team assembled |
| HH:MM | Root cause identified |
| HH:MM | Fix implemented |
| HH:MM | Incident resolved |

## Root Cause

[Detailed explanation of what caused the incident]

## Impact

- **Users Affected**: [Number/percentage]
- **Services Affected**: [List]
- **Data Loss**: [Yes/No - details]
- **Financial Impact**: [Cost]

## Response

### What Went Well

- [Item 1]
- [Item 2]

### What Could Be Improved

- [Item 1]
- [Item 2]

## Action Items

| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| [Action 1] | [Name] | [Date] | [ ] |
| [Action 2] | [Name] | [Date] | [ ] |

## Lessons Learned

[Key takeaways and learnings]

## Appendix

- Logs: [Link]
- Metrics: [Link]
- Communication: [Link]
```

## Incident Metrics

Track and review monthly:

- **MTTD** (Mean Time To Detect): Time from incident start to detection
- **MTTR** (Mean Time To Resolve): Time from detection to resolution
- **Incident Count**: Total incidents by severity
- **Repeat Incidents**: Incidents with same root cause
- **False Positives**: Alerts that weren't actual incidents

## Continuous Improvement

### Monthly Review

- Review all incidents
- Identify patterns
- Update runbooks
- Improve monitoring
- Enhance automation

### Quarterly Goals

- Reduce MTTR by 20%
- Reduce incident count by 15%
- Eliminate repeat incidents
- Improve detection coverage

## Additional Resources

- [Runbook](./RUNBOOK.md) - Operational procedures
- [Rollback Procedure](./ROLLBACK_PROCEDURE.md) - Deployment rollback
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md) - Deployment guide
- [Monitoring and Alerts](./MONITORING_ALERTS.md) - Monitoring setup

## Contact Information

### Emergency Contacts

- **On-Call Engineer**: [Phone]
- **Team Lead**: [Phone]
- **Management**: [Phone]

### External Support

- **Supabase Support**: support@supabase.com
- **OpenAI Support**: https://help.openai.com
- **Opik Support**: support@comet.com

### Escalation Path

1. On-Call Engineer (Primary)
2. On-Call Engineer (Secondary)
3. Team Lead
4. Engineering Manager
5. CTO
