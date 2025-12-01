# CD Implementation Summary: Ephemeral SSH Key Solution

**Date**: 2025-12-01
**Status**: Implementation In Progress
**Last Updated**: 2025-12-01 22:50 UTC

## Overview

Implemented the ephemeral SSH key solution for GitHub Actions CD as recommended in CD_TODO.md. This approach replaces static SSH keys with dynamically generated temporary keys that are registered with GCP OS Login for each deployment.

## Implementation Details

### Solution Architecture

```
GitHub Actions Runner
    ↓
1. Generate ephemeral SSH key (4096-bit RSA)
    ↓
2. Register public key with osLogin (TTL: 10 minutes)
    ↓
3. Extract osLogin username (sa_110491369899107386224)
    ↓
4. SSH directly to VM using ephemeral key
    ↓
5. Execute deployment commands
    ↓
6. Cleanup: Remove SSH key from osLogin
    ↓
7. Delete local SSH key files
```

### Key Components Updated

**File**: `.github/workflows/deploy-production.yml`

#### New Steps Added:

1. **Generate Ephemeral SSH Key**
   - Command: `ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/deploy_key -C "github-actions-$(date +%s)"`
   - Purpose: Create unique SSH key for each workflow execution
   - Output: SSH key fingerprint for logging

2. **Register SSH Key with OS Login**
   - Command: `gcloud compute os-login ssh-keys add --key-file=$HOME/.ssh/deploy_key.pub --ttl=600s`
   - Purpose: Register public key with 10-minute TTL
   - Fixed Issue: Used `$HOME` variable instead of `~` for path expansion

3. **Get OS Login Username**
   - Hardcoded unique ID: `sa_110491369899107386224`
   - Purpose: Extract POSIX username for osLogin authentication
   - Note: Hardcoded to avoid gcloud command issues in runners

4. **Test SSH Connection** (Enhanced)
   - 3 retry attempts with 10-second delays
   - Verbose SSH output for debugging
   - Timeout set to 10 seconds per attempt
   - BatchMode enabled for non-interactive testing

5. **Cleanup SSH Key**
   - Removes key from osLogin: `gcloud compute os-login ssh-keys remove --key-file=$HOME/.ssh/deploy_key.pub`
   - Deletes local key files
   - Runs always (success or failure)

#### SSH Commands Replaced:
- Replaced all `gcloud compute ssh` commands with direct SSH
- Using heredoc syntax (`<< 'EOF'`) for clean multi-line script execution
- Applied to:
  - Create deployment backup
  - Fetch latest code
  - Stop running containers
  - Build and start containers
  - Run database migrations
  - Verify deployment
  - Rollback on failure

## Commits Made

### 1. `4f0f1ee` - Initial Implementation
- Implemented ephemeral SSH key generation
- Added osLogin registration with TTL
- Replaced all gcloud compute ssh with direct SSH
- Added SSH key cleanup step

### 2. `3f45a79` - Path Expansion Fix
- Changed `~/.ssh/deploy_key.pub` to `$HOME/.ssh/deploy_key.pub`
- Issue: Tilde expansion doesn't work in gcloud command parameters
- Result: Fixed "Unable to read file" error

### 3. `59492fe` - osLogin Username Extraction
- Initially tried to use gcloud command to extract unique ID
- Added fallback mechanism
- Issue: gcloud command failed in some runner contexts

### 4. `c3771bd` - Hardcoded Unique ID
- Removed gcloud dependency for username extraction
- Hardcoded unique ID `110491369899107386224`
- Rationale: Service account unique ID is stable and never changes

### 5. `4f502ad` - SSH Retry Logic & Debugging
- Added 3-attempt retry mechanism with 10-second delays
- Included verbose SSH output (`-v` flag)
- Added detailed configuration logging
- Purpose: Identify exact SSH authentication issues

## Current Status

### ✅ Working Components

1. **SSH Key Generation**: Successfully creates 4096-bit RSA keys
2. **osLogin Registration**: Keys are registered with TTL successfully
3. **Key Path Expansion**: `$HOME` variable correctly expands paths
4. **Pre-Deploy Checks**: Pass without issues
5. **GCP Authentication**: Service account auth works correctly
6. **SSH Key Cleanup**: Properly removes keys (with || true for safety)

