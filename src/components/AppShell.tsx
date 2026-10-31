import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  ExternalLink,
  FileText,
  Home,
  LogOut,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { api } from "../lib/api";
import { useMe } from "../lib/useMe";
import { useTheme, type ThemeMode } from "../lib/theme";

const navigation = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/merits", label: "Merits", icon: Sparkles },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/notices", label: "Notices", icon: Bell },
];

const mobileNavigation = navigation;

const themeOptions: Array<{ mode: ThemeMode; label: string; icon: typeof Sun }> = [
  { mode: "system", label: "System theme", icon: Monitor },
  { mode: "light", label: "Light theme", icon: Sun },
  { mode: "dark", label: "Dark theme", icon: Moon },
];

function ThemeSegmented({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();

  return (
    <div className={`theme-segmented ${compact ? "is-compact" : ""}`} role="group" aria-label="Theme">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.mode}
            type="button"
            className="theme-option"
            data-active={mode === option.mode}
            onClick={() => setMode(option.mode)}
            aria-label={option.label}
            aria-pressed={mode === option.mode}
            title={option.label}
          >
            <Icon size={compact ? 16 : 17} strokeWidth={1.9} />
          </button>
        );
      })}
    </div>
  );
}

function CycleThemeButton() {
  const { mode, setMode } = useTheme();
  const next: Record<ThemeMode, ThemeMode> = { system: "light", light: "dark", dark: "system" };
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setMode(next[mode])}
      aria-label={`Theme: ${mode}. Change theme`}
      title={`Theme: ${mode}`}
    >
      <Icon size={20} strokeWidth={1.9} />
    </button>
  );
}

export function AppShell() {
  const me = useMe();
  const user = me.data?.user;
  const demo = me.data?.demo ?? false;
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    try {
      await api.logout();
    } finally {
      queryClient.setQueryData(["me"], null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
      navigate("/", { replace: true });
    }
  }

  if (!user) return null;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link to="/" className="brand" aria-label="Holme Grange home">
            <img src="/crest.png" alt="" className="brand-crest" />
            <span className="brand-text">
              <span className="brand-name">Holme Grange</span>
              <span className="brand-sub">Engage</span>
            </span>
          </Link>

          {demo ? (
            <span className="demo-chip" title="Fixture data — no school account is being used">
              Demo data
            </span>
          ) : null}
        </div>

        <nav className="side-nav" aria-label="Main">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}
              >
                <Icon size={20} strokeWidth={1.9} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <a
            className="portal-link"
            href="https://holmegrange.engagehosted.com/vle/"
            target="_blank"
            rel="noreferrer"
          >
            <span>Official portal</span>
            <ExternalLink size={14} />
          </a>

          <div className="sidebar-theme">
            <span>Appearance</span>
            <ThemeSegmented compact />
          </div>

          <div className="sidebar-user">
            <Link to="/profile" className="sidebar-user-main">
              <Avatar name={user.name} src={user.photoUrl} size={38} />
              <span className="sidebar-user-text">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-meta">Student</span>
              </span>
            </Link>
            <button type="button" className="icon-btn" onClick={signOut} aria-label="Log out" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <header className="mobile-bar">
        <Link to="/" className="mobile-brand" aria-label="Holme Grange home">
          <img src="/crest.png" alt="" />
          <span>Holme Grange</span>
        </Link>
        <div className="mobile-actions">
          {demo ? <span className="demo-chip">Demo</span> : null}
          <CycleThemeButton />
          <Link to="/profile" className="mobile-avatar" aria-label="Your profile">
            <Avatar name={user.name} src={user.photoUrl} size={34} />
          </Link>
        </div>
      </header>

      <main className="main">
        <div className="page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `bottom-nav-item ${isActive ? "is-active" : ""}`}
            >
              <span className="bottom-nav-icon">
                <Icon size={21} strokeWidth={1.9} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <NavLink
          to="/profile"
          className={({ isActive }) => `bottom-nav-item ${isActive ? "is-active" : ""}`}
        >
          <span className="bottom-nav-icon">
            <UserRound size={21} strokeWidth={1.9} />
          </span>
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
