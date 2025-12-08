# Incident: [YYYY-MM-DD] - [Incident Title]

**Date**: YYYY-MM-DD
**Severity**: Critical / High / Medium / Low
**Duration**: HH:MM (total time from detection to resolution)
**Status**: Resolved / Ongoing / Mitigated

---

## 📋 Summary

Brief 1-2 sentence description of what happened.

**Impact**:
- Users affected: [number or percentage]
- Services affected: [list services]
- Business impact: [revenue loss, user experience degradation, etc.]

---

## ⏱️ Timeline

**All times in UTC-3 (São Paulo time)**

| Time | Event | Action Taken |
|------|-------|--------------|
| HH:MM | Incident detected | [How it was detected - alerts, user reports, etc.] |
| HH:MM | Investigation started | [Who started investigating] |
| HH:MM | Root cause identified | [What was found] |
| HH:MM | Mitigation applied | [What temporary fix was applied] |
| HH:MM | Fix deployed | [Permanent solution deployed] |
| HH:MM | Incident resolved | [Service fully restored] |
| HH:MM | Monitoring confirmed stable | [No further issues detected] |

---

## 🔍 Detection

**How was the incident detected?**
- [ ] Automated alert (specify which alert)
- [ ] User report
- [ ] Manual discovery during deployment
- [ ] Monitoring dashboard
- [ ] Other: [specify]

**Alert details** (if applicable):
```
[Paste alert message or monitoring graph]
```

---

## 🐛 Root Cause

**What caused the incident?**

[Detailed explanation of the root cause]

**Technical details**:
- Component affected: [backend, frontend, database, infrastructure]
- Error messages: [paste relevant errors]
- Logs: [paste relevant log excerpts]

**Why it happened**:
- [Explain the sequence of events that led to the incident]

---

## 🔧 Resolution

**Immediate mitigation** (temporary fix):
```bash
# Commands executed to mitigate
[paste commands]
```

**Permanent fix**:
- PR: [link to PR if applicable]
- Commit: [commit hash]
- Changes made: [describe what was changed]

**Verification**:
- [ ] Service health check passed
- [ ] Error rate returned to normal
- [ ] User functionality restored
- [ ] Monitoring shows stable metrics

---

## 📊 Impact Analysis

**System metrics during incident**:
- Error rate: [X%]
- Response time: [Xms]
- CPU/Memory usage: [X%]
- Database connections: [X]

**User impact**:
- Users affected: [number]
- Failed requests: [number]
- Duration of impact: [HH:MM]

**Business impact**:
- Revenue loss (if applicable): R$ [amount]
- User complaints: [number]
- SLA violation: Yes/No

---

## ✅ Action Items

**Immediate** (prevent recurrence):
- [ ] [Action item 1] - Owner: [name] - Due: [date]
- [ ] [Action item 2] - Owner: [name] - Due: [date]

**Short-term** (improve detection and response):
- [ ] Add monitoring for [specific metric] - Owner: [name] - Due: [date]
- [ ] Create runbook for [similar issue] - Owner: [name] - Due: [date]
- [ ] Update alert thresholds - Owner: [name] - Due: [date]

**Long-term** (architectural improvements):
- [ ] [Improvement 1] - Owner: [name] - Due: [date]
- [ ] [Improvement 2] - Owner: [name] - Due: [date]

---

## 💡 Lessons Learned

**What went well**:
- [Thing 1]
- [Thing 2]

**What could be improved**:
- [Thing 1]
- [Thing 2]

**Process improvements**:
- [Improvement 1]
- [Improvement 2]

---

## 📚 Related Documents

**Documentation updated**:
- [ ] Runbook created/updated: [link]
- [ ] Deployment guide updated: [link]
- [ ] Architecture docs updated: [link]
- [ ] Monitoring guide updated: [link]

**Related incidents**:
- [Link to similar past incidents if any]

---

## 👥 People Involved

- **Incident Commander**: [name]
- **Responders**: [names]
- **Notified**: [stakeholders notified]

---

**Postmortem completed by**: [name]
**Date**: YYYY-MM-DD
**Review status**: [ ] Reviewed by team / [ ] Pending review
