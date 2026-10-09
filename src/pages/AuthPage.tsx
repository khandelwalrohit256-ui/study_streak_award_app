import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Flame, Loader2 } from "lucide-react";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName || email.split("@")[0]);
      }
    } catch (err) {
      const raw = String(err?.message || err);
      const msg = raw.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        setError("Invalid email or password");
      } else if (msg.includes("already") || msg.includes("already_registered") || msg.includes("user already")) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (msg.includes("weak_password") || msg.includes("pwned") || msg.includes("weak")) {
        setError("That password is too common and easy to guess. Use a mix of letters, numbers, and symbols (e.g. StudyApp2026!)");
      } else if (msg.includes("rate_limit") || msg.includes("rate") || msg.includes("too many")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (msg.includes("unexpected_failure") || msg.includes("database error")) {
        setError("Server error creating account. Please try again in a moment.");
      } else if (msg.includes("email")) {
        setError("Please enter a valid email address.");
      } else {
        setError(raw || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3">
            <Flame size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Study Streak
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
            Build unbreakable study discipline. One day at a time.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === "signin"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              {mode === "signup" && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Use at least 8 characters with a mix of letters, numbers, and symbols. Avoid common passwords.
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Please wait...
                </>
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Your data syncs across all your devices.
        </p>
      </div>
    </div>
  );
}
