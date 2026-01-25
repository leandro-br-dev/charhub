---
name: production-env-sync
description: Validate and sync production environment variables. Use before deployment to ensure .env.production has all required keys, and sync to production server. Agent Reviewer exclusive.
---

# Production Environment Sync

## Purpose

Validate and synchronize production environment variables between local `.env.production` and production server. This skill ensures production deployments have all required environment configuration before going live.

**Agent Scope**: This skill is **exclusive to Agent Reviewer** and should not be used by other agents.

## When to Use

Use this skill:
- **Before deployment**: Validate `.env.production` has all required keys from `.env`
- **After environment changes**: Sync new or changed variables to production
- **During deployment coordination**: As part of pre-deployment validation
- **When adding new features**: Ensure new environment variables are deployed

## Available Scripts

### 1. env-compare.sh - Compare Environment Keys

**Purpose**: Compare keys between local `.env` files and `.env.production` files to identify missing keys.

**Usage**:
```bash
./scripts/ops/env-compare.sh
```

**What it does**:
- Compares **3 file pairs**:
  - `.env` ↔ `.env.production` (root)
  - `backend/.env` ↔ `backend/.env.production`
  - `frontend/.env` ↔ `frontend/.env.production`
- Reports keys missing in `.env.production` files
- Reports extra keys in `.env.production` files (production-specific)
- Provides suggestions for fixing missing keys
- Masks sensitive values (PASSWORD, SECRET, TOKEN, KEY, PRIVATE)

**Does NOT**:
- Compare values (only key existence)
- Modify any files
- Connect to remote servers

**Exit Codes**:
- `0` - All keys match (success)
- `1` - Missing keys detected (needs action)

### 2. env-sync-production.sh - Sync to Production Server

**Purpose**: Sync `.env.production` from local to production server via SSH.

**Usage**:
```bash
# Live sync (with confirmation)
./scripts/ops/env-sync-production.sh

# Dry run (show what would change)
./scripts/ops/env-sync-production.sh --dry-run

# Force sync (skip confirmation)
./scripts/ops/env-sync-production.sh --force

# Backup only (no sync)
./scripts/ops/env-sync-production.sh --backup-only

# Show help
./scripts/ops/env-sync-production.sh --help
```

**What it does**:
- Creates backup on remote server before overwriting
- Uploads `.env.production` to production server
- Uploads `backend/.env.production` if it exists
- Uploads `frontend/.env.production` if it exists
- Verifies sync via MD5 hash comparison
- Shows detailed status and error messages

**Files Synced**:
- `.env.production` → `/mnt/stateful_partition/charhub/.env`
- `backend/.env.production` → `/mnt/stateful_partition/charhub/backend/.env` (if exists)
- `frontend/.env.production` → `/mnt/stateful_partition/charhub/frontend/.env.production` (if exists)

**Remote Configuration** (via environment variables):
- `REMOTE_USER` (default: `leandro_br_dev_gmail_com`)
- `REMOTE_HOST` (default: `charhub-vm`)
- `REMOTE_ZONE` (default: `us-central1-a`)
- `REMOTE_DIR` (default: `/mnt/stateful_partition/charhub`)

## Complete Workflow

### Phase 1: Pre-Deployment Validation

```bash
# 1. Compare environment keys
./scripts/ops/env-compare.sh

# Expected output if successful:
# ✅ Perfect match! All keys in .env exist in .env.production

# If missing keys:
# ❌ .env.production is missing N key(s) from .env
# (Shows list of missing keys with suggestions)
```

### Phase 2: Fix Missing Keys (if needed)

If `env-compare.sh` reports missing keys:

**Option 1: Manually add keys**
```bash
# Edit .env.production and add missing keys
vim .env.production

# Re-run comparison
./scripts/ops/env-compare.sh
```

**Option 2: Use env-guardian sub-agent**
```bash
# Delegate to env-guardian for automated fix
"Use env-guardian to fix missing environment variables in .env.production"
```

### Phase 3: Sync to Production

```bash
# 1. Dry run first (recommended)
./scripts/ops/env-sync-production.sh --dry-run

# 2. If satisfied, do live sync
./scripts/ops/env-sync-production.sh

# 3. Confirm when prompted
# Type "yes" to proceed

# Expected output:
# ✅ All files synced successfully to production!
# ⚠️  Next steps:
#   1. Review the synced files on the production server
#   2. Restart services if needed
#   3. Verify services are healthy
```

### Phase 4: Verify and Restart

```bash
# SSH to production server
gcloud compute ssh charhub-vm --zone=us-central1-a

# Verify files
cat /mnt/stateful_partition/charhub/.env | grep KEY_NAME

# Restart services (if needed)
sudo systemctl restart charhub-backend charhub-frontend

# Check service status
sudo systemctl status charhub-backend charhub-frontend
```

## Output Examples

