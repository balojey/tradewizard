"use client";

import { useState, useEffect } from "react";
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
  XCircle
} from "lucide-react";
import Card from "@/components/shared/Card";

interface AgentArgument {
  id: string;
  agentName: string;
  agentType: 'bull' | 'bear' | 'neutral';
  position: 'LONG_YES' | 'LONG_NO' | 'NO_TRADE';
  confidence: number; // 0-1
  fairProbability: number; // 0-1
  keyPoints: string[];
  counterArguments: string[];
  evidence: {
    type: 'data' | 'news' | 'analysis';
    source: string;
    summary: string;
    weight: number; // 0-1
  }[];
  timestamp: string;
}

interface DebateRound {
  id: string;
  roundNumber: number;
  topic: string;
  arguments: AgentArgument[];
  consensus: {
    reached: boolean;
    finalProbability?: number;
    agreementLevel: number; // 0-1
    dissenting: string[];
  };
  duration: number; // seconds
}

interface AgentDebatePanelProps {
  conditionId: string | null;
  marketQuestion: string;
}

export default function AgentDebatePanel({ 
  conditionId, 
  marketQuestion 
}: AgentDebatePanelProps) {
  const [debateData, setDebateData] = useState<DebateRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(0);
  const [expandedArguments, setExpandedArguments] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conditionId) return;

    const fetchDebateData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // This would be replaced with actual API call to agent debate service
        // For now, we'll simulate realistic debate data
        await new Promise(resolve => setTimeout(resolve, 1200));

        const mockDebateRounds: DebateRound[] = [
          {
            id: 'round-1',
            roundNumber: 1,
            topic: 'Initial Market Assessment',
            duration: 45,
            arguments: [
              {
                id: 'bull-1',
                agentName: 'Market Bull Agent',
                agentType: 'bull',
                position: 'LONG_YES',
                confidence: 0.78,
                fairProbability: 0.72,
                keyPoints: [
                  'Strong historical precedent supports YES outcome',
                  'Recent polling data shows momentum building',
                  'Market liquidity indicates institutional confidence'
                ],
                counterArguments: [
                  'Acknowledges volatility in recent weeks',
                  'Notes potential for external disruption'
                ],
                evidence: [
                  {
                    type: 'data',
                    source: 'Historical Analysis',
                    summary: 'Similar events resolved YES in 73% of cases',
                    weight: 0.85
                  },
                  {
                    type: 'news',
                    source: 'Reuters',
                    summary: 'Positive sentiment in recent coverage',
                    weight: 0.65
                  }
                ],
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
              },
              {
                id: 'bear-1',
                agentName: 'Risk Assessment Agent',
                agentType: 'bear',
                position: 'LONG_NO',
                confidence: 0.65,
                fairProbability: 0.35,
                keyPoints: [
                  'Significant uncertainty in key variables',
                  'Market may be overconfident given limited data',
                  'Downside scenarios are underpriced'
                ],
                counterArguments: [
                  'Agrees historical data is relevant',
                  'Concedes recent momentum exists'
                ],
                evidence: [
                  {
                    type: 'analysis',
                    source: 'Risk Model',
                    summary: 'High volatility in similar market conditions',
                    weight: 0.75
                  },
                  {
                    type: 'data',
                    source: 'Volatility Index',
                    summary: 'Elevated uncertainty metrics',
                    weight: 0.70
                  }
                ],
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
              }
            ],
            consensus: {
              reached: false,
              agreementLevel: 0.45,
              dissenting: ['Risk Assessment Agent']
            }
          },
          {
            id: 'round-2',
            roundNumber: 2,
            topic: 'Evidence Reconciliation',
            duration: 38,
            arguments: [
              {
                id: 'bull-2',
                agentName: 'Market Bull Agent',
                agentType: 'bull',
                position: 'LONG_YES',
                confidence: 0.72,
                fairProbability: 0.68,
                keyPoints: [
                  'Adjusts for risk concerns while maintaining bullish view',
                  'New data supports core thesis with higher confidence',
                  'Market inefficiency creates opportunity'
                ],
                counterArguments: [
                  'Incorporates volatility adjustments',
                  'Reduces position size recommendation'
                ],
                evidence: [
                  {
                    type: 'data',
                    source: 'Updated Polling',
                    summary: 'Trend confirmation with larger sample',
                    weight: 0.90
                  }
                ],
                timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
              },
              {
                id: 'bear-2',
                agentName: 'Risk Assessment Agent',
                agentType: 'bear',
                position: 'NO_TRADE',
                confidence: 0.58,
                fairProbability: 0.45,
                keyPoints: [
                  'Acknowledges bull case has merit',
                  'Risk-reward ratio not compelling at current prices',
                  'Recommends waiting for better entry'
                ],
                counterArguments: [
                  'Concedes momentum is real',
                  'Agrees market may be inefficient'
                ],
                evidence: [
                  {
                    type: 'analysis',
                    source: 'Options Pricing',
                    summary: 'Implied volatility suggests fair value',
                    weight: 0.65
                  }
                ],
                timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
              }
            ],
            consensus: {
              reached: true,
              finalProbability: 0.58,
              agreementLevel: 0.75,
              dissenting: []
            }
          }
        ];

        setDebateData(mockDebateRounds);
        setSelectedRound(mockDebateRounds.length - 1); // Show latest round
      } catch (err) {
        setError('Failed to load debate data');
        console.error('Agent debate error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDebateData();
  }, [conditionId]);

  const toggleArgument = (argumentId: string) => {
    const newExpanded = new Set(expandedArguments);
    if (newExpanded.has(argumentId)) {
      newExpanded.delete(argumentId);
    } else {
      newExpanded.add(argumentId);
    }
    setExpandedArguments(newExpanded);
  };

  const getAgentColor = (agentType: 'bull' | 'bear' | 'neutral') => {
    switch (agentType) {
      case 'bull': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'bear': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-white/5 border-white/10';
    }
  };

  const getAgentIcon = (agentType: 'bull' | 'bear' | 'neutral') => {
    switch (agentType) {
      case 'bull': return <TrendingUp className="w-4 h-4" />;
      case 'bear': return <TrendingDown className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'LONG_YES': return 'text-green-400 bg-green-500/20';
      case 'LONG_NO': return 'text-red-400 bg-red-500/20';
      case 'NO_TRADE': return 'text-gray-400 bg-white/10';
      default: return 'text-gray-400 bg-white/10';
    }
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'data': return <Target className="w-3 h-3" />;
      case 'news': return <MessageSquare className="w-3 h-3" />;
      case 'analysis': return <Brain className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

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

  if (error || debateData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="font-medium text-white">Agent Debate Unavailable</p>
          <p className="text-sm mt-1">{error || 'No debate data available'}</p>
        </div>
      </Card>
    );
  }

  const currentRound = debateData[selectedRound];

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-white">Agent Debate</h3>
              <p className="text-sm text-gray-400">
                Multi-agent analysis and consensus building
              </p>
            </div>
          </div>
          {currentRound.consensus.reached ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Consensus Reached</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-400">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Debate Ongoing</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Round Selection */}
        {debateData.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {debateData.map((round, index) => (
              <button
                key={round.id}
                onClick={() => setSelectedRound(index)}
                className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedRound === index
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                }`}
              >
                Round {round.roundNumber}
              </button>
            ))}
          </div>
        )}

        {/* Round Summary */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Round {currentRound.roundNumber}: {currentRound.topic}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              {currentRound.duration}s
            </div>
          </div>
          
          {currentRound.consensus.reached && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Final Probability:</span>
                <span className="font-medium ml-2 text-white">
                  {(currentRound.consensus.finalProbability! * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-400">Agreement Level:</span>
                <span className="font-medium ml-2 text-white">
                  {(currentRound.consensus.agreementLevel * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Agent Arguments */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-300">Agent Positions</h4>
          {currentRound.arguments.map((argument) => (
            <div
              key={argument.id}
              className={`border rounded-lg overflow-hidden ${getAgentColor(argument.agentType)}`}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleArgument(argument.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-black/20">
                      {getAgentIcon(argument.agentType)}
                    </div>
                    <div>
                      <h5 className="font-medium text-white">{argument.agentName}</h5>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPositionColor(argument.position)}`}>
                          {argument.position.replace('_', ' ')}
                        </span>
                        <span className="text-gray-300">Fair Price: {(argument.fairProbability * 100).toFixed(1)}%</span>
                        <span className="text-gray-300">Confidence: {(argument.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  {expandedArguments.has(argument.id) ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </div>

              {expandedArguments.has(argument.id) && (
                <div className="px-4 pb-4 border-t border-white/10 bg-black/20">
                  <div className="mt-4 space-y-4">
                    {/* Key Points */}
                    <div>
                      <h6 className="font-medium text-sm text-gray-300 mb-2">Key Arguments</h6>
                      <ul className="space-y-1">
                        {argument.keyPoints.map((point, index) => (
                          <li key={index} className="text-sm flex items-start gap-2 text-gray-300">
                            <span className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Counter Arguments */}
                    {argument.counterArguments.length > 0 && (
                      <div>
                        <h6 className="font-medium text-sm text-gray-300 mb-2">Concessions</h6>
                        <ul className="space-y-1">
                          {argument.counterArguments.map((counter, index) => (
                            <li key={index} className="text-sm flex items-start gap-2 text-gray-400">
                              <span className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0" />
                              {counter}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Evidence */}
                    <div>
                      <h6 className="font-medium text-sm text-gray-300 mb-2">Supporting Evidence</h6>
                      <div className="space-y-2">
                        {argument.evidence.map((evidence, index) => (
                          <div key={index} className="flex items-start gap-3 p-2 bg-white/5 rounded border border-white/10">
                            <div className={`p-1 rounded ${
                              evidence.type === 'data' ? 'bg-indigo-500/20 text-indigo-400' :
                              evidence.type === 'news' ? 'bg-green-500/20 text-green-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}>
                              {getEvidenceIcon(evidence.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm text-white">{evidence.source}</span>
                                <span className="text-xs text-gray-400">
                                  Weight: {(evidence.weight * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 mt-1">{evidence.summary}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 pt-2 border-t border-white/10">
                      Updated: {new Date(argument.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Consensus Status */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="font-medium text-gray-300 mb-3">Consensus Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Agreement Level</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      currentRound.consensus.agreementLevel > 0.7 ? 'bg-green-500' :
                      currentRound.consensus.agreementLevel > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${currentRound.consensus.agreementLevel * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-white">
                  {(currentRound.consensus.agreementLevel * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            {currentRound.consensus.dissenting.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-400">Dissenting Agents: </span>
                <span className="font-medium text-white">{currentRound.consensus.dissenting.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}