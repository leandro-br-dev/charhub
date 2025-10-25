import { Outlet, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/layout';
import { AuthenticatedLayout } from './layouts';
import Home from './pages/home';
import Login from './pages/(auth)/login';
import Signup from './pages/(auth)/signup';
import Callback from './pages/(auth)/callback';
import Dashboard from './pages/dashboard';
import NotFound from './pages/not-found';
import CharacterHubPage from './pages/(characters)/hub';
import CharacterCreatePage from './pages/(characters)/create';
import CharacterDetailPage from './pages/(characters)/[characterId]';
import CharacterEditPage from './pages/(characters)/[characterId]/edit';
import ProfilePage from './pages/profile';
import ChatIndexPage from './pages/(chat)';
import ConversationDetailPage from './pages/(chat)/[conversationId]';
import NewConversationPage from './pages/(chat)/new';

function PublicShell(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
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
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/characters" element={<CharacterHubPage />} />
        <Route path="/characters/create" element={<CharacterCreatePage />} />
        <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
        <Route path="/characters/:characterId/edit" element={<CharacterEditPage />} />
        <Route path="/chat" element={<ChatIndexPage />} />
        <Route path="/chat/new" element={<NewConversationPage />} />
        <Route path="/chat/:conversationId" element={<ConversationDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
