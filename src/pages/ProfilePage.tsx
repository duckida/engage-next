import { useQuery } from "@tanstack/react-query";
import { LogOut, ExternalLink, Monitor, Moon, Sun, ShieldCheck, Users, GraduationCap } from "lucide-react";
import { api } from "../lib/api";
import { useMe } from "../lib/useMe";
import { remembered } from "../lib/remember";
import { useTheme, type ThemeMode } from "../lib/theme";
import { ErrorState, PageSkeleton, EmptyState, Skeleton } from "../components/States";
import { Avatar } from "../components/Avatar";
import { surnameFirst } from "../lib/format";

const themeOptions: Array<{ mode: ThemeMode; label: string; icon: typeof Sun }> = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "system", label: "System", icon: Monitor },
];

/** "stmarks" -> "Stmarks"; "st-marks" -> "St Marks". */
function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProfilePage() {
  const me = useMe();
  const { mode, setMode } = useTheme();
  const school = me.data?.school ?? null;
  const portalUrl = school ? `https://${school}.engagehosted.com/vle/` : null;
  const siblingsQuery = useQuery({
    queryKey: ["siblings"],
    queryFn: () => api.siblings(),
  });

  const user = me.data?.user;

  if (!user) return <PageSkeleton />;

  async function signOut() {
    try {
      await api.logout();
    } finally {
      remembered.clearPassword();
      window.location.assign("/");
      window.location.reload();
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Profile</h1>
        </div>
        <button type="button" className="btn btn-outline" onClick={signOut}>
          <LogOut size={16} /> Sign out
        </button>
      </header>

      <section className="profile-hero">
        <div className="profile-avatar">
          <Avatar name={user.name} src={user.photoUrl} size={96} />
        </div>
        <div className="profile-id">
          <h2>{surnameFirst(user.name)}</h2>
          <p>
            <GraduationCap size={15} /> Pupil
            {me.data?.school ? ` · ${titleCase(me.data.school)}` : ""}
          </p>
          <span className={`pill ${me.data?.demo ? "is-demo" : "is-live"}`}>
            <ShieldCheck size={13} /> {me.data?.demo ? "Demo session" : "Live session"}
          </span>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Appearance</h2>
            <p className="card-sub">Choose how Engage looks on this device</p>
          </div>
        </header>
        <div className="theme-tiles" role="group" aria-label="Theme">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.mode}
                type="button"
                className={`theme-tile ${mode === option.mode ? "is-active" : ""}`}
                onClick={() => setMode(option.mode)}
                aria-pressed={mode === option.mode}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Family</h2>
            <p className="card-sub">Linked pupils on this account</p>
          </div>
          <span className="stat-icon">
            <Users size={18} />
          </span>
        </header>

        {siblingsQuery.isPending ? (
          <div className="sibling-list" aria-hidden="true">
            <Skeleton className="skeleton-row" style={{ height: 64 }} />
            <Skeleton className="skeleton-row" style={{ height: 64 }} />
          </div>
        ) : siblingsQuery.error ? (
          <ErrorState
            error={siblingsQuery.error}
            compact
            onRetry={() => void siblingsQuery.refetch()}
          />
        ) : (siblingsQuery.data ?? []).length ? (
          <ul className="sibling-list">
            {siblingsQuery.data?.map((sibling) => (
              <li key={`${sibling.name}-${sibling.details.join("-")}`} className="sibling-row">
                <Avatar name={surnameFirst(sibling.name)} src={sibling.photoUrl} size={44} />
                <div className="sibling-body">
                  <strong>{surnameFirst(sibling.name)}</strong>
                  <span>{sibling.details.filter(Boolean).join(" · ") || "—"}</span>
                </div>
                {sibling.current ? <span className="pill is-live">You</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Users size={20} />} title="No linked pupils" />
        )}
      </section>

      <section className="card">
        <header className="card-head">
          <div>
            <h2>Portal</h2>
            <p className="card-sub">Open your school’s Engage portal in a new tab</p>
          </div>
        </header>
        {portalUrl ? (
          <a className="btn btn-tonal" href={portalUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> {school}.engagehosted.com
          </a>
        ) : (
          <p className="card-sub">Sign in with your school to open the official portal.</p>
        )}
      </section>
    </div>
  );
}