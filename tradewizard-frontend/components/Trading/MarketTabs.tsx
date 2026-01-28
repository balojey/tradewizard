"use client";

import { useState } from "react";

import Card from "@/components/shared/Card";
import ActiveOrders from "@/components/Trading/Orders";
import UserPositions from "@/components/Trading/Positions";
import HighVolumeMarkets from "@/components/Trading/Markets";

import { cn } from "@/utils/classNames";

type TabId = "positions" | "orders" | "markets";

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: "positions", label: "My Positions" },
  { id: "orders", label: "Open Orders" },
  { id: "markets", label: "Markets" },
];

export default function MarketTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("markets");

  return (
    <Card className="p-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Market Overview</h2>

        {/* Segmented Control */}
        <div className="bg-white/5 p-1 rounded-xl flex gap-1 border border-white/5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[100px]",
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "positions" && <UserPositions />}
        {activeTab === "orders" && <ActiveOrders />}
        {activeTab === "markets" && <HighVolumeMarkets />}
      </div>
    </Card>
  );
}
