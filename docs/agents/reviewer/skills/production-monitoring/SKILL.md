---
name: production-monitoring
description: Monitor production health continuously, detect issues early, and maintain system reliability. Use for ongoing operational monitoring.
---

# Production Monitoring

## Purpose

Maintain continuous awareness of production system health through regular health checks, log analysis, performance monitoring, and proactive issue detection.

## When to Use

- Ongoing production health monitoring
- Post-deployment monitoring
- Performance verification
- Log analysis and error detection
- Regular operational checks
- Capacity planning

## Pre-Conditions

✅ Production access available
✅ production-monitor sub-agent available
✅ Monitoring tools configured
✅ Baseline metrics established

## Production Monitoring Workflow

### Phase 1: Health Status Check

**Use sub-agent**: `production-monitor`

**Daily health check**:

```bash
# Service status
docker compose ps

# Container health
docker inspect $(docker compose ps -q backend) | grep -A 5 Health

# API health endpoint
curl https://charhub.app/api/v1/health

# Database connection
# Check database queries executing
```

**Health indicators**:
- All containers running
- Health checks passing
- API responding correctly
- Database connectivity OK
- No critical errors in logs
- Resource usage normal

**Output**: Health status report

### Phase 2: Log Analysis

**Use sub-agent**: `production-monitor`

**Regular log review**:

```bash
# Recent error logs (last hour)
docker compose logs --since 1h backend | grep -i error
docker compose logs --since 1h frontend | grep -i error

# Warning logs
docker compose logs --since 1h backend | grep -i warn

# Application logs (last 100 lines)
docker compose logs --tail=100 backend

# Check for specific patterns
docker compose logs --since 24h backend | grep -i "exception"
docker compose logs --since 24h backend | grep -i "timeout"
docker compose logs --since 24h backend | grep -i "connection"
```

**Log analysis checklist**:
- [ ] Error frequency increasing?
- [ ] New error patterns?
- [ ] Repeated errors (same error multiple times)?
- [ ] Stack traces indicating code issues?
- [ ] Database query errors?
- [ ] API timeout errors?
- [ ] Authentication failures?
- [ ] Rate limiting issues?

**Output**: Log analysis report with issues identified

### Phase 3: Performance Monitoring

**Use sub-agent**: `production-monitor`

**Performance metrics**:

```bash
# Response time monitoring
curl -w "@curl-format.txt" https://charhub.app/api/v1/health

# Container resource usage
docker stats --no-stream

# Disk usage
df -h

# Memory usage
free -h

# CPU usage
top -bn1 | head -20

# Database performance
# Check query times, connection pool usage
```

**Performance indicators to track**:
- API response times (p50, p95, p99)
- Database query times
- Container CPU usage
- Container memory usage
- Disk I/O
- Network I/O
- Request rate
- Error rate

**Performance baselines**:
- API response time: <500ms (p95)
- Database query: <100ms (p95)
- Container CPU: <70%
- Container memory: <80%
- Error rate: <0.1%

**Output**: Performance report with anomalies flagged

### Phase 4: Error Tracking

**Use sub-agent**: `production-monitor`

**Error categorization**:

**By frequency**:
- **Sporadic**: <10 occurrences/hour
- **Frequent**: 10-100 occurrences/hour
- **Critical**: >100 occurrences/hour

**By severity**:
- **Critical**: Service unavailable, data loss
- **High**: Major feature broken
- **Medium**: Minor feature broken
- **Low**: Edge case, workaround available

**Error tracking**:
```markdown
# Error Log - {Date}

## New Errors
- {error_1}: {count} occurrences
- {error_2}: {count} occurrences

## Recurring Errors
- {error_1}: {count} occurrences (previous: {count})
- {error_2}: {count} occurrences (previous: {count})

## Resolved Errors
- {error_1}: No longer occurring

## Error Trends
- Increasing: {errors}
- Decreasing: {errors}
- Stable: {errors}
```

**Output**: Error tracking report

### Phase 5: Capacity Planning

**Use sub-agent**: `production-monitor`

**Capacity analysis**:

```bash
# Disk space trends
df -h | grep -v tmpfs

# Memory usage trends
free -h

# Database size
# Check database growth rate

# Log file sizes
du -sh /var/log/*
```

**Capacity indicators**:
- Disk usage trending up (>80%: action needed)
- Memory usage increasing (memory leak?)
- Database size growth rate
- Log file rotation working
- Backup space available

