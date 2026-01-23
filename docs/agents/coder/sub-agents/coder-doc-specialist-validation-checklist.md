# Documentation Validation Checklist

**Purpose**: Ensure all `.docs.md` files follow the coder-doc-specialist template standards.

**For**: Agent Coder and coder-doc-specialist sub-agent

---

## Validation Checklist

For each `.docs.md` file, verify the following:

### Structure Requirements

- [ ] **File Location**: `.docs.md` is in the same directory as the code it documents
- [ ] **File Naming**: Follows convention (`.docs.md` for folders, `filename.docs.md` for single files)
- [ ] **Header Section**: Contains Purpose, Related Files at the top
- [ ] **Overview Section**: High-level description of the component/service
- [ ] **Architecture/Structure Section**: How it works, key design decisions
- [ ] **API/Interface Section**: Public methods, parameters, return types
- [ ] **Usage Example Section**: Code example showing typical usage
- [ ] **Dependencies Section**: What this code depends on
- [ ] **Important Notes Section**: Critical information, gotchas, constraints
- [ ] **See Also Section**: Links to related documentation

### Content Quality

- [ ] **Purpose Statement**: Clear, concise description of what the code does
- [ ] **Related Files**: Lists all related files (controllers, models, services, routes)
- [ ] **Code Examples**: Accurate, runnable code snippets
- [ ] **API Documentation**: All public methods/parameters documented
- [ ] **Dependencies Listed**: All external dependencies mentioned
- [ ] **Gotchas Documented**: Common pitfalls and constraints explained
- [ ] **Links Work**: All cross-references are valid paths

### Language and Formatting

- [ ] **English Only**: All documentation in English (en-US) per project policy
- [ ] **Markdown Format**: Proper markdown syntax
- [ ] **Code Blocks**: Correctly formatted with language tags
- [ ] **Consistent Style**: Follows existing documentation patterns
- [ ] **No Hardcoded Paths**: Uses relative paths or clear references

### Completeness

- [ ] **No Placeholder Content**: All TODO items filled in
- [ ] **No Broken Links**: All links to other docs are valid
- [ ] **Examples Match Code**: Code examples match actual implementation
- [ ] **API Sync**: API documentation matches current code
- [ ] **Dependencies Accurate**: Listed dependencies are actually used

### Best Practices

- [ ] **Complexity Matched**: Documentation exists for complex components only
- [ ] **Not Over-Documented**: Simple components don't have redundant docs
- [ ] **Focused Content**: Sticks to what developers need to know
- [ ] **Maintainable**: Easy to update when code changes

---

## Quick Validation Commands

```bash
# Find all .docs.md files
find . -name ".docs.md" -o -name "*.docs.md"

# Check for broken internal links
grep -r "\](.*\.md)" . --include="*.docs.md" | while read line; do
  link=$(echo "$line" | sed -n 's/.*](\([^)]*\)).*/\1/p')
  if [ ! -f "$link" ] && [ ! -d "$link" ]; then
    echo "BROKEN: $link in $line"
  fi
done

# Check for non-English content (basic check)
find . -name "*.docs.md" -exec grep -l "[áéíóúñ]" {} \;

# Validate markdown syntax
# Requires: npm install -g markdownlint-cli
markdownlint **/*.docs.md
```

---

## Common Issues Found

### ❌ Missing Sections

**Problem**: .docs.md file without required sections

**Solution**: Add all required sections per template

### ❌ Broken Links

**Problem**: Links to moved/removed documentation

**Solution**: Update all cross-references to new distributed locations

### ❌ Outdated Content

**Problem**: API docs don't match current code

**Solution**: Update documentation when code changes

### ❌ Missing Code Examples

**Problem**: Documentation describes but doesn't show

**Solution**: Add usage examples for all public APIs

### ❌ Wrong Language

**Problem**: Documentation not in English

**Solution**: Translate all documentation to English (en-US)

---

## Post-Migration Validation

After DOCCLEAN-002 Phase 2, verify:

- [ ] All 6 distributed docs created and in correct locations
- [ ] All follow the .docs.md template structure
- [ ] All cross-references updated in related docs
- [ ] Central README.md updated with distributed locations
- [ ] No broken links in documentation
- [ ] All docs in English (en-US)
- [ ] Code examples are accurate and runnable

---

## Template Reference

Use this structure for all `.docs.md` files:

```markdown
# Component/Service Name Documentation

**Purpose**: Brief description of what this code does

**Related Files**:
- Controller: `path/to/controller`
- Model: `path/to/model`
- Used by: `path/to/consumer`

## Overview

[High-level description]

## Architecture

[How it works, key design decisions]

## API/Interface

[Public methods, parameters, return types]

## Usage Example

```typescript
// Code example
```

## Dependencies

- [Dependency]: What it's used for

## Important Notes

- [Critical information]
- [Gotchas, constraints, patterns]

## See Also

- [Related documentation]
- [Architecture docs]
```

---

**Last Updated**: 2026-01-21
**Validated By**: Agent Coder
**Migration**: DOCCLEAN-002 Phase 2
