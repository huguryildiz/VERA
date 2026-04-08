// src/layouts/RootLayout.jsx
// Root layout wrapper for the entire app.
// Provides ThemeProvider, AuthProvider, ToastContainer
// and renders child routes via <Outlet />.

import { Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { AuthProvider } from "@/auth";
import ToastContainer from "@/shared/ui/ToastContainer";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";
import DraggableThemeToggle from "@/jury/components/DraggableThemeToggle";

function RootLayoutInner() {
  const { pathname } = useLocation();
  const showToggle = !pathname.startsWith("/admin") && !pathname.startsWith("/demo/admin");

  return (
    <>
      <ErrorBoundary>
        <Outlet />
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
