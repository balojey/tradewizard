# End-to-End Deployment Checklist

This checklist ensures all steps are completed for successful staging deployment and 48-hour testing of the Automated Market Monitor.

## Pre-Deployment Checklist

### Environment Setup

- [ ] **Staging Server Provisioned**
  - [ ] Linux server (Ubuntu 20.04+) or VM available
  - [ ] At least 2GB RAM and 10GB disk space
  - [ ] SSH access configured
  - [ ] Firewall rules allow outbound HTTPS (443)
  - [ ] Port 3000 accessible for health checks

- [ ] **Node.js Installed**
  - [ ] Node.js 18+ installed
  - [ ] npm or yarn available
  - [ ] Verify: `node --version` shows 18.x or higher

- [ ] **PM2 Installed (Recommended)**
  - [ ] Install globally: `npm install -g pm2`
  - [ ] Verify: `pm2 --version`
  - [ ] Configure PM2 startup: `pm2 startup`

### Supabase Setup

- [ ] **Staging Project Created**
  - [ ] New Supabase project created: `tradewizard-staging`
  - [ ] Project URL noted
  - [ ] Anon key noted
  - [ ] Service role key noted
  - [ ] Database password saved securely

- [ ] **Database Migrations Run**
  - [ ] All migration files applied
  - [ ] Tables created: `markets`, `recommendations`, `agent_signals`, `analysis_history`, `langgraph_checkpoints`
  - [ ] Indexes created
  - [ ] Foreign keys configured
  - [ ] Verify with: `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`

- [ ] **Database Permissions**
  - [ ] Service role has full access
  - [ ] Anon key has appropriate read/write permissions
  - [ ] RLS policies configured (if needed)

### API Keys

- [ ] **LLM Provider Keys**
  - [ ] OpenAI API key obtained (or Anthropic/Google)
  - [ ] Key tested and working
  - [ ] Billing configured and limits set
  - [ ] Budget alerts configured

- [ ] **Polymarket Access**
  - [ ] Gamma API accessible
  - [ ] CLOB API accessible
  - [ ] No authentication required (public endpoints)

- [ ] **Opik (Optional)**
  - [ ] Opik account created
  - [ ] API key obtained
  - [ ] Project created: `tradewizard-staging`
  - [ ] Dashboard accessible

- [ ] **External Data APIs (Optional)**
  - [ ] NewsAPI key (if using)
  - [ ] Twitter API key (if using)
  - [ ] Reddit API key (if using)

### Code Deployment

- [ ] **Repository Cloned**
  - [ ] Code cloned to staging server
  - [ ] Correct branch checked out
  - [ ] Git status clean

- [ ] **Dependencies Installed**
  - [ ] `npm install` completed successfully
  - [ ] No vulnerability warnings (or acceptable)
  - [ ] `node_modules` populated

- [ ] **Build Successful**
  - [ ] `npm run build` completed
  - [ ] `dist/` directory created
  - [ ] No TypeScript errors

- [ ] **Environment Configured**
  - [ ] `.env` file created from `.env.monitor.example`
  - [ ] All required variables set
  - [ ] Secrets properly secured (not in git)
  - [ ] Configuration validated

## Deployment Checklist

### Initial Deployment

- [ ] **Configuration Validation**
  - [ ] Run: `npm run monitor:start` (will validate config)
  - [ ] No configuration errors
  - [ ] All required variables present
  - [ ] Database connection successful

- [ ] **Service Start**
  - [ ] Monitor started: `npm run monitor:start`
  - [ ] Process running: `npm run monitor:status`
  - [ ] No startup errors in logs
  - [ ] PID file created (if not using PM2)

- [ ] **Health Check Verification**
  - [ ] Health endpoint accessible: `curl http://localhost:3000/health`
  - [ ] Returns status 200
  - [ ] JSON response valid
  - [ ] Status shows "healthy"

- [ ] **Initial Smoke Test**
  - [ ] Database connection confirmed
  - [ ] Scheduler initialized
  - [ ] Next run scheduled
  - [ ] No errors in logs

### Monitoring Setup

