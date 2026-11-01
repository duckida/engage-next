import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, School } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { useMe } from "../lib/useMe";
import { AppMark } from "../components/AppMark";

type Step = "school" | "account";

export function LoginPage() {
  const queryClient = useQueryClient();
  const me = useMe();
  const [step, setStep] = useState<Step>("school");
  const [school, setSchool] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const login = useMutation({
    mutationFn: (input: { school: string; username: string; password: string }) =>
      api.login(input.school, input.username, input.password),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
    },
  });

  function submitSchool(event: FormEvent) {
    event.preventDefault();
    if (!school.trim()) return;
    setStep("account");
  }

  function submitAccount(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    login.mutate({ school: school.trim(), username: username.trim(), password });
  }

  function back() {
    login.reset();
    setStep("school");
  }

  const error = login.error as ApiError | null;

  return (
    <div className="login">
      <div className="login-brand">
        <div className="brand-mark">
          <AppMark size={48} className="is-on-brand" />
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
          Works with any school on Engage. Not affiliated with your school or with Engage.
        </p>
      </div>

      <div className="login-panel">
        <div className="login-card">
          {step === "school" ? (
            <>
              <div className="login-icon">
                <School size={22} strokeWidth={1.8} />
              </div>
              <h2>Find your school</h2>
              <p className="login-intro">
                Enter your school’s Engage address. It’s the part before{" "}
                <code>.engagehosted.com</code> in your portal link.
              </p>

              <form onSubmit={submitSchool} className="login-form" noValidate>
                <label className="field">
                  <span className="field-label">School Engage address</span>
                  <span className="input-suffix">
                    <input
                      className="input"
                      name="school"
                      autoFocus
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="yourschool"
                      value={school}
                      onChange={(event) => setSchool(event.target.value)}
                      required
                    />
                    <span className="input-suffix-label">.engagehosted.com</span>
                  </span>
                </label>

                <button
                  type="submit"
                  className="btn btn-filled btn-lg login-submit"
                  disabled={!school.trim()}
                >
                  Continue <ArrowRight size={18} />
                </button>
              </form>

              <p className="login-hint">
                Example: if your portal is <code>stmarks.engagehosted.com</code>, enter{" "}
                <strong>stmarks</strong>.
              </p>
            </>
          ) : (
            <>
              <div className="login-icon">
                <LockKeyhole size={22} strokeWidth={1.8} />
              </div>
              <h2>Welcome back</h2>
              <p className="login-intro">
                Sign in with your school Engage account. Your password goes straight from your
                computer to this local session — it is never stored or shared.
              </p>

              <button type="button" className="login-school-chip" onClick={back}>
                <School size={14} />
                <span>
                  <strong>{school}</strong>.engagehosted.com
                </span>
                <ArrowLeft size={14} className="login-school-back" />
              </button>

              {me.data?.demo ? (
                <div className="demo-notice">
                  <strong>Demo mode.</strong> This build is showing fixture data. Restart the app
                  without <code>ENGAGE_DEMO</code> to sign in with your account.
                </div>
              ) : null}

              <form onSubmit={submitAccount} className="login-form" noValidate>
                <label className="field">
                  <span className="field-label">Username</span>
                  <input
                    className="input"
                    name="username"
                    autoFocus
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Your Engage username"
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

                <button
                  type="submit"
                  className="btn btn-filled btn-lg login-submit"
                  disabled={login.isPending}
                >
                  {login.isPending ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
                  {login.isPending ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}