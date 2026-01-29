"use client";

import { useState, useEffect, useMemo } from "react";
import { useAgentSignalsGrouped } from "@/hooks/useAgentSignals";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ArrowRight,
  Users,
  Zap,
  Target,
  MessageSquare
} from "lucide-react";
import Card from "@/components/shared/Card";

interface AgentInteractionNetworkProps {
  conditionId: string | null;
  marketQuestion: string;
}

interface AgentNode {
  id: string;
  name: string;
  type: 'bull' | 'bear' | 'neutral' | 'technical';
  position: { x: number; y: number };
  fairProbability: number;
  confidence: number;
  direction: string;
  keyDrivers: string[];
}

interface AgentConnection {
  from: string;
  to: string;
  type: 'agreement' | 'disagreement' | 'influence';
  strength: number; // 0-1
  reason: string;
}

export default function AgentInteractionNetwork({ 
  conditionId, 
  marketQuestion 
}: AgentInteractionNetworkProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  
  const { 
    data: signals, 
    groupedSignals, 
    isLoading, 
    error 
  } = useAgentSignalsGrouped(conditionId);

  // Transform agent signals into network nodes and connections
  const { nodes, connections } = useMemo(() => {
    if (!signals || signals.length === 0) {
      return { nodes: [], connections: [] };
    }

    // Create nodes from agent signals
    const nodes: AgentNode[] = signals.map((signal, index) => {
      const angle = (index / signals.length) * 2 * Math.PI;
      const radius = 120;
      const centerX = 200;
      const centerY = 150;
      
      return {
        id: signal.id,
        name: signal.agentName,
        type: signal.agentType.toLowerCase() as any,
        position: {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        },
        fairProbability: signal.fairProbability,
        confidence: signal.confidence,
        direction: signal.direction,
        keyDrivers: signal.keyDrivers
      };
    });

    // Generate connections based on agent agreement/disagreement
    const connections: AgentConnection[] = [];
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        // Calculate agreement based on probability difference
        const probDiff = Math.abs(nodeA.fairProbability - nodeB.fairProbability);
        const agreement = 1 - probDiff; // Higher agreement = lower probability difference
        
        // Determine connection type
        let connectionType: 'agreement' | 'disagreement' | 'influence' = 'influence';
        let reason = '';
        
        if (agreement > 0.8) {
          connectionType = 'agreement';
          reason = `Both agents see similar fair value (~${(nodeA.fairProbability * 100).toFixed(0)}%)`;
        } else if (agreement < 0.3) {
          connectionType = 'disagreement';
          reason = `Significant disagreement: ${(nodeA.fairProbability * 100).toFixed(0)}% vs ${(nodeB.fairProbability * 100).toFixed(0)}%`;
        } else {
          connectionType = 'influence';
          reason = `Moderate difference in probability estimates`;
        }

        // Only show meaningful connections (not too weak)
        if (agreement > 0.2 || agreement < 0.8) {
          connections.push({
            from: nodeA.id,
            to: nodeB.id,
            type: connectionType,
            strength: connectionType === 'agreement' ? agreement : (1 - agreement),
            reason
          });
        }
      }
    }

    return { nodes, connections };
  }, [signals]);

  const getAgentColor = (type: string) => {
    switch (type) {
      case 'bull': return '#10b981'; // green
      case 'bear': return '#ef4444'; // red
      case 'neutral': return '#6b7280'; // gray
      case 'technical': return '#8b5cf6'; // purple
      default: return '#6366f1'; // indigo
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'bull': return TrendingUp;
      case 'bear': return TrendingDown;
      case 'neutral': return Activity;
      case 'technical': return Target;
      default: return Brain;
    }
  };

  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'agreement': return '#10b981';
      case 'disagreement': return '#ef4444';
      case 'influence': return '#6366f1';
      default: return '#6b7280';
    }
  };

  if (!conditionId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Agent network not available</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-full" />
            <div className="h-6 bg-white/10 rounded w-48" />
          </div>
          <div className="h-64 bg-white/10 rounded" />
        </div>
      </Card>
    );
  }

  if (error || nodes.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="font-medium text-white">Agent Network Unavailable</p>
          <p className="text-sm mt-1">No agent interaction data available</p>
        </div>
      </Card>
    );
  }

  const selectedNode = selectedAgent ? nodes.find(n => n.id === selectedAgent) : null;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-semibold text-white">Agent Interaction Network</h3>
            <p className="text-sm text-gray-400">
              How agents influence each other's analysis
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Network Visualization */}
          <div className="lg:col-span-2">
            <div className="relative bg-white/5 rounded-lg border border-white/10 p-4" style={{ height: '300px' }}>
              <svg width="100%" height="100%" viewBox="0 0 400 300">
                {/* Connections */}
                {connections.map((connection, index) => {
                  const fromNode = nodes.find(n => n.id === connection.from);
                  const toNode = nodes.find(n => n.id === connection.to);
                  
                  if (!fromNode || !toNode) return null;
                  
                  const connectionId = `${connection.from}-${connection.to}`;
                  const isHovered = hoveredConnection === connectionId;
                  
                  return (
                    <g key={connectionId}>
                      <line
                        x1={fromNode.position.x}
                        y1={fromNode.position.y}
                        x2={toNode.position.x}
                        y2={toNode.position.y}
                        stroke={getConnectionColor(connection.type)}
                        strokeWidth={isHovered ? 3 : Math.max(1, connection.strength * 3)}
                        strokeOpacity={isHovered ? 0.8 : 0.4}
                        strokeDasharray={connection.type === 'disagreement' ? '5,5' : 'none'}
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setHoveredConnection(connectionId)}
                        onMouseLeave={() => setHoveredConnection(null)}
                      />
                      
                      {/* Connection label on hover */}
                      {isHovered && (
                        <text
                          x={(fromNode.position.x + toNode.position.x) / 2}
                          y={(fromNode.position.y + toNode.position.y) / 2}
                          fill="white"
                          fontSize="10"
                          textAnchor="middle"
                          className="pointer-events-none"
                        >
                          {connection.type}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Agent Nodes */}
                {nodes.map((node) => {
                  const isSelected = selectedAgent === node.id;
                  const AgentIcon = getAgentIcon(node.type);
                  
                  return (
                    <g key={node.id}>
                      {/* Node Circle */}
                      <circle
                        cx={node.position.x}
                        cy={node.position.y}
                        r={isSelected ? 25 : 20}
                        fill={getAgentColor(node.type)}
                        fillOpacity={0.2}
                        stroke={getAgentColor(node.type)}
                        strokeWidth={isSelected ? 3 : 2}
                        className="cursor-pointer transition-all duration-200"
                        onClick={() => setSelectedAgent(node.id)}
                      />
                      
                      {/* Confidence Ring */}
                      <circle
                        cx={node.position.x}
                        cy={node.position.y}
                        r={15}
                        fill="none"
                        stroke={getAgentColor(node.type)}
                        strokeWidth={2}
                        strokeOpacity={node.confidence}
                        strokeDasharray={`${node.confidence * 94} 94`}
                        transform={`rotate(-90 ${node.position.x} ${node.position.y})`}
                      />
                      
                      {/* Agent Label */}
                      <text
                        x={node.position.x}
                        y={node.position.y + 35}
                        fill="white"
                        fontSize="10"
                        textAnchor="middle"
                        className="pointer-events-none font-medium"
                      >
                        {node.name.split(' ')[0]}
                      </text>
                      
                      {/* Probability Label */}
                      <text
                        x={node.position.x}
                        y={node.position.y + 47}
                        fill="#9ca3af"
                        fontSize="8"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {(node.fairProbability * 100).toFixed(0)}%
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-green-400" />
                <span className="text-gray-400">Agreement</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-400 border-dashed border-red-400" style={{ borderWidth: '1px 0' }} />
                <span className="text-gray-400">Disagreement</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-indigo-400" />
                <span className="text-gray-400">Influence</span>
              </div>
            </div>
          </div>

          {/* Agent Details Panel */}
          <div className="space-y-4">
            {selectedNode ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  selectedNode.type === 'bull' ? 'border-green-500/30 bg-green-500/10' :
                  selectedNode.type === 'bear' ? 'border-red-500/30 bg-red-500/10' :
                  'border-indigo-500/30 bg-indigo-500/10'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      selectedNode.type === 'bull' ? 'bg-green-500/20' :
                      selectedNode.type === 'bear' ? 'bg-red-500/20' :
                      'bg-indigo-500/20'
                    }`}>
                      {(() => {
                        const Icon = getAgentIcon(selectedNode.type);
                        return <Icon className="w-4 h-4" style={{ color: getAgentColor(selectedNode.type) }} />;
                      })()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{selectedNode.name}</h4>
                      <p className="text-sm text-gray-400 capitalize">{selectedNode.type} Agent</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Fair Price:</span>
                        <div className="font-medium text-white">
                          {(selectedNode.fairProbability * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Confidence:</span>
                        <div className="font-medium text-white">
                          {(selectedNode.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-400 text-sm">Position:</span>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ml-2 ${
                        selectedNode.direction === 'LONG_YES' ? 'bg-green-500/20 text-green-400' :
                        selectedNode.direction === 'LONG_NO' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {selectedNode.direction.replace('_', ' ')}
                      </div>
                    </div>

                    {selectedNode.keyDrivers.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-sm">Key Drivers:</span>
                        <ul className="mt-1 space-y-1">
                          {selectedNode.keyDrivers.slice(0, 3).map((driver, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0" />
                              {driver}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connections for selected agent */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-300 text-sm">Agent Interactions</h5>
                  {connections
                    .filter(c => c.from === selectedNode.id || c.to === selectedNode.id)
                    .map((connection, index) => {
                      const otherAgentId = connection.from === selectedNode.id ? connection.to : connection.from;
                      const otherAgent = nodes.find(n => n.id === otherAgentId);
                      
                      if (!otherAgent) return null;
                      
                      return (
                        <div key={index} className="p-3 bg-white/5 rounded border border-white/10">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">
                              {otherAgent.name}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              connection.type === 'agreement' ? 'bg-green-500/20 text-green-400' :
                              connection.type === 'disagreement' ? 'bg-red-500/20 text-red-400' :
                              'bg-indigo-500/20 text-indigo-400'
                            }`}>
                              {connection.type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{connection.reason}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click on an agent to see details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}