- [ ] **Log Access Configured**
  - [ ] PM2 logs accessible: `pm2 logs tradewizard-monitor`
  - [ ] Or console logs redirected to file
  - [ ] Log rotation configured (if needed)
  - [ ] Log level appropriate (info for staging)

- [ ] **Metrics Collection**
  - [ ] Health check endpoint monitored
  - [ ] Resource usage tracked (CPU, memory)
  - [ ] Database size monitored
  - [ ] API quota tracked

- [ ] **Alerting (Optional)**
  - [ ] Uptime monitoring configured
  - [ ] Error alerts configured
  - [ ] Resource alerts configured
  - [ ] Quota alerts configured

## Testing Checklist

### Automated Tests

- [ ] **E2E Test Suite**
  - [ ] Run: `npm run test:e2e`
  - [ ] All tests pass
  - [ ] Report generated: `e2e-test-report.json`
  - [ ] No critical failures

### Manual Tests

- [ ] **Test 1: Initial Startup**
  - [ ] Monitor starts without errors
  - [ ] All components initialize
  - [ ] Health check returns "healthy"
  - [ ] Database connection confirmed

- [ ] **Test 2: Market Discovery**
  - [ ] Wait for first scheduled run (or trigger manually)
  - [ ] Markets discovered from Polymarket
  - [ ] Markets filtered for political events
  - [ ] Markets ranked by trending score
  - [ ] Top N markets selected

- [ ] **Test 3: Market Analysis**
  - [ ] Analysis workflow executes
  - [ ] Trade recommendations generated
  - [ ] Agent signals collected
  - [ ] Results stored in database
  - [ ] No analysis errors

- [ ] **Test 4: Data Persistence**
  - [ ] Markets table populated
  - [ ] Recommendations table populated
  - [ ] Agent signals table populated
  - [ ] Analysis history recorded
  - [ ] Timestamps accurate

- [ ] **Test 5: Scheduled Execution**
  - [ ] Analysis runs at scheduled time
  - [ ] Next run rescheduled
  - [ ] Multiple cycles complete
  - [ ] Timing is consistent

- [ ] **Test 6: API Quota Management**
  - [ ] Quota usage tracked
  - [ ] Limits respected
  - [ ] Market count adjusts when needed
  - [ ] No quota overages

- [ ] **Test 7: Graceful Shutdown**
  - [ ] Stop during analysis: `npm run monitor:stop`
  - [ ] Current analysis completes
  - [ ] No partial records in database
  - [ ] Clean exit (code 0)

- [ ] **Test 8: Service Restart**
  - [ ] Stop monitor
  - [ ] Wait 30 seconds
  - [ ] Start monitor
  - [ ] Resumes normal operation
  - [ ] No duplicate runs

- [ ] **Test 9: Health Check Accuracy**
  - [ ] Health check reflects actual status
  - [ ] All fields accurate
  - [ ] Updates in real-time
  - [ ] Degraded states detected

- [ ] **Test 10: Manual Triggers**
  - [ ] Get valid condition ID
  - [ ] Trigger: `npm run monitor:trigger <id>`
  - [ ] Analysis runs immediately
  - [ ] Results returned
  - [ ] Results stored

- [ ] **Test 11: Error Recovery**
  - [ ] Simulate API failure
  - [ ] Monitor continues running
  - [ ] Retries with backoff
  - [ ] Other markets process
  - [ ] Service remains healthy

### 48-Hour Continuous Test

- [ ] **Start Continuous Monitoring**
  - [ ] Run: `npm run test:e2e:continuous`
  - [ ] Or manually monitor for 48 hours
  - [ ] Document start time

- [ ] **Periodic Checks (Every 6 Hours)**
  - [ ] Check 1 (6h): Service running, no errors
  - [ ] Check 2 (12h): Service running, no errors
  - [ ] Check 3 (18h): Service running, no errors
  - [ ] Check 4 (24h): Service running, quota reset occurred
  - [ ] Check 5 (30h): Service running, no errors
  - [ ] Check 6 (36h): Service running, no errors
  - [ ] Check 7 (42h): Service running, no errors
  - [ ] Check 8 (48h): Service running, test complete

