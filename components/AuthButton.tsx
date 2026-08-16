"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-20 animate-pulse rounded-lg bg-neutral-800" />;
  }

  if (session?.user) {
    return (
      <button
        onClick={() => signOut()}
        className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
      >
        {session.user.name ?? session.user.email}
        <span className="text-neutral-600">· Sign out</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-neutral-950"
    >
      Sign in
    </button>
  );
}
