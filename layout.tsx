import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAMS AI | FRC Team 7729",
  description:
    "AI assistant for FRC Team 7729 — rules, scouting, strategy, and robot programming help.",
  icons: {
    icon: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-rams-darker text-white antialiased">
        {children}
      </body>
    </html>
  );
}
