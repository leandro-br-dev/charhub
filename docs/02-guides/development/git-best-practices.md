# Git Best Practices

**Audience:** All developers (human and AI agents)
**Purpose:** General git best practices, tools, and configurations
**Last Updated:** 2026-01-10

---

## 🎯 Core Principles

1. **Commit early, commit often** - Small, frequent commits are better than large, infrequent ones
2. **Write clear commit messages** - Future you will thank you
3. **Use branches** - Never work directly on main
4. **Push regularly** - GitHub is your backup server
5. **Review before committing** - Always check `git status` and `git diff`

---

## 🔧 Useful Git Tools

### Visual Merge Tools

When you have merge conflicts, visual tools make resolution much easier.

#### Meld (Recommended for Linux)

**Install:**
```bash
sudo apt-get install meld
```

**Configure:**
```bash
git config --global merge.tool meld
git config --global mergetool.meld.cmd 'meld "$LOCAL" "$BASE" "$REMOTE" --output "$MERGED"'
```

**Use during conflicts:**
```bash
git mergetool
```

**Benefits:**
- Visual 3-way diff (yours, theirs, base)
- Point-and-click to resolve conflicts
- See both sides clearly

---

#### VS Code (Built-in)

**Configure:**
```bash
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait --merge $REMOTE $LOCAL $BASE $MERGED'
```

**Use during conflicts:**
```bash
git mergetool
```

**Benefits:**
- Uses familiar VS Code interface
- Syntax highlighting
- Good for text-based conflicts

---

### Git Aliases (Productivity Shortcuts)

Add these to `~/.gitconfig` or run the commands:

#### Safety Aliases

```bash
# Check for uncommitted changes before merge
git config --global alias.pre-merge-check "!f() { git stash list && git status && git log --oneline -5; }; f"

# Usage: git pre-merge-check
```

```bash
# Show what will be merged
git config --global alias.see-merge "!f() { git log --oneline HEAD..main; }; f"

# Usage: git see-merge
```

```bash
# Find dangling/lost commits
git config --global alias.find-lost "!f() { git fsck --full --no-reflogs --unreachable --lost | grep commit; }; f"

# Usage: git find-lost
```

---

#### Productivity Aliases

```bash
# Better log output
git config --global alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"

# Usage: git lg
# Output: Beautiful colored graph of commits
```

```bash
# Show uncommitted changes
git config --global alias.uncommitted "diff HEAD"

# Usage: git uncommitted
```

```bash
# Undo last commit (keep changes)
git config --global alias.undo "reset HEAD~1 --soft"

# Usage: git undo
```

```bash
# Amend commit without editing message
git config --global alias.amend "commit --amend --no-edit"

# Usage: git amend
```

---

#### Branch Management Aliases

```bash
# List branches by most recent
git config --global alias.recent "branch --sort=-committerdate"

# Usage: git recent
```

```bash
# Delete merged branches (safely)
git config --global alias.cleanup "!git branch --merged | grep -v '\\*\\|main\\|master' | xargs -n 1 git branch -d"

# Usage: git cleanup
```

---

### Git Hooks (Automation)

Git hooks run automatically on certain git events. Useful for enforcing standards.

#### Pre-commit Hook (Prevent Large Files)

**Create:** `.git/hooks/pre-commit`

```bash
#!/bin/bash
# Prevent committing files larger than 10MB

hard_limit=$(( 10 * 2**20 )) # 10MB

list_new_or_modified_files()
{
    git diff --staged --name-status | sed '/^D/d; /^D/d; s/^..\s\+//'
}

unmunge()
{
    local quoted="$1"
    eval "local str=$quoted"
    echo "$str"
}

esc=$(printf '\033')
red="${esc}[31m"
reset="${esc}[0m"

while IFS= read -r file; do
    file_size=$(( $(git cat-file -s ":0:$(unmunge "$file")") ))
    if (( $file_size > $hard_limit )); then
        echo "${red}File $file is $(($file_size/2**20))MB, which is larger than 10MB limit${reset}"
        exit 1
    fi
done <<< "$(list_new_or_modified_files)"
```

**Make executable:**
```bash
chmod +x .git/hooks/pre-commit
```

---

#### Pre-commit Hook (Run Linter)

**Create:** `.git/hooks/pre-commit`

```bash
#!/bin/bash
# Run linter before commit

echo "Running linter..."

cd backend
npm run lint
BACKEND_RESULT=$?

cd ../frontend
npm run lint
FRONTEND_RESULT=$?

if [ $BACKEND_RESULT -ne 0 ] || [ $FRONTEND_RESULT -ne 0 ]; then
    echo "❌ Lint failed! Fix errors before committing."
    exit 1
fi

echo "✅ Lint passed!"
```

---

## 📝 Commit Message Best Practices

### Format

```
<type>(<scope>): <short description>

<longer description if needed>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding tests
- `chore`: Maintenance (deps, config, etc.)
- `perf`: Performance improvement

### Examples

**Good commits:**
```
feat(auth): add JWT token refresh mechanism

