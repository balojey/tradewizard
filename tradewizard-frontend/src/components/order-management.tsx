"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  X, 
  RefreshCw, 
  Filter,
  Search,
  ExternalLink,
  AlertCircle,
  Edit3
} from 'lucide-react';

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

interface OrderManagementProps {
  activeOrders: UserOrder[];
  orderHistory: UserOrder[];
  onCancelOrder: (orderId: string) => Promise<void>;
  onModifyOrder?: (orderId: string, newPrice: number, newSize: number) => Promise<void>;
  loading?: boolean;
  onRefresh?: () => void;
}

type TabType = 'active' | 'history';
type FilterType = 'all' | 'buy' | 'sell' | 'filled' | 'cancelled';
type SortType = 'date' | 'price' | 'size' | 'market';

export function OrderManagement({ 
  activeOrders, 
  orderHistory, 
  onCancelOrder, 
  onModifyOrder,
  loading = false,
  onRefresh 
}: OrderManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set());
  const [modifyingOrder, setModifyingOrder] = useState<string | null>(null);
  const [modifyPrice, setModifyPrice] = useState('');
  const [modifySize, setModifySize] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'partially_filled':
        return <Clock className="h-3 w-3 text-blue-500" />;
      case 'filled':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'cancelled':
      case 'rejected':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'partially_filled':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'filled':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'cancelled':
      case 'rejected':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getSideColor = (side: string) => {
    return side === 'buy' ? 'text-green-600' : 'text-red-600';
  };

  // Filter and sort orders
  const filterAndSortOrders = (orders: UserOrder[]) => {
    let filtered = orders.filter(order => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!order.marketTitle.toLowerCase().includes(query) && 
            !order.outcome.toLowerCase().includes(query) &&
            !order.orderId.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status/side filter
      switch (filter) {
        case 'buy':
          return order.side === 'buy';
        case 'sell':
          return order.side === 'sell';
        case 'filled':
          return order.status === 'filled';
        case 'cancelled':
          return order.status === 'cancelled' || order.status === 'rejected';
        default:
          return true;
      }
    });

    // Sort orders
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.timestamp - a.timestamp;
        case 'price':
          return b.price - a.price;
        case 'size':
          return b.size - a.size;
        case 'market':
          return a.marketTitle.localeCompare(b.marketTitle);
        default:
          return 0;
      }
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrders(prev => new Set(prev).add(orderId));
    try {
      await onCancelOrder(orderId);
    } catch (error) {
      console.error('Failed to cancel order:', error);
    } finally {
      setCancellingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleModifyOrder = async (orderId: string) => {
    if (!onModifyOrder || !modifyPrice || !modifySize) return;
    
    try {
      await onModifyOrder(orderId, parseFloat(modifyPrice), parseFloat(modifySize));
      setModifyingOrder(null);
      setModifyPrice('');
      setModifySize('');
    } catch (error) {
      console.error('Failed to modify order:', error);
    }
  };

  const startModifyOrder = (order: UserOrder) => {
    setModifyingOrder(order.orderId);
    setModifyPrice(order.price.toString());
    setModifySize(order.remainingSize.toString());
  };

  const currentOrders = activeTab === 'active' ? activeOrders : orderHistory;
  const filteredOrders = filterAndSortOrders(currentOrders);

  return (
    <div className="bg-background border border-border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Order Management</h2>
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

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-4">
          <Button
            variant={activeTab === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('active')}
            className="flex-1"
          >
            Active Orders ({activeOrders.length})
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('history')}
            className="flex-1"
          >
            Order History ({orderHistory.length})
          </Button>
        </div>

        {/* Filters and Search */}
        {showFilters && (
          <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'buy', 'sell', 'filled', 'cancelled'] as FilterType[]).map((filterType) => (
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
                <option value="date">Date</option>
                <option value="price">Price</option>
                <option value="size">Size</option>
                <option value="market">Market</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {currentOrders.length === 0 
                ? `No ${activeTab === 'active' ? 'active orders' : 'order history'} found`
                : 'No orders match your filters'
              }
            </p>
            {currentOrders.length === 0 && activeTab === 'active' && (
              <p className="text-xs text-muted-foreground mt-1">
                Place your first order to see it here
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredOrders.map((order) => (
              <div key={order.orderId} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${getSideColor(order.side)}`}>
                        {order.side.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">
                        {order.outcome}
                      </span>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {order.marketTitle}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Type: {order.orderType}</span>
                      <span>Price: {formatCurrency(order.price)}</span>
                      <span>Size: {order.size.toFixed(2)}</span>
                      {order.filledSize > 0 && (
                        <span>Filled: {order.filledSize.toFixed(2)}</span>
                      )}
                      <span>Date: {formatDate(order.timestamp)}</span>
                    </div>

                    {order.fillPrice && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Fill Price: {formatCurrency(order.fillPrice)}
                        {order.fees && ` • Fees: ${formatCurrency(order.fees)}`}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {activeTab === 'active' && (order.status === 'pending' || order.status === 'partially_filled') && (
                      <>
                        {onModifyOrder && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startModifyOrder(order)}
                            disabled={modifyingOrder === order.orderId}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelOrder(order.orderId)}
                          disabled={cancellingOrders.has(order.orderId)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {cancellingOrders.has(order.orderId) ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </>
                    )}
                    
                    {order.marketId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/market/${order.marketId}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Modify Order Form */}
                {modifyingOrder === order.orderId && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Modify Order</h4>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={modifyPrice}
                          onChange={(e) => setModifyPrice(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-input bg-background rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Size</label>
                        <input
                          type="number"
                          step="0.01"
                          value={modifySize}
                          onChange={(e) => setModifySize(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-input bg-background rounded"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleModifyOrder(order.orderId)}
                        disabled={!modifyPrice || !modifySize}
                      >
                        Update Order
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setModifyingOrder(null);
                          setModifyPrice('');
                          setModifySize('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredOrders.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Showing {filteredOrders.length} of {currentOrders.length} orders
          </p>
        </div>
      )}
    </div>
  );
}