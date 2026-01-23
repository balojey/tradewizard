import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Navbar } from "@/components/ui/navbar";
import { CategoriesBar } from "@/components/categories-bar";
import MagicProvider from "@/lib/magic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeWizard - AI-Powered Prediction Trading",
  description: "Intelligence layer for real-world prediction markets with AI-driven analysis and trade recommendations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <MagicProvider>
          <Navbar />
          <Suspense fallback={<div className="h-12 border-b border-border/40 bg-background/95" />}>
            <CategoriesBar />
          </Suspense>
          <main className="flex-1">
            {children}
          </main>
        </MagicProvider>
      </body>
    </html>
  );
}
