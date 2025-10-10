import { Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
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

export default function App(): JSX.Element {
  const location = useLocation();
  const isExternalPage = ['/', '/login', '/signup'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isExternalPage && <Header />}
      <main className={isExternalPage ? '' : 'mx-auto max-w-7xl px-6 py-10'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/characters"
            element={
              <ProtectedRoute>
                <CharacterHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/characters/create"
            element={
              <ProtectedRoute>
                <CharacterCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/characters/:characterId"
            element={
              <ProtectedRoute>
                <CharacterDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/characters/:characterId/edit"
            element={
              <ProtectedRoute>
                <CharacterEditPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