Implements automatic token refresh 5 minutes before expiry.
Uses axios interceptor to handle refresh failures gracefully.

Closes #42
```

```
fix(dashboard): prevent infinite loop in character loading

Added safety check to break loop if no more characters available.
```

```
docs(readme): update setup instructions for Node 20

Node 18 is deprecated, updated docs to reflect Node 20 requirement.
```

**Bad commits (avoid):**
```
fix stuff
update
wip
changes
asdf
```

---

## 🌿 Branch Naming Conventions

### Pattern

```
<type>/<short-description>
```

### Types

- `feature/` - New features
- `fix/` - Bug fixes
- `hotfix/` - Urgent production fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates

### Examples

**Good branch names:**
```
feature/user-authentication
feature/add-dark-mode
fix/login-redirect-bug
fix/memory-leak-in-websocket
hotfix/critical-security-patch
refactor/split-large-component
docs/update-api-reference
test/add-integration-tests
```

**Bad branch names (avoid):**
```
my-branch
temp
test
fix
updates
```

---

## 🔍 Useful Git Commands

### Investigating History

```bash
# Who changed this line and when?
git blame <file>

# What changed in this file over time?
git log -p <file>

# Show commit that introduced a string
git log -S "specific string" --source --all

# Find when a bug was introduced
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
# Git will checkout commits, mark them good/bad until bug found
```

---

### Undoing Changes

```bash
# Undo changes to a file (not staged)
git checkout -- <file>

# Unstage a file (keep changes)
git reset HEAD <file>

# Undo last commit (keep changes)
git reset HEAD~1 --soft

# Undo last commit (discard changes) - DANGEROUS!
git reset HEAD~1 --hard

# Revert a commit (creates new commit)
git revert <commit-hash>
```

---

### Working with Remotes

```bash
# Add remote
git remote add origin https://github.com/user/repo.git

# Change remote URL
git remote set-url origin https://github.com/user/new-repo.git

# List remotes
git remote -v

# Fetch all remotes
git fetch --all

# Prune deleted remote branches
git remote prune origin
```

---

### Stashing (Temporary Save)

```bash
# Save work in progress
git stash push -m "description of work"

# List stashes
git stash list

# Apply most recent stash (keep in list)
git stash apply

# Apply and remove most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{2}

# Show what's in a stash
git stash show stash@{0}

# Delete a stash
git stash drop stash@{0}

# Delete all stashes
git stash clear
```

---

### Cherry-Picking (Copy Commits)

```bash
# Copy a commit from another branch
git cherry-pick <commit-hash>

# Copy multiple commits
git cherry-pick <hash1> <hash2> <hash3>

# Copy a range of commits
git cherry-pick <start-hash>..<end-hash>
```

---

### Rebasing (Advanced)

```bash
# Rebase current branch onto main
git rebase main

# Interactive rebase (squash, reorder, edit commits)
git rebase -i HEAD~5

# Continue after resolving conflicts
git rebase --continue

# Abort rebase
git rebase --abort
```

**⚠️ Warning:** Never rebase commits that have been pushed to shared branches!

---

## 🛡️ Safety Best Practices

### Before Dangerous Operations

```bash
# Always create a backup branch first
git branch backup-$(date +%Y%m%d%H%M%S)

# Always check what you're about to do
git status
git diff
git log --oneline -5
```

---

### Daily Workflow

```bash
# Start of day
git checkout main
git pull origin main
git checkout -b feature/new-feature

# During work (every 30-60 min)
git add .
git commit -m "wip: describe what you just did"
git push origin HEAD

# End of day
git add .
git commit -m "wip: end of day checkpoint"
git push origin HEAD
```

---

### Before Creating PR

```bash
# Update branch with main
git checkout main
git pull origin main
git checkout feature/your-feature
git merge main

# Verify builds and tests pass
npm run build
npm test

# Push updated branch
git push origin feature/your-feature
```

---

## 📚 Further Reading

- **Official Git Documentation:** https://git-scm.com/doc
- **Pro Git Book (Free):** https://git-scm.com/book/en/v2
- **Git Flight Rules:** https://github.com/k88hudson/git-flight-rules
- **Oh Shit, Git!?!** https://ohshitgit.com/

---

## 🔗 Related CharHub Documentation

- **Recovery Procedures:** [docs/06-operations/incident-response/recovery-procedures.md](../../06-operations/incident-response/recovery-procedures.md)
- **Git Safety (Agent Coder):** [docs/agents/coder/CLAUDE.md](../../agents/coder/CLAUDE.md#git-safety-comandos-proibidos)
- **Git Safety Pre-Flight:** [docs/agents/coder/checklists/git-safety-pre-flight.md](../../agents/coder/checklists/git-safety-pre-flight.md)

---

**Remember:** Git is a powerful tool. Use it wisely and you'll never lose work!
