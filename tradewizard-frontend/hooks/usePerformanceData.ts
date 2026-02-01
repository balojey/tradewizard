import { useQuery } from "@tanstack/react-query";

export interface ClosedMarketPerformance {
  market_id: string;
  condition_id: string;
  question: string;
  event_type: string;
  status: string;
  resolved_outcome: string;
  recommendation_id: string;
  direction: "LONG_YES" | "LONG_NO" | "NO_TRADE";
  fair_probability: number;
  market_edge: number;
  expected_value: number;
  confidence: "high" | "moderate" | "low";
  entry_zone_min: number;
  entry_zone_max: number;
  explanation: string;
  recommendation_was_correct: boolean;
  roi_realized: number;
  edge_captured: number;
  market_probability_at_recommendation: number;
  resolution_date: string;
  recommendation_created_at: string;
  days_to_resolution: number;
  total_agents: number;
  agents_in_agreement: number;
}

export interface PerformanceSummary {
  total_resolved_recommendations: number;
  correct_recommendations: number;
  win_rate_pct: number;
  avg_roi: number;
  avg_winning_roi: number;
  avg_losing_roi: number;
  avg_edge_captured: number;
  long_yes_count: number;
  long_no_count: number;
  no_trade_count: number;
  long_yes_wins: number;
  long_no_wins: number;
}

export interface PerformanceByConfidence {
  confidence: "high" | "moderate" | "low";
  total_recommendations: number;
  correct_recommendations: number;
  win_rate_pct: number;
  avg_roi: number;
  avg_edge_captured: number;
  avg_expected_value: number;
  avg_fair_probability: number;
}

export interface PerformanceByAgent {
  agent_name: string;
  agent_type: string;
  total_recommendations: number;
  correct_recommendations: number;
  win_rate_pct: number;
  avg_roi: number;
  avg_agent_probability: number;
  avg_agent_confidence: number;
  agent_correct_signals: number;
  total_agent_signals: number;
  agent_signal_accuracy_pct: number;
}

export interface MonthlyPerformance {
  month: string;
  total_recommendations: number;
  correct_recommendations: number;
  win_rate_pct: number;
  avg_roi: number;
  total_profit: number;
  avg_edge_captured: number;
}

export interface PerformanceByCategory {
  event_type: string;
  total_recommendations: number;
  correct_recommendations: number;
  win_rate_pct: number;
  avg_roi: number;
  avg_edge_captured: number;
  avg_market_volume: number;
  avg_market_liquidity: number;
}

export interface CalculatedMetrics {
  totalMarkets: number;
  winRate: number;
  avgROI: number;
  totalProfit: number;
  avgDaysToResolution: number;
  bestPerformingCategory: {
    category: string;
    winRate: number;
    avgROI: number;
    totalMarkets: number;
  } | null;
  worstPerformingCategory: {
    category: string;
    winRate: number;
    avgROI: number;
    totalMarkets: number;
  } | null;
  categoryBreakdown: Array<{
    category: string;
    winRate: number;
    avgROI: number;
    totalMarkets: number;
  }>;
}

export interface PerformanceData {
  closedMarkets: ClosedMarketPerformance[];
  summary: PerformanceSummary | null;
  performanceByConfidence: PerformanceByConfidence[];
  performanceByAgent: PerformanceByAgent[];
  monthlyPerformance: MonthlyPerformance[];
  performanceByCategory: PerformanceByCategory[];
  calculatedMetrics: CalculatedMetrics;
  filters: {
    timeframe: string;
    category: string;
    confidence: string;
    limit: number;
  };
}

export interface UsePerformanceDataOptions {
  timeframe?: "all" | "30d" | "90d" | "1y";
  category?: string;
  confidence?: "all" | "high" | "moderate" | "low";
  limit?: number;
  enabled?: boolean;
}

export function usePerformanceData(options: UsePerformanceDataOptions = {}) {
  const {
    timeframe = "all",
    category = "all",
    confidence = "all",
    limit = 50,
    enabled = true,
  } = options;

  return useQuery<PerformanceData>({
    queryKey: ["performance", timeframe, category, confidence, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe,
        category,
        confidence,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/tradewizard/performance?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch performance data: ${response.status}`);
      }

      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for real-time performance updates
export function usePerformanceMetrics() {
  return useQuery<PerformanceSummary>({
    queryKey: ["performance-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/tradewizard/performance?summary=true");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch performance metrics: ${response.status}`);
      }

      const data = await response.json();
      return data.summary;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}