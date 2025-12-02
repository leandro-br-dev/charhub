# Database Connection Guide - DBeaver via SSH Tunnel

**Last Updated**: 2025-12-02
**Purpose**: Connect to PostgreSQL database on production VM via SSH tunnel using DBeaver
**Environment**: Production VM (GCP Compute Engine)

---

## 📋 Overview

PostgreSQL running on production VM is **not directly exposed** to the internet. To access it:
1. **SSH Tunnel** through the VM (via GCP or direct SSH)
2. **DBeaver** connects to localhost:5432 (forwarded through tunnel)
3. **Query the database** safely and securely

This guide covers both methods:
- **Method A**: Using DBeaver's built-in SSH tunnel (recommended, simpler)
- **Method B**: Manual SSH tunnel + DBeaver connection (more control)

---

## 🔧 Method A: DBeaver Built-in SSH Tunnel (RECOMMENDED)

### Prerequisites

1. **DBeaver Community Edition** (free) or Professional installed
   - Download: https://dbeaver.io/download/
2. **SSH Key** for production VM access
   - File: `~/.ssh/charhub-prod-key` or similar
   - Or use `gcloud` authentication

### Step-by-Step Setup

#### Step 1: Create New Connection

1. Open DBeaver
2. Go to **File → New → Database Connection**
3. Select **PostgreSQL**
4. Click **Next**

#### Step 2: PostgreSQL Connection Details

Fill in the main connection parameters:

| Field | Value |
|-------|-------|
| **Server Host** | `localhost` |
| **Server Port** | `5432` |
| **Database** | `charhub` |
| **Username** | `postgres` |
| **Password** | Check `.env` file for `POSTGRES_PASSWORD` |

**Important**:
- Host is `localhost` because SSH tunnel will forward
- Port is `5432` (default PostgreSQL)
- Leave "Save password" unchecked (use SSH auth instead)

Click **Next** to continue.

#### Step 3: Configure SSH Tunnel

1. Check the box: **SSH Tunnel (via SSH)**
2. Configure tunnel settings:

| Field | Value |
|-------|-------|
| **Host** | `34.66.66.202` (Production VM IP) |
| **Port** | `22` |
| **Username** | `leandro_br_dev_gmail_com` |
| **Authentication Method** | Public Key |
| **Private Key File** | Browse to SSH key (see below) |
| **Local Bind Host** | `localhost` |
| **Local Bind Port** | `5432` |

#### Step 4: Set Up SSH Key

**Option A: Using GCP Default Key**
```bash
# List your keys
gcloud compute os-login ssh-keys list

# The key location is typically:
~/.ssh/google_compute_engine
```

In DBeaver:
- Click **Browse** next to "Private Key File"
- Navigate to `~/.ssh/google_compute_engine`
- Select it

**Option B: Using Custom SSH Key**
```bash
# If you have a custom key (e.g., from previous setup):
# Usually located at:
~/.ssh/id_rsa
# OR
~/.ssh/charhub_key
# OR
~/.ssh/charhub-prod-key
```

If you don't have the key, you can generate one:
```bash
# Generate new SSH key for production access
ssh-keygen -t rsa -b 4096 -f ~/.ssh/charhub-prod-key

# Add to VM via gcloud
gcloud compute os-login ssh-keys add --key-file=~/.ssh/charhub-prod-key.pub
```

#### Step 5: Test Connection

1. Click **Test Connection**
   - DBeaver will attempt SSH connection
   - Then test PostgreSQL connection
   - Should show: ✅ "Connected successfully"

2. If SSH key auth fails:
   - Use **gcloud compute ssh** to verify access first:
   ```bash
   gcloud compute ssh charhub-vm --zone=us-central1-a
   ```
   - If that works, your auth is correct
   - In DBeaver, try different key file paths

#### Step 6: Finish

1. Click **Finish**
2. Name the connection: `CharHub Production` (or similar)
3. Connection appears in **Database** panel on left

### Using the Connection

Once connected:

```
✅ DBeaver → SSH Tunnel → Production VM:22 → localhost:5432 → PostgreSQL
```

You can now:
- **Browse tables** in left panel
- **Execute queries** in SQL editor (Ctrl+Alt+Q or right-click → SQL)
- **Export data** (Tables → Export)
- **View table contents** (Tables → YourTable → Data tab)