### env-compare.sh - Perfect Match

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 File Existence Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ .env found
✅ .env.production found
✅ backend/.env.production found
✅ frontend/.env.production found

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍 Key Comparison: .env vs .env.production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key Counts:
  .env:            45 keys
  .env.production: 45 keys

✅ Perfect match! All keys in .env exist in .env.production

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍 Key Comparison: backend/.env vs backend/.env.production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key Counts:
  backend/.env:            45 keys
  backend/.env.production: 45 keys

✅ Perfect match! All keys in backend/.env exist in backend/.env.production

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍 Key Comparison: frontend/.env vs frontend/.env.production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key Counts:
  frontend/.env:            10 keys
  frontend/.env.production: 10 keys

✅ Perfect match! All keys in frontend/.env exist in frontend/.env.production

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ All checks passed! All .env.production files are up to date
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### env-compare.sh - Missing Keys

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍 Key Comparison: .env vs .env.production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key Counts:
  .env:            47 keys
  .env.production: 45 keys

▶ ❌ Missing Keys in .env.production (2)
The following keys exist in .env but are MISSING from .env.production:

  ✗ NEW_FEATURE_ENABLED
    Current value in .env: true
  ✗ NEW_API_ENDPOINT
    Current value in .env: https://api.example.com/v1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ .env.production is missing 2 key(s) from .env

Action required:
  1. Add missing keys to .env.production
  2. Or remove unused keys from .env
  3. Re-run this script to verify

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💡 Suggestions for Fixing Missing Keys
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Option 1: Manually add keys to .env.production

  For each missing key, add it to .env.production:

  NEW_FEATURE_ENABLED=true
  NEW_API_ENDPOINT=https://api.example.com/v1

Option 2: Copy all keys from .env to .env.production

  ⚠️  WARNING: This will overwrite production-specific values!

  # Backup first
  cp .env.production .env.production.backup

  # Copy missing keys
  echo 'NEW_FEATURE_ENABLED=true' >> .env.production
  echo 'NEW_API_ENDPOINT=https://api.example.com/v1' >> .env.production
```

### env-sync-production.sh - Live Sync

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 Environment Sync to Production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Configuration:
  Remote Host:  charhub-vm
  Remote Zone:  us-central1-a
  Remote Dir:   /mnt/stateful_partition/charhub
  Mode:         LIVE

▶ Pre-flight Checks

✅ .env.production found
✅ backend/.env.production found
✅ frontend/.env.production found

▶ 🔍 Change Detection

🔍 Checking for changes in .env...
⚠️  Changes detected
  Local:  47 lines
  Remote: 45 lines

🔍 Checking for changes in backend/.env...
⚠️  Changes detected
  Local:  47 lines
  Remote: 45 lines

🔍 Checking for changes in frontend/.env.production...
✅ No changes needed - files are identical

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️  Confirmation Required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This will OVERWRITE environment files in PRODUCTION
Backups will be created automatically

Files to be overwritten:
  - /mnt/stateful_partition/charhub/.env
  - /mnt/stateful_partition/charhub/backend/.env

Do you want to continue? (yes/no): yes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📦 Creating Backups
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Creating backup: .env.backup.20250125_075738
✅ Backup created
📦 Creating backup: backend/.env.backup.20250125_075738
✅ Backup created

▶ 📤 Syncing .env to production

📤 Copying .env to production...
✅ .env synced successfully

▶ 📤 Syncing backend/.env to production

📤 Copying backend/.env to production...
✅ backend/.env synced successfully

▶ 🔍 Verifying .env

✅ Verification successful - files match
  MD5: a1b2c3d4e5f6...

▶ 🔍 Verifying backend/.env

✅ Verification successful - files match
  MD5: 1a2b3c4d5e6f...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Sync Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All files synced successfully to production!

⚠️  Next steps:
  1. Review the synced files on the production server
  2. Restart services if needed:
     gcloud compute ssh charhub-vm --zone=us-central1-a --command='sudo systemctl restart charhub-backend charhub-frontend'
  3. Verify services are healthy
```

## Integration with Agent Reviewer Workflow

This skill integrates with Agent Reviewer's **env-guardian** sub-agent and **deployment-coordination** orchestration skill:

```
┌─────────────────────────────────────────────────────────────┐
│              Agent Reviewer Deployment Workflow              │
└─────────────────────────────────────────────────────────────┘

1. PR Approved → Ready for deployment
      ↓
2. Use env-guardian sub-agent
   ├─ Runs env-compare.sh
   ├─ Checks for missing keys
   └─ Reports findings
      ↓
3. Missing keys found?
   ├─ YES → Fix .env.production → Re-run env-compare.sh
   └─ NO  → Proceed
      ↓
4. Use env-sync-production.sh
   ├─ Dry run first
   ├─ Review changes
   └─ Live sync
      ↓
5. Deploy to production (deploy-coordinator)
      ↓
6. Restart services
      ↓
7. Verify production health
```

