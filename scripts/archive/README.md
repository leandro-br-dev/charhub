# Archived Scripts

**Last Updated**: 2025-12-05

---

## 📋 Overview

This directory contains scripts that are **no longer used** in the current infrastructure but are kept for historical reference.

---

## 🗂️ Archived Directories

### `/legacy/` - PowerShell Scripts (Pre-GitHub Actions)

**Date Archived**: 2025-12-05
**Reason**: Replaced by GitHub Actions CI/CD Pipeline

These PowerShell scripts were used for manual deployment before the implementation of automated CI/CD via GitHub Actions.

**Archived Scripts**:
- `deploy-git.ps1` - Manual deployment via SSH from Windows
- `rollback.ps1` - Manual rollback procedure
- `sync-secrets.ps1` - Manual secrets synchronization
- `vm-status.ps1` - VM status check from Windows

**Why Archived**:
1. **GitHub Actions Replacement**: Automated CD pipeline (`deploy-production.yml`) handles all deployment tasks
2. **Platform Change**: Moved from Windows-based manual deploy to GitHub-hosted runners
3. **Security Improvement**: Secrets managed via GitHub Secrets instead of local sync
4. **Efficiency**: Automated deploys (4-5 min) vs manual PowerShell (15-20 min)

**Historical Context**:
These scripts were created for the initial deployment model where:
- Developer worked on Windows machine
- Deployment via PowerShell + SSH
- Manual secret management
- No automated testing before deploy

**Current Replacement**:
- **Deploy**: GitHub Actions workflow (`.github/workflows/deploy-production.yml`)
- **Rollback**: `git revert HEAD && git push origin main`
- **Secrets**: GitHub Secrets + automatic sync in workflow
- **Status**: GitHub Actions monitoring + `gcloud compute ssh`

---

## 🔍 How to Find Current Solutions

| Old Script | Current Solution | Documentation |
|------------|------------------|---------------|
| `deploy-git.ps1` | GitHub Actions CD | [CD Deploy Guide](../../docs/02-guides/deployment/cd-deploy-guide.md) |
| `rollback.ps1` | Git revert + push | [CD Deploy Guide - Rollback](../../docs/02-guides/deployment/cd-deploy-guide.md#rollback-procedures) |
| `sync-secrets.ps1` | GitHub Secrets | [CD Deploy Guide - Secrets](../../docs/02-guides/deployment/cd-deploy-guide.md#github-secrets-required) |
| `vm-status.ps1` | `gcloud compute ssh` | [VM Setup Guide](../../docs/02-guides/deployment/vm-setup-recovery.md) |

---

## ⚠️ DO NOT USE

**These scripts will NOT work with current infrastructure**:

- ❌ Reference old VM paths
- ❌ Use deprecated authentication methods
- ❌ Expect different Docker setup
- ❌ Missing Container-Optimized OS configurations
- ❌ Not compatible with current deployment pipeline

---

## 📚 Why Keep Archived Scripts?

1. **Historical Reference**: Understanding evolution of deployment process
2. **Knowledge Transfer**: Learning what worked/didn't work
3. **Disaster Recovery**: If GitHub Actions completely fails, scripts show manual process
4. **Documentation**: Show progression from manual to automated

---

## 🗑️ Deletion Policy

**When to Delete**:
- After 1 year from archiving (2026-12-05)
- If repository size becomes an issue
- If no one references them in 6 months

**Before Deletion**:
- Document key learnings in main documentation
- Ensure all functionality is covered by current system
- Get user approval

---

[← Back to Scripts](../) | [← Back to Documentation Home](../../docs/README.md)
