# Technical Reference

**Last Updated**: 2026-01-21

---

## 📋 Overview

This section contains technical specifications, API documentation, and reference materials for CharHub.

**🎉 Documentation Distribution**: Component and service documentation is now distributed alongside code for better AI agent discoverability. Look for `.docs.md` files in code directories.

---

## 📂 Sections

### 🔌 [API](./api/)
API documentation has been distributed to code locations:
- **[LLM Service](../../backend/src/services/llm/.docs.md)** - Multi-provider LLM management
- **[LLM Tool-Calling](../../backend/src/services/llm/tools/.docs.md)** - Web search and tool integration

### 💻 [Backend](./backend/)
Backend documentation is distributed alongside services:
- **[Backend Overview](./backend/README.md)** - Runtime, API overview, and commands

**Distributed Service Documentation**:
- **[Tag System](../../backend/src/data/tags/.docs.md)** - Content classification, age ratings, content warnings
- **[Payment Service](../../backend/src/services/payments/.docs.md)** - Stripe and PayPal integration
- **[Credits Service](../../backend/src/services/.docs.md)** - Credit-based monetization
- **[Translation Service](../../backend/src/services/translation/.docs.md)** - Automatic translation with caching
- **[LLM Service](../../backend/src/services/llm/.docs.md)** - Multi-provider LLM (Gemini, OpenAI, Grok)
- **[LLM Tools](../../backend/src/services/llm/tools/.docs.md)** - Tool-calling system

### 🎨 [Frontend](./frontend/)
Frontend documentation with distributed component guides:
- **[Frontend Overview](./frontend/README.md)** - Architecture, tooling, and patterns
- Component documentation is in `frontend/src/components/*/` folders

### ⚙️ [CLI](./cli/)
Command-line tools reference:
- gcloud commands
- docker commands

### 🔄 [Workflows](./workflows/)
GitHub Actions workflows:
- [Workflows Analysis](./workflows/workflows-analysis.md)

### 📜 [Scripts](./scripts/)
Automation scripts:
- [Backup & Restore Guide](./scripts/backup-restore-guide.md)

---

## 🎯 Quick Links

**Most Used References**:
- [Backend API Overview](./backend/README.md)
- [Frontend Overview](./frontend/README.md)
- [LLM Service](../../backend/src/services/llm/.docs.md)
- [Tag System](../../backend/src/data/tags/.docs.md)
- [Backup Scripts](./scripts/backup-restore-guide.md)

---

## 📖 Distributed Documentation

**Why `.docs.md` files?**

Placing documentation alongside code enables:
- ✅ AI agents find documentation immediately when accessing code folders
- ✅ Documentation stays synchronized with code changes
- ✅ Easier onboarding for developers working on specific components
- ✅ Better discoverability via `find . -name "*.docs.md"`

**Finding Documentation**:

```bash
# Find all .docs.md files
find . -name ".docs.md" -o -name "*.docs.md"

# Search for specific service docs
find backend/src/services -name ".docs.md"

# Search for component docs
find frontend/src/components -name ".docs.md"
```

---

[← Back to Documentation Home](../README.md)
