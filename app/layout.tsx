import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hotel Budget Optimizer",
  description: "Optimize hotel & resort marketing budgets using performance modeling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
