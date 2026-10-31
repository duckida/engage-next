import { useEffect } from "react";
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

  useEffect(() => {
    const onUnauthorized = () => {
      window.location.assign("/");
    };
    window.addEventListener("engage:unauthorized", onUnauthorized);
    return () => window.removeEventListener("engage:unauthorized", onUnauthorized);
  }, []);

  if (me.isPending) return <Splash />;

  if (me.isError || !me.data) {
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