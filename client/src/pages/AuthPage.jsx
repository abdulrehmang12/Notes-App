import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../lib/api.js";

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const isSignup = mode === "signup";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        await auth.signup(form);
      } else {
        await auth.login({ email: form.email, password: form.password });
      }
      navigate("/app");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
          <Logo />
          <div className="my-16 max-w-2xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1 text-sm font-semibold text-moss">
              <Sparkles size={15} />
              Live notes, shared thinking
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.02] tracking-normal text-ink sm:text-6xl">
              Write together without losing the thread.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink/65">
              Lumina Notes gives teams lightweight notebooks, rich formatting, access control, and live cursors in one calm writing space.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm text-ink/65">
            <div className="rounded-lg border border-ink/10 bg-white/70 p-4">
              <p className="font-bold text-ink">JWT Auth</p>
              <p className="mt-1">Private workspaces</p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-white/70 p-4">
              <p className="font-bold text-ink">Quill Deltas</p>
              <p className="mt-1">Rich text JSON</p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-white/70 p-4">
              <p className="font-bold text-ink">Socket.io</p>
              <p className="mt-1">Live collaboration</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-ink px-6 py-10 text-paper lg:px-12">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-paper p-6 text-ink shadow-soft sm:p-8">
            <div className="mb-8">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-amber/80 text-ink">
                <Mail size={22} />
              </div>
              <h2 className="text-2xl font-extrabold">{isSignup ? "Create your account" : "Welcome back"}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                {isSignup ? "Start a workspace for collaborative notes." : "Open your notebooks and keep writing."}
              </p>
            </div>

            {isSignup && (
              <label className="mb-4 block">
                <span className="text-sm font-bold text-ink/70">Name</span>
                <input
                  className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ada Lovelace"
                  required
                />
              </label>
            )}

            <label className="mb-4 block">
              <span className="text-sm font-bold text-ink/70">Email</span>
              <input
                className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                type="email"
                required
              />
            </label>

            <label className="mb-4 block">
              <span className="text-sm font-bold text-ink/70">Password</span>
              <input
                className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="At least 8 characters"
                type="password"
                minLength={8}
                required
              />
            </label>

            {error && <p className="mb-4 rounded-lg bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">{error}</p>}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 font-bold text-paper transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Working..." : isSignup ? "Create account" : "Sign in"}
              <ArrowRight size={18} />
            </button>

            <p className="mt-6 text-center text-sm text-ink/60">
              {isSignup ? "Already have an account?" : "New to Lumina?"}{" "}
              <Link className="font-bold text-moss hover:underline" to={isSignup ? "/login" : "/signup"}>
                {isSignup ? "Sign in" : "Create one"}
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
