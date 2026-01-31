import { Outlet, Route, Routes, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './components/layout';
import { AuthenticatedLayout } from './layouts';
import Home from './pages/home';
import Login from './pages/(auth)/login';
import Signup from './pages/(auth)/signup';
import Callback from './pages/(auth)/callback';
import Dashboard from './pages/dashboard';
import NotFound from './pages/not-found';
import CharacterHubPage from './pages/(characters)/hub';
import CharacterCreateMethodPage from './pages/(characters)/create';
import CharacterCreatePage from './pages/(characters)/new';
import AutomatedCharacterCreatePage from './pages/(characters)/create-ai';
import CharacterDetailPage from './pages/(characters)/[characterId]';
import CharacterEditPage from './pages/(characters)/[characterId]/edit';
import ProfilePage from './pages/profile';
import ChatIndexPage from './pages/(chat)';
import ConversationDetailPage from './pages/(chat)/[conversationId]';
import NewConversationPage from './pages/(chat)/new';
import JoinChatPage from './pages/(chat)/join';
import StoryCreatePage from './pages/story/create';
import StoryNewPage from './pages/story/new';
import AutomatedStoryCreatePage from './pages/story/create-ai';
import StoryEditPage from './pages/story/[storyId]/edit';
import StoryHubPage from './pages/story/hub';
import { StoryDetailPage } from './pages/story/[storyId]';
import PlansPage from './pages/plans';
import TasksPage from './pages/tasks';
import DiscoverPage from './pages/(discover)';
import AssetHubPage from './pages/assets/hub';
import AnalyticsPage from './pages/admin/analytics';
import AdminScriptsPage from './pages/admin/scripts';

function PublicShell(): JSX.Element {
  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Dashboard is public - can be accessed without authentication */}
      <Route path="/dashboard" element={<Dashboard />} />

      <Route
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/characters" element={<CharacterHubPage />} />
        <Route path="/characters/create" element={<CharacterCreateMethodPage />} />
        <Route path="/characters/new" element={<CharacterCreatePage />} />
        <Route path="/characters/create-ai" element={<AutomatedCharacterCreatePage />} />
        <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
        <Route path="/characters/:characterId/edit" element={<CharacterEditPage />} />
        <Route path="/chat" element={<ChatIndexPage />} />
        <Route path="/chat/new" element={<NewConversationPage />} />
        <Route path="/chat/:conversationId/join" element={<JoinChatPage />} />
        <Route path="/chat/:conversationId" element={<ConversationDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/stories" element={<StoryHubPage />} />
        <Route path="/stories/create" element={<StoryCreatePage />} />
        <Route path="/stories/new" element={<StoryNewPage />} />
        <Route path="/stories/create-ai" element={<AutomatedStoryCreatePage />} />
        <Route path="/stories/:storyId" element={<StoryDetailPage />} />
        <Route path="/stories/:storyId/edit" element={<StoryEditPage />} />
        {/* Asset Management System routes */}
        <Route path="/assets" element={<Navigate to="/assets/hub" replace />} />
        <Route path="/assets/hub" element={<AssetHubPage />} />
        <Route path="/assets/create" element={<Navigate to="/assets/hub" replace />} />
        <Route path="/assets/:assetId" element={<Navigate to="/assets/hub" replace />} />
        <Route path="/assets/:assetId/edit" element={<Navigate to="/assets/hub" replace />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/tasks" element={<TasksPage />} />
      </Route>

      {/* Admin-only routes */}
      <Route
        element={
          <AdminRoute>
            <AuthenticatedLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/scripts" element={<AdminScriptsPage />} />
      </Route>
    </Routes>
  );
}
