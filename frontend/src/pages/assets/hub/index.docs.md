# Assets Hub Page

**Purpose**: Display and filter user's assets and public assets gallery.

**Location**: `frontend/src/pages/assets/hub/index.tsx`

**Route**: `/assets/hub`

---

## Overview

The Assets Hub is the main entry point for the Asset system. It provides a centralized interface for browsing, searching, and filtering assets. Users can switch between their private assets (`My Assets`) and the public assets gallery (`Public Gallery`).

---

## Features

### View Modes

**My Assets** (`private`):
- Shows only the authenticated user's assets
- Includes assets of any visibility level
- Default view for authenticated users

**Public Gallery** (`public`):
- Shows all public assets from all users
- Includes user's own public assets
- Accessible without authentication

### Filtering

**Type Filters**:
- CLOTHING, ACCESSORY, SCAR, HAIRSTYLE, OBJECT, WEAPON, VEHICLE, FURNITURE, PROP
- Multi-select: Can select multiple types simultaneously
- Visual indication: Selected types highlighted with primary color

**Category Filters**:
- WEARABLE, HOLDABLE, ENVIRONMENTAL
- Multi-select: Can select multiple categories simultaneously
- Visual indication: Selected categories highlighted with primary color

**Search**:
- Case-insensitive search across asset names and descriptions
- Real-time filtering as user types
- Search icon indicator in input field

**Clear Filters**:
- Button appears when any filters are active
- Clears all type, category, and search filters
- Returns to default state for current view mode

### Asset Display

**Grid Layout**:
- Responsive card-based grid
- Cards stretch to fill available space
- Gap between cards for visual separation

**Asset Cards** (`AssetCard` component):
- Asset preview/thumbnail image
- Asset name and description
- Type and category badges
- Author information (in public gallery)
- Quick actions (view, edit, delete for own assets)

### States

**Loading State**:
- Animated spinner icon
- "Loading assets..." message
- Centered in content area

**Error State**:
- Error icon (red)
- Error message
- Retry button to refetch data

**Empty State**:
- Context-aware message based on view mode
- Helpful hints for creating first asset
- "New Asset" button for quick navigation
- Different messages for filtered vs unfiltered empty results

**Success State**:
- Grid of asset cards
- Footer with total count
- Quick link to create new asset

---

## i18n Keys Used

### Page Structure
- `assets:hub.title` - Page heading
- `assets:hub.subtitle` - Page description

### Tabs
- `assets:hub.tabs.myAssets` - "My Assets" tab label
- `assets:hub.tabs.publicGallery` - "Public Gallery" tab label

### Filters
- `assets:hub.filters.type` - Type filter label
- `assets:hub.filters.category` - Category filter label
- `assets:hub.filters.searchPlaceholder` - Search input placeholder
- `assets:hub.filters.clear` - Clear filters button text

### Asset Types
- `assets:types.CLOTHING`
- `assets:types.ACCESSORY`
- `assets:types.SCAR`
- `assets:types.HAIRSTYLE`
- `assets:types.OBJECT`
- `assets:types.WEAPON`
- `assets:types.VEHICLE`
- `assets:types.FURNITURE`
- `assets:types.PROP`

### Asset Categories
- `assets:categories.WEARABLE`
- `assets:categories.HOLDABLE`
- `assets:categories.ENVIRONMENTAL`

### States
- `assets:hub.states.loading` - Loading message
- `assets:hub.states.error` - Error message
- `assets:hub.states.empty` - Empty state message (with context: `private` or `public`)
- `assets:hub.states.emptyHint` - Hint for empty state (no filters)
- `assets:hub.states.emptySearchHint` - Hint for empty state (with filters)

### Actions
- `assets:hub.actions.newAsset` - "New Asset" button
- `assets:hub.actions.retry` - "Retry" button

### Labels
- `assets:hub.labels.total` - "1 asset found"
- `assets:hub.labels.total_plural` - "{count} assets found"
- `assets:hub.labels.quickCreateLink` - "Create new asset" footer link

---

## Data Flow

### Initialization

1. Component mounts
2. Page title set via `usePageHeader` hook
3. Default view mode set to `private`
4. Asset list query initiated with default filters

### Filtering Flow

1. User modifies filter (type, category, or search)
2. Filter state updated locally
3. `useMemo` recalculates filter object
4. `useAssetListQuery` refetches with new filters
5. Asset cards re-render with filtered results

### View Mode Switch

1. User clicks tab (My Assets / Public Gallery)
2. `viewMode` state updated
3. Filters recalculated (public flag set/unset)
4. Asset list refetched
5. Empty state message context updated

### Asset Deletion

1. User deletes asset from card
2. `handleDelete` called via `useAssetMutations`
3. Delete mutation executed
4. On success: `refetch()` called to update list
5. On error: Error logged to console

---

## Component Structure

```tsx
export default function AssetHubPage(): JSX.Element {
  // State
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('private');
  const [selectedTypes, setSelectedTypes] = useState<AssetType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<AssetCategory[]>([]);

  // Hooks
  const { t } = useTranslation(['assets', 'common']);
  const navigate = useNavigate();
  const { setTitle } = usePageHeader();

  // Queries
  const { data, isLoading, isError, refetch } = useAssetListQuery(filters);
  const { deleteMutation } = useAssetMutations();

  // Handlers
  const handleDelete = useCallback(...);
  const toggleTypeFilter = useCallback(...);
  const toggleCategoryFilter = useCallback(...);
  const clearFilters = useCallback(...);

  // Render
  return (
    <section>
      <header>...</header>
      <div>
        {/* Tabs and Search */}
        {/* Type and Category Filters */}
        {/* Loading/Error/Empty/Success States */}
        {/* Asset Grid */}
        {/* Footer */}
      </div>
    </section>
  );
}
```

---

## Dependencies

### Components
- `AssetCard` - Individual asset display card
- `Button` - UI button component
- `Input` - UI input component

### Hooks
- `useAssetListQuery` - TanStack Query for asset list
- `useAssetMutations` - Asset mutations (delete)
- `usePageHeader` - Page title management
- `useTranslation` - i18n translations

### Services
- `assetService` - Asset API service (for deletion)

### Types
- `AssetType` - Asset type enumeration
- `AssetCategory` - Asset category enumeration
- `ViewMode` - 'private' | 'public'

---

## Related

- `frontend/src/pages/assets/create/index.docs.md` - Asset creation page
- `frontend/src/pages/assets/shared/components/AssetCard.docs.md` - Asset card component
- `frontend/src/pages/assets/shared/hooks/useAssetQueries.docs.md` - Asset queries hook
- `backend/src/routes/v1/assets.docs.md` - Assets API documentation
