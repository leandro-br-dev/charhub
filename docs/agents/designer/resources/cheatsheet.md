# Agent Designer Cheatsheet

## 🛠️ Essential Commands

### Visual Testing
```bash
# Start local environment
docker compose up -d --build

# Open website
open http://localhost:8083
```

### Git Workflow (Small Fixes)
```bash
# Start feature
git checkout main
git pull origin main
git checkout -b feature/design-[name]

# Test
npm run build
docker compose restart frontend

# Submit PR
git add .
git commit -m "design: [description]"
git push origin feature/design-[name]
gh pr create --title "design: [description]"
```

### Creating Issues (Large Changes)
```bash
# Create Issue for Agent Coder
gh issue create \
  --title "design: [Feature] UI Improvements" \
  --label "design,enhancement" \
  --assignee "Agent-Coder" \
  --body "Problem and proposed solution..."
```

### Reading Reports
```bash
cat docs/05-business/user-behavior-reports/[current-month].md
```

## 📱 Testing Resolutions
- **Mobile**: 375px (iPhone SE), 414px (iPhone Max)
- **Tablet**: 768px (iPad Mini), 1024px (iPad Pro)
- **Desktop**: 1280px (Laptop), 1920px (FHD)
