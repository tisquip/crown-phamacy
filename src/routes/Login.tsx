import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import SignInWithGoogleButton from "@/components/SignInWithGoogleButton";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export const Route = createFileRoute("/Login")({
  component: RouteComponent,
});

function friendlyError(message: string): string {
  const msg = message.toLowerCase();
  if (
    msg.includes("invalid password") ||
    msg.includes("invalid credentials") ||
    msg.includes("could not verify")
  ) {
    return "Incorrect email or password. Please double-check and try again.";
  }
  if (msg.includes("user not found") || msg.includes("no account")) {
    return "No account found with that email. Would you like to sign up instead?";
  }
  if (
    msg.includes("already exists") ||
    msg.includes("duplicate") ||
    msg.includes("already been taken")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (msg.includes("too many") || msg.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Connection error. Please check your internet and try again.";
  }
  if (
    msg.includes("password") &&
    (msg.includes("short") || msg.includes("weak") || msg.includes("length"))
  ) {
    return "Password is too short. Please use at least 8 characters.";
  }
  return "Something went wrong. Please try again or use a different sign-in method.";
}

function RouteComponent() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const isSignUp = flow === "signUp";

  // Redirect once auth state confirms the user is authenticated after form submission
  useEffect(() => {
    if (submitted && isAuthenticated) {
      void navigate({ to: "/account" });
    }
  }, [submitted, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (isSignUp && password !== confirmPassword) {
      setError(
        "Passwords do not match. Please make sure both passwords are the same.",
      );
      return;
    }
    if (isSignUp && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      formData.set("flow", flow);
      await signIn("password", formData);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(friendlyError(message));
    } finally {
      setLoading(false);
    }
  };

  const switchFlow = () => {
    setFlow(isSignUp ? "signIn" : "signUp");
    setError(null);
    setConfirmPassword("");
    setPassword("");
  };

  return (
    <Layout>
      <div className="bg-secondary py-2">
        <div className="container mx-auto px-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>{" "}
          &gt; {isSignUp ? "Create Account" : "Sign In"}
        </div>
      </div>
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-sm w-full mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isSignUp
              ? "Fill in your details to create a new account."
              : "Welcome back! Sign in to your account."}
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 mb-4 text-left">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <SignInWithGoogleButton />

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  required
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Min. 8 characters"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                    confirmPassword && password !== confirmPassword
                      ? "border-destructive focus:ring-destructive"
                      : "border-border"
                  }`}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-destructive text-xs mt-1">
                    Passwords do not match.
                  </p>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading
                ? isSignUp
                  ? "Creating account..."
                  : "Signing in..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          <div className="flex flex-row items-center justify-center gap-1 mt-6 text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </span>
            <button
              type="button"
              className="text-primary font-medium underline hover:no-underline cursor-pointer"
              onClick={switchFlow}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
