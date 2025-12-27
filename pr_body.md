## Summary
Migrates backend from TypeScript ESLint 6.15.0 to 8.49.0, resolving security vulnerabilities and enabling new linting rules.

Fixes #42
Closes #36 (Dependabot PR - superseded by this manual migration)

## Changes
🔧 **Dependencies**:
- `@typescript-eslint/eslint-plugin`: 6.15.0 → 8.49.0
- `@typescript-eslint/parser`: 6.15.0 → 8.49.0

⚙️ **Configuration**:
- Updated `.eslintrc.js` for ESLint 8.x compatibility
- Removed deprecated rules
- Added new recommended rules
- Updated parser options

🐛 **Code Fixes**:
- Fixed linting errors (empty interfaces)
- Improved type safety in agent code
- Resolved unused variable warnings
- **Fixed OAuth Redirect Issue**: Added `trust proxy` setting to Express to correctly handle redirects behind Nginx.

## Testing
- [x] All existing tests pass (193 tests passed locally with corrected DB URL)
- [x] Lint passes with 0 errors
- [x] Build succeeds
- [x] `npm audit` shows 0 vulnerabilities (fixed unrelated issues)

## Security
- ✅ Resolves vulnerabilities in @typescript-eslint dependencies
- ✅ `npm audit` clean (0 vulnerabilities)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
