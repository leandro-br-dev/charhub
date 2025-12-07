# Documentation Restructure Proposal

**Date**: 2025-12-05
**Status**: Proposed
**Author**: Agent Reviewer

---

## Current Problems

1. **Flat structure**: 14 files in root of `docs/reviewer/` without clear organization
2. **Mixed purposes**: Technical guides, business plans, agent instructions all mixed together
3. **Hard to navigate**: No clear entry point or hierarchy
4. **Obsolete scripts**: `/scripts/` folder contains PowerShell scripts for old deployment model

---

## Industry Standards Analysis

### 1. **GitLab Documentation Pattern**
```
docs/
├── README.md                    # Entry point
├── architecture/                # System design
├── development/                 # Development guides
├── operations/                  # DevOps/SRE
├── user/                        # End-user documentation
└── api/                         # API reference
```

### 2. **Kubernetes Documentation Pattern**
```
docs/
├── concepts/                    # Core concepts
├── tasks/                       # How-to guides
├── tutorials/                   # Step-by-step
├── reference/                   # API/CLI reference
└── contributing/                # Contributor guide
```

### 3. **AWS Well-Architected Framework**
```
docs/
├── security/                    # Security best practices
├── reliability/                 # SLAs, monitoring
├── performance/                 # Optimization
├── cost-optimization/           # Cost management
└── operational-excellence/      # Operations
```

---

## Proposed Structure for CharHub

### Based on: **Diátaxis Framework** (Industry Best Practice)

The Diátaxis framework divides documentation into 4 quadrants:

1. **Tutorials** (Learning-oriented): "Take me by the hand"
2. **How-To Guides** (Task-oriented): "Show me how to..."
3. **Reference** (Information-oriented): "Tell me exactly..."
4. **Explanation** (Understanding-oriented): "Help me understand..."

### Our Proposed Structure

```
docs/reviewer/
│
├── README.md                           # 📍 Main entry point (navigation hub)
├── CLAUDE.md                           # 🤖 Agent instructions (stays in root)
│
├── 01-getting-started/                 # 🚀 TUTORIALS (Learning)
│   ├── README.md                       # Index
│   ├── quick-start.md                  # From: QUICK-START-REVIEWER.md
│   ├── agent-overview.md               # From: AGENT-REVIEWER-README.md
│   └── local-development-setup.md      # New
│
├── 02-guides/                          # 📖 HOW-TO GUIDES (Tasks)
│   ├── README.md                       # Index
│   ├── deployment/                     # Deployment guides
│   │   ├── README.md                   # From: DEPLOYMENT_GUIDE.md
│   │   ├── cd-deploy-guide.md          # From: deploy/CD_DEPLOY_GUIDE.md
│   │   ├── vm-setup-recovery.md        # From: deploy/VM_SETUP_AND_RECOVERY.md
│   │   └── manual-deployment.md        # New (SSH-based)
│   ├── infrastructure/                 # Infrastructure management
│   │   ├── database-connection.md      # From: DATABASE_CONNECTION_GUIDE.md
│   │   ├── ssh-key-setup.md            # From: SSH_KEY_SETUP.md
│   │   └── gcloud-setup.md             # New
│   ├── development/                    # Development workflows
│   │   ├── git-github-actions.md       # From: GIT_AND_GITHUB_ACTIONS_REFERENCE.md
│   │   ├── testing-workflow.md         # New
│   │   └── code-review-process.md      # New
│   └── troubleshooting/                # Problem-solving
│       ├── common-issues.md            # New
│       └── debugging-production.md     # New
│
├── 03-reference/                       # 📚 REFERENCE (Information)
│   ├── README.md                       # Index
│   ├── api/                            # API documentation
│   │   └── backend-api.md              # New
│   ├── cli/                            # CLI reference
│   │   ├── gcloud-commands.md          # New
│   │   └── docker-commands.md          # New
│   ├── workflows/                      # GitHub Actions
│   │   ├── backend-ci.md               # From: WORKFLOWS_REAL_ANALYSIS.md (part)
│   │   ├── deploy-production.md        # From: WORKFLOWS_REAL_ANALYSIS.md (part)
│   │   └── workflow-triggers.md        # New
│   └── scripts/                        # Scripts documentation
│       ├── README.md                   # Index of available scripts
│       ├── backup-restore.md           # Documents backup scripts
│       └── deprecated-scripts.md       # Documents obsolete scripts
│
├── 04-architecture/                    # 🏛️ EXPLANATION (Understanding)
│   ├── README.md                       # Index
│   ├── system-overview.md              # High-level architecture
│   ├── database-schema.md              # Prisma schema explained
│   ├── multi-agent-system.md           # Agent architecture
│   ├── deployment-pipeline.md          # CI/CD explained
│   └── security-model.md               # Security architecture
│
├── 05-business/                        # 💼 BUSINESS (Planning & Metrics)
│   ├── README.md                       # Index
│   ├── roadmap/                        # Product roadmap
│   │   ├── README.md                   # From: ROADMAP.md (if exists)
│   │   ├── implemented-features.md     # From: IMPLEMENTED_AND_NEEDS_TESTING.md
│   │   ├── missing-features.md         # From: MISSING_FEATURES_SUMMARY.md
│   │   └── undocumented-features.md    # From: UNDOCUMENTED_FEATURES_FOUND.md
│   ├── planning/                       # Sprint planning
│   │   ├── agent-assignments.md        # From: agent-assignments.md
│   │   └── coder-next-sprint.md        # From: AGENT_CODER_NEXT_SPRINT.md
│   ├── metrics/                        # Analytics & KPIs
│   │   ├── README.md                   # Metrics overview
│   │   └── weekly-report-template.md   # From: metrics/weekly-report-template.md
│   └── analysis/                       # Business analysis
│       ├── migration-scripts.md        # From: MIGRATION_SCRIPTS_ANALYSIS.md
│       └── feature-usage.md            # New
│
├── 06-operations/                      # ⚙️ OPERATIONS (SRE)
│   ├── README.md                       # Index
│   ├── monitoring/                     # Observability
│   │   ├── health-checks.md            # New
│   │   ├── logging.md                  # New
│   │   └── alerting.md                 # New
│   ├── incident-response/              # Incident management
│   │   ├── runbooks.md                 # New
│   │   └── postmortems/                # Incident reports
│   └── maintenance/                    # Routine maintenance
│       ├── backup-restore.md           # New
│       └── database-maintenance.md     # New
│
└── 07-contributing/                    # 🤝 CONTRIBUTING (For team)
    ├── README.md                       # Contribution guide
    ├── code-style.md                   # Coding standards
    ├── documentation-style.md          # Doc writing standards
    └── agent-workflow.md               # Multi-agent workflow
```

