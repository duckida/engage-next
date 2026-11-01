import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Splash } from "./components/States";
import { useMe } from "./lib/useMe";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MeritsPage } from "./pages/MeritsPage";
import { NoticesPage } from "./pages/NoticesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { TimetablePage } from "./pages/TimetablePage";

export function App() {
  const me = useMe();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onUnauthorized = () => {
      // Drop the session state so the login screen renders — no reload needed.
      queryClient.setQueryData(["me"], null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
    };
    window.addEventListener("engage:unauthorized", onUnauthorized);
    return () => window.removeEventListener("engage:unauthorized", onUnauthorized);
  }, [queryClient]);

  if (me.isPending) return <Splash />;

  if (me.isError || !me.data?.user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes location={location}>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/merits" element={<MeritsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}