import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/navbar";
import MagicProvider from "@/lib/magic";
import { WalletProvider } from "@/lib/wallet-context";
import { ErrorBoundary } from "@/components/error-boundary";

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
        <ErrorBoundary 
          name="RootLayout"
          showRecoveryOptions={true}
          maxRetries={2}
        >
          <MagicProvider>
            <WalletProvider>
              <ErrorBoundary 
                name="Navigation"
                showRecoveryOptions={false}
                maxRetries={1}
              >
                <Navbar />
              </ErrorBoundary>
              <main className="flex-1">
                <ErrorBoundary 
                  name="MainContent"
                  showRecoveryOptions={true}
                  maxRetries={3}
                >
                  {children}
                </ErrorBoundary>
              </main>
            </WalletProvider>
          </MagicProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