---

## Scripts Folder Analysis & Proposal

### Current Scripts (Root `/scripts/`)

| Script | Purpose | Status | Action |
|--------|---------|--------|--------|
| `deploy-git.ps1` | PowerShell deploy via git | ❌ **OBSOLETE** | Archive or delete |
| `rollback.ps1` | PowerShell rollback | ❌ **OBSOLETE** | Archive or delete |
| `sync-secrets.ps1` | PowerShell secrets sync | ❌ **OBSOLETE** | Archive or delete |
| `vm-status.ps1` | PowerShell VM status | ❌ **OBSOLETE** | Archive or delete |
| `backup/backup-database.sh` | Bash database backup | ⚠️ **REVIEW** | Test & document |
| `backup/restore-database.sh` | Bash database restore | ⚠️ **REVIEW** | Test & document |
| `backup/list-backups.sh` | Bash list backups | ⚠️ **REVIEW** | Test & document |
| `backup/setup-backup-cron.sh` | Bash cron setup | ⚠️ **REVIEW** | Test & document |
| `backup/*.service` | Systemd service files | ⚠️ **REVIEW** | Test & document |
| `backup/*.timer` | Systemd timer files | ⚠️ **REVIEW** | Test & document |

### Analysis

#### **PowerShell Scripts (`.ps1`)**
- **Why Obsolete**: Written for old deployment model (direct SSH from Windows)
- **Current Model**: GitHub Actions-based CD pipeline
- **Replacement**: GitHub Actions workflows handle deploy/rollback/secrets
- **Recommendation**: Move to `/scripts/archive/legacy/` with README explaining history

#### **Bash Backup Scripts**
- **Potentially Useful**: Database backup/restore is critical
- **Need Testing**: Unknown if compatible with current GCP VM setup
- **Need Documentation**: No README explaining usage
- **Recommendation**:
  1. Test each script on production VM
  2. Update for Container-Optimized OS if needed
  3. Create comprehensive documentation
  4. Move working scripts to `/scripts/backup/` (keep)
  5. Delete if completely broken and not worth fixing

