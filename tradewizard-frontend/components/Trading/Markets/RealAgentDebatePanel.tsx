"use client";

import { useState } from "react";
import { useAgentSignalsGrouped } from "@/hooks/useAgentSignals";
import { useAnalysisHistory, useAnalysisMetrics } from "@/hooks/useAnalysisHistory";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Brain,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Zap
} from "lucide-react";
import Card from "@/components/shared/Card";

interface RealAgentDebatePanelProps {
  conditionId: string | null;
  marketQuestion: string;
}

export default function RealAgentDebatePanel({ 
  conditionId, 
  marketQuestion 
}: RealAgentDebatePanelProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  
  // Fetch agent signals grouped by type
  const { 
    data: signals, 
    groupedSignals, 
    bullSignals, 
    bearSignals, 
    neutralSignals,
    isLoading: signalsLoading, 
    error: signalsError 
  } = useAgentSignalsGrouped(conditionId);

  // Fetch analysis history for context
  const { 
    data: analysisHistory, 
    isLoading: historyLoading, 
    error: historyError 
  } = useAnalysisHistory(conditionId, { limit: 5 });

  // Fetch analysis metrics separately
  const { metrics } = useAnalysisMetrics(conditionId, { limit: 5 });

  const isLoading = signalsLoading || historyLoading;
  const error = signalsError || historyError;

  const toggleAgent = (agentId: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  const getAgentColor = (agentType: string) => {
    switch (agentType.toLowerCase()) {
      case 'bull': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'bear': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'neutral': return 'text-gray-400 bg-white/5 border-white/10';
      default: return 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30';
    }
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType.toLowerCase()) {
      case 'bull': return <TrendingUp className="w-4 h-4" />;
      case 'bear': return <TrendingDown className="w-4 h-4" />;
      case 'neutral': return <Activity className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getPositionColor = (direction: string) => {
    switch (direction) {
      case 'LONG_YES': return 'text-green-400 bg-green-500/20';
      case 'LONG_NO': return 'text-red-400 bg-red-500/20';
      case 'NO_TRADE': return 'text-gray-400 bg-white/10';
      default: return 'text-gray-400 bg-white/10';
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatConfidence = (value: number) => `${(value * 100).toFixed(0)}%`;

  // Calculate consensus metrics
  const consensusMetrics = signals ? {
    totalAgents: signals.length,
    bullishCount: bullSignals.length,
    bearishCount: bearSignals.length,
    neutralCount: neutralSignals.length,
    avgFairProbability: signals.reduce((sum, s) => sum + (s.fairProbability || 0), 0) / signals.length,
    avgConfidence: signals.reduce((sum, s) => sum + (s.confidence || 0), 0) / signals.length,
    agreementLevel: calculateAgreementLevel(signals),
  } : null;

  function calculateAgreementLevel(signals: any[]) {
    if (signals.length < 2) return 1;
    
    const probabilities = signals.map(s => s.fairProbability || 0);
    const mean = probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length;
    const variance = probabilities.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / probabilities.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert standard deviation to agreement level (lower stdDev = higher agreement)
    return Math.max(0, 1 - (stdDev * 4)); // Scale factor of 4 for reasonable range
  }

  if (!conditionId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Agent debate not available</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-full" />
            <div className="h-6 bg-white/10 rounded w-48" />
          </div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="p-4 border border-white/10 rounded-lg space-y-2">
                <div className="h-4 bg-white/10 rounded w-32" />
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error || !signals || signals.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="font-medium text-white">Agent Debate Unavailable</p>
          <p className="text-sm mt-1">
            {error ? 'Failed to load agent signals' : 'No agent analysis available for this market'}
          </p>
        </div>
      </Card>
    );
  }

  const hasConsensus = consensusMetrics && consensusMetrics.agreementLevel > 0.7;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-white">Agent Debate</h3>
              <p className="text-sm text-gray-400">
                {consensusMetrics?.totalAgents || 0} agents analyzed this market
              </p>
            </div>
          </div>
          {hasConsensus ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Strong Consensus</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Mixed Signals</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Consensus Overview */}
        {consensusMetrics && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Consensus Summary
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Avg Fair Price:</span>
                  <span className="font-medium text-white">
                    {formatPercentage(consensusMetrics.avgFairProbability)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Avg Confidence:</span>
                  <span className="font-medium text-white">
                    {formatConfidence(consensusMetrics.avgConfidence)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Agreement Level:</span>
                  <span className={`font-medium ${
                    consensusMetrics.agreementLevel > 0.7 ? 'text-green-400' :
                    consensusMetrics.agreementLevel > 0.4 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {formatConfidence(consensusMetrics.agreementLevel)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Bull/Bear Split:</span>
                  <span className="font-medium text-white">
                    {consensusMetrics.bullishCount}/{consensusMetrics.bearishCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Agreement Level Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Agreement Level</span>
                <span>{formatConfidence(consensusMetrics.agreementLevel)}</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    consensusMetrics.agreementLevel > 0.7 ? 'bg-green-500' :
                    consensusMetrics.agreementLevel > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${consensusMetrics.agreementLevel * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Agent Positions */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-300">Individual Agent Positions</h4>
          
          {/* Group agents by type for better organization */}
          {bullSignals.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-green-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Bullish Agents ({bullSignals.length})
              </h5>
              {bullSignals.map((signal) => (
                <AgentSignalCard 
                  key={signal.id} 
                  signal={signal} 
                  isExpanded={expandedAgents.has(signal.id)}
                  onToggle={() => toggleAgent(signal.id)}
                />
              ))}
            </div>
          )}

          {bearSignals.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-red-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Bearish Agents ({bearSignals.length})
              </h5>
              {bearSignals.map((signal) => (
                <AgentSignalCard 
                  key={signal.id} 
                  signal={signal} 
                  isExpanded={expandedAgents.has(signal.id)}
                  onToggle={() => toggleAgent(signal.id)}
                />
              ))}
            </div>
          )}

          {neutralSignals.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Neutral Agents ({neutralSignals.length})
              </h5>
              {neutralSignals.map((signal) => (
                <AgentSignalCard 
                  key={signal.id} 
                  signal={signal} 
                  isExpanded={expandedAgents.has(signal.id)}
                  onToggle={() => toggleAgent(signal.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Analysis History */}
        {analysisHistory && analysisHistory.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Analysis History
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {analysisHistory.slice(0, 3).map((analysis) => (
                <div
                  key={analysis.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    analysis.status === 'completed' ? 'border-l-green-400 bg-green-500/10' :
                    analysis.status === 'failed' ? 'border-l-red-400 bg-red-500/10' :
                    'border-l-yellow-400 bg-yellow-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm text-white capitalize">
                        {analysis.analysisType.replace('_', ' ')}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {analysis.agentsUsed.length > 0 && (
                          <span>Agents: {analysis.agentsUsed.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <div>{new Date(analysis.createdAt).toLocaleTimeString()}</div>
                      {analysis.durationMs && (
                        <div>{(analysis.durationMs / 1000).toFixed(1)}s</div>
                      )}
                      {analysis.costUsd && (
                        <div>${analysis.costUsd.toFixed(3)}</div>
                      )}
                    </div>
                  </div>
                  {analysis.errorMessage && (
                    <p className="text-xs text-red-300 mt-2">{analysis.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
            
            {/* Analysis Metrics Summary */}
            {metrics && (
              <div className="text-xs text-gray-400 p-2 bg-white/5 rounded border border-white/10">
                <div className="flex justify-between">
                  <span>Success Rate: {metrics.completedCount}/{metrics.completedCount + metrics.failedCount}</span>
                  <span>Avg Duration: {(metrics.avgDuration / 1000).toFixed(1)}s</span>
                  <span>Total Cost: ${metrics.totalCost.toFixed(3)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// Component for individual agent signal cards
function AgentSignalCard({ 
  signal, 
  isExpanded, 
  onToggle 
}: { 
  signal: any; 
  isExpanded: boolean; 
  onToggle: () => void; 
}) {
  const getAgentColor = (agentType: string) => {
    switch (agentType.toLowerCase()) {
      case 'bull': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'bear': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'neutral': return 'text-gray-400 bg-white/5 border-white/10';
      default: return 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30';
    }
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType.toLowerCase()) {
      case 'bull': return <TrendingUp className="w-4 h-4" />;
      case 'bear': return <TrendingDown className="w-4 h-4" />;
      case 'neutral': return <Activity className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getPositionColor = (direction: string) => {
    switch (direction) {
      case 'LONG_YES': return 'text-green-400 bg-green-500/20';
      case 'LONG_NO': return 'text-red-400 bg-red-500/20';
      case 'NO_TRADE': return 'text-gray-400 bg-white/10';
      default: return 'text-gray-400 bg-white/10';
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${getAgentColor(signal.agentType)}`}>
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-black/20">
              {getAgentIcon(signal.agentType)}
            </div>
            <div>
              <h5 className="font-medium text-white">{signal.agentName}</h5>
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPositionColor(signal.direction)}`}>
                  {signal.direction.replace('_', ' ')}
                </span>
                <span className="text-gray-300">
                  Fair: {((signal.fairProbability || 0) * 100).toFixed(1)}%
                </span>
                <span className="text-gray-300">
                  Conf: {((signal.confidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          {isExpanded ? 
            <ChevronUp className="w-5 h-5 text-gray-400" /> : 
            <ChevronDown className="w-5 h-5 text-gray-400" />
          }
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/10 bg-black/20">
          <div className="mt-4 space-y-4">
            {/* Key Drivers */}
            {signal.keyDrivers && signal.keyDrivers.length > 0 && (
              <div>
                <h6 className="font-medium text-sm text-gray-300 mb-2">Key Drivers</h6>
                <ul className="space-y-1">
                  {signal.keyDrivers.map((driver: string, index: number) => (
                    <li key={index} className="text-sm flex items-start gap-2 text-gray-300">
                      <span className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0" />
                      {driver}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            {signal.metadata && Object.keys(signal.metadata).length > 0 && (
              <div>
                <h6 className="font-medium text-sm text-gray-300 mb-2">Additional Context</h6>
                <div className="space-y-1 text-sm text-gray-400">
                  {Object.entries(signal.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                      <span className="text-white">
                        {typeof value === 'number' ? value.toFixed(3) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-400 pt-2 border-t border-white/10">
              Updated: {new Date(signal.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}