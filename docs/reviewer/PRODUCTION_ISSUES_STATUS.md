# Production Issues - Status & Resolution Plan

**Date**: 2025-12-02
**Status**: Issues Identified, Awaiting Code Fixes
**Priority**: HIGH - Critical bugs affecting production users

---

## 📌 Summary

Four **critical production bugs** identified after first user registrations. All related to initial account setup and state synchronization:

| Bug | Severity | Status | Action |
|-----|----------|--------|--------|
| Plans Tab Crash | 🔴 CRITICAL | Documented | Awaiting Code Fix |
| Missing Initial Credits | 🟠 HIGH | Documented | Awaiting Code Fix |
| Stale Sidebar Credits | 🟠 HIGH | Documented | Awaiting Code Fix |
| Missing Tags in DB | 🟠 HIGH | Identified | DB Seed Issue |

---

## 🐛 Detailed Issues

### BUG-001: Profile Plans Tab Crashes

**Status**: Identified, Not Fixed
**Location**: `frontend/src/pages/profile/components/PlansTab.tsx` (likely)
**Error**: `TypeError: Cannot read properties of null (reading 'name')`

**Root Cause**: Component tries to access `.name` property on null/undefined subscription object

**User Report**:
```
Steps: Login → Profile menu → Click "Planos" tab
Result: Blank page, JavaScript error in console
```

**Fix Required**:
- [ ] Add null check before accessing subscription properties
- [ ] Provide fallback UI when subscription is null
- [ ] Test with new user account (no subscription)
- [ ] Add error boundary to Plans component

**Database Check**:
- Verify `Subscription` data exists when user created
- Check if new users have subscription object assigned

---

### BUG-002: New User Missing 200 Initial Credits

**Status**: Identified, Not Fixed
**Location**: User account creation flow (unclear which file)
**Issue**: New accounts created with 0 credits instead of 200 bonus

**What Should Happen**:
1. User registers/creates account
2. System automatically grants 200 initial credits
3. Welcome message displayed: "Welcome! You received 200 bonus credits"

**What Actually Happens**:
- Credits: 0
- No message
- User doesn't know about credit system

**Fix Required**:
- [ ] Find user creation endpoint (`backend/src/routes/auth/*` or similar)
- [ ] Add initial credit grant (200 credits)
- [ ] Create corresponding `CreditTransaction` record
- [ ] Add welcome message on frontend
- [ ] Test with new account registration

**Possible Locations**:
```
backend/src/routes/auth/callback.ts
backend/src/routes/auth/signup.ts
backend/src/services/authService.ts
backend/src/services/creditService.ts
```

---

### BUG-003: Sidebar Credit Balance Not Updating

**Status**: Identified, Not Fixed
**Location**: Frontend sidebar component + credit state management
**Issue**: Stale credit balance, only updates on page refresh

**What Should Happen**:
- User claims daily reward → sidebar updates immediately
- User spends credits → sidebar updates immediately
- Any credit transaction → automatic sidebar sync

**What Actually Happens**:
- Sidebar shows old balance
- Only updates after browser refresh (F5)
- Affects: Daily rewards, first chat, purchases

**Root Cause**:
- Credit balance probably loaded once at app startup
- Not subscribed to credit change events
- No real-time state update mechanism

**Fix Required**:
- [ ] Implement credit state in global context (useContext/Redux/Zustand)
- [ ] Update balance after each credit transaction
- [ ] Emit event when credits change
- [ ] Subscribe sidebar component to credit updates
- [ ] Test: Claim reward → verify sidebar updates

**Affected Components**:
```
frontend/src/components/Sidebar.tsx (likely)
frontend/src/pages/tasks/index.tsx (daily reward)
frontend/src/pages/plans/index.tsx (credit purchase)
frontend/src/hooks/useCredits.ts (likely needs creation)
```

**Suggested Solution**:
```typescript
// Create hook if it doesn't exist
export const useCredits = () => {
  const [balance, setBalance] = useState<number>(0);
  const [refreshBalance, setRefreshBalance] = useState<boolean>(false);

  // Fetch balance on mount and when refreshBalance changes
  useEffect(() => {
    fetchBalance();
  }, [refreshBalance]);

  const onCreditChanged = () => {
    setRefreshBalance(prev => !prev);  // Trigger re-fetch
  };

  return { balance, onCreditChanged };
};
```

---

### BUG-004: Tags Not Available in Database

**Status**: Partially Identified
**Location**: Database seed process
**Issue**: `Tag` table is empty or doesn't have expected records

**Root Cause**: `npm run db:seed` was not executed on production VM

**Evidence**:
- Tags seed is included in main `db:seed` (line 465 of `backend/src/scripts/seed.ts`)
- File: `backend/src/scripts/seedTags.ts` exists and works
- But CD pipeline **does not call `db:seed`** during deployment
- Only migrations applied, not initial data seeding

**What Should Be Done**:
1. ✅ Identify issue (DONE)
2. 🔲 Fix: Add `db:seed` to CD pipeline
3. 🔲 Fix: Run `db:seed` one-time on production to populate initial data

**Database State**:
- [ ] Check if tags exist: `SELECT COUNT(*) FROM "Tag";`
- [ ] Check if plans exist: `SELECT COUNT(*) FROM "Plan";`
- [ ] Check if service costs exist: `SELECT COUNT(*) FROM "ServiceCreditCost";`

**CD Pipeline Fix**:
- Location: `.github/workflows/deploy-production.yml`
- Add step after migrations:
```yaml
- name: Seed database (initial data)
  if: steps.check-seed.outputs.needs-seed == 'true'
  run: |
    docker compose exec -T backend npm run db:seed
```

