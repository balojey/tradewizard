"use client";

import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { Calendar, TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";
import Card from "@/components/shared/Card";
import { formatNumber } from "@/utils/formatting";

interface PricePoint {
  timestamp: string;
  price: number;
  volume: number;
  high: number;
  low: number;
}

interface PriceEvent {
  timestamp: string;
  type: 'news' | 'trade' | 'social';
  title: string;
  impact: 'positive' | 'negative' | 'neutral';
  priceChange: number;
}

interface PriceHistoryChartProps {
  conditionId: string | null;
  currentPrice: number;
  aiRecommendation?: {
    entryZone: [number, number];
    targetZone: [number, number];
    consensusProbability: number;
  };
}

type TimeRange = '1H' | '4H' | '1D' | '7D' | '30D';

export default function PriceHistoryChart({ 
  conditionId, 
  currentPrice,
  aiRecommendation 
}: PriceHistoryChartProps) {
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [events, setEvents] = useState<PriceEvent[]>([]);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1D');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeRanges: { label: string; value: TimeRange; hours: number }[] = [
    { label: '1H', value: '1H', hours: 1 },
    { label: '4H', value: '4H', hours: 4 },
    { label: '1D', value: '1D', hours: 24 },
    { label: '7D', value: '7D', hours: 168 },
    { label: '30D', value: '30D', hours: 720 },
  ];

  useEffect(() => {
    if (!conditionId) return;

    const fetchPriceData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // This would be replaced with actual API call to price history service
        // For now, we'll simulate realistic price data
        await new Promise(resolve => setTimeout(resolve, 800));

        const range = timeRanges.find(r => r.value === selectedRange);
        const hours = range?.hours || 24;
        const points = Math.min(hours * 4, 200); // 15-minute intervals, max 200 points
        
        const basePrice = currentPrice || 0.5;
        const volatility = 0.02; // 2% volatility
        
        const mockData: PricePoint[] = [];
        let price = basePrice * (0.9 + Math.random() * 0.2); // Start within ±10% of current
        
        for (let i = 0; i < points; i++) {
          const timestamp = new Date(Date.now() - (points - i) * (hours * 60 * 60 * 1000) / points);
          
          // Add some trend and mean reversion
          const trend = (basePrice - price) * 0.001; // Mean reversion
          const randomWalk = (Math.random() - 0.5) * volatility;
          price = Math.max(0.01, Math.min(0.99, price + trend + randomWalk));
          
          const volume = Math.random() * 10000 + 1000;
          const high = price * (1 + Math.random() * 0.01);
          const low = price * (1 - Math.random() * 0.01);
          
          mockData.push({
            timestamp: timestamp.toISOString(),
            price: Number(price.toFixed(4)),
            volume: Math.floor(volume),
            high: Number(high.toFixed(4)),
            low: Number(low.toFixed(4))
          });
        }

        // Generate some price events
        const mockEvents: PriceEvent[] = [];
        const eventCount = Math.floor(hours / 12); // Roughly one event per 12 hours
        
        for (let i = 0; i < eventCount; i++) {
          const eventIndex = Math.floor(Math.random() * mockData.length);
          const eventData = mockData[eventIndex];
          const impact = Math.random() > 0.5 ? 'positive' : 'negative';
          
          mockEvents.push({
            timestamp: eventData.timestamp,
            type: ['news', 'trade', 'social'][Math.floor(Math.random() * 3)] as any,
            title: impact === 'positive' 
              ? 'Positive market development reported'
              : 'Market concerns emerge',
            impact,
            priceChange: (Math.random() - 0.5) * 0.1 // ±5% change
          });
        }

        setPriceData(mockData);
        setEvents(mockEvents);
      } catch (err) {
        setError('Failed to load price history');
        console.error('Price history error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceData();
  }, [conditionId, selectedRange, currentPrice]);

  const chartData = useMemo(() => {
    return priceData.map(point => ({
      ...point,
      time: new Date(point.timestamp).getTime(),
      formattedTime: new Date(point.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        ...(selectedRange === '7D' || selectedRange === '30D' ? { 
          month: 'short', 
          day: 'numeric' 
        } : {})
      })
    }));
  }, [priceData, selectedRange]);

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { value: 0, percentage: 0 };
    
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    const change = last - first;
    const percentage = (change / first) * 100;
    
    return { value: change, percentage };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/90 backdrop-blur-sm p-3 border border-white/20 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-white">{data.formattedTime}</p>
          <p className="text-sm">
            <span className="text-gray-400">Price: </span>
            <span className="font-medium text-white">${data.price.toFixed(3)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Volume: </span>
            <span className="font-medium text-white">{formatNumber(data.volume)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Range: </span>
            <span className="font-medium text-white">${data.low.toFixed(3)} - ${data.high.toFixed(3)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!conditionId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Price history not available</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-white/10 rounded w-48" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 w-12 bg-white/10 rounded" />
              ))}
            </div>
          </div>
          <div className="h-64 bg-white/10 rounded" />
        </div>
      </Card>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <Activity className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="font-medium text-white">Price History Unavailable</p>
          <p className="text-sm mt-1">{error || 'No price data available'}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-white">Price History</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Current: ${currentPrice.toFixed(3)}</span>
                <span className={`font-medium ${
                  priceChange.percentage > 0 ? 'text-green-400' : 
                  priceChange.percentage < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {priceChange.percentage > 0 ? '+' : ''}{priceChange.percentage.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {timeRanges.map(range => (
              <button
                key={range.value}
                onClick={() => setSelectedRange(range.value)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  selectedRange === range.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="formattedTime"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['dataMin - 0.01', 'dataMax + 0.01']}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(3)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* AI Recommendation Zones */}
              {aiRecommendation && (
                <>
                  <ReferenceLine 
                    y={aiRecommendation.entryZone[0]} 
                    stroke="#10b981" 
                    strokeDasharray="5 5"
                    label={{ value: "Entry Min", position: "insideTopRight", fill: '#10b981' }}
                  />
                  <ReferenceLine 
                    y={aiRecommendation.entryZone[1]} 
                    stroke="#10b981" 
                    strokeDasharray="5 5"
                    label={{ value: "Entry Max", position: "insideTopRight", fill: '#10b981' }}
                  />
                  <ReferenceLine 
                    y={aiRecommendation.targetZone[0]} 
                    stroke="#f59e0b" 
                    strokeDasharray="5 5"
                    label={{ value: "Target Min", position: "insideTopRight", fill: '#f59e0b' }}
                  />
                  <ReferenceLine 
                    y={aiRecommendation.targetZone[1]} 
                    stroke="#f59e0b" 
                    strokeDasharray="5 5"
                    label={{ value: "Target Max", position: "insideTopRight", fill: '#f59e0b' }}
                  />
                  <ReferenceLine 
                    y={aiRecommendation.consensusProbability} 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    label={{ value: "AI Fair Price", position: "insideTopRight", fill: '#8b5cf6' }}
                  />
                </>
              )}
              
              <Area
                type="monotone"
                dataKey="price"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Price Events */}
        {events.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-300 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Market Events
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {events.slice(0, 5).map((event, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-2 rounded-lg border-l-4 ${
                    event.impact === 'positive' ? 'border-l-green-400 bg-green-500/10' :
                    event.impact === 'negative' ? 'border-l-red-400 bg-red-500/10' :
                    'border-l-gray-400 bg-white/5'
                  }`}
                >
                  <div className={`p-1 rounded ${
                    event.type === 'news' ? 'bg-indigo-500/20 text-indigo-400' :
                    event.type === 'trade' ? 'bg-green-500/20 text-green-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {event.type === 'news' ? <Calendar className="w-3 h-3" /> :
                     event.type === 'trade' ? <TrendingUp className="w-3 h-3" /> :
                     <Activity className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                      <span className={`font-medium ${
                        event.priceChange > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {event.priceChange > 0 ? '+' : ''}{(event.priceChange * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend for AI zones */}
        {aiRecommendation && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-medium text-sm text-gray-300 mb-2">AI Trading Zones</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-green-400 border-dashed border-green-400" style={{ borderWidth: '1px 0' }} />
                  <span className="text-gray-400">Entry Zone</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-yellow-400 border-dashed border-yellow-400" style={{ borderWidth: '1px 0' }} />
                  <span className="text-gray-400">Target Zone</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-purple-400" />
                  <span className="text-gray-400">AI Fair Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-indigo-400" />
                  <span className="text-gray-400">Market Price</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}