---

## 🔄 Method B: Manual SSH Tunnel + DBeaver Connection

### When to Use

- DBeaver SSH tunnel isn't working
- You want more control over tunnel parameters
- Testing or debugging SSH connectivity

### Step-by-Step Setup

#### Step 1: Create SSH Tunnel (in Terminal)

```bash
# Create local tunnel forwarding localhost:5432 to VM's PostgreSQL
ssh -i ~/.ssh/google_compute_engine \
    -L 5432:localhost:5432 \
    leandro_br_dev_gmail_com@34.66.66.202 \
    -N -v

# Explanation:
# -i               = SSH key file
# -L 5432:localhost:5432 = Forward local 5432 to remote localhost:5432
# -N               = Don't execute remote command (tunnel only)
# -v               = Verbose (useful for debugging)

# Keep this terminal open while using DBeaver
# To stop tunnel: Ctrl+C
```

Alternative with gcloud:
```bash
# If you prefer gcloud for auth
gcloud compute ssh charhub-vm \
    --zone=us-central1-a \
    --ssh-flag="-L" \
    --ssh-flag="5432:localhost:5432" \
    --ssh-flag="-N"
```

#### Step 2: Configure DBeaver (Without SSH Tunnel)

1. **File → New → Database Connection**
2. Select **PostgreSQL** → **Next**
3. Fill in connection details:

| Field | Value |
|-------|-------|
| **Server Host** | `localhost` |
| **Server Port** | `5432` |
| **Database** | `charhub` |
| **Username** | `postgres` |
| **Password** | From `.env` POSTGRES_PASSWORD |

4. **Skip** SSH Tunnel section (already handled by manual tunnel)
5. Click **Test Connection** → should connect
6. Click **Finish**

#### Step 3: Keep Tunnel Running

- Keep the terminal window open with SSH tunnel active
- DBeaver connects through the tunnel
- When done, press Ctrl+C to close tunnel

---

## 📊 Database Information

### Connection Details

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Host** | 34.66.66.202 | Production VM (GCP) |
| **Port** | 5432 | PostgreSQL default |
| **Database** | `charhub` | Application database |
| **User** | `postgres` | Superuser |
| **Password** | See `.env` | `POSTGRES_PASSWORD` value |

### Getting the Password

```bash
# From local repository
cat .env | grep POSTGRES_PASSWORD

# Or if connected to VM
gcloud compute ssh charhub-vm --zone=us-central1-a
cat /mnt/stateful_partition/charhub/.env | grep POSTGRES_PASSWORD
```

### Key Tables

After connecting, you'll see tables like:

- `User` - User accounts
- `Conversation` - Chat conversations
- `ChatMessage` - Messages
- `Character` - Character profiles
- `Tag` - Content tags
- `Plan` - Subscription plans
- `ServiceCreditCost` - Credit pricing
- And 20+ more...

---

## 🔍 Common Queries

Once connected to DBeaver, try these queries:

### Check Total Users

```sql
SELECT COUNT(*) as total_users FROM "User";
```

### Check Database Size

```sql
SELECT pg_size_pretty(pg_database_size('charhub')) AS size;
```

### View Tags (check if seed worked)

```sql
SELECT COUNT(*) as total_tags FROM "Tag";
SELECT * FROM "Tag" LIMIT 5;
```

### View Plans

```sql
SELECT * FROM "Plan";
```

### View Service Costs

```sql
SELECT * FROM "ServiceCreditCost";
```

### View Recent Users

```sql
SELECT id, displayName, email, "createdAt"
FROM "User"
ORDER BY "createdAt" DESC
LIMIT 10;
```

### View Conversations

```sql
SELECT id, "userId", "isMultiUser", "createdAt"
FROM "Conversation"
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Error: "Connection refused"

**Symptom**: DBeaver can't connect to localhost:5432

**Solutions**:
```bash
# 1. Verify SSH tunnel is running (if using Method B)
ps aux | grep ssh  # Should show tunnel process

# 2. Test SSH access first
ssh -i ~/.ssh/google_compute_engine \
    leandro_br_dev_gmail_com@34.66.66.202 \
    -v  # verbose output shows auth issues