### Proposed Scripts Structure

```
scripts/
├── README.md                           # Index of all scripts
├── backup/                             # Database backup scripts
│   ├── README.md                       # Usage documentation
│   ├── backup-database.sh              # ✅ Tested & documented
│   ├── restore-database.sh             # ✅ Tested & documented
│   ├── list-backups.sh                 # ✅ Tested & documented
│   ├── setup-backup-cron.sh            # ✅ Tested & documented
│   ├── charhub-backup.service          # ✅ Tested & documented
│   └── charhub-backup.timer            # ✅ Tested & documented
├── deployment/                         # Deployment utilities
│   ├── README.md                       # Usage documentation
│   ├── manual-deploy.sh                # New: Manual deploy helper
│   └── health-check.sh                 # New: Production health check
├── development/                        # Development utilities
│   ├── README.md                       # Usage documentation
│   ├── reset-local-db.sh               # New: Reset local database
│   └── sync-prod-db.sh                 # New: Sync prod DB to local
└── archive/                            # Obsolete scripts (historical)
    ├── README.md                       # Explains why archived
    └── legacy/                         # Old PowerShell scripts
        ├── deploy-git.ps1              # Historical reference
        ├── rollback.ps1                # Historical reference
        ├── sync-secrets.ps1            # Historical reference
        └── vm-status.ps1               # Historical reference
```

---

## Migration Plan

### Phase 1: Preparation (1-2 hours)
1. Create new folder structure (empty folders + README stubs)
2. Create main `/docs/reviewer/README.md` with navigation
3. Test backup scripts on production VM
4. Document script testing results

### Phase 2: Content Migration (2-3 hours)
1. Move existing files to new locations (using `git mv` to preserve history)
2. Update internal links in all documents
3. Create missing README.md files in each folder
4. Archive obsolete PowerShell scripts

### Phase 3: Scripts Cleanup (1-2 hours)
1. Test backup scripts on production
2. Document working scripts
3. Fix or delete broken scripts
4. Create new utility scripts if needed

### Phase 4: Validation (1 hour)
1. Verify all links work
2. Check navigation flow
3. Ensure no broken references
4. Test that CLAUDE.md still works for agent

### Phase 5: Commit & Documentation (30 min)
1. Create comprehensive commit explaining restructure
2. Update CLAUDE.md with new structure references
3. Commit locally (wait for user approval before push)

---

## Benefits of This Structure

### For Agent Reviewer
- ✅ Clear separation of concerns
- ✅ Easier to find relevant documentation
- ✅ Logical navigation hierarchy
- ✅ Scales as project grows

### For User
- ✅ Professional, industry-standard organization
- ✅ Easy onboarding for new team members
- ✅ Clear distinction: technical vs business vs operations
- ✅ Better GitHub/GitLab documentation rendering

### For Future Agents
- ✅ Agent Coder knows where to put feature docs
- ✅ Agent Reviewer knows where to put operational guides
- ✅ New agents can easily understand structure

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Broken links in old commits | Low | Use `git mv` to preserve history |
| Agent confusion during transition | Medium | Update CLAUDE.md with new paths |
| Scripts might be completely broken | Low | Test before deleting, archive if unsure |
| Too much work for uncertain benefit | Medium | Start with Phase 1-2, evaluate before Phase 3-5 |

---

## Next Steps

**Option A: Full Restructure**
- Execute all 5 phases
- Comprehensive reorganization
- ~6-8 hours total effort

**Option B: Incremental Restructure**
- Start with Phase 1-2 (folders + migration)
- Defer scripts cleanup to later
- ~3-4 hours total effort

**Option C: Scripts Only**
- Focus only on scripts folder
- Test, document, or archive
- ~2-3 hours total effort

---

## Recommendation

I recommend **Option B: Incremental Restructure**

**Rationale**:
1. Documentation structure provides immediate value
2. Scripts can be addressed as separate task
3. Lower risk (can validate structure before scripts work)
4. Faster time-to-value

**User Decision Required**:
- Which option do you prefer?
- Should I proceed with implementation?
- Any modifications to proposed structure?
