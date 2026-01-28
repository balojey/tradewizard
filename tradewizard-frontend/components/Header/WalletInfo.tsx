import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/providers/WalletContext";
import useAddressCopy from "@/hooks/useAddressCopy";
import useSafeDeployment from "@/hooks/useSafeDeployment";

import InfoTooltip from "@/components/shared/InfoTooltip";

import { formatAddress } from "@/utils/formatting";

export default function WalletInfo({
  onDisconnect,
}: {
  onDisconnect: () => void;
}) {
  const { eoaAddress } = useWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress);
  const { copied: copiedSafe, copyAddress: copySafeAddress } = useAddressCopy(
    derivedSafeAddressFromEoa || null
  );

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 ${isOpen
            ? "bg-white/10 border-white/20 text-white"
            : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
          {eoaAddress?.slice(2, 4)}
        </div>
        <span className="font-mono text-sm">
          {eoaAddress && formatAddress(eoaAddress)}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <div className="flex flex-col gap-4">
            {/* EOA Wallet */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                  EOA Wallet
                </span>
                <InfoTooltip text="This is your EOA wallet address. It is only used for signing transactions for the proxy wallet. Do not fund this address!" />
              </div>
              <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-2 font-mono text-sm text-gray-300 break-all select-all">
                {eoaAddress}
              </div>
            </div>

            {/* Safe Wallet */}
            {derivedSafeAddressFromEoa && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-400/80 bg-blue-400/10 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                      Safe Wallet
                    </span>
                    <InfoTooltip text="This is your Safe wallet. It's controlled by your EOA and used for gasless transactions. Send USDC.e to this address." />
                  </div>
                  <button
                    onClick={copySafeAddress}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    {copiedSafe ? "Copied" : "Copy Address"}
                  </button>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2 font-mono text-sm text-blue-200/80 break-all select-all">
                  {derivedSafeAddressFromEoa}
                </div>
              </div>
            )}

            {/* Warning / Info */}
            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
              <p className="text-xs text-yellow-200/70 leading-relaxed">
                <span className="font-semibold text-yellow-200/90 block mb-1">
                  Note:
                </span>
                This account is separate from your main Polymarket.com account.
                Funds cannot be shared between them directly.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={onDisconnect}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-lg px-4 py-2 transition-all select-none cursor-pointer text-sm font-medium text-red-300 hover:text-red-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                  />
                </svg>
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
