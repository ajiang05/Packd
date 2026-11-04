import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Packd — Plan trips together",
  description:
    "Get trip plans out of the group chat. Propose, vote, and pack — together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
