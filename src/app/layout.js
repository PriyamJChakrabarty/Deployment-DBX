import { ClerkProvider } from "@clerk/nextjs";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";

import { hasClerkCredentials } from "@/lib/clerk-config";
import SmoothScrollProvider from "@/components/smooth-scroll-provider";

import "./globals.css";

const oswald = Oswald({
  variable: "--font-display-raw",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans-raw",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-raw",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "DebugRoyale — Debug AI. Become a Bug Slayer.",
  description:
    "Competitive arena where engineers hunt security flaws, performance bottlenecks, and ethical violations in real code. Five categories, one codebase, one winner.",
};

export default function RootLayout({ children }) {
  const app = hasClerkCredentials() ? <ClerkProvider>{children}</ClerkProvider> : children;

  return (
    <html
      lang="en"
      className={`h-full antialiased dark ${oswald.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScrollProvider>{app}</SmoothScrollProvider>
      </body>
    </html>
  );
}
