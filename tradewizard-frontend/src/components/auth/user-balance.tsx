"use client";

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/wallet-context';

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
}

interface UserBalanceProps {
  positions?: UserPosition[];
  onRefresh?: () => void;
  loading?: boolean;
}

export function UserBalance({ positions = [], onRefresh, loading = false }: UserBalanceProps) {
  const { address, balance, isConnected } = useWallet();
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalRealizedPnL, setTotalRealizedPnL] = useState(0);

  // Calculate totals from positions
  useEffect(() => {
    if (positions.length > 0) {
      const value = positions.reduce((sum, pos) => sum + pos.value, 0);
      const unrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
      const realizedPnL = positions.reduce((sum, pos) => sum + pos.realizedPnL, 0);
      
      setTotalValue(value);
      setTotalPnL(unrealizedPnL);
      setTotalRealizedPnL(realizedPnL);
    } else {
      setTotalValue(0);
      setTotalPnL(0);
      setTotalRealizedPnL(0);
    }
  }, [positions]);

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

  if (!isConnected) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
        <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Connect your wallet to view balance and positions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Wallet Balance */}
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Wallet Balance</h3>
          {onRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-semibold">
            {parseFloat(balance).toFixed(4)} MATIC
          </span>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1">
          {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
        </p>
      </div>

      {/* Portfolio Summary */}
      <div className="bg-background border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Portfolio Summary</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Total Value */}
          <div>
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-lg font-semibold">
              {formatCurrency(totalValue)}
            </p>
          </div>
          
          {/* Unrealized P&L */}
          <div>
            <p className="text-xs text-muted-foreground">Unrealized P&L</p>
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
        
        {/* Realized P&L */}
        {totalRealizedPnL !== 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Realized P&L</p>
              <div className="flex items-center gap-1">
                {totalRealizedPnL >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  totalRealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(Math.abs(totalRealizedPnL))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Positions Summary */}
      {positions.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Active Positions</h3>
          
          <div className="space-y-3">
            {positions.slice(0, 3).map((position, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {position.outcome}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {position.marketTitle}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatCurrency(position.value)}
                  </p>
                  <div className="flex items-center gap-1">
                    {position.unrealizedPnL >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs ${
                      position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(position.unrealizedPnL))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {positions.length > 3 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all {positions.length} positions
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {positions.length === 0 && (
        <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No active positions
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Start trading to see your positions here
          </p>
        </div>
      )}
    </div>
  );
}