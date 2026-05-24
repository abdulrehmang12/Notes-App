import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import SharePage from "./pages/SharePage.jsx";

function ProtectedRoute({ children }) {
  const { token, booting } = useAuth();

  if (booting) {
    return <div className="grid min-h-screen place-items-center bg-paper text-ink">Opening Lumina...</div>;
  }

  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:documentId"
        element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        }
      />
      <Route path="/share/:shareId" element={<SharePage />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
