"use client";

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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center font-bold text-white text-xl">
            T
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            TradeWizard
          </span>
        </div>

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
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
