"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/providers/WalletContext";
import WalletInfo from "@/components/Header/WalletInfo";
import { BUTTON_BASE, BUTTON_VARIANTS } from "@/constants/ui";
import { cn } from "@/utils/classNames";

export default function Header({
  onEndSession,
}: {
  onEndSession?: () => void;
}) {
  const { eoaAddress, connect, disconnect } = useWallet();
  const pathname = usePathname();

  const navItems = [
    { label: "Markets", href: "/" },
    { label: "Wallet", href: "/wallet" },
    { label: "Account", href: "/account" },
  ];

  const handleDisconnect = async () => {
    try {
      onEndSession?.();
      await disconnect();
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 select-none">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center font-bold text-white text-xl">
              T
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              TradeWizard
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {eoaAddress ? (
            <WalletInfo onDisconnect={handleDisconnect} />
          ) : (
            <button
              className={cn(
                BUTTON_BASE,
                BUTTON_VARIANTS.primary,
                "px-6 py-2"
              )}
              onClick={connect}
            >
              Login / Sign Up
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
