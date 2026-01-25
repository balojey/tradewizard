"use client";

import React, { useState, useEffect } from 'react';
import { WalletConnection, UserBalance } from '@/components/auth';
import { PositionsPanel } from '@/components/positions-panel';
import { OrderManagement } from '@/components/order-management';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Wallet, Activity } from 'lucide-react';

// Mock data interfaces (these would come from your API)
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

interface UserOrder {
  orderId: string;
  tokenId: string;
  marketTitle: string;
  outcome: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  price: number;
  size: number;
  filledSize: number;
  remainingSize: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled';
  timestamp: number;
  fillPrice?: number;
  fees?: number;
  marketId?: string;
}

export default function DashboardPage() {
  const { isConnected, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [activeOrders, setActiveOrders] = useState<UserOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<UserOrder[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);

  // Mock data for demonstration
  useEffect(() => {
    if (isConnected && address) {
      // Simulate loading user data
      setLoading(true);
      
      setTimeout(() => {
        // Mock positions data
        setPositions([
          {
            tokenId: '0x123',
            marketTitle: 'Will Bitcoin reach $100,000 by end of 2024?',
            outcome: 'Yes',
            size: 100,
            averagePrice: 0.65,
            currentPrice: 0.72,
            unrealizedPnL: 7,
            realizedPnL: 0,
            value: 72,
            marketId: 'btc-100k-2024',
            endDate: '2024-12-31T23:59:59Z',
            status: 'active'
          },
          {
            tokenId: '0x456',
            marketTitle: 'Will Trump win the 2024 US Presidential Election?',
            outcome: 'No',
            size: 50,
            averagePrice: 0.45,
            currentPrice: 0.38,
            unrealizedPnL: -3.5,
            realizedPnL: 2.1,
            value: 19,
            marketId: 'trump-2024-election',
            endDate: '2024-11-05T23:59:59Z',
            status: 'active'
          },
          {
            tokenId: '0x789',
            marketTitle: 'Will Ethereum reach $5,000 by Q2 2024?',
            outcome: 'Yes',
            size: 75,
            averagePrice: 0.55,
            currentPrice: 0.12,
            unrealizedPnL: -32.25,
            realizedPnL: 0,
            value: 9,
            marketId: 'eth-5k-q2-2024',
            endDate: '2024-06-30T23:59:59Z',
            status: 'resolved'
          }
        ]);

        // Mock active orders
        setActiveOrders([
          {
            orderId: 'order-001',
            tokenId: '0x111',
            marketTitle: 'Will AI achieve AGI by 2025?',
            outcome: 'Yes',
            side: 'buy',
            orderType: 'limit',
            price: 0.35,
            size: 100,
            filledSize: 0,
            remainingSize: 100,
            status: 'pending',
            timestamp: Date.now() - 3600000, // 1 hour ago
            marketId: 'agi-2025'
          },
          {
            orderId: 'order-002',
            tokenId: '0x222',
            marketTitle: 'Will SpaceX land on Mars by 2026?',
            outcome: 'No',
            side: 'sell',
            orderType: 'limit',
            price: 0.75,
            size: 50,
            filledSize: 25,
            remainingSize: 25,
            status: 'partially_filled',
            timestamp: Date.now() - 7200000, // 2 hours ago
            fillPrice: 0.75,
            fees: 0.25,
            marketId: 'spacex-mars-2026'
          }
        ]);

        // Mock order history
        setOrderHistory([
          {
            orderId: 'order-003',
            tokenId: '0x333',
            marketTitle: 'Will Bitcoin ETF be approved in 2024?',
            outcome: 'Yes',
            side: 'buy',
            orderType: 'market',
            price: 0.85,
            size: 200,
            filledSize: 200,
            remainingSize: 0,
            status: 'filled',
            timestamp: Date.now() - 86400000, // 1 day ago
            fillPrice: 0.87,
            fees: 1.74,
            marketId: 'btc-etf-2024'
          },
          {
            orderId: 'order-004',
            tokenId: '0x444',
            marketTitle: 'Will Tesla stock reach $300 by end of 2024?',
            outcome: 'No',
            side: 'sell',
            orderType: 'limit',
            price: 0.40,
            size: 150,
            filledSize: 0,
            remainingSize: 150,
            status: 'cancelled',
            timestamp: Date.now() - 172800000, // 2 days ago
            marketId: 'tesla-300-2024'
          }
        ]);

        setLoading(false);
      }, 1000);
    }
  }, [isConnected, address]);

  // Calculate totals
  useEffect(() => {
    const value = positions.reduce((sum, pos) => sum + pos.value, 0);
    const pnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    setTotalValue(value);
    setTotalPnL(pnl);
  }, [positions]);

  const handlePositionClick = (position: UserPosition) => {
    // Navigate to market detail page
    if (position.marketId) {
      window.open(`/market/${position.marketId}`, '_blank');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    // Simulate API call to cancel order
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remove from active orders and add to history
    const orderToCancel = activeOrders.find(order => order.orderId === orderId);
    if (orderToCancel) {
      setActiveOrders(prev => prev.filter(order => order.orderId !== orderId));
      setOrderHistory(prev => [...prev, { ...orderToCancel, status: 'cancelled' }]);
    }
  };

  const handleModifyOrder = async (orderId: string, newPrice: number, newSize: number) => {
    // Simulate API call to modify order
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setActiveOrders(prev => prev.map(order => 
      order.orderId === orderId 
        ? { ...order, price: newPrice, size: newSize, remainingSize: newSize - order.filledSize }
        : order
    ));
  };

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Trading Dashboard</h1>
            <p className="text-muted-foreground">
              Connect your wallet to view your positions, orders, and trading activity
            </p>
          </div>
          
          <WalletConnection />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Trading Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your positions, orders, and trading activity
          </p>
        </div>
        
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Wallet & Balance */}
        <div className="space-y-6">
          <WalletConnection showBalance={true} />
          <UserBalance 
            positions={positions}
            onRefresh={handleRefresh}
            loading={loading}
          />
        </div>

        {/* Middle Column - Positions */}
        <div>
          <PositionsPanel
            positions={positions}
            onPositionClick={handlePositionClick}
            totalValue={totalValue}
            totalPnL={totalPnL}
            loading={loading}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Right Column - Orders */}
        <div>
          <OrderManagement
            activeOrders={activeOrders}
            orderHistory={orderHistory}
            onCancelOrder={handleCancelOrder}
            onModifyOrder={handleModifyOrder}
            loading={loading}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Active Positions</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {positions.filter(p => p.status === 'active').length}
          </p>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Active Orders</span>
          </div>
          <p className="text-2xl font-bold mt-1">{activeOrders.length}</p>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Total Value</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            ${totalValue.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-sm text-muted-foreground">Total P&L</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}