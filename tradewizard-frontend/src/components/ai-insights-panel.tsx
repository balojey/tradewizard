"use client";

import { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, Clock, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AIMarketInsights } from '@/lib/polymarket-api-types';

interface AIInsightsPanelProps {
  insights: AIMarketInsights;
}

/**
 * AI Insights Panel Component
 * Displays AI-powered market analysis and insights
 */
export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  const confidenceColor = getConfidenceColor(insights.confidence);
  const sentimentIcon = getSentimentIcon(insights.sentiment);
  const sentimentColor = getSentimentColor(insights.sentiment);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Market Analysis
          <div className={cn(
            "ml-auto px-2 py-1 rounded-full text-xs font-medium",
            `bg-${confidenceColor}-100 text-${confidenceColor}-800`
          )}>
            {insights.confidence}% Confidence
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm leading-relaxed">{insights.summary}</p>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Last updated: {formatTimestamp(insights.lastUpdated)}</span>
            <div className="flex items-center gap-1">
              {sentimentIcon}
              <span className={`text-${sentimentColor}-600 font-medium`}>
                {insights.sentiment.charAt(0).toUpperCase() + insights.sentiment.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Volatility Prediction */}
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Volatility"
            value={insights.volatilityPrediction}
            color={getVolatilityColor(insights.volatilityPrediction)}
          />

          {/* Liquidity Assessment */}
          <MetricCard
            icon={<Target className="h-4 w-4" />}
            label="Liquidity"
            value={insights.liquidityAssessment}
            color={getLiquidityColor(insights.liquidityAssessment)}
          />

          {/* Position Sizing */}
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Position Size"
            value={insights.positionSizing || 'medium'}
            color={getPositionSizeColor(insights.positionSizing || 'medium')}
          />
        </div>

        {/* Key Factors */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Key Factors
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {insights.keyFactors.map((factor, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-sm"
              >
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-emerald-800">{factor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Factors
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {insights.riskFactors.map((risk, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-red-800">{risk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Insights (if available) */}
        {(insights.fairValueEstimate || insights.optimalEntryZone || insights.targetZone) && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Advanced Analysis</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fair Value */}
              {insights.fairValueEstimate && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 mb-1">Fair Value Estimate</div>
                  <div className="text-lg font-bold text-blue-900">
                    {(insights.fairValueEstimate * 100).toFixed(1)}%
                  </div>
                  {insights.confidenceBand && (
                    <div className="text-xs text-blue-700 mt-1">
                      Range: {(insights.confidenceBand[0] * 100).toFixed(1)}% - {(insights.confidenceBand[1] * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              )}

              {/* Edge Detection */}
              {insights.edgeDetection && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-sm font-medium text-purple-800 mb-1">Market Edge</div>
                  <div className={cn(
                    "text-lg font-bold",
                    insights.edgeDetection > 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {insights.edgeDetection > 0 ? '+' : ''}{(insights.edgeDetection * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-purple-700 mt-1">
                    {insights.edgeDetection > 0 ? 'Positive edge detected' : 'Negative edge detected'}
                  </div>
                </div>
              )}
            </div>

            {/* Trading Zones */}
            {(insights.optimalEntryZone || insights.targetZone) && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-muted-foreground">Trading Zones</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insights.optimalEntryZone && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Entry Zone: </span>
                      <span className="font-mono">
                        {(insights.optimalEntryZone[0] * 100).toFixed(1)}% - {(insights.optimalEntryZone[1] * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {insights.targetZone && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Target Zone: </span>
                      <span className="font-mono">
                        {(insights.targetZone[0] * 100).toFixed(1)}% - {(insights.targetZone[1] * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Time Horizon Analysis (if available) */}
        {insights.timeHorizonAnalysis && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Horizon Analysis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TimeHorizonCard
                label="Short Term (1-7 days)"
                analysis={insights.timeHorizonAnalysis.shortTerm}
              />
              <TimeHorizonCard
                label="Medium Term (1-4 weeks)"
                analysis={insights.timeHorizonAnalysis.mediumTerm}
              />
              <TimeHorizonCard
                label="Long Term (1+ months)"
                analysis={insights.timeHorizonAnalysis.longTerm}
              />
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded border-l-4 border-muted">
          <strong>Disclaimer:</strong> AI analysis is for informational purposes only and should not be considered as financial advice. 
          Always conduct your own research and consider your risk tolerance before making trading decisions.
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <div className={`text-${color}-600`}>{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={cn(
        "px-2 py-1 rounded text-xs font-medium capitalize",
        `bg-${color}-100 text-${color}-800`
      )}>
        {value}
      </div>
    </div>
  );
}

/**
 * Time Horizon Card Component
 */
function TimeHorizonCard({
  label,
  analysis,
}: {
  label: string;
  analysis: string;
}) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <div className="text-sm font-medium mb-2">{label}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{analysis}</div>
    </div>
  );
}

/**
 * Utility Functions
 */

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'emerald';
  if (confidence >= 60) return 'yellow';
  if (confidence >= 40) return 'orange';
  return 'red';
}

function getSentimentIcon(sentiment: string) {
  switch (sentiment) {
    case 'bullish':
      return <TrendingUp className="h-3 w-3" />;
    case 'bearish':
      return <TrendingDown className="h-3 w-3" />;
    default:
      return <Target className="h-3 w-3" />;
  }
}

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'bullish':
      return 'emerald';
    case 'bearish':
      return 'red';
    default:
      return 'gray';
  }
}

function getVolatilityColor(volatility: string): string {
  switch (volatility) {
    case 'low':
      return 'emerald';
    case 'medium':
      return 'yellow';
    case 'high':
      return 'red';
    default:
      return 'gray';
  }
}

function getLiquidityColor(liquidity: string): string {
  switch (liquidity) {
    case 'excellent':
      return 'emerald';
    case 'good':
      return 'blue';
    case 'fair':
      return 'yellow';
    case 'poor':
      return 'red';
    default:
      return 'gray';
  }
}

function getPositionSizeColor(size: string | undefined): string {
  switch (size) {
    case 'large':
      return 'emerald';
    case 'medium':
      return 'blue';
    case 'small':
      return 'yellow';
    default:
      return 'gray';
  }
}