import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timeframe = searchParams.get("timeframe") || "all"; // all, 30d, 90d, 1y
  const category = searchParams.get("category") || "all";
  const confidence = searchParams.get("confidence") || "all";
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    // Build the base query for closed markets with performance data
    let query = supabase
      .from("v_closed_markets_performance")
      .select("*")
      .not("recommendation_was_correct", "is", null)
      .order("resolution_date", { ascending: false });

    // Apply timeframe filter
    if (timeframe !== "all") {
      const daysAgo = timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : 365;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      query = query.gte("resolution_date", cutoffDate.toISOString());
    }

    // Apply category filter
    if (category !== "all") {
      query = query.eq("event_type", category);
    }

    // Apply confidence filter
    if (confidence !== "all") {
      query = query.eq("confidence", confidence);
    }

    // Apply limit
    query = query.limit(limit);

    const { data: closedMarkets, error: marketsError } = await query;

    if (marketsError) {
      console.error("Error fetching closed markets:", marketsError);
      return NextResponse.json(
        { error: "Failed to fetch closed markets performance data" },
        { status: 500 }
      );
    }

    // Fetch performance summary
    const { data: performanceSummary, error: summaryError } = await supabase
      .from("v_performance_summary")
      .select("*")
      .single();

    if (summaryError) {
      console.error("Error fetching performance summary:", summaryError);
    }

    // Fetch performance by confidence
    const { data: performanceByConfidence, error: confidenceError } = await supabase
      .from("v_performance_by_confidence")
      .select("*");

    if (confidenceError) {
      console.error("Error fetching performance by confidence:", confidenceError);
    }

    // Fetch performance by agent
    const { data: performanceByAgent, error: agentError } = await supabase
      .from("v_performance_by_agent")
      .select("*")
      .order("win_rate_pct", { ascending: false })
      .limit(10);

    if (agentError) {
      console.error("Error fetching performance by agent:", agentError);
    }

    // Fetch monthly performance trends
    const { data: monthlyPerformance, error: monthlyError } = await supabase
      .from("v_monthly_performance")
      .select("*")
      .order("month", { ascending: false })
      .limit(12);

    if (monthlyError) {
      console.error("Error fetching monthly performance:", monthlyError);
    }

    // Fetch performance by category
    const { data: performanceByCategory, error: categoryError } = await supabase
      .from("v_performance_by_category")
      .select("*")
      .order("win_rate_pct", { ascending: false });

    if (categoryError) {
      console.error("Error fetching performance by category:", categoryError);
    }

    // Calculate additional metrics from the closed markets data
    const metrics = calculatePerformanceMetrics(closedMarkets || []);

    return NextResponse.json({
      closedMarkets: closedMarkets || [],
      summary: performanceSummary || null,
      performanceByConfidence: performanceByConfidence || [],
      performanceByAgent: performanceByAgent || [],
      monthlyPerformance: monthlyPerformance || [],
      performanceByCategory: performanceByCategory || [],
      calculatedMetrics: metrics,
      filters: {
        timeframe,
        category,
        confidence,
        limit,
      },
    });
  } catch (error) {
    console.error("Error in performance API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculatePerformanceMetrics(closedMarkets: any[]) {
  if (!closedMarkets.length) {
    return {
      totalMarkets: 0,
      winRate: 0,
      avgROI: 0,
      totalProfit: 0,
      avgDaysToResolution: 0,
      bestPerformingCategory: null,
      worstPerformingCategory: null,
    };
  }

  const totalMarkets = closedMarkets.length;
  const correctPredictions = closedMarkets.filter(m => m.recommendation_was_correct).length;
  const winRate = (correctPredictions / totalMarkets) * 100;
  
  const avgROI = closedMarkets.reduce((sum, m) => sum + (m.roi_realized || 0), 0) / totalMarkets;
  const totalProfit = closedMarkets.reduce((sum, m) => sum + (m.roi_realized || 0), 0);
  
  const marketsWithResolutionTime = closedMarkets.filter(m => m.days_to_resolution !== null);
  const avgDaysToResolution = marketsWithResolutionTime.length > 0
    ? marketsWithResolutionTime.reduce((sum, m) => sum + m.days_to_resolution, 0) / marketsWithResolutionTime.length
    : 0;

  // Group by category for best/worst performing
  const categoryPerformance = closedMarkets.reduce((acc, market) => {
    const category = market.event_type;
    if (!acc[category]) {
      acc[category] = { correct: 0, total: 0, roi: 0 };
    }
    acc[category].total++;
    if (market.recommendation_was_correct) {
      acc[category].correct++;
    }
    acc[category].roi += market.roi_realized || 0;
    return acc;
  }, {} as Record<string, { correct: number; total: number; roi: number }>);

  const categoryStats = (Object.entries(categoryPerformance) as [string, { correct: number; total: number; roi: number }][])
    .map(([category, stats]) => ({
      category,
      winRate: (stats.correct / stats.total) * 100,
      avgROI: stats.roi / stats.total,
      totalMarkets: stats.total,
    }))
    .filter(stat => stat.totalMarkets >= 3) // Only include categories with at least 3 markets
    .sort((a, b) => b.winRate - a.winRate);

  return {
    totalMarkets,
    winRate: Math.round(winRate * 100) / 100,
    avgROI: Math.round(avgROI * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    avgDaysToResolution: Math.round(avgDaysToResolution * 10) / 10,
    bestPerformingCategory: categoryStats[0] || null,
    worstPerformingCategory: categoryStats[categoryStats.length - 1] || null,
    categoryBreakdown: categoryStats,
  };
}