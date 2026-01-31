"use client";

import React, { useState, useEffect } from "react";
import { Search, Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MarketSearch from "@/components/Trading/Markets/MarketSearch";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/classNames";

interface SearchShortcutProps {
  className?: string;
}

const SearchShortcut: React.FC<SearchShortcutProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMarketSelect = (market: any) => {
    setIsOpen(false);
    router.push(`/market/${market.slug || market.id}`);
  };

  const handleOutcomeClick = (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean
  ) => {
    setIsOpen(false);
    // Navigate to market page - the trading modal will be handled there
    // For now, just navigate to the market
    const market = { slug: tokenId }; // This would need proper market data
    router.push(`/market/${market.slug}`);
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "group relative flex items-center gap-2.5 px-3.5 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg ring-1 ring-white/5 hover:ring-white/10 hover:shadow-xl active:scale-[0.98]",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-transparent to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 rounded-xl transition-colors duration-500" />

        <Search className="h-4 w-4 relative z-10 group-hover:text-indigo-400 transition-colors" />
        <span className="hidden sm:inline text-sm font-medium relative z-10">Search markets...</span>

        <div className="hidden sm:flex items-center gap-1 ml-auto relative z-10">
          <kbd className="px-2 py-1 text-xs bg-white/10 backdrop-blur-sm rounded-md border border-white/10 text-gray-400 group-hover:text-gray-300 transition-colors">
            <Command className="h-3 w-3" />
          </kbd>
          <kbd className="px-2 py-1 text-xs bg-white/10 backdrop-blur-sm rounded-md border border-white/10 text-gray-400 group-hover:text-gray-300 transition-colors">
            K
          </kbd>
        </div>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
              onClick={() => setIsOpen(false)}
            />

            {/* Search Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
              className="relative w-full max-w-3xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl ring-1 ring-white/5"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

              <div className="relative z-10 p-6">
                <MarketSearch
                  onMarketSelect={handleMarketSelect}
                  onOutcomeClick={handleOutcomeClick}
                  className="w-full"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SearchShortcut;