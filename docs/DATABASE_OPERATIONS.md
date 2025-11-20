# Database Operations Guide

## Overview

CharHub uses PostgreSQL 16 running in a Docker container on the production VM. This guide covers how to connect to the database for administration and debugging.

## Database Configuration

### Production Environment

- **Host**: Inside Docker network (not directly accessible)
- **Port**: 5432 (exposed on VM)
- **Database**: `charhub_db`
- **User**: `charhub`
- **Connection**: Via SSH tunnel through VM

### VM Details

- **VM Name**: `charhub-vm`
- **Zone**: `us-central1-a`
- **Project**: `charhub-prod`
- **SSH Access**: Via gcloud CLI

## Connecting with DBeaver

There are two methods to connect DBeaver to the PostgreSQL database. **Method 2 (Port Forwarding)** is recommended as it's more reliable.

### Method 1: DBeaver Built-in SSH Tunnel (May Have Issues)

**Note**: DBeaver's SSH tunnel can be finicky with Google Cloud SSH keys. If this doesn't work, use Method 2.

#### Step 1: Configure SSH Tunnel

1. Open DBeaver
2. Create a new PostgreSQL connection
3. Go to the **SSH** tab
4. Enable **Use SSH Tunnel**
5. Configure SSH settings:
   - **Host/IP**: `136.116.66.192` (VM external IP)
   - **Port**: `22`
   - **Username**: `Leandro` (your Windows username, NOT the email)
   - **Authentication Method**: `Public Key`
   - **Private Key**: `C:\Users\Leandro\.ssh\google_compute_engine`
   - **Passphrase**: Leave blank

#### Step 2: Configure Database Connection

1. Go to the **Main** tab
2. Configure database settings:
   - **Host**: `localhost` (because we're tunneling through SSH)
   - **Port**: `5432`
   - **Database**: `charhub_db`
   - **Username**: `charhub`
   - **Password**: `eN7-NwIXNo-z9GgIBXDW` (from `.env.production`)

#### Step 3: Test Connection

1. Click **Test Connection**
2. If you get "Exhausted available authentication methods", use Method 2 instead

### Method 2: Manual SSH Port Forwarding (Recommended)

This method is more reliable and works consistently.

#### Step 1: Create SSH Tunnel

Open PowerShell and run:

```powershell
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod -- -L 5432:localhost:5432 -N
```

**Keep this PowerShell window open** - the tunnel will close when you close it.

You should see the connection established (the window will hang without output - this is normal).

#### Step 2: Configure DBeaver

1. Open DBeaver
2. Create a new PostgreSQL connection
3. **Do NOT enable SSH tunnel** (we already have one via PowerShell)
4. Configure database settings in the **Main** tab:
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `charhub_db`
   - **Username**: `charhub`
   - **Password**: `eN7-NwIXNo-z9GgIBXDW`

#### Step 3: Test Connection

1. Click **Test Connection**
2. Should connect successfully
3. Click **Finish**

#### Step 4: When Finished

Close the PowerShell window to terminate the SSH tunnel.

## Direct Database Access via Docker

If you need to access the database directly from the VM:

```bash
# Connect to the VM
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod

# Access PostgreSQL via Docker
sudo docker exec -it charhub-postgres-1 psql -U charhub -d charhub_db
```

## Common Operations

### Backup Database

```bash
# From your local machine
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod --command="sudo docker exec charhub-postgres-1 pg_dump -U charhub charhub_db" > backup.sql
```

### Restore Database

```bash
# Copy backup to VM
gcloud compute scp backup.sql charhub-vm:~/backup.sql --zone=us-central1-a --project=charhub-prod

# Connect to VM and restore
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod

# On the VM
sudo docker exec -i charhub-postgres-1 psql -U charhub -d charhub_db < ~/backup.sql
```

### View Database Logs

```bash
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod --command="sudo docker logs charhub-postgres-1 --tail 100 -f"
```

### Check Database Size

```bash
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod --command="sudo docker exec charhub-postgres-1 psql -U charhub -d charhub_db -c 'SELECT pg_size_pretty(pg_database_size(current_database()));'"
```

## Migration from Cloud SQL

Previously, CharHub used Google Cloud SQL, but it was discontinued due to cost ($30/month for ~10 users/day). The database was migrated to a Docker container on the VM.

### Backup Location

The Cloud SQL backup is stored in Google Cloud Storage:
- **Bucket**: `gs://charhub-deploy-temp/`
- **File**: `Cloud_SQL_Export_2025-11-20 (06:37:30).sql`

This backup is preserved and NOT deleted by the deploy script.

## Troubleshooting

### Cannot Connect via SSH Tunnel

1. Verify SSH keys are configured:
   ```bash
   gcloud compute config-ssh
   ```

2. Test SSH connection manually:
   ```bash
   gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod
   ```

3. Check if PostgreSQL port is accessible:
   ```bash
   gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod --command="sudo docker exec charhub-postgres-1 psql -U charhub -d charhub_db -c 'SELECT version();'"
   ```

### Connection Refused

1. Check if PostgreSQL container is running:
   ```bash
   gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod --command="sudo docker ps | grep postgres"
   ```

2. Check container health:
   ```bash
   gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod --command="sudo docker exec charhub-postgres-1 pg_isready -U charhub"
   ```

### Database Credentials Not Working

Verify credentials from the `.env` file on the VM:
```bash
gcloud compute ssh charhub-vm --zone=us-central1-a --project=charhub-prod --command="cd /mnt/stateful_partition/charhub && sudo cat .env | grep POSTGRES"
```

## Security Notes

- The PostgreSQL port (5432) is **not exposed** to the internet
- Access is **only possible** via SSH tunnel through the VM
- Database credentials are stored in `.env` file (not committed to git)
- The `.env` file is deployed with proper permissions (readable only by chronos user)

## Cost Savings

Migrating from Cloud SQL to Docker resulted in:
- **Before**: ~$30/month (Cloud SQL)
- **After**: $0 additional cost (using existing VM resources)
- **Savings**: 100% reduction in database costs

The Docker-based PostgreSQL is suitable for the current load (~10 users/day). As the project grows, we can consider migrating back to Cloud SQL or other managed database services.
