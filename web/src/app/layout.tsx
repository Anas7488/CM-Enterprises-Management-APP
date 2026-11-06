import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/shared/ui/ThemeProvider";

export const metadata: Metadata = {
  title: "CM Enterprises",
  description: "Inventory & Distribution Management",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CM Enterprises",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0F172A",
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
