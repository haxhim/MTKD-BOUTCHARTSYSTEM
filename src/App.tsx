import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { TournamentProvider } from './context/TournamentContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { TournamentRoute } from './guards/TournamentRoute';

// Pages
import { LoginPage } from './pages/LoginPage';
import { LobbyPage } from './pages/LobbyPage';
import { Layout } from './pages/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { RingsPage } from './pages/RingsPage';
import { BracketsPage } from './pages/BracketsPage';
import { RingMatchPage } from './pages/RingMatchPage';
import { MasterBoutPage } from './pages/MasterBoutPage';
import { JudgePage } from './pages/JudgePage';
import { WinnersPage } from './pages/WinnersPage';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <TournamentProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/lobby" replace />} />
              <Route path="/lobby" element={<LobbyPage />} />

              {/* Tournament Routes */}
              <Route path="/tournament/:tournamentId" element={<TournamentRoute />}>
                <Route element={<Layout />}>
                  <Route path="overview" element={<DashboardPage />} />
                  <Route path="participants" element={<MasterBoutPage />} />
                  <Route path="rings" element={<RingsPage />} />
                  <Route path="brackets" element={<BracketsPage />} />
                  <Route path="matches" element={<RingMatchPage />} />
                  <Route path="judge" element={<JudgePage />} />
                  <Route path="judge/:ringId" element={<JudgePage />} />
                  <Route path="winners" element={<WinnersPage />} />

                  {/* Default redirect to overview */}
                  <Route index element={<Navigate to="overview" replace />} />
                </Route>
              </Route>
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </TournamentProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
