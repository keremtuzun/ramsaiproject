import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAMS AI | FRC Team 7729",
  description:
    "AI assistant for FRC Team 7729 — rules, scouting, strategy, and robot programming help.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>",
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