**Capacity planning actions**:
- Disk cleanup when >80% full
- Monitor memory leaks
- Plan database capacity expansion
- Review log retention policy
- Check backup storage

**Output**: Capacity report with recommendations

### Phase 6: Security Monitoring

**Use sub-agent**: `production-monitor`

**Security checks**:

```bash
# Authentication failures
docker compose logs --since 24h backend | grep -i "authentication failed"
docker compose logs --since 24h backend | grep -i "unauthorized"

# Rate limiting
docker compose logs --since 24h backend | grep -i "rate limit"

# Suspicious activity
# Multiple failed logins from same IP
# Unusual API usage patterns
# SQL injection attempts
```

**Security indicators**:
- Brute force attempts
- API abuse patterns
- Unusual data access patterns
- Configuration changes
- Failed authentication spikes

**Output**: Security monitoring report

### Phase 7: Uptime & Availability

**Use sub-agent**: `production-monitor`

**Availability tracking**:

```markdown
# Availability Report - {Period}

## Service Uptime
- Backend: {X.XX}%
- Frontend: {X.XX}%
- Database: {X.XX}%

## Downtime Incidents
- {date}: {duration} - {reason}
- {date}: {duration} - {reason}

## Availability Goals vs Actual
- Backend target: 99.9% | actual: {X.XX}%
- Frontend target: 99.9% | actual: {X.XX}%
```

**Output**: Availability report

## Monitoring Schedule

### Continuous Monitoring
- Error logs (automated alerts)
- Service health (every 5 minutes)
- Critical metrics (real-time)

### Daily Checks
- Health status
- Error log review
- Performance metrics
- Security indicators

### Weekly Reviews
- Performance trends
- Capacity planning
- Error patterns
- Security review

### Monthly Reports
- Availability summary
- Performance summary
- Incident summary
- Capacity planning

## Alert Thresholds

**Critical alerts (immediate action)**:
- Service down >5 minutes
- Error rate >5%
- API response time >2s (p95)
- Container resource usage >90%
- Disk usage >90%

**Warning alerts (investigate within 1 hour)**:
- Error rate >1%
- API response time >1s (p95)
- Container resource usage >80%
- Disk usage >80%

**Info alerts (review daily)**:
- Error rate >0.1%
- API response time >500ms (p95)
- Container resource usage >70%
- Disk usage >70%

## Output Format

```
"Production monitoring complete:

Period: {last 24h | last 7d | custom}

Health Status:
- All services running: YES/NO
- Health checks: PASSING/{X} FAILING
- API responding: YES/NO

Log Analysis:
- Errors found: {count}
- Warnings: {count}
- New errors: {count}
- Recurring errors: {count}

Performance:
- API response time (p95): {X}ms
- Database query time (p95): {X}ms
- Container CPU: {X}%
- Container memory: {X}%

Capacity:
- Disk usage: {X}%
- Memory usage: {X}%
- Database size: {X}GB

Security:
- Authentication failures: {count}
- Suspicious activity: {count}

Issues Found:
- {issue_1}: {severity}
- {issue_2}: {severity}

Recommendations:
- {recommendation_1}
- {recommendation_2}

Next Check: {time}"
```

## Integration with Workflow

```
production-monitoring (THIS SKILL)
    ↓
Health status check
    ↓
Log analysis
    ↓
Performance monitoring
    ↓
Error tracking
    ↓
Capacity planning
    ↓
Security monitoring
    ↓
Generate monitoring report
    ↓
incident-response-protocol (if issues found)
```

---

## Monitoring Tools Reference

**Built-in tools**:
```bash
# Docker
docker compose ps           # Container status
docker stats               # Resource usage
docker logs                # Container logs
docker inspect             # Container details

# System
df -h                      # Disk usage
free -h                    # Memory usage
top                        # CPU usage
htop                       # Interactive monitoring

# Network
curl -w                    # Response time metrics
netstat                    # Network connections
tcpdump                    # Packet capture

# Logs
journalctl                 # System logs
docker compose logs        # Container logs
tail -f                    # Follow log files
grep                       # Search logs
```

**Health endpoints**:
```bash
# Backend health
curl https://charhub.app/api/v1/health

# Frontend serving
curl -I https://charhub.app

# Database connectivity
# (check via backend logs)
```

---

Remember: **Prevention Through Detection - Monitor Continuously**

Early detection of issues prevents incidents. Regular monitoring catches problems before they impact users.
