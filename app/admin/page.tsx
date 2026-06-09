import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="font-display text-4xl font-bold text-white">
          Admin Dashboard
        </h1>
        <p className="text-white/60">
          Full admin panel coming in Phase 5.
        </p>
      </div>
    </div>
  );
}
