"use client";

import { useAuth } from "../../lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/");
      return;
    }
  }, [user, loading, router]);

  if (loading || !user) return <p>Loading...</p>;
  if (user.role !== "admin") return null;

  return (
    <main>
      <h1>Admin Dashboard</h1>
      {/* nanti isi statistik dll */}
    </main>
  );
}
