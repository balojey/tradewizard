"use client";

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Wallet, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DetailedMarket, MarketOutcome, OrderRequest } from '@/lib/polymarket-api-types';

interface TradingPanelProps {
  market: DetailedMarket;
  selectedOutcome: MarketOutcome;
  onClose: () => void;
  onOrderSubmit?: (order: OrderRequest) => Promise<void>;
  userBalance?: number;
}

interface OrderFormErrors {
  price?: string;
  size?: string;
  balance?: string;
  general?: string;
}

/**
 * Trading Panel Component
 * Implements Requirements 5.1, 5.2, 5.6 - Create TradingPanel component with buy/sell options, 
 * Build OrderForm with price/quantity inputs and validation, Add order book display
 */
export function TradingPanel({ 
  market, 
  selectedOutcome, 
  onClose, 
  onOrderSubmit,
  userBalance = 1000 // Mock balance for demo
}: TradingPanelProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [price, setPrice] = useState(selectedOutcome.price);
  const [size, setSize] = useState(10);
  const [timeInForce, setTimeInForce] = useState<'GTC' | 'IOC' | 'FOK'>('GTC');
  const [slippageTolerance, setSlippageTolerance] = useState(2); // 2% default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<OrderFormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate order details
  const effectivePrice = orderType === 'market' ? 
    (side === 'buy' ? selectedOutcome.bestAsk || selectedOutcome.price : selectedOutcome.bestBid || selectedOutcome.price) : 
    price;
  
  const estimatedCost = side === 'buy' ? effectivePrice * size : (1 - effectivePrice) * size;
  const estimatedFees = estimatedCost * 0.02; // 2% fee estimate
  const total = estimatedCost + estimatedFees;
  const maxSlippage = orderType === 'market' ? (slippageTolerance / 100) * effectivePrice : 0;

  // Validation
  useEffect(() => {
    const newErrors: OrderFormErrors = {};

    // Price validation (for limit orders)
    if (orderType === 'limit') {
      if (price <= 0 || price >= 1) {
        newErrors.price = 'Price must be between 0.01 and 0.99';
      }
      if (selectedOutcome.tickSize && price % selectedOutcome.tickSize !== 0) {
        newErrors.price = `Price must be in increments of ${selectedOutcome.tickSize}`;
      }
    }

    // Size validation
    if (size <= 0) {
      newErrors.size = 'Size must be greater than 0';
    }
    if (selectedOutcome.minOrderSize && size < selectedOutcome.minOrderSize) {
      newErrors.size = `Minimum order size is $${selectedOutcome.minOrderSize}`;
    }
    if (selectedOutcome.maxOrderSize && size > selectedOutcome.maxOrderSize) {
      newErrors.size = `Maximum order size is $${selectedOutcome.maxOrderSize}`;
    }

    // Balance validation
    if (total > userBalance) {
      newErrors.balance = 'Insufficient balance';
    }

    setErrors(newErrors);
  }, [price, size, orderType, side, total, userBalance, selectedOutcome]);

  const isValid = Object.keys(errors).length === 0 && size > 0;

  // Handle order submission
  const handleSubmit = async () => {
    if (!isValid || !onOrderSubmit) return;

    setIsSubmitting(true);
    try {
      const order: OrderRequest = {
        tokenId: selectedOutcome.tokenId,
        side,
        price: effectivePrice,
        size,
        orderType,
        timeInForce,
        slippageTolerance: slippageTolerance / 100,
      };

      await onOrderSubmit(order);
      onClose();
    } catch (error) {
      setErrors({ general: 'Failed to place order. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick size buttons
  const quickSizes = [10, 25, 50, 100];
  const balancePercentages = [25, 50, 75, 100];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-sm sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="min-w-0 flex-1 pr-2">
            <CardTitle className="text-base sm:text-lg truncate">
              Trade {selectedOutcome.name}
            </CardTitle>
            <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {market.title}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Market Info - Enhanced mobile layout */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Current Price:</span>
                <span className="font-mono font-medium text-sm sm:text-base">
                  {(selectedOutcome.probability).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Best Bid/Ask:</span>
                <span className="font-mono text-xs sm:text-sm">
                  {selectedOutcome.bestBid ? (selectedOutcome.bestBid * 100).toFixed(1) : '--'}% / 
                  {selectedOutcome.bestAsk ? (selectedOutcome.bestAsk * 100).toFixed(1) : '--'}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/50">
              <span className="text-xs sm:text-sm text-muted-foreground">Your Balance:</span>
              <span className="font-mono font-medium flex items-center gap-1 text-sm sm:text-base">
                <Wallet className="h-3 w-3" />
                ${userBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Buy/Sell Toggle - Enhanced mobile touch targets */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button
              variant={side === 'buy' ? 'default' : 'outline'}
              onClick={() => setSide('buy')}
              className={cn(
                "h-12 sm:h-10 text-sm sm:text-base font-semibold",
                side === 'buy' && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy Yes
            </Button>
            <Button
              variant={side === 'sell' ? 'default' : 'outline'}
              onClick={() => setSide('sell')}
              className={cn(
                "h-12 sm:h-10 text-sm sm:text-base font-semibold",
                side === 'sell' && "bg-red-600 hover:bg-red-700"
              )}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Sell Yes
            </Button>
          </div>

          {/* Order Type - Enhanced mobile layout */}
          <div className="space-y-2 sm:space-y-3">
            <label className="text-sm sm:text-base font-medium">Order Type</label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Button
                variant={orderType === 'limit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('limit')}
                className="h-10 sm:h-9 text-sm font-medium"
              >
                Limit
              </Button>
              <Button
                variant={orderType === 'market' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('market')}
                className="h-10 sm:h-9 text-sm font-medium"
              >
                Market
              </Button>
            </div>
            {orderType === 'market' && (
              <div className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Market orders execute immediately at the best available price
              </div>
            )}
          </div>

          {/* Price Input (for limit orders) - Enhanced mobile layout */}
          {orderType === 'limit' && (
            <div className="space-y-2 sm:space-y-3">
              <label className="text-sm sm:text-base font-medium">Price</label>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  min="0.01"
                  max="0.99"
                  step={selectedOutcome.tickSize || 0.01}
                  className={cn(
                    "w-full px-3 py-3 sm:py-2 border rounded-md text-right font-mono text-base sm:text-sm",
                    errors.price && "border-red-500"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  %
                </div>
              </div>
              {errors.price && (
                <div className="text-xs sm:text-sm text-red-600">{errors.price}</div>
              )}
            </div>
          )}

          {/* Size Input - Enhanced mobile layout */}
          <div className="space-y-2 sm:space-y-3">
            <label className="text-sm sm:text-base font-medium">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(parseFloat(e.target.value) || 0)}
                min={selectedOutcome.minOrderSize || 1}
                max={selectedOutcome.maxOrderSize}
                step="1"
                className={cn(
                  "w-full pl-10 pr-3 py-3 sm:py-2 border rounded-md text-right font-mono text-base sm:text-sm",
                  (errors.size || errors.balance) && "border-red-500"
                )}
              />
            </div>
            {(errors.size || errors.balance) && (
              <div className="text-xs sm:text-sm text-red-600">{errors.size || errors.balance}</div>
            )}
            
            {/* Quick Size Buttons - Enhanced mobile layout */}
            <div className="space-y-2 sm:space-y-3">
              <div className="text-xs sm:text-sm text-muted-foreground">Quick amounts:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {quickSizes.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setSize(amount)}
                    className="text-xs sm:text-sm h-9 sm:h-8"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">Use % of balance:</div>
              <div className="grid grid-cols-4 gap-1">
                {balancePercentages.map((percent) => (
                  <Button
                    key={percent}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const maxAffordable = userBalance / (effectivePrice + (effectivePrice * 0.02));
                      setSize(Math.floor((maxAffordable * percent) / 100));
                    }}
                    className="text-xs"
                  >
                    {percent}%
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced Options
              </span>
              <span className={cn(
                "transition-transform",
                showAdvanced && "rotate-180"
              )}>
                ↓
              </span>
            </Button>
            
            {showAdvanced && (
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                {/* Time in Force */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time in Force</label>
                  <select
                    value={timeInForce}
                    onChange={(e) => setTimeInForce(e.target.value as 'GTC' | 'IOC' | 'FOK')}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="GTC">Good Till Cancelled (GTC)</option>
                    <option value="IOC">Immediate or Cancel (IOC)</option>
                    <option value="FOK">Fill or Kill (FOK)</option>
                  </select>
                </div>

                {/* Slippage Tolerance (for market orders) */}
                {orderType === 'market' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slippage Tolerance</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={slippageTolerance}
                        onChange={(e) => setSlippageTolerance(parseFloat(e.target.value) || 0)}
                        min="0.1"
                        max="10"
                        step="0.1"
                        className="w-full px-3 py-2 border rounded-md text-right"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        %
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Order Type:</span>
              <span className="font-medium capitalize">{orderType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Effective Price:</span>
              <span className="font-mono">{(effectivePrice * 100).toFixed(2)}%</span>
            </div>
            {orderType === 'market' && maxSlippage > 0 && (
              <div className="flex justify-between text-sm">
                <span>Max Slippage:</span>
                <span className="font-mono">±{(maxSlippage * 100).toFixed(2)}%</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Estimated Cost:</span>
              <span className="font-mono">${estimatedCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Estimated Fees:</span>
              <span className="font-mono">${estimatedFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>Total:</span>
              <span className="font-mono">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Warnings */}
          {!market.tradingEnabled && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">Trading Not Available</div>
                <div>This market is not currently accepting orders.</div>
              </div>
            </div>
          )}

          {errors.general && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">{errors.general}</div>
            </div>
          )}

          {/* Action Buttons - Enhanced mobile layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="h-12 sm:h-10 text-sm sm:text-base font-medium order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isValid || !market.tradingEnabled || isSubmitting}
              className={cn(
                "h-12 sm:h-10 text-sm sm:text-base font-semibold order-1 sm:order-2",
                side === 'buy' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              )}
            >
              {isSubmitting ? 'Placing...' : `Place ${side === 'buy' ? 'Buy' : 'Sell'} Order`}
            </Button>
          </div>

          {/* Disclaimer - Enhanced mobile readability */}
          <div className="text-xs sm:text-sm text-muted-foreground p-3 sm:p-2 bg-muted/20 rounded border-l-2 border-muted">
            <strong>Risk Warning:</strong> Trading prediction markets involves risk. 
            Only trade with funds you can afford to lose.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}