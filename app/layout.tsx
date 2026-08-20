import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Campus Study Spot Finder",
  description: "Find the best places on campus to study, right now.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[var(--surface)] text-[var(--text-primary)] antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
