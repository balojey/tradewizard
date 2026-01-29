"use client";

import useClobOrder from "@/hooks/useClobOrder";
import useTickSize from "@/hooks/useTickSize";
import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/providers/WalletContext";

import Portal from "@/components/Portal";
import OrderForm from "@/components/Trading/OrderModal/OrderForm";
import OrderSummary from "@/components/Trading/OrderModal/OrderSummary";
import OrderTypeToggle from "@/components/Trading/OrderModal/OrderTypeToggle";

import { cn } from "@/utils/classNames";
import { MIN_ORDER_SIZE } from "@/constants/validation";
import type { ClobClient } from "@polymarket/clob-client";
import { isValidSize } from "@/utils/validation";
import { X, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

function getDecimalPlaces(tickSize: number): number {
  if (tickSize >= 1) return 0;
  const str = tickSize.toString();
  const decimalPart = str.split(".")[1];
  return decimalPart ? decimalPart.length : 0;
}

function isValidTickPrice(price: number, tickSize: number): boolean {
  if (tickSize <= 0) return false;
  const multiplier = Math.round(price / tickSize);
  const expectedPrice = multiplier * tickSize;
  // Allow small floating point tolerance
  return Math.abs(price - expectedPrice) < 1e-10;
}

type OrderPlacementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  marketTitle: string;
  outcome: string;
  currentPrice: number;
  tokenId: string;
  negRisk?: boolean;
  clobClient: ClobClient | null;
};

export default function OrderPlacementModal({
  isOpen,
  onClose,
  marketTitle,
  outcome,
  currentPrice,
  tokenId,
  negRisk = false,
  clobClient,
}: OrderPlacementModalProps) {
  const [size, setSize] = useState<string>("");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { eoaAddress } = useWallet();

  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch tick size dynamically for this market
  const { tickSize, isLoading: isLoadingTickSize } = useTickSize(
    isOpen ? tokenId : null
  );
  const decimalPlaces = getDecimalPlaces(tickSize);

  const {
    submitOrder,
    isSubmitting,
    error: orderError,
    orderId,
  } = useClobOrder(clobClient, eoaAddress);

  useEffect(() => {
    if (isOpen) {
      setSize("");
      setOrderType("market");
      setLimitPrice("");
      setLocalError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (orderId && isOpen) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [orderId, isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeNum = parseFloat(size) || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;
  const effectivePrice = orderType === "limit" ? limitPriceNum : currentPrice;

  // Determine colors based on outcome
  const isYes = outcome.toLowerCase() === "yes";
  const isNo = outcome.toLowerCase() === "no";
  const accentColor = isYes ? "text-green-400" : isNo ? "text-red-400" : "text-blue-400";
  const bgAccent = isYes ? "bg-green-500" : isNo ? "bg-red-500" : "bg-blue-500";

  const handlePlaceOrder = async () => {
    if (!isValidSize(sizeNum)) {
      setLocalError(`Size must be greater than ${MIN_ORDER_SIZE}`);
      return;
    }

    if (orderType === "limit") {
      if (!limitPrice || limitPriceNum <= 0) {
        setLocalError("Limit price is required");
        return;
      }

      if (limitPriceNum < tickSize || limitPriceNum > 1 - tickSize) {
        setLocalError(
          `Price must be between $${tickSize.toFixed(decimalPlaces)} and $${(1 - tickSize).toFixed(decimalPlaces)}`
        );
        return;
      }

      if (!isValidTickPrice(limitPriceNum, tickSize)) {
        setLocalError(`Price must be a multiple of tick size ($${tickSize})`);
        return;
      }
    }

    try {
      await submitOrder({
        tokenId,
        size: sizeNum,
        price: orderType === "limit" ? limitPriceNum : undefined,
        side: "BUY",
        negRisk,
        isMarketOrder: orderType === "market",
      });
    } catch (err) {
      console.error("Error placing order:", err);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 transition-all duration-300"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className="bg-[#0A0A0B] rounded-2xl max-w-[420px] w-full border border-white/10 shadow-2xl animate-modal-fade-in overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <span>Buying</span>
                <ArrowRight className="w-3 h-3" />
                <span className={cn("font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-[10px] bg-white/5", accentColor)}>
                  {outcome}
                </span>
              </div>
              <h3 className="text-base font-medium leading-snug line-clamp-2 text-gray-100">
                {marketTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar">
            {/* Success Message */}
            {showSuccess && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 animate-slide-down">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <h4 className="font-bold text-green-400 text-sm">Order Successful</h4>
                  <p className="text-green-300/80 text-xs">Your order has been placed on the orderbook.</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {(localError || orderError) && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-slide-down">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-400 text-sm">Unable to Place Order</h4>
                  <p className="text-red-300/80 text-xs mt-0.5">
                    {localError || orderError?.message || "An unexpected error occurred."}
                  </p>
                </div>
              </div>
            )}

            {/* Controls */}
            <OrderTypeToggle
              orderType={orderType}
              onChangeOrderType={(type) => {
                setOrderType(type);
                setLocalError(null);
              }}
            />

            <OrderForm
              size={size}
              onSizeChange={(value) => {
                setSize(value);
                setLocalError(null);
              }}
              limitPrice={limitPrice}
              onLimitPriceChange={(value) => {
                setLimitPrice(value);
                setLocalError(null);
              }}
              orderType={orderType}
              currentPrice={currentPrice}
              isSubmitting={isSubmitting}
              tickSize={tickSize}
              decimalPlaces={decimalPlaces}
              isLoadingTickSize={isLoadingTickSize}
            />

            <OrderSummary size={sizeNum} price={effectivePrice} />

            {/* Submit Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || sizeNum <= 0 || !clobClient}
              className={cn(
                "w-full py-4 mt-2 text-white font-bold rounded-xl transition-all duration-300 shadow-lg relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                bgAccent,
                "hover:brightness-110 active:scale-[0.98]"
              )}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>Processing Order...</>
                ) : (
                  <>
                    Place Buy Order
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>

            {!clobClient && (
              <p className="text-xs text-yellow-500/80 mt-4 text-center bg-yellow-500/5 py-2 rounded-lg border border-yellow-500/10">
                ⚠️ Wallet not connected or authenticated
              </p>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
