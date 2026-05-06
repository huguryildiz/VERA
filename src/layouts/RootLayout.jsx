// src/layouts/RootLayout.jsx
// Root layout wrapper for the entire app.
// Provides ThemeProvider, AuthProvider, ToastContainer
// and renders child routes via <Outlet />.

import { useContext, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { AuthProvider } from "@/auth";
import { AuthContext } from "@/auth/shared/AuthProvider";
import ToastContainer from "@/shared/ui/ToastContainer";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";
import DraggableThemeToggle from "@/jury/shared/DraggableThemeToggle";
import MaintenanceGate from "@/components/MaintenanceGate";

function RootLayoutInner() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const isLandingRoot = pathname === "/" || pathname === "/demo" || pathname === "/demo/";
  const showToggle = !pathname.startsWith("/admin") && !pathname.startsWith("/demo/admin") && !isLandingRoot;

  // After Google OAuth, Supabase may redirect to site root instead of an
  // allow-listed URL when the redirect URL isn't in the allow-list. Catch that
  // here as a safety net.
  //
  // Skips:
  //   • /admin and /demo/admin — AdminRouteLayout natively renders
  //     CompleteProfileScreen for profileIncomplete users, so redirecting
  //     would unmount that flow and cause a flicker → wrong destination race.
  //   • /register and /demo/register — already on the right screen.
  //   • /invite/accept and /reset-password — route owns its own session.
  //
  // Preserve the /demo prefix so demo OAuth callbacks stay on the demo client;
  // a bare /register would route a demo session through the prod Supabase client.
  const PROFILE_REDIRECT_SKIP = (p) => {
    if (p === "/register" || p === "/demo/register") return true;
    if (p.startsWith("/admin") || p.startsWith("/demo/admin")) return true;
    if (p.startsWith("/invite/accept") || p.startsWith("/demo/invite/accept")) return true;
    if (p.startsWith("/reset-password") || p.startsWith("/demo/reset-password")) return true;
    return false;
  };
  useEffect(() => {
    if (auth?.profileIncomplete && !PROFILE_REDIRECT_SKIP(pathname)) {
      const base = pathname.startsWith("/demo") ? "/demo" : "";
      navigate(`${base}/register`, { replace: true });
    }
  }, [auth?.profileIncomplete, pathname, navigate]);

  return (
    <>
      <ErrorBoundary>
        <MaintenanceGate>
          <Outlet />
        </MaintenanceGate>
      </ErrorBoundary>
      <ToastContainer />
      {showToggle && <DraggableThemeToggle />}
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
