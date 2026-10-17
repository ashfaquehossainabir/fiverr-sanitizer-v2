import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import Loader from "./components/Loader.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="app-loading-screen">
        <Loader full label="Loading" />
      </div>
    );
  }
  // Send people back to the page that sent them to sign in (e.g. /admin), not always /dashboard.
  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname || "/dashboard"} replace />;
  return children;
}

// Pages that have their own header render the toggle there; everything else
// (login, register) gets a floating one.
function FloatingThemeToggle() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;
  return <ThemeToggle floating />;
}

export default function App() {
  return (
    <>
      <FloatingThemeToggle />
      <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
