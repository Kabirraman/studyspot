"use client";

import { useCallback, useEffect, useState } from "react";

type LocalUser = { id: string; email: string; name: string | null };

const STORAGE_KEY = "studyspot_user";

// Placeholder identity layer: stores the created user's id in localStorage
// so ratings can be attributed to *someone* without full auth. Swap this
// out for a NextAuth session hook once sign-in is wired up.
export function useLocalUser() {
  const [user, setUser] = useState<LocalUser | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const identify = useCallback(async (email: string, name?: string) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    if (!res.ok) throw new Error("Could not identify user.");
    const created: LocalUser = await res.json();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
    setUser(created);
    return created;
  }, []);

  return { user, identify };
}
