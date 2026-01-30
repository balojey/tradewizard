"use client";

import { useState, useEffect, useMemo } from "react";
import { useAgentSignalsGrouped } from "@/hooks/useAgentSignals";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CheckCircle,
  AlertTriangle,
  Brain,
  Activity,
  Zap,
  ArrowRight
} from "lucide-react";
import Card from "@/components/shared/Card";

interface ConsensusFormationTimelineProps {
  conditionId: string | null;
  marketQuestion: string;
  recommendationId?: string | null;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'agent_analysis' | 'cross_examination' | 'consensus_update' | 'final_recommendation';
  title: string;
  description: string;
  agentName?: string;
  agentType?: string;
  data?: {
    fairProbability?: number;
    confidence?: number;
    consensusProbability?: number;
    agreementLevel?: number;
    keyChange?: string;
  };
  icon: React.ComponentType<any>;
  color: string;
}

export default function ConsensusFormationTimeline({ 
  conditionId, 
  marketQuestion,
  recommendationId
}: ConsensusFormationTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  
  const { 
    data: signals, 
    isLoading: signalsLoading 
  } = useAgentSignalsGrouped(conditionId, recommendationId);
  
  const { 
    data: analysisHistory, 
    isLoading: historyLoading 
  } = useAnalysisHistory(conditionId, { limit: 20 });

  const isLoading = signalsLoading || historyLoading;

  // Build timeline from agent signals and analysis history
  useEffect(() => {
    if (!signals || !analysisHistory) return;

    const events: TimelineEvent[] = [];

    // Add analysis history events
    analysisHistory.forEach((analysis, index) => {
      const baseTime = new Date(analysis.createdAt);
      
      // Add analysis start event
      events.push({
        id: `analysis-start-${analysis.id}`,
        timestamp: analysis.createdAt,
        type: 'agent_analysis',
        title: `${analysis.analysisType.replace('_', ' ')} Started`,
        description: `Multi-agent analysis initiated with ${analysis.agentsUsed.length} agents`,
        data: {
          keyChange: `Analysis type: ${analysis.analysisType}`
        },
        icon: Brain,
        color: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30'
      });

      // Add completion event if successful
      if (analysis.status === 'completed' && analysis.durationMs) {
        const completionTime = new Date(baseTime.getTime() + analysis.durationMs);
        events.push({
          id: `analysis-complete-${analysis.id}`,
          timestamp: completionTime.toISOString(),
          type: 'consensus_update',
          title: `Analysis Completed`,
          description: `${analysis.analysisType.replace('_', ' ')} finished in ${(analysis.durationMs / 1000).toFixed(1)}s`,
          data: {
            keyChange: analysis.costUsd ? `Cost: $${analysis.costUsd.toFixed(3)}` : undefined
          },
          icon: CheckCircle,
          color: 'text-green-400 bg-green-500/20 border-green-500/30'
        });
      }
    });

    // Add agent signal events
    signals.forEach((signal, index) => {
      events.push({
        id: `signal-${signal.id}`,
        timestamp: signal.createdAt,
        type: 'agent_analysis',
        title: `${signal.agentName} Analysis`,
        description: `${signal.agentType} agent completed individual analysis`,
        agentName: signal.agentName,
        agentType: signal.agentType,
        data: {
          fairProbability: signal.fairProbability,
          confidence: signal.confidence,
          keyChange: `Position: ${signal.direction}`
        },
        icon: signal.agentType === 'bull' ? TrendingUp : 
              signal.agentType === 'bear' ? TrendingDown : Brain,
        color: signal.agentType === 'bull' ? 'text-green-400 bg-green-500/20 border-green-500/30' :
               signal.agentType === 'bear' ? 'text-red-400 bg-red-500/20 border-red-500/30' :
               'text-gray-400 bg-white/5 border-white/10'
      });
    });

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Add synthetic consensus formation events
    if (events.length > 1) {
      const midPoint = Math.floor(events.length / 2);
      const crossExamTime = new Date(
        (new Date(events[midPoint - 1].timestamp).getTime() + 
         new Date(events[midPoint].timestamp).getTime()) / 2
      );

      events.splice(midPoint, 0, {
        id: 'cross-examination',
        timestamp: crossExamTime.toISOString(),
        type: 'cross_examination',
        title: 'Cross-Examination Phase',
        description: 'Agents challenge each other\'s assumptions and refine positions',
        data: {
          agreementLevel: calculateAgreementLevel(signals),
          keyChange: 'Adversarial reasoning in progress'
        },
        icon: Activity,
        color: 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      });

      // Add final consensus event
      const finalTime = new Date(events[events.length - 1].timestamp);
      finalTime.setMinutes(finalTime.getMinutes() + 2);
      
      events.push({
        id: 'final-consensus',
        timestamp: finalTime.toISOString(),
        type: 'final_recommendation',
        title: 'Final Consensus Reached',
        description: 'Multi-agent system reached final recommendation',
        data: {
          consensusProbability: signals.reduce((sum, s) => sum + s.fairProbability, 0) / signals.length,
          agreementLevel: calculateAgreementLevel(signals),
          keyChange: 'Trade recommendation generated'
        },
        icon: Target,
        color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      });
    }

    setTimelineEvents(events);
  }, [signals, analysisHistory]);

  function calculateAgreementLevel(signals: any[]) {
    if (signals.length < 2) return 1;
    
    const probabilities = signals.map(s => s.fairProbability || 0);
    const mean = probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length;
    const variance = probabilities.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / probabilities.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.max(0, 1 - (stdDev * 4));
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffSeconds = (end - start) / 1000;
    
    if (diffSeconds < 60) return `${diffSeconds.toFixed(0)}s`;
    if (diffSeconds < 3600) return `${(diffSeconds / 60).toFixed(1)}m`;
    return `${(diffSeconds / 3600).toFixed(1)}h`;
  };

  if (!conditionId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Consensus timeline not available</p>
        </div>
      </Card>
    );
  }

  if (!recommendationId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-white">No Current Recommendation</p>
          <p className="text-sm mt-1">Timeline will appear when a recommendation is generated</p>
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
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 bg-white/10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="font-medium text-white">Timeline Unavailable</p>
          <p className="text-sm mt-1">No consensus formation data available</p>
        </div>
      </Card>
    );
  }

  const selectedEventData = selectedEvent ? timelineEvents.find(e => e.id === selectedEvent) : null;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-semibold text-white">Consensus Formation Timeline</h3>
            <p className="text-sm text-gray-400">
              Timeline for current recommendation consensus
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/20" />
              
              <div className="space-y-6">
                {timelineEvents.map((event, index) => {
                  const EventIcon = event.icon;
                  const isSelected = selectedEvent === event.id;
                  const isLast = index === timelineEvents.length - 1;
                  
                  return (
                    <div key={event.id} className="relative">
                      {/* Timeline Node */}
                      <div 
                        className={`absolute left-4 w-4 h-4 rounded-full border-2 cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-indigo-500 border-indigo-400 scale-125' 
                            : 'bg-white/10 border-white/30 hover:border-indigo-400'
                        }`}
                        onClick={() => setSelectedEvent(event.id)}
                      />
                      
                      {/* Event Content */}
                      <div className="ml-12">
                        <div 
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? event.color 
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                          onClick={() => setSelectedEvent(event.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                isSelected ? 'bg-black/20' : 'bg-white/10'
                              }`}>
                                <EventIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{event.title}</h4>
                                <p className="text-sm text-gray-300 mt-1">{event.description}</p>
                                {event.agentName && (
                                  <div className="mt-2">
                                    <span className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded-full">
                                      {event.agentName}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-xs text-gray-400">
                              <div>{formatTime(event.timestamp)}</div>
                              {index > 0 && (
                                <div className="mt-1">
                                  +{formatDuration(timelineEvents[index - 1].timestamp, event.timestamp)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Event Details Panel */}
          <div className="space-y-4">
            {selectedEventData ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${selectedEventData.color}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-black/20">
                      <selectedEventData.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{selectedEventData.title}</h4>
                      <p className="text-sm text-gray-400">
                        {formatTime(selectedEventData.timestamp)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 mb-4">
                    {selectedEventData.description}
                  </p>

                  {selectedEventData.data && (
                    <div className="space-y-3">
                      {selectedEventData.data.fairProbability !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Fair Probability:</span>
                          <span className="font-medium text-white">
                            {(selectedEventData.data.fairProbability * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      
                      {selectedEventData.data.confidence !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Confidence:</span>
                          <span className="font-medium text-white">
                            {(selectedEventData.data.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      
                      {selectedEventData.data.consensusProbability !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Consensus Probability:</span>
                          <span className="font-medium text-white">
                            {(selectedEventData.data.consensusProbability * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      
                      {selectedEventData.data.agreementLevel !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Agreement Level:</span>
                          <span className={`font-medium ${
                            selectedEventData.data.agreementLevel > 0.7 ? 'text-green-400' :
                            selectedEventData.data.agreementLevel > 0.4 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {(selectedEventData.data.agreementLevel * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      
                      {selectedEventData.data.keyChange && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-gray-400 text-sm">Key Change:</span>
                          <p className="text-sm text-white mt-1">
                            {selectedEventData.data.keyChange}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Event Context */}
                <div className="p-3 bg-white/5 rounded border border-white/10">
                  <h5 className="font-medium text-gray-300 text-sm mb-2">Event Context</h5>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Type: {selectedEventData.type.replace('_', ' ')}</div>
                    {selectedEventData.agentType && (
                      <div>Agent Type: {selectedEventData.agentType}</div>
                    )}
                    <div>
                      Timeline Position: {timelineEvents.findIndex(e => e.id === selectedEventData.id) + 1} of {timelineEvents.length}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click on a timeline event to see details</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Summary */}
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-medium text-white mb-3">Timeline Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-indigo-400">
                {timelineEvents.length}
              </div>
              <div className="text-gray-400">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">
                {timelineEvents.filter(e => e.type === 'agent_analysis').length}
              </div>
              <div className="text-gray-400">Agent Analyses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">
                {timelineEvents.filter(e => e.type === 'cross_examination').length}
              </div>
              <div className="text-gray-400">Cross-Examinations</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {timelineEvents.length > 1 ? formatDuration(
                  timelineEvents[0].timestamp, 
                  timelineEvents[timelineEvents.length - 1].timestamp
                ) : '0s'}
              </div>
              <div className="text-gray-400">Total Duration</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}