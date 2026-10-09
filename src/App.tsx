import { useState } from "react";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout, type PageId } from "@/components/Layout";
import { AuthPage } from "@/pages/AuthPage";
import { Dashboard } from "@/pages/Dashboard";
import { Tasks } from "@/pages/Tasks";
import { Focus } from "@/pages/Focus";
import { Rewards } from "@/pages/Rewards";
import { Statistics } from "@/pages/Statistics";
import { History } from "@/pages/History";
import { Profile } from "@/pages/Profile";

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<PageId>("dashboard");

  return (
    <ThemeProvider
      initialTheme={(profile?.theme as "dark" | "light") || "dark"}
      userId={session?.user.id}
    >
      <AppInner
        loading={loading}
        session={session}
        page={page}
        setPage={setPage}
      />
    </ThemeProvider>
  );
}

function AppInner({
  loading,
  session,
  page,
  setPage,
}: {
  loading: boolean;
  session: ReturnType<typeof useAuth>["session"];
  page: PageId;
  setPage: (p: PageId) => void;
}) {
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === "dashboard" && <Dashboard onNavigate={setPage} />}
      {page === "tasks" && <Tasks onNavigate={setPage} />}
      {page === "focus" && <Focus onNavigate={setPage} />}
      {page === "rewards" && <Rewards />}
      {page === "stats" && <Statistics />}
      {page === "history" && <History />}
      {page === "profile" && <Profile />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