## Best Practices

### ✅ ALWAYS Do These

1. **Run env-compare.sh before EVERY deployment**
   ```bash
   ./scripts/ops/env-compare.sh
   ```

2. **Use dry-run mode first**
   ```bash
   ./scripts/ops/env-sync-production.sh --dry-run
   ```

3. **Create .env.production from .env.example**
   ```bash
   cp .env.example .env.production
   # Then edit with production values
   ```

4. **Keep .env.production in version control** (if values are non-sensitive)
   - Use placeholder values for sensitive keys
   - Document required variables in comments

5. **Test environment sync before first deployment**
   - Use dry-run mode
   - Verify backups are created
   - Check MD5 verification works

6. **Restart services after sync**
   - Environment variables only take effect on service restart
   - Use `systemctl restart charhub-backend charhub-frontend`

### ❌ NEVER Do These

1. **Skip env-compare.sh before deployment**
   - Missing keys cause production failures

2. **Skip dry-run mode**
   - Accidental overwrites are hard to undo

3. **Ignore missing key warnings**
   - Each missing key is a potential production failure

4. **Forget to restart services**
   - New environment variables won't take effect

5. **Sync uncommitted changes**
   - Always commit .env.production changes first

6. **Use --force without testing**
   - Bypass confirmation only after dry-run verification

## Troubleshooting

### env-compare.sh: File Not Found

```
❌ ERROR: Missing required files:
   - .env.production
```

**Solution**:
```bash
# Create from example
cp .env.example .env.production

# Or create empty file
touch .env.production
```

### env-sync-production.sh: Permission Denied

```
Permission denied (publickey,gssapi-keyex,gssapi-with-mic)
```

**Solution**:
```bash
# Verify gcloud authentication
gcloud auth list

# Re-authenticate if needed
gcloud auth login

# Verify SSH keys
gcloud compute config-ssh
```

### env-sync-production.sh: Verification Failed

```
❌ Verification failed - files do not match
  Local MD5:  abc123...
  Remote MD5: def456...
```

**Solution**:
```bash
# Manual verification
gcloud compute ssh charhub-vm --zone=us-central1-a \
  --command="sudo cat /mnt/stateful_partition/charhub/.env"

# Restore from backup if needed
gcloud compute ssh charhub-vm --zone=us-central1-a \
  --command="sudo cp /mnt/stateful_partition/charhub/.env.backup.YYYYMMDD_HHMMSS /mnt/stateful_partition/charhub/.env"

# Re-run sync
./scripts/ops/env-sync-production.sh
```

### Services Not Starting After Sync

**Symptoms**:
- Backend fails to start
- "Environment variable not found" errors

**Solution**:
```bash
# Check for missing keys in synced file
gcloud compute ssh charhub-vm --zone=us-central1-a \
  --command="sudo cat /mnt/stateful_partition/charhub/.env | grep MISSING_KEY"

# Fix .env.production locally
vim .env.production

# Re-sync
./scripts/ops/env-sync-production.sh

# Restart services
gcloud compute ssh charhub-vm --zone=us-central1-a \
  --command="sudo systemctl restart charhub-backend"
```

### Backup Creation Failed

```
Warning: Could not create backup (file may not exist yet)
```

**This is not an error** - It means the remote file doesn't exist yet (first deployment).

**Solution**: Proceed with sync.

## Related Skills and Sub-Agents

### Agent Reviewer Skills
- **deployment-coordination**: Main deployment orchestration
- **env-guardian sub-agent**: Environment validation and sync

### Global Skills
- **container-health-check**: Verify containers are healthy after env changes

## Environment Variables Reference

### Standard Keys (Required)

| Key | Purpose | Example |
|-----|---------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-here` |
| `REDIS_HOST` | Redis server | `redis` |
| `REDIS_PORT` | Redis port | `6379` |

### Feature Flags

| Key | Purpose | Default |
|-----|---------|---------|
| `QUEUES_ENABLED` | Enable job queues | `true` |
| `DEV_TRANSLATION_MODE` | Auto-generate translations | `false` |
| `BATCH_GENERATION_ENABLED` | Enable batch character generation | `true` |

### External Service Keys

| Key | Purpose | Required |
|-----|---------|----------|
| `R2_*` | Cloudflare R2 storage | Yes |
| `OPENAI_API_KEY` | OpenAI API | Yes |
| `GEMINI_API_KEY` | Google Gemini API | Yes |
| `COMFYUI_*` | ComfyUI integration | Yes |
| `STRIPE_*` | Stripe payments | Yes |

---

Remember: **Validate Before You Sync, Sync Before You Deploy**

Always run `env-compare.sh` before deployment to ensure no missing environment variables. Missing keys in production cause failures that require immediate rollback.
