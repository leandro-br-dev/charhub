# SSH Authentication Fix: osLogin Integration

## Problem Statement

GitHub Actions workflow was failing with error:
```
ERROR: (gcloud.compute.ssh) Could not add SSH key to instance metadata
Required 'compute.instances.setMetadata' permission for 'projects/charhub-prod/zones/us-central1-a/instances/charhub-vm'
```

Even though:
- ✅ Service account had `compute.osLogin` role assigned
- ✅ Manual SSH worked locally: `gcloud compute ssh charhub-vm --zone=us-central1-a --command="echo 'SSH works!'"`
- ❌ GitHub Actions still tried to add SSH key to instance metadata

## Root Cause Analysis

**The Issue**: Standard `gcloud compute ssh` command has two authentication methods:

1. **SSH Key Management** (default):
   - Generates an SSH key in the runner environment
   - Tries to add it to instance metadata via `compute.instances.setMetadata`
   - Requires permission: `roles/compute.instances.setMetadata`
   - ❌ This is what was failing in GitHub Actions

2. **OS Login** (alternative):
   - Uses GCP IAM identities for SSH authentication
   - Authenticates through `gcloud auth` instead of SSH keys
   - Requires permission: `roles/compute.osLogin` (already had this!)
   - ✅ This should work in GitHub Actions

**Why It Worked Locally**: When running `gcloud compute ssh` locally with application default credentials, gcloud has permission to create and manage resources differently than in GitHub Actions with a service account.

## Solution Implemented

### Change Made
Added one configuration step in GitHub Actions workflow **before** any SSH commands:

```yaml
- name: Configure gcloud SSH to use osLogin
  run: |
    gcloud config set compute/use_os_login true
    echo "✅ osLogin configured for SSH"
```

### How It Works

**Command**: `gcloud config set compute/use_os_login true`
- Sets local gcloud configuration to prefer OS Login for all SSH operations
- Tells gcloud: "Use IAM identities for authentication, not SSH key management"
- Works with existing `compute.osLogin` role permission

**Result**:
- gcloud SSH operations now use OS Login instead of dynamic SSH key management
- No need for `compute.instances.setMetadata` permission
- SSH authentication happens at the OS level (Linux PAM) via GCP IAM

### Permission Requirements

After this fix, the service account only needs:

```bash
# Required roles:
✅ roles/compute.osLogin              # Authenticate via OS Login
✅ roles/compute.instanceAdmin.v1     # Manage instances (if needed)

# NOT needed anymore:
❌ roles/compute.instances.setMetadata  # Would only be needed for SSH key management
```

## Commit Details

**Commit 1**: `970d52d` - Core fix
- File: `.github/workflows/deploy-production.yml`
- Change: Added `gcloud config set compute/use_os_login true` before SSH operations
- Effect: GitHub Actions will now use OS Login for all SSH commands

**Commit 2**: `9cd7aa1` - Documentation
- File: `docs/reviewer/DEPLOYMENT_GUIDE.md`
- Change: Enhanced troubleshooting section with osLogin explanation and recovery steps
- Effect: Future deployments can reference this guide if SSH issues occur

## Testing the Fix

### Verify osLogin is Working

```bash
# Check gcloud configuration
gcloud config list | grep use_os_login

# Test SSH connection
gcloud compute ssh charhub-vm --zone=us-central1-a --command="echo 'osLogin authenticated!'"
```

### Run Workflow in GitHub Actions

1. Go to: https://github.com/leandro-br-dev/charhub/actions
2. Select workflow: **Deploy to Production**
3. Click: **Run workflow**
4. Select ref: **main**
5. Click: **Run workflow**

### Expected Behavior

✅ **Success**:
- "Test SSH connection" step completes without error
- "SSH connection successful" appears in logs
- Subsequent steps (backup, git pull, docker build) execute
- Deployment completes with health checks passing

❌ **If Still Failing**:
- Check service account has `compute.osLogin` role (see DEPLOYMENT_GUIDE.md)
- Verify GCP_SERVICE_ACCOUNT_KEY_PROD secret is up-to-date
- Review logs for specific error messages
- Follow troubleshooting steps in DEPLOYMENT_GUIDE.md

## Future Reference

This osLogin configuration:
- ✅ Persists across all SSH commands in the workflow
- ✅ Works with any GCP service account that has `compute.osLogin` role
- ✅ Is more secure (no SSH keys transmitted in CI/CD logs)
- ✅ Follows Google Cloud best practices for CI/CD authentication

## Related Documentation

- **DEPLOYMENT_GUIDE.md** - Full deployment guide with troubleshooting
- **deploy-production.yml** - The workflow file with this fix
- **GCP_SETUP_GUIDE.md** - Initial GCP setup instructions

---

**Fix Applied**: 2025-12-01
**Status**: Ready for testing in GitHub Actions
**Tested Locally**: Manual SSH works ✅
**Tested in CI/CD**: Pending (run workflow manually to verify)