---

## 🔧 Investigation Findings

### Migration Scripts Cleanup

**Status**: ✅ DONE

Two legacy migration scripts were removed:
- ✅ Deleted: `backend/src/scripts/migrate-conversations-to-multiuser.ts`
- ✅ Deleted: `backend/src/scripts/fix-conversation-participants.ts`
- ✅ Updated: `backend/package.json` (removed script references)

**Rationale**: These were one-time schema transition scripts. With fresh database, no longer needed.

### Dockerfile Issue Encountered

**What Happened**:
1. Attempted to fix Prisma binary permission issue in production
2. Edited `backend/Dockerfile` directly on main branch
3. This violates CI/CD process (breaks GitHub Actions pull)

**Lesson Learned**:
- **NEVER edit production files directly**
- All code changes must go through proper GitHub flow (PR → merge → deploy)
- Infrastructure as Code principle: changes are versioned and tracked

**Action Taken**:
- ✅ Reverted Dockerfile change
- ✅ Added critical rule to `docs/reviewer/CLAUDE.md`
- ✅ Documented consequences of violating this rule

---

## 📋 Required Actions

### Immediate (Next Sprint - Agent Coder)

Priority order for fixing:

1. **BUG-003: Sidebar Credit Updates** (4-6 hours)
   - Affects UX most directly
   - Users will notice immediately
   - Relatively straightforward fix (state management)

2. **BUG-002: Initial Credits Grant** (2-3 hours)
   - Add to user creation flow
   - Create initial credit transaction
   - Add welcome message

3. **BUG-001: Plans Tab Crash** (2-3 hours)
   - Add null checks
   - Provide fallback UI
   - Test with new accounts

4. **BUG-004: Database Seed Issue** (Operational - Agent Reviewer)
   - Update CD pipeline
   - Run seed on production (one-time)
   - Verify tags/plans/costs populated

### Medium Term

- [ ] Add automated tests for credit system
- [ ] Add tests for user registration flow
- [ ] Add tests for sidebar components
- [ ] Set up monitoring/alerting for critical bugs

---

## 🗺️ Where to Start

For **Agent Coder**:

### BUG-003 (Start Here - Highest Impact)

1. Search for sidebar component:
   ```bash
   find frontend/src -name "*sidebar*" -o -name "*Sidebar*"
   find frontend/src -name "*credit*" -o -name "*Credit*"
   ```

2. Check how current credits are loaded:
   - Look for API calls: `GET /api/v1/credits/balance`
   - Check where result is stored
   - Find when it's called (likely page load only)

3. Create useCredits hook or update existing:
   ```typescript
   // Hook should:
   // - Fetch balance on mount
   // - Provide refetch function
   // - Return current balance
   // - Allow subscription to balance changes
   ```

4. Update components to use hook and call refetch after credit changes

### BUG-002 (Next Priority)

1. Find user creation flow:
   ```bash
   grep -r "createUser\|registerUser\|signUp" backend/src/services/
   grep -r "POST.*auth.*signup\|POST.*auth.*register" backend/src/routes/
   ```

2. Add initial credit grant:
   ```typescript
   // After user created, add:
   await creditService.grantCredits({
     userId: newUser.id,
     amount: 200,
     reason: 'SIGNUP_BONUS',
     description: 'Welcome bonus'
   });
   ```

3. Add welcome message to frontend (profile page or modal)

### BUG-001 (Last Priority)

1. Find Plans component:
   ```bash
   find frontend/src -path "*profile*" -name "*Plan*"
   ```

2. Identify where subscription is accessed
3. Add null check and fallback UI

---

## 📞 Communication

**User Notes File**: `docs/USER_FEATURE_NOTES.md`
- All 4 bugs documented with full details
- User can add more notes there

**Database Connection**: `docs/reviewer/DATABASE_CONNECTION_GUIDE.md`
- Complete guide for connecting via DBeaver + SSH tunnel
- Methods A & B explained
- Troubleshooting included

**Dockerfile Rule**: `docs/reviewer/CLAUDE.md`
- Added critical rule at top
- Explains why (GitHub Actions rejection)
- What to do instead

---

## ✅ Completion Checklist

- [x] Bugs identified and documented in `docs/USER_FEATURE_NOTES.md`
- [x] Root causes analyzed
- [x] Migration scripts cleaned up
- [x] Critical rule added to `docs/reviewer/CLAUDE.md`
- [x] Database connection guide created
- [x] Code locations identified for Agent Coder
- [ ] BUG-003 fixed (Sidebar credit updates)
- [ ] BUG-002 fixed (Initial credits grant)
- [ ] BUG-001 fixed (Plans tab crash)
- [ ] BUG-004 fixed (Database seed in CD pipeline)
- [ ] All bugs tested in production
- [ ] No more user reports of these issues

---

## 📊 Timeline

**2025-12-02** (Today):
- ✅ Issues identified
- ✅ Documentation created
- ✅ Cleanup done

**Week of 2025-12-09**:
- 🔲 Agent Coder fixes bugs
- 🔲 Agent Reviewer tests fixes
- 🔲 Deploy to production

**2025-12-16+**:
- 🔲 Monitor for regressions
- 🔲 Update documentation with learnings
- 🔲 Plan process improvements

---

**Status**: Ready for Agent Coder to start fixes
**Awaiting**: PR submissions and code review
**Blocking**: None - non-production work can proceed in parallel
