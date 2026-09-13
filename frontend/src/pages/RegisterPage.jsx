import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import Logo from "../components/Logo";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs = {};
    if (!name.trim()) {
      errs.name = "Name is required";
    } else if (name.trim().length > 100) {
      errs.name = "Must be 100 characters or less";
    }
    if (!email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Invalid email format";
    }
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 8) {
      errs.password = "Must be at least 8 characters";
    }
    if (!confirmPassword) {
      errs.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      navigate("/login", {
        state: { message: "Account created! Please log in." },
      });
    } catch (err) {
      const msg =
        err.response?.data?.error || "Registration failed. Please try again.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <Logo size="md" />
            <span className="text-xl font-bold text-campus-green">Campusly</span>
          </Link>
          <h1 className="text-2xl font-bold text-text">Create your account</h1>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card">
          {serverError && (
            <div className="mb-4 p-3 rounded-xl bg-error-light border border-error/20 text-error text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text mb-1.5 block">Full Name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoFocus
                className={`w-full h-11 px-4 rounded-xl border bg-surface text-text text-sm placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green hover:border-border-hover ${
                  errors.name ? "border-error focus:ring-error/20 focus:border-error" : "border-border"
                }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-error">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-text mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={`w-full h-11 px-4 rounded-xl border bg-surface text-text text-sm placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green hover:border-border-hover ${
                  errors.email ? "border-error focus:ring-error/20 focus:border-error" : "border-border"
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-error">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-text mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full h-11 px-4 pr-10 rounded-xl border bg-surface text-text text-sm placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green hover:border-border-hover ${
                    errors.password ? "border-error focus:ring-error/20 focus:border-error" : "border-border"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-error">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-text mb-1.5 block">Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full h-11 px-4 rounded-xl border bg-surface text-text text-sm placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-campus-green/20 focus:border-campus-green hover:border-border-hover ${
                  errors.confirmPassword ? "border-error focus:ring-error/20 focus:border-error" : "border-border"
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-error">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-campus-green hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