### ❌ Remaining Issues

1. **SSH Connection**: Failing at test stage
   - Step: "Test SSH Connection"
   - Status: Times out or denied
   - Cause: Under investigation (see troubleshooting below)

### 🔄 Troubleshooting In Progress

#### Issue: SSH Connection Failed

**Error Pattern**: "Permission denied (publickey)" or connection timeout

**Probable Causes**:
1. osLogin PAM configuration on VM not complete
2. SSH key registration takes time to sync across GCP infrastructure
3. VM may need additional configuration for osLogin support
4. osAdminLogin role might be needed instead of osLogin

**Next Steps**:
1. Add osAdminLogin role to service account if needed
2. Verify VM PAM configuration includes osLogin
3. Check osLogin SSH keys visibility in osLogin profile
4. Consider adding longer delays between key registration and SSH attempt
5. Review VM's GCP metadata for osLogin configuration

## Deployment Flow Diagram

```
┌─────────────────────────────────────────┐
│   GitHub Actions Triggered (push main)  │
└──────────────────┬──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Pre-Deploy Checks   │ ✅ Success
        └──────────┬───────────┘
                   ↓
        ┌──────────────────────────────────┐
        │  Deploy to Production Job        │
        └──────────┬───────────────────────┘
                   ↓
        ┌──────────────────────────────────┐
        │  1. Generate Ephemeral SSH Key   │ ✅ Success
        └──────────┬───────────────────────┘
                   ↓
        ┌──────────────────────────────────┐
        │  2. Register Key with osLogin    │ ✅ Success
        │     (TTL: 10 minutes)            │
        └──────────┬───────────────────────┘
                   ↓
        ┌──────────────────────────────────┐
        │  3. Get osLogin Username         │ ✅ Success
        │     sa_110491369899107386224     │
        └──────────┬───────────────────────┘
                   ↓
        ┌──────────────────────────────────┐
        │  4. Test SSH Connection          │ ❌ Failing
        │     Retry 3x with delays         │
        └──────────┬───────────────────────┘
                   ↓
        [Remaining steps blocked until 4 succeeds]
```

## Security Benefits

1. **Ephemeral Credentials**: Keys are valid for only 10 minutes
2. **Automatic Cleanup**: Keys are removed after deployment (success or failure)
3. **No Static Secrets**: No permanent SSH keys stored in GitHub Secrets
4. **Unique Per Execution**: Each deployment gets a unique key
5. **GCP Best Practices**: Follows official GCP recommendations for ephemeral auth
6. **No Custom IAM Roles**: Uses standard `compute.osLogin` role

## Configuration Reference

### Service Account Permissions

**Current**:
- `roles/compute.osLogin`: Allows SSH via osLogin

**May Need to Add**:
- `roles/compute.osAdminLogin`: Broader osLogin permissions

### VM Configuration

**Requirements**:
- osLogin enabled: `enable-oslogin=TRUE` in instance metadata
- PAM configured for osLogin authentication
- SSH server listening on port 22

## Next Steps

1. **Monitor Workflow Logs**: Check GitHub Actions logs for exact SSH error
2. **Verify VM osLogin Setup**: Ensure PAM is properly configured
3. **Test osAdminLogin Role**: Add if needed for better compatibility
4. **Add Longer Delays**: Wait for osLogin sync if needed
5. **Alternative Approach**: Consider using gcloud compute ssh wrapper if direct SSH can't be made reliable

## References

- **CD_TODO.md**: Original analysis and solution recommendations
- **CD_DEPLOYMENT_ISSUE_ANALYSIS.md**: Detailed problem investigation
- **GCP osLogin Documentation**: https://cloud.google.com/compute/docs/oslogin
- **Workload Identity Federation**: https://cloud.google.com/docs/authentication/external/using-workload-identity-federation

---

**Last Modified**: 2025-12-01 22:50 UTC
**Author**: Claude Code Agent (Reviewer)
**Status**: Active Implementation - Debugging SSH Connection Issue
# Testing with osAdminLogin role added on 2025-12-01 22:52 UTC
