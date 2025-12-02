# Git and GitHub Actions Reference

**Purpose**: Common commands for daily git operations and GitHub Actions interactions

---

## Git Operations

### Basic Workflow

```bash
# Check current branch
git branch --show-current

# Update main branch
git pull origin main

# See recent commits
git log --oneline -10

# See commit details
git log -1 --format="%H %s %an %ae %ai"
```

### Making Changes

```bash
# See what changed
git status

# See detailed changes
git diff

# Stage all changes
git add .

# Stage specific file
git add path/to/file

# Commit with message
git commit -m "feat(module): brief description"

# Push to remote
git push origin main
```

### Conventional Commit Format

Follow the format: `<type>(<scope>): <description>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Build/tool/dependency changes

**Examples**:
```bash
git commit -m "feat(deploy): add cloudflare credentials sync"
git commit -m "fix(deploy): resolve git permission denied errors"
git commit -m "docs(deploy): update CD deployment guide"
git commit -m "refactor(deploy): simplify workflow logic"
```

### Inspecting Commits

```bash
# See full commit details
git show <commit-hash>

# Compare commits
git diff <commit1> <commit2>

# See commits in range
git log <commit1>..<commit2> --oneline

# See who changed what
git blame path/to/file

# See file history
git log --oneline -- path/to/file
```

### Fixing Mistakes

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Undo changes to file
git checkout -- path/to/file

# Undo all unstaged changes
git restore .

# Revert a specific commit
git revert <commit-hash>
git push origin main
```

### Branches

```bash
# List local branches
git branch

# List all branches (including remote)
git branch -a

# Create new branch
git checkout -b feature/name

# Switch branches
git checkout main

# Delete local branch
git branch -d feature/name

# Delete remote branch
git push origin --delete feature/name

# See what's in a remote branch
git log origin/<branch> --oneline -10
```

### Managing Remotes

```bash
# List remotes
git remote -v

# Add remote
git remote add upstream <url>

# Remove remote
git remote remove origin

# Update remote tracking
git fetch origin

# Pull with rebase
git pull --rebase origin main
```

---

## GitHub Actions

### Viewing Workflow Runs

```bash
# List recent runs
gh run list --repo leandro-br-dev/charhub

# Get details of specific run
gh run view <run-id>

# View logs of run
gh run view <run-id> --log

# Watch a run in progress
gh run watch <run-id>
```

### Getting Run Information

```bash
# Get latest run for branch
gh run list --repo leandro-br-dev/charhub --branch main --limit 1

# Get successful runs only
gh run list --repo leandro-br-dev/charhub --status success

# Get failed runs
gh run list --repo leandro-br-dev/charhub --status failure

# Get specific workflow runs
gh run list --repo leandro-br-dev/charhub --workflow deploy-production.yml
```

### Triggering Manual Workflows

```bash
# Manually trigger workflow
gh workflow run deploy-production.yml --repo leandro-br-dev/charhub

# Trigger with inputs
gh workflow run deploy-staging.yml \
  --repo leandro-br-dev/charhub \
  -f version=main
```

### Debugging Failed Runs

```bash
# View failed run details
gh run view <run-id> --log

# Get specific job logs
gh run view <run-id> --job <job-id>

# Download logs as zip
gh run download <run-id> --dir ./logs

# View step-by-step output
gh run view <run-id> --verbose
```

### Checking Workflow Status

```bash
# Get all workflow files
gh workflow list --repo leandro-br-dev/charhub

# Check if workflow is enabled
gh workflow view deploy-production.yml

# Disable workflow
gh workflow disable deploy-production.yml

# Enable workflow
gh workflow enable deploy-production.yml
```

---

## SSH and Remote Access

### SSH to Production VM

```bash
# Using gcloud
gcloud compute ssh charhub-vm --zone=us-central1-a

# Using SSH key directly
ssh -i /path/to/key leandro_br_dev_gmail_com@34.66.66.202

# Verify connection
ssh -o ConnectTimeout=5 -i /path/to/key leandro_br_dev_gmail_com@34.66.66.202 'echo "Connected"'
```

### Common SSH Operations

```bash
# Execute single command
ssh -i key leandro_br_dev_gmail_com@34.66.66.202 'docker-compose ps'

# Execute multiple commands
ssh -i key leandro_br_dev_gmail_com@34.66.66.202 << 'EOF'
cd /mnt/stateful_partition/charhub
docker-compose logs -f backend
EOF

# Copy files to VM
scp -i key -r local/path/* leandro_br_dev_gmail_com@34.66.66.202:/remote/path/

# Copy files from VM
scp -i key leandro_br_dev_gmail_com@34.66.66.202:/remote/file local/path/
```

---

## Docker Commands on VM

### Container Management

```bash
# SSH to VM first
gcloud compute ssh charhub-vm --zone=us-central1-a

# List containers
sudo /var/lib/toolbox/bin/docker-compose ps

# View logs
sudo /var/lib/toolbox/bin/docker-compose logs -f backend

# Stop containers
sudo /var/lib/toolbox/bin/docker-compose down

# Start containers
sudo /var/lib/toolbox/bin/docker-compose up -d

# Rebuild containers
sudo /var/lib/toolbox/bin/docker-compose build --no-cache

# Restart specific container
sudo /var/lib/toolbox/bin/docker-compose restart backend
```

### Executing Commands in Containers

```bash
# Execute command in running container
sudo /var/lib/toolbox/bin/docker-compose exec backend npm run build

# Execute in detached mode (don't need TTY)
sudo /var/lib/toolbox/bin/docker-compose exec -T backend npx prisma migrate deploy

# Get shell in container
sudo /var/lib/toolbox/bin/docker-compose exec backend bash
```

