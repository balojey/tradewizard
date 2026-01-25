"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';

interface UserPosition {
  tokenId: string;
  marketTitle: string;
  outcome: string;
  size: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  value: number;
  marketId?: string;
  endDate?: string;
  status?: 'active' | 'resolved' | 'closed';
}

interface PositionsPanelProps {
  positions: UserPosition[];
  onPositionClick: (position: UserPosition) => void;
  totalValue: number;
  totalPnL: number;
  loading?: boolean;
  onRefresh?: () => void;
}

type FilterType = 'all' | 'active' | 'resolved' | 'profitable' | 'losing';
type SortType = 'value' | 'pnl' | 'date' | 'market';

export function PositionsPanel({ 
  positions, 
  onPositionClick, 
  totalValue, 
  totalPnL,
  loading = false,
  onRefresh 
}: PositionsPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('value');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0.00%';
    const percentage = (value / total) * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No end date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter positions
  const filteredPositions = positions.filter(position => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!position.marketTitle.toLowerCase().includes(query) && 
          !position.outcome.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    switch (filter) {
      case 'active':
        return position.status === 'active';
      case 'resolved':
        return position.status === 'resolved';
      case 'profitable':
        return position.unrealizedPnL > 0;
      case 'losing':
        return position.unrealizedPnL < 0;
      default:
        return true;
    }
  });

  // Sort positions
  const sortedPositions = [...filteredPositions].sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return b.value - a.value;
      case 'pnl':
        return b.unrealizedPnL - a.unrealizedPnL;
      case 'date':
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      case 'market':
        return a.marketTitle.localeCompare(b.marketTitle);
      default:
        return 0;
    }
  });

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-3 w-3 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'closed':
        return <XCircle className="h-3 w-3 text-gray-500" />;
      default:
        return <Clock className="h-3 w-3 text-blue-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'resolved':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'closed':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className="bg-background border border-border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Positions</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            {onRefresh && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-lg font-semibold">{formatCurrency(totalValue)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <div className="flex items-center gap-1">
              {totalPnL >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-lg font-semibold ${
                totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(totalPnL))}
              </span>
            </div>
            <p className={`text-xs ${
              totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(totalPnL, totalValue)}
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        {showFilters && (
          <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'active', 'resolved', 'profitable', 'losing'] as FilterType[]).map((filterType) => (
                <Button
                  key={filterType}
                  size="sm"
                  variant={filter === filterType ? "default" : "outline"}
                  onClick={() => setFilter(filterType)}
                  className="text-xs"
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="text-xs border border-input bg-background rounded px-2 py-1"
              >
                <option value="value">Value</option>
                <option value="pnl">P&L</option>
                <option value="date">End Date</option>
                <option value="market">Market</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Positions List */}
      <div className="max-h-96 overflow-y-auto">
        {sortedPositions.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {positions.length === 0 ? 'No positions found' : 'No positions match your filters'}
            </p>
            {positions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Start trading to see your positions here
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedPositions.map((position, index) => (
              <div
                key={`${position.tokenId}-${index}`}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onPositionClick(position)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium truncate">
                        {position.outcome}
                      </h3>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(position.status)}`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(position.status)}
                          {position.status || 'active'}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {position.marketTitle}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Size: {position.size.toFixed(2)}</span>
                      <span>Avg: {formatCurrency(position.averagePrice)}</span>
                      <span>Current: {formatCurrency(position.currentPrice)}</span>
                      {position.endDate && (
                        <span>Ends: {formatDate(position.endDate)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium">
                      {formatCurrency(position.value)}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                      {position.unrealizedPnL >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className={`text-xs font-medium ${
                        position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Math.abs(position.unrealizedPnL))}
                      </span>
                    </div>
                    <p className={`text-xs ${
                      position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(position.unrealizedPnL, position.value)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {sortedPositions.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Showing {sortedPositions.length} of {positions.length} positions
          </p>
        </div>
      )}
    </div>
  );
}