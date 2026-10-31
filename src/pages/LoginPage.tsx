import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { useMe } from "../lib/useMe";

export function LoginPage() {
  const queryClient = useQueryClient();
  const me = useMe();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const login = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      api.login(username, password),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    login.mutate({ username: username.trim(), password });
  }

  const error = login.error as ApiError | null;

  return (
    <div className="login">
      <div className="login-brand">
        <div className="brand-mark">
          <img src="/crest.png" alt="Holme Grange School crest" />
        </div>
        <div className="login-brand-copy">
          <p className="eyebrow on-primary">Unofficial pupil client</p>
          <h1>Your school day, beautifully simple.</h1>
          <ul className="login-points">
            <li>
              <span>01</span> Today’s timetable and the week ahead
            </li>
            <li>
              <span>02</span> Merits, reports and notices in one place
            </li>
            <li>
              <span>03</span> Works on phones, tablets and laptops
            </li>
          </ul>
        </div>
        <p className="login-footnote">
          Built for Holme Grange School’s Engage portal. Not affiliated with the school or Engage.
        </p>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-icon">
            <LockKeyhole size={22} strokeWidth={1.8} />
          </div>
          <h2>Welcome back</h2>
          <p className="login-intro">
            Sign in with your school Engage account. Your password goes straight from your computer to this local
            session — it is never stored or shared.
          </p>

          {me.data?.demo ? (
            <div className="demo-notice">
              <strong>Demo mode.</strong> This build is showing fixture data. Restart the app without{" "}
              <code>ENGAGE_DEMO</code> to sign in with your account.
            </div>
          ) : null}

          <form onSubmit={submit} className="login-form" noValidate>
            <label className="field">
              <span className="field-label">Username</span>
              <input
                className="input"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. ntandon"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <span className="input-affix">
                <input
                  className="input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your portal password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {error ? (
              <p className="form-error" role="alert">
                {error.message}
              </p>
            ) : null}

            <button type="submit" className="btn btn-filled btn-lg login-submit" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
              {login.isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <button type="button" className="login-demo-skip" onClick={() => { window.location.search = ""; void queryClient.invalidateQueries({ queryKey: ["me"] }); }}>
            Continue in demo mode
          </button>
        </div>
      </div>
    </div>
  );
}