- [ ] **Metrics Collection**
  - [ ] Total uptime recorded
  - [ ] Number of analysis cycles
  - [ ] Number of markets analyzed
  - [ ] Total API calls per source
  - [ ] Average analysis duration
  - [ ] Total cost (from Opik)
  - [ ] Memory usage trend
  - [ ] CPU usage trend
  - [ ] Database size growth

- [ ] **Issue Documentation**
  - [ ] All issues documented
  - [ ] Severity assigned
  - [ ] Reproduction steps noted
  - [ ] Logs captured
  - [ ] Database state captured

## Success Criteria

- [ ] **Uptime**: 48 hours continuous operation with no unplanned restarts
- [ ] **Discovery**: Markets discovered in every scheduled cycle
- [ ] **Analysis**: At least 80% of markets analyzed successfully
- [ ] **Persistence**: All successful analyses stored in database
- [ ] **Quotas**: API quotas respected (no overages)
- [ ] **Shutdown**: Graceful shutdown completes without data loss
- [ ] **Health**: Health checks return accurate status throughout
- [ ] **Triggers**: Manual triggers work when tested
- [ ] **Recovery**: Service recovers from simulated failures
- [ ] **Performance**: Memory usage remains stable (no leaks)

## Post-Test Checklist

### Results Documentation

- [ ] **Test Report Generated**
  - [ ] E2E test report saved
  - [ ] All test results documented
  - [ ] Metrics collected and analyzed
  - [ ] Issues documented with details

- [ ] **Database Verification**
  - [ ] Final row counts recorded
  - [ ] Data quality verified
  - [ ] No orphaned records
  - [ ] Relationships intact

- [ ] **Performance Analysis**
  - [ ] Memory usage analyzed
  - [ ] CPU usage analyzed
  - [ ] Database performance analyzed
  - [ ] Cost analysis completed

### Issue Resolution

- [ ] **Critical Issues**
  - [ ] All critical issues identified
  - [ ] Root causes determined
  - [ ] Fixes implemented
  - [ ] Fixes verified

- [ ] **High Priority Issues**
  - [ ] All high priority issues identified
  - [ ] Fixes planned or implemented
  - [ ] Workarounds documented

- [ ] **Medium/Low Issues**
  - [ ] All issues documented
  - [ ] Prioritized for future work
  - [ ] Tracked in issue system

### Documentation Updates

- [ ] **Deployment Guide Updated**
  - [ ] Lessons learned incorporated
  - [ ] Known issues documented
  - [ ] Troubleshooting expanded
  - [ ] Best practices added

- [ ] **Runbook Created**
  - [ ] Common operations documented
  - [ ] Troubleshooting procedures
  - [ ] Emergency procedures
  - [ ] Contact information

### Cleanup

- [ ] **Staging Environment**
  - [ ] Monitor stopped
  - [ ] Decision: Keep or delete staging data
  - [ ] Decision: Keep or delete staging project
  - [ ] Resources cleaned up (if deleting)

- [ ] **Local Files**
  - [ ] Test reports archived
  - [ ] Logs archived
  - [ ] Temporary files cleaned

## Next Steps

- [ ] **Production Readiness Review**
  - [ ] All success criteria met
  - [ ] All critical issues resolved
  - [ ] Documentation complete
  - [ ] Team approval obtained

- [ ] **Production Deployment Plan**
  - [ ] Production environment prepared
  - [ ] Deployment schedule set
  - [ ] Rollback plan documented
  - [ ] Monitoring configured
  - [ ] Alerts configured

- [ ] **Go/No-Go Decision**
  - [ ] Test results reviewed
  - [ ] Issues assessed
  - [ ] Risk evaluated
  - [ ] Decision documented

## Sign-Off

- [ ] **Technical Lead**: _________________ Date: _______
- [ ] **QA Lead**: _________________ Date: _______
- [ ] **Product Owner**: _________________ Date: _______

## Notes

Use this section to document any additional notes, observations, or decisions made during the deployment and testing process.

---

**Deployment Date**: _________________

**Test Start Time**: _________________

**Test End Time**: _________________

**Overall Result**: ☐ PASS  ☐ FAIL  ☐ CONDITIONAL PASS

**Production Deployment**: ☐ APPROVED  ☐ DELAYED  ☐ CANCELLED

