// src/layouts/AuthRouteLayout.jsx
// Ensures standalone auth routes (/login, /register, /forgot-password,
// /reset-password) always use production Supabase environment.

import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { setEnvironment } from "@/shared/lib/environment";

export default function AuthRouteLayout() {
  useEffect(() => {
    setEnvironment("prod");
  }, []);

  return <Outlet />;
}
