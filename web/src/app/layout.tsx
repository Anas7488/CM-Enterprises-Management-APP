import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/shared/ui/ThemeProvider";

export const metadata: Metadata = {
  title: "CM Enterprises",
  description: "Inventory & Distribution Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
