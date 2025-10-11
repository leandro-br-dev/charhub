import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Header, ProtectedRoute } from './components/layout';
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

function PublicShell(): JSX.Element {
  const location = useLocation();
  const hideHeaderPaths = new Set(['/', '/login', '/signup']);
  const showHeader = !hideHeaderPaths.has(location.pathname);
  const mainClassName = showHeader ? 'mx-auto max-w-7xl px-6 py-10' : '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showHeader ? <Header /> : null}
      <main className={mainClassName}>
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
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