# 3. Verify PostgreSQL is running on VM
gcloud compute ssh charhub-vm --zone=us-central1-a
docker-compose ps postgres  # Should show running

# 4. Check port is accessible
nc -zv localhost 5432  # Test localhost:5432
```

### Error: "Permission denied (publickey)"

**Symptom**: SSH auth fails

**Solutions**:
```bash
# 1. Verify key exists and has correct permissions
ls -la ~/.ssh/google_compute_engine
chmod 600 ~/.ssh/google_compute_engine  # Fix permissions if needed

# 2. Try gcloud auth first
gcloud compute ssh charhub-vm --zone=us-central1-a

# 3. List available keys
gcloud compute os-login ssh-keys list

# 4. If no keys, add your local key
gcloud compute os-login ssh-keys add --key-file=~/.ssh/id_rsa.pub
```

### Error: "Password authentication failed"

**Symptom**: PostgreSQL won't accept password

**Solutions**:
```bash
# 1. Verify password in .env file
cat .env | grep POSTGRES_PASSWORD

# 2. If password contains special characters, it may need escaping
# Try without password first (if key-based auth available)

# 3. Check PostgreSQL logs on VM
gcloud compute ssh charhub-vm --zone=us-central1-a
docker-compose logs postgres | tail -20

# 4. Try psql directly to test
PGPASSWORD="your_password" psql -h localhost -U postgres -d charhub -c "SELECT 1;"
```

### Error: "Cannot establish SSH tunnel"

**Symptom**: DBeaver's SSH tunnel fails to connect

**Solutions**:
```bash
# 1. Test SSH directly
ssh -i ~/.ssh/google_compute_engine \
    leandro_br_dev_gmail_com@34.66.66.202 \
    echo "SSH works"

# 2. If that fails, use Method B (manual tunnel)

# 3. Verify VM is running
gcloud compute instances describe charhub-vm --zone=us-central1-a

# 4. Check VM IP hasn't changed
gcloud compute instances describe charhub-vm \
    --zone=us-central1-a \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

---

## 🔐 Security Notes

### ✅ DO

- ✅ Use SSH keys instead of passwords (more secure)
- ✅ Keep SSH key file private: `chmod 600 ~/.ssh/key_name`
- ✅ Use DBeaver built-in SSH tunnel when possible
- ✅ Close connection when done with database work
- ✅ Don't commit SSH keys to git

### ❌ DON'T

- ❌ Don't share SSH keys or passwords
- ❌ Don't make SSH keys world-readable: `chmod 777`
- ❌ Don't hardcode database password in code
- ❌ Don't leave tunnel open unattended
- ❌ Don't use `root` user for database operations (use `postgres` or limited user)

---

## 📞 Reference

### Relevant Files

- **Environment Config**: `.env` (contains POSTGRES_PASSWORD)
- **Docker Compose**: `docker-compose.yml` (PostgreSQL service config)
- **Prisma Schema**: `backend/prisma/schema.prisma` (database tables)

### Useful Commands

```bash
# Test direct SSH access
ssh leandro_br_dev_gmail_com@34.66.66.202

# Access PostgreSQL directly from VM
gcloud compute ssh charhub-vm --zone=us-central1-a
docker-compose exec postgres psql -U postgres -d charhub -c "SELECT 1;"

# Create tunnel manually
ssh -L 5432:localhost:5432 leandro_br_dev_gmail_com@34.66.66.202 -N

# Show current connections to database
psql -h localhost -U postgres -d charhub -c "SELECT * FROM pg_stat_activity;"
```

### DBeaver Shortcuts

- **Execute Query**: Ctrl+Enter (or Cmd+Enter on Mac)
- **Format SQL**: Ctrl+Shift+F
- **Open SQL Console**: Ctrl+Alt+Q
- **Toggle Comments**: Ctrl+/
- **Auto-Complete**: Ctrl+Space

---

## Next Steps

1. **Connect to database** using Method A or B
2. **Run test queries** to verify connection works
3. **Check data** is present (users, tags, plans, etc.)
4. **Backup database** regularly (see VM_SETUP_AND_RECOVERY.md)
5. **Monitor growth** as application gains users

---

**Happy querying! 🚀**