### Viewing Container Details

```bash
# View container health
sudo /var/lib/toolbox/bin/docker-compose ps backend

# View full status format
sudo /var/lib/toolbox/bin/docker-compose ps --format='table {{.Name}}\t{{.Status}}\t{{.Ports}}'

# View single container logs with tail
sudo /var/lib/toolbox/bin/docker-compose logs -f --tail 50 backend
```

---

## Deployment Commands

### Before Deployment

```bash
# Verify branch
git branch --show-current  # Should be: main

# Check uncommitted changes
git status  # Should be: nothing to commit

# See what will be deployed
git log --oneline origin/main -5

# Verify secrets are set
gh secret list  # Should show GCP_SERVICE_ACCOUNT_KEY_PROD and GH_DEPLOY_SSH_PRIVATE_KEY
```

### During Deployment

```bash
# Watch GitHub Actions in real-time
gh run watch --repo leandro-br-dev/charhub

# Or manually check status
gh run list --repo leandro-br-dev/charhub --limit 1

# View deployment logs
gh run view <run-id> --log
```

### After Deployment

```bash
# Verify site is up
curl -I https://charhub.app

# SSH and verify containers
gcloud compute ssh charhub-vm --zone=us-central1-a
sudo /var/lib/toolbox/bin/docker-compose ps

# Check deployed commit
git log -1 --format="Deployed: %h - %s"

# View backend logs
sudo /var/lib/toolbox/bin/docker-compose logs -f backend
```

### Rollback Procedure

```bash
# SSH to VM
gcloud compute ssh charhub-vm --zone=us-central1-a

# List recent commits
git log --oneline -5

# Revert to specific commit
git revert <commit-hash>
git push origin main

# Or force checkout previous version
git reset --hard <commit-hash>
sudo /var/lib/toolbox/bin/docker-compose build --no-cache
sudo /var/lib/toolbox/bin/docker-compose up -d

# Verify
curl -I https://charhub.app
```

---

## Troubleshooting

### Git Issues

```bash
# Git says "permission denied"
# Solution: Fix file permissions
sudo chown -R leandro_br_dev_gmail_com:leandro_br_dev_gmail_com .git
sudo chmod -R u+w .git

# Git says "dubious ownership"
# Solution: Configure safe.directory
git config --global --add safe.directory /path/to/repo
git config --local --add safe.directory /path/to/repo

# Git says "index.lock exists"
# Solution: Remove lock file and retry
rm -f .git/index.lock
git status
```

### GitHub Actions Issues

```bash
# Workflow not triggering
# Check if it's enabled
gh workflow view deploy-production.yml
gh workflow enable deploy-production.yml

# Get more details on why it failed
gh run view <run-id> --verbose

# Check recent commits to main
git log origin/main --oneline -5
```

### SSH Issues

```bash
# "Permission denied (publickey)"
# Verify key permissions
ls -la ~/.ssh/deploy_key  # Should be: -rw------- (600)

# Verify key format
file ~/.ssh/deploy_key  # Should be: OpenSSH private key

# Test connection with verbose output
ssh -vvv -i ~/.ssh/deploy_key leandro_br_dev_gmail_com@34.66.66.202

# Check if key is in authorized_keys on VM
gcloud compute ssh charhub-vm --zone=us-central1-a
cat ~/.ssh/authorized_keys
```

---

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
# Git
alias gs="git status"
alias gl="git log --oneline -10"
alias gc="git commit -m"
alias gp="git push origin main"
alias gco="git checkout"
alias gd="git diff"

# GitHub Actions
alias ghr="gh run list --repo leandro-br-dev/charhub --limit 5"
alias ghw="gh run watch"
alias ghrl="gh run view --log"

# Deploy VM
alias ssh-prod="gcloud compute ssh charhub-vm --zone=us-central1-a"
alias docker-prod="gcloud compute ssh charhub-vm --zone=us-central1-a -- sudo /var/lib/toolbox/bin/docker-compose"
alias logs-prod="gcloud compute ssh charhub-vm --zone=us-central1-a -- sudo /var/lib/toolbox/bin/docker-compose logs -f"

# Check deployment
alias check-prod="curl -I https://charhub.app"
alias check-commit="git log -1 --format='%h - %s (by %an)'"
```

---

## Quick Reference Sheet

### Daily Commands

```bash
# Check status before working
git status
git log --oneline -5

# Make changes and commit
git add .
git commit -m "feat(module): description"
git push origin main

# GitHub Actions will deploy automatically

# Monitor deployment
gh run list --repo leandro-br-dev/charhub --limit 1
gh run view <run-id> --log

# Verify production
curl -I https://charhub.app
gcloud compute ssh charhub-vm --zone=us-central1-a -- sudo /var/lib/toolbox/bin/docker-compose ps
```

### Emergency Procedures

```bash
# Rollback latest deploy
git revert HEAD
git push origin main

# View previous commits
git log --oneline -10

# SSH to VM and check status
gcloud compute ssh charhub-vm --zone=us-central1-a
sudo /var/lib/toolbox/bin/docker-compose ps
sudo /var/lib/toolbox/bin/docker-compose logs -f backend
```

---

## Notes

- Always commit to `main` for auto-deployment
- Use conventional commit messages for clarity
- Check deployment status immediately after pushing
- Keep SSH key permissions at 600 (`-rw-------`)
- Test commands locally before running on production VM
