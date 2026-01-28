"use client";

import { useState } from "react";
import { ChevronDownIcon, FilterIcon } from "lucide-react";

export type MarketStatus = "all" | "active" | "closed" | "ending-soon";

interface MarketStatusFilterProps {
  currentStatus: MarketStatus;
  onStatusChange: (status: MarketStatus) => void;
  marketCounts?: {
    all: number;
    active: number;
    closed: number;
    endingSoon: number;
  };
}

const STATUS_OPTIONS = [
  { value: "all" as const, label: "All Markets", icon: "🏛️" },
  { value: "active" as const, label: "Active", icon: "🟢" },
  { value: "closed" as const, label: "Closed", icon: "🔴" },
  { value: "ending-soon" as const, label: "Ending Soon", icon: "⏰" },
];

export default function MarketStatusFilter({
  currentStatus,
  onStatusChange,
  marketCounts,
}: MarketStatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = STATUS_OPTIONS.find(option => option.value === currentStatus);
  
  const getCountForStatus = (status: MarketStatus) => {
    if (!marketCounts) return null;
    
    switch (status) {
      case "all":
        return marketCounts.all;
      case "active":
        return marketCounts.active;
      case "closed":
        return marketCounts.closed;
      case "ending-soon":
        return marketCounts.endingSoon;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 
                   border border-white/20 rounded-lg text-sm font-medium text-white 
                   transition-all duration-200 backdrop-blur-sm"
      >
        <FilterIcon className="w-4 h-4" />
        <span className="flex items-center gap-2">
          <span>{currentOption?.icon}</span>
          <span>{currentOption?.label}</span>
          {marketCounts && (
            <span className="text-xs text-gray-400">
              ({getCountForStatus(currentStatus)})
            </span>
          )}
        </span>
        <ChevronDownIcon 
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-56 bg-[#1C1C1E] border border-white/20 
                          rounded-lg shadow-xl backdrop-blur-xl z-20 overflow-hidden">
            {STATUS_OPTIONS.map((option) => {
              const count = getCountForStatus(option.value);
              const isSelected = option.value === currentStatus;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onStatusChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm 
                             transition-colors duration-200 ${
                    isSelected 
                      ? "bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500" 
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                  
                  {count !== null && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isSelected 
                        ? "bg-indigo-500/30 text-indigo-200" 
                        : "bg-white/10 text-gray-400"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}