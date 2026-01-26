import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/navbar";
import MagicProvider from "@/lib/magic";
import { WalletProvider } from "@/lib/wallet-context";
import { RealtimeProvider } from "@/lib/realtime-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { ConnectionBanner } from "@/components/connection-status";
import { PerformanceMonitor } from "@/components/performance-monitor";

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
              <RealtimeProvider 
                autoConnect={true}
                enableNotifications={true}
                enableSound={false}
              >
                <ErrorBoundary 
                  name="Navigation"
                  showRecoveryOptions={false}
                  maxRetries={1}
                >
                  <Navbar />
                </ErrorBoundary>
                
                {/* Connection Status Indicator */}
                <ConnectionBanner 
                  className="fixed top-16 left-4 right-4 z-40 max-w-md mx-auto"
                  dismissible={true}
                />
                
                <main className="flex-1">
                  <ErrorBoundary 
                    name="MainContent"
                    showRecoveryOptions={true}
                    maxRetries={3}
                  >
                    {children}
                  </ErrorBoundary>
                </main>
                
                {/* Performance Monitor (development only) */}
                {process.env.NODE_ENV === 'development' && (
                  <PerformanceMonitor />
                )}
              </RealtimeProvider>
            </WalletProvider>
          </MagicProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
