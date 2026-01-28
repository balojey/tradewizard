"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletContext";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import usePolygonBalances from "@/hooks/usePolygonBalances";

import { cn } from "@/utils/classNames";
import { BUTTON_BASE, BUTTON_VARIANTS } from "@/constants/ui";

import Card from "@/components/shared/Card";
import Badge from "@/components/shared/Badge";
import TransferModal from "@/components/PolygonAssets/TransferModal";

export default function PolygonAssets() {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { eoaAddress } = useWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress);
  const { formattedUsdcBalance, isLoading, isError } = usePolygonBalances(
    derivedSafeAddressFromEoa
  );

  if (!derivedSafeAddressFromEoa) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Trading Balance</h2>
        <div className="h-32 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 border-red-500/20">
        <h2 className="text-xl font-bold mb-4 text-white">Trading Balance</h2>
        <p className="text-center text-red-400">Error loading balance</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 transition-all duration-300 hover:shadow-indigo-500/10 hover:border-indigo-500/30">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-6 bg-indigo-500 rounded-full" />
          Trading Balance
        </h2>
        <button
          onClick={() => setIsTransferModalOpen(true)}
          className={cn(
            BUTTON_BASE,
            BUTTON_VARIANTS.secondary,
            "px-4 py-2 text-sm shadow-sm"
          )}
        >
          Transfer Funds
        </button>
      </div>

      <div className="bg-black/20 rounded-xl p-8 text-center border border-black/10 shadow-inner">
        <div className="flex items-center justify-center gap-3 mb-3">
          <h3 className="text-lg font-medium text-gray-400">USDC (Polygon)</h3>
        </div>

        <p className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">
          ${formattedUsdcBalance}
        </p>
      </div>

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </Card>
  );
}
