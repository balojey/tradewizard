"use client";

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Info, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MarketOutcome, OrderRequest } from '@/lib/polymarket-api-types';

interface OrderFormProps {
  outcome: MarketOutcome;
  maxPrice: number;
  minPrice: number;
  tickSize: number;
  userBalance: number;
  onSubmit: (order: OrderRequest) => void;
  loading: boolean;
}

interface OrderFormState {
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  price: number;
  size: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  postOnly: boolean;
  reduceOnly: boolean;
}

interface ValidationErrors {
  price?: string;
  size?: string;
  balance?: string;
  general?: string;
}

/**
 * Order Form Component
 * Implements Requirements 5.2 - Build OrderForm with price/quantity inputs and validation
 */
export function OrderForm({
  outcome,
  maxPrice,
  minPrice,
  tickSize,
  userBalance,
  onSubmit,
  loading,
}: OrderFormProps) {
  const [formState, setFormState] = useState<OrderFormState>({
    side: 'buy',
    orderType: 'limit',
    price: outcome.price,
    size: 10,
    timeInForce: 'GTC',
    postOnly: false,
    reduceOnly: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate order metrics
  const effectivePrice = formState.orderType === 'market' ? 
    (formState.side === 'buy' ? outcome.bestAsk || outcome.price : outcome.bestBid || outcome.price) : 
    formState.price;

  const notionalValue = effectivePrice * formState.size;
  const estimatedFees = notionalValue * 0.02; // 2% fee estimate
  const totalCost = formState.side === 'buy' ? notionalValue + estimatedFees : estimatedFees;
  const potentialProfit = formState.side === 'buy' ? 
    (1 - effectivePrice) * formState.size - estimatedFees :
    effectivePrice * formState.size - estimatedFees;

  // Validation
  useEffect(() => {
    const newErrors: ValidationErrors = {};

    // Price validation (for limit orders)
    if (formState.orderType === 'limit') {
      if (formState.price < minPrice || formState.price > maxPrice) {
        newErrors.price = `Price must be between ${minPrice} and ${maxPrice}`;
      }
      if (formState.price % tickSize !== 0) {
        newErrors.price = `Price must be in increments of ${tickSize}`;
      }
    }

    // Size validation
    if (formState.size <= 0) {
      newErrors.size = 'Size must be greater than 0';
    }
    if (outcome.minOrderSize && formState.size < outcome.minOrderSize) {
      newErrors.size = `Minimum order size is $${outcome.minOrderSize}`;
    }
    if (outcome.maxOrderSize && formState.size > outcome.maxOrderSize) {
      newErrors.size = `Maximum order size is $${outcome.maxOrderSize}`;
    }

    // Balance validation
    if (totalCost > userBalance) {
      newErrors.balance = `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${userBalance.toFixed(2)}`;
    }

    setErrors(newErrors);
  }, [formState, minPrice, maxPrice, tickSize, outcome, totalCost, userBalance]);

  const isValid = Object.keys(errors).length === 0 && formState.size > 0;

  // Handle form submission
  const handleSubmit = () => {
    if (!isValid) return;

    const order: OrderRequest = {
      tokenId: outcome.tokenId,
      side: formState.side,
      price: effectivePrice,
      size: formState.size,
      orderType: formState.orderType,
      timeInForce: formState.timeInForce,
      postOnly: formState.postOnly,
      reduceOnly: formState.reduceOnly,
    };

    onSubmit(order);
  };

  // Update form state
  const updateFormState = (updates: Partial<OrderFormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };

  // Quick size calculations
  const getMaxAffordableSize = () => {
    const maxCost = userBalance * 0.98; // Leave 2% buffer for fees
    return Math.floor(maxCost / (effectivePrice * 1.02));
  };

  const quickSizePercentages = [25, 50, 75, 100];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Order Form - {outcome.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Side Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Order Side</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={formState.side === 'buy' ? 'default' : 'outline'}
              onClick={() => updateFormState({ side: 'buy' })}
              className={cn(
                formState.side === 'buy' && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy
            </Button>
            <Button
              variant={formState.side === 'sell' ? 'default' : 'outline'}
              onClick={() => updateFormState({ side: 'sell' })}
              className={cn(
                formState.side === 'sell' && "bg-red-600 hover:bg-red-700"
              )}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Sell
            </Button>
          </div>
        </div>

        {/* Order Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Order Type</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={formState.orderType === 'limit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFormState({ orderType: 'limit' })}
            >
              Limit
            </Button>
            <Button
              variant={formState.orderType === 'market' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFormState({ orderType: 'market' })}
            >
              Market
            </Button>
          </div>
          {formState.orderType === 'market' && (
            <div className="text-xs text-muted-foreground flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              Market orders execute immediately at the best available price
            </div>
          )}
        </div>

        {/* Price Input (for limit orders) */}
        {formState.orderType === 'limit' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Price</label>
            <div className="relative">
              <input
                type="number"
                value={formState.price}
                onChange={(e) => updateFormState({ price: parseFloat(e.target.value) || 0 })}
                min={minPrice}
                max={maxPrice}
                step={tickSize}
                className={cn(
                  "w-full px-3 py-2 border rounded-md text-right font-mono",
                  errors.price && "border-red-500"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                $
              </div>
            </div>
            {errors.price && (
              <div className="text-xs text-red-600">{errors.price}</div>
            )}
            <div className="text-xs text-muted-foreground">
              Current: ${outcome.price.toFixed(3)} | 
              Best Bid: ${(outcome.bestBid || 0).toFixed(3)} | 
              Best Ask: ${(outcome.bestAsk || 1).toFixed(3)}
            </div>
          </div>
        )}

        {/* Size Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Size</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="number"
              value={formState.size}
              onChange={(e) => updateFormState({ size: parseFloat(e.target.value) || 0 })}
              min={outcome.minOrderSize || 1}
              max={outcome.maxOrderSize}
              step="1"
              className={cn(
                "w-full pl-10 pr-3 py-2 border rounded-md text-right font-mono",
                (errors.size || errors.balance) && "border-red-500"
              )}
            />
          </div>
          {(errors.size || errors.balance) && (
            <div className="text-xs text-red-600">{errors.size || errors.balance}</div>
          )}
          
          {/* Quick Size Buttons */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Quick sizes (% of max affordable):</div>
            <div className="grid grid-cols-4 gap-1">
              {quickSizePercentages.map((percent) => (
                <Button
                  key={percent}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const maxSize = getMaxAffordableSize();
                    updateFormState({ size: Math.floor((maxSize * percent) / 100) });
                  }}
                  className="text-xs"
                >
                  {percent}%
                </Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Max affordable: {getMaxAffordableSize()} shares
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
            Advanced Options
            <span className={cn(
              "transition-transform",
              showAdvanced && "rotate-180"
            )}>
              ↓
            </span>
          </Button>
          
          {showAdvanced && (
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              {/* Time in Force */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Time in Force</label>
                <select
                  value={formState.timeInForce}
                  onChange={(e) => updateFormState({ timeInForce: e.target.value as 'GTC' | 'IOC' | 'FOK' })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="GTC">Good Till Cancelled (GTC)</option>
                  <option value="IOC">Immediate or Cancel (IOC)</option>
                  <option value="FOK">Fill or Kill (FOK)</option>
                </select>
              </div>

              {/* Order Flags */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.postOnly}
                    onChange={(e) => updateFormState({ postOnly: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Post Only (Maker Only)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.reduceOnly}
                    onChange={(e) => updateFormState({ reduceOnly: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Reduce Only</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-2">Order Summary</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Effective Price:</span>
              <span className="font-mono">${effectivePrice.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Notional Value:</span>
              <span className="font-mono">${notionalValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Fees:</span>
              <span className="font-mono">${estimatedFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Total Cost:</span>
              <span className="font-mono">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Potential Profit:</span>
              <span className={cn(
                "font-mono",
                potentialProfit > 0 ? "text-emerald-600" : "text-red-600"
              )}>
                ${potentialProfit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">{errors.general}</div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className={cn(
            "w-full",
            formState.side === 'buy' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
          )}
        >
          {loading ? 'Placing Order...' : `Place ${formState.side.toUpperCase()} Order`}
        </Button>

        {/* Risk Warning */}
        <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded border-l-2 border-muted">
          <strong>Risk Warning:</strong> All trading involves risk. Ensure you understand the market before placing orders.
        </div>
      </CardContent>
    </Card>
  );
}