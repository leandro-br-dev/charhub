# Scenes Hub Page

**Purpose**: Display and filter user's scenes and public scenes gallery.

**Location**: `frontend/src/pages/scenes/hub/index.tsx`

**Route**: `/scenes/hub`

---

## Overview

The Scenes Hub is the main entry point for the Scene system. It provides a centralized interface for browsing, searching, and filtering scenes. Users can switch between their private scenes (`My Scenes`) and the public scenes gallery (`Public Gallery`).

---

## Features

### View Modes

**My Scenes** (`private`):
- Shows only the authenticated user's scenes
- Includes scenes of any visibility level
- Default view for authenticated users

**Public Gallery** (`public`):
- Shows all public scenes from all users
- Includes user's own public scenes
- Accessible without authentication

### Filtering

**Genre Filter**:
- Text-based genre filter
- Displays as removable chip when active
- Examples: Fantasy, Sci-Fi, Horror, Historical

**Mood Filter**:
- Text-based mood filter
- Displays as removable chip when active
- Examples: Mysterious, Peaceful, Tense

**Era Filter**:
- Text-based era filter
- Displays as removable chip when active
- Examples: Medieval, Modern, Future

**Search**:
- Case-insensitive search across scene names and descriptions
- Real-time filtering as user types
- Search icon indicator in input field

**Filter Chips**:
- Visual display of active filters
- Click chip to remove individual filter
- Clear styling with close icon

### Scene Display

**Grid Layout**:
- Responsive card-based grid
- Cards stretch to fill available space
- Gap between cards for visual separation

**Scene Cards** (`SceneCard` component):
- Scene cover image
- Scene name and description
- Genre, era, mood badges
- Area count indicator
- Author information (in public gallery)
- Quick actions (view, edit, delete for own scenes)

### States

**Loading State**:
- Animated spinner icon
- "Loading scenes..." message
- Centered in content area

**Error State**:
- Error icon
- Error message
- Retry button to refetch data

**Empty State**:
- Context-aware message based on view mode
- Helpful hints for creating first scene
- "New Scene" button for quick navigation
- Different messages for filtered vs unfiltered empty results

**Success State**:
- Grid of scene cards
- Footer with total count
- Quick link to create new scene

---

## i18n Keys Used

### Page Structure
- `scenes:hub.title` - Page heading
- `scenes:hub.subtitle` - Page description

### Tabs
- `scenes:hub.tabs.myScenes` - "My Scenes" tab label
- `scenes:hub.tabs.publicGallery` - "Public Gallery" tab label

### Filters
- `scenes:filters.genre` - Genre label
- `scenes:filters.mood` - Mood label
- `scenes:filters.era` - Era label
- `scenes:hub.filters.searchPlaceholder` - Search input placeholder

### States
- `scenes:hub.states.loading` - Loading message
- `scenes:hub.states.error` - Error message
- `scenes:hub.states.empty` - Empty state message (with context: `private` or `public`)
- `scenes:hub.states.emptyHint` - Hint for empty state (no filters)
- `scenes:hub.states.emptySearchHint` - Hint for empty state (with filters)

### Actions
- `scenes:hub.actions.newScene` - "New Scene" button
- `scenes:hub.actions.retry` - "Retry" button

### Labels
- `scenes:hub.labels.total` - "1 scene found"
- `scenes:hub.labels.total_plural` - "{count} scenes found"
- `scenes:hub.labels.quickCreateLink` - "Create new scene" footer link

---

## Data Flow

### Initialization

1. Component mounts
2. Page title set via `usePageHeader` hook
3. Default view mode set to `private`
4. Scene list query initiated with default filters

### Filtering Flow

1. User modifies filter (genre, mood, era, or search)
2. Filter state updated locally
3. `useMemo` recalculates filter object
4. `useSceneListQuery` refetches with new filters
5. Scene cards re-render with filtered results

### View Mode Switch

1. User clicks tab (My Scenes / Public Gallery)
2. `viewMode` state updated
3. Filters recalculated (visibility set to PUBLIC for public mode)
4. Scene list refetched
5. Empty state message context updated

---

## Component Structure

```tsx
export default function SceneHubPage(): JSX.Element {
  // State
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('private');
  const [genreFilter, setGenreFilter] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [eraFilter, setEraFilter] = useState('');

  // Hooks
  const { t } = useTranslation(['scenes', 'common']);
  const navigate = useNavigate();
  const { setTitle } = usePageHeader();

  // Queries
  const { data, isLoading, isError, refetch } = useSceneListQuery(filters);

  // Filter management
  const filters = useMemo<SceneListParams>(() => {
    // Build filter object based on state
  }, [search, genreFilter, moodFilter, eraFilter, viewMode]);

  // Render
  return (
    <section>
      <header>...</header>
      <div>
        {/* Tabs and Search */}
        {/* Filter Chips */}
        {/* Loading/Error/Empty/Success States */}
        {/* Scene Grid */}
        {/* Footer */}
      </div>
    </section>
  );
}
```

---

## Filter Object Structure

```typescript
const filters: SceneListParams = {
  search?: string;      // Search term
  genre?: string;       // Genre filter
  mood?: string;        // Mood filter
  era?: string;         // Era filter
  visibility?: Visibility;  // PUBLIC for public mode
};
```

**Behavior**:
- Empty filters = no filtering applied
- `visibility: Visibility.PUBLIC` only set in public mode
- Private mode: No visibility filter (returns user's scenes regardless of visibility)

---

## Dependencies

### Components
- `SceneCard` - Individual scene display card
- `Button` - UI button component
- `Input` - UI input component

### Hooks
- `useSceneListQuery` - TanStack Query for scene list
- `usePageHeader` - Page title management
- `useTranslation` - i18n translations

### Types
- `Visibility` - Visibility enumeration
- `SceneListParams` - Filter parameters type

---

## Related

- `frontend/src/pages/scenes/create/index.docs.md` - Scene creation page
- `frontend/src/pages/scenes/shared/components/SceneCard.docs.md` - Scene card component
- `frontend/src/pages/scenes/shared/hooks/useSceneQueries.docs.md` - Scene queries hook
- `backend/src/routes/v1/scenes.docs.md` - Scenes API documentation
