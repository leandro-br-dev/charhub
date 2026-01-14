# Feature: Admin Navigation Button

**Status**: Active - Ready for Development
**Created**: 2026-01-14
**Priority**: Medium
**Estimated Complexity**: Small (S)

---

## 1. Overview

### 1.1 Objective
Convert the existing development button in the Navigation Rail to an admin-only button that opens a dropdown menu with administrative links. The button should be moved to the end of the navigation items list and provide access to admin-only features like analytics.

### 1.2 Current State
- A "Development" button exists at `frontend/src/components/layout/NavigationRail.tsx` (lines 132-139)
- Currently configured with `available: false` and `onlyAdmin: true`
- Located in the middle of navigation items
- Does not function (disabled)

### 1.3 Desired State
- Rename to "Admin" button with appropriate icon
- Move to end of navigation items (after Tasks, before separator)
- On click, show dropdown/menu with admin links
- Initial link: `/admin/analytics`
- Backend validation ensures ADMIN role (cannot be forged via frontend)

---

## 2. Technical Requirements

### 2.1 Frontend Changes

#### 2.1.1 NavigationRail.tsx Modifications

**File**: `frontend/src/components/layout/NavigationRail.tsx`

**Changes Required**:

1. **Rename and Reposition Navigation Item** (lines 132-139):
```typescript
// FROM:
{
  to: '/development',
  icon: 'terminal',
  labelKey: 'navigation:development',
  fallbackLabel: 'Development',
  available: false,
  onlyAdmin: true,
  opensSidebar: true
}

// TO:
{
  to: '/admin',
  icon: 'admin_panel_settings',
  labelKey: 'navigation:admin',
  fallbackLabel: 'Admin',
  available: true,
  onlyAdmin: true,
  opensSidebar: false,  // Opens dropdown instead
  isDropdown: true      // New flag for dropdown behavior
}
```

2. **Move to End of List**: Reorder `navigationItems` array to place admin item last (before Assets which is disabled)

3. **Implement Dropdown Behavior**: Create new component or modify NavItem to support dropdown with links:
```typescript
const adminLinks = [
  { to: '/admin/analytics', icon: 'analytics', labelKey: 'navigation:adminAnalytics', fallbackLabel: 'Analytics' }
];
```

#### 2.1.2 New AdminDropdown Component (Optional)

Create `frontend/src/components/layout/AdminDropdown.tsx`:
- Uses `SmartDropdown` component pattern (already used for user menu)
- Displays list of admin links
- Each link navigates to respective admin page

#### 2.1.3 Translation Keys

**File**: `backend/translations/_source/navigation.json`
```json
{
  "admin": "Admin",
  "adminAnalytics": "Analytics",
  "adminMenu": "Admin Menu"
}
```

### 2.2 Backend Security

#### 2.2.1 Admin Route Protection

**File**: `backend/src/routes/adminRoutes.ts` (create if not exists)

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Analytics endpoint
router.get('/analytics', analyticsController.getAnalytics);

export default router;
```

#### 2.2.2 Admin Middleware

**File**: `backend/src/middleware/requireAdmin.ts` (create if not exists)

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (req.user.role !== 'ADMIN') {
    throw new AppError('Admin access required', 403);
  }

  next();
};
```

#### 2.2.3 Route Registration

**File**: `backend/src/index.ts` or `backend/src/app.ts`

```typescript
import adminRoutes from './routes/adminRoutes';

// Register admin routes
app.use('/api/v1/admin', adminRoutes);
```

### 2.3 Analytics Page (Placeholder)

**File**: `frontend/src/pages/admin/Analytics.tsx` (create)

```typescript
export function AnalyticsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      {/* Analytics content - can be expanded later */}
    </div>
  );
}
```

**File**: `frontend/src/routes.tsx` - Add route:
```typescript
{
  path: '/admin/analytics',
  element: <AdminGuard><AnalyticsPage /></AdminGuard>
}
```

### 2.4 Frontend Admin Guard

**File**: `frontend/src/components/guards/AdminGuard.tsx` (create if not exists)

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

---

## 3. Implementation Plan

### Phase 1: Backend Security (1 hour)
1. Create `requireAdmin` middleware
2. Create admin routes file
3. Register routes in app
4. Test with non-admin user (should return 403)

### Phase 2: Frontend Navigation (2 hours)
1. Modify NavigationRail to rename and reposition admin item
2. Implement dropdown behavior for admin button
3. Add translation keys
4. Create AdminGuard component

### Phase 3: Analytics Page Placeholder (1 hour)
1. Create basic Analytics page
2. Add route configuration
3. Test navigation flow

### Phase 4: Testing (1 hour)
1. Test admin button only visible for ADMIN users
2. Test dropdown opens correctly
3. Test navigation to /admin/analytics
4. Test non-admin cannot access via URL manipulation
5. Test backend returns 403 for non-admin API calls

---

## 4. Acceptance Criteria

### Functional
- [ ] Admin button only visible for users with ADMIN role
- [ ] Button positioned at end of navigation items (before disabled items)
- [ ] Clicking button opens dropdown with admin links
- [ ] "Analytics" link navigates to /admin/analytics
- [ ] Analytics page loads correctly for admin users
- [ ] Non-admin users redirected when accessing /admin/* routes directly

### Security
- [ ] Backend middleware validates ADMIN role
- [ ] API returns 403 for non-admin users
- [ ] Frontend role check cannot be bypassed
- [ ] No admin data exposed to non-admin users

### UI/UX
- [ ] Button uses appropriate admin icon (`admin_panel_settings`)
- [ ] Dropdown styling consistent with user menu dropdown
- [ ] Proper hover states and transitions
- [ ] Mobile responsive (overlay mode)

---

## 5. Files to Modify/Create

### Modify
- `frontend/src/components/layout/NavigationRail.tsx`
- `backend/translations/_source/navigation.json`
- `frontend/src/routes.tsx`
- `backend/src/app.ts` (route registration)

### Create
- `backend/src/middleware/requireAdmin.ts`
- `backend/src/routes/adminRoutes.ts`
- `frontend/src/pages/admin/Analytics.tsx`
- `frontend/src/components/guards/AdminGuard.tsx` (if not exists)

---

## 6. Related Features

- Future admin features will add more links to this dropdown
- Analytics dashboard content (separate feature)
- User management (future)
- System configuration (future)

---

## 7. Notes

- The `/admin/analytics` page already exists at this path based on user requirements
- Future admin links can be added to the `adminLinks` array without major refactoring
- Backend validation is CRITICAL - frontend checks are for UX only, not security
