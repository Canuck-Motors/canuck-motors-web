import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Outfit } from "next/font/google";
import ChatLauncher from "@/components/chat/ChatLauncher";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),

  title: {
    default: "Canuck Motors | North America's Automotive Parts Experts",
    template: "%s | Canuck Motors",
  },

  description:
    "Find compatible automotive parts by year, manufacturer, model, engine, and trim at Canuck Motors.",

  robots: {
    index: true,
    follow: true,
  },
};

const outfit = Outfit({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${outfit.className} antialiased`}>
  {/* Header reads the current path (usePathname), so it must stream in */}
  <Suspense fallback={<div className="h-20" aria-hidden="true" />}>
    <Header />
  </Suspense>
  <Navbar />
  {children}
  <ChatLauncher />
</body>
    </html>
  );
}
