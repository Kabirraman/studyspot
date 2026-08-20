"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { motion } from "framer-motion";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-9 w-24 animate-pulse rounded-full" style={{ backgroundColor: "var(--surface-hover)" }} />;
  }

  if (session?.user) {
    const initial = (session.user.name ?? session.user.email ?? "?").charAt(0).toUpperCase();
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => signOut()}
        className="focus-ring flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition-colors"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-neutral-950"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {initial}
        </span>
        <span className="max-w-[100px] truncate">{session.user.name ?? session.user.email}</span>
        <span style={{ color: "var(--text-tertiary)" }}>Sign out</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => signIn("google")}
      className="focus-ring rounded-full px-4 py-2 text-xs font-medium text-neutral-950"
      style={{ backgroundColor: "var(--accent)" }}
    >
      Sign in
    </motion.button>
  );
}
