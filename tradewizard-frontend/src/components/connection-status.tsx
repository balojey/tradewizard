/**
 * Connection Status Components
 * Provides visual indicators for WebSocket connection status
 * Requirements: 3.6, 11.5
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  X,
  Info,
} from 'lucide-react';
import { useConnectionStatus } from '../lib/realtime-context';
import { polymarketWebSocket } from '../lib/polymarket-websocket';

// ============================================================================
// Connection Status Indicator (Compact)
// ============================================================================

interface ConnectionIndicatorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConnectionIndicator({ 
  className = '', 
  showLabel = false,
  size = 'md',
}: ConnectionIndicatorProps) {
  const { status, quality, isHealthy, reconnectAttempts } = useConnectionStatus();

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const getStatusColor = () => {
    if (status.connected && isHealthy) return 'text-emerald-500';
    if (status.connected && quality === 'poor') return 'text-yellow-500';
    if (status.connecting) return 'text-blue-500';
    return 'text-red-500';
  };

  const getStatusIcon = () => {
    if (status.connecting) {
      return <Loader2 className={`${sizeClasses[size]} animate-spin`} />;
    }
    
    if (status.connected) {
      switch (quality) {
        case 'excellent':
          return <Signal className={sizeClasses[size]} />;
        case 'good':
          return <SignalHigh className={sizeClasses[size]} />;
        case 'poor':
          return <SignalLow className={sizeClasses[size]} />;
        default:
          return <SignalMedium className={sizeClasses[size]} />;
      }
    }
    
    return <WifiOff className={sizeClasses[size]} />;
  };

  const getStatusText = () => {
    if (status.connecting) return 'Connecting...';
    if (status.connected && isHealthy) return 'Connected';
    if (status.connected && quality === 'poor') return 'Poor Connection';
    if (reconnectAttempts > 0) return `Reconnecting (${reconnectAttempts})`;
    return 'Disconnected';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={getStatusColor()}>
        {getStatusIcon()}
      </div>
      {showLabel && (
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Connection Status Banner (Detailed)
// ============================================================================

interface ConnectionBannerProps {
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function ConnectionBanner({ 
  className = '',
  dismissible = true,
  onDismiss,
}: ConnectionBannerProps) {
  const { 
    status, 
    quality, 
    isHealthy, 
    reconnectAttempts, 
    showStatus,
    toggleVisibility,
    metrics,
  } = useConnectionStatus();

  const [isDismissed, setIsDismissed] = useState(false);

  // Auto-show banner for connection issues
  useEffect(() => {
    if (!status.connected || !isHealthy) {
      setIsDismissed(false);
    }
  }, [status.connected, isHealthy]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
    if (status.connected && isHealthy) {
      toggleVisibility(false);
    }
  };

  // Don't show banner if dismissed and connection is healthy
  if (isDismissed && status.connected && isHealthy) {
    return null;
  }

  // Don't show banner if disabled in settings
  if (!showStatus) {
    return null;
  }

  const getBannerStyle = () => {
    if (status.connecting) {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }
    if (status.connected && isHealthy) {
      return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    }
    if (status.connected && quality === 'poor') {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
    return 'bg-red-50 border-red-200 text-red-800';
  };

  const getBannerIcon = () => {
    if (status.connecting) {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    }
    if (status.connected && isHealthy) {
      return <CheckCircle className="w-5 h-5" />;
    }
    if (status.connected && quality === 'poor') {
      return <AlertCircle className="w-5 h-5" />;
    }
    return <WifiOff className="w-5 h-5" />;
  };

  const getBannerMessage = () => {
    if (status.connecting) {
      return 'Connecting to real-time data feed...';
    }
    if (status.connected && isHealthy) {
      return `Connected to real-time data feed (${quality} quality)`;
    }
    if (status.connected && quality === 'poor') {
      return 'Connected with poor connection quality - data may be delayed';
    }
    if (reconnectAttempts > 0) {
      return `Connection lost - attempting to reconnect (${reconnectAttempts}/10)`;
    }
    return 'Disconnected from real-time data feed - prices may be outdated';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={`
          border rounded-lg p-4 ${getBannerStyle()} ${className}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getBannerIcon()}
            <div>
              <p className="font-medium">
                {getBannerMessage()}
              </p>
              {status.error && (
                <p className="text-sm mt-1 opacity-75">
                  {status.error}
                </p>
              )}
            </div>
          </div>
          
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-black/10 rounded-full transition-colors"
              aria-label="Dismiss connection status"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Connection Status Modal (Detailed Info)
// ============================================================================

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
  const { 
    status, 
    quality, 
    reconnectAttempts, 
    metrics,
  } = useConnectionStatus();

  const [healthData, setHealthData] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<{ markets: string[]; users: string[] }>({ markets: [], users: [] });

  useEffect(() => {
    if (isOpen) {
      // Get health data directly from the WebSocket service
      setHealthData(polymarketWebSocket.getConnectionHealth());
      setSubscriptions(polymarketWebSocket.getActiveSubscriptions());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Info className="w-5 h-5" />
              Connection Status
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Status</span>
              <div className="flex items-center gap-2">
                <ConnectionIndicator size="sm" />
                <span className={`text-sm ${
                  status.connected ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {status.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Connection Quality */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Quality</span>
              <span className={`text-sm capitalize ${
                quality === 'excellent' ? 'text-emerald-600' :
                quality === 'good' ? 'text-blue-600' :
                quality === 'poor' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {quality}
              </span>
            </div>

            {/* Latency */}
            {healthData?.latency >= 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Latency</span>
                <span className="text-sm text-gray-600">
                  {healthData.latency}ms
                </span>
              </div>
            )}

            {/* Uptime */}
            {healthData?.uptime > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Uptime</span>
                <span className="text-sm text-gray-600">
                  {formatUptime(healthData.uptime)}
                </span>
              </div>
            )}

            {/* Messages Received */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Messages</span>
              <span className="text-sm text-gray-600">
                {metrics.messagesReceived.toLocaleString()}
              </span>
            </div>

            {/* Active Subscriptions */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium mb-2">Active Subscriptions</div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Markets: {subscriptions.markets.length}</div>
                <div>Users: {subscriptions.users.length}</div>
              </div>
            </div>

            {/* Reconnection Info */}
            {reconnectAttempts > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-yellow-800 mb-1">
                  Reconnection Attempts
                </div>
                <div className="text-sm text-yellow-700">
                  {reconnectAttempts} / 10 attempts
                </div>
              </div>
            )}

            {/* Error Info */}
            {status.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-medium text-red-800 mb-1">
                  Connection Error
                </div>
                <div className="text-sm text-red-700">
                  {status.error}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Connection Status Hook for Components
// ============================================================================

export function useConnectionIndicator() {
  const { status, quality, isHealthy, toggleVisibility } = useConnectionStatus();
  const [showModal, setShowModal] = useState(false);

  return {
    // Status data
    isConnected: status.connected,
    isConnecting: status.connecting,
    isHealthy,
    quality,
    error: status.error,
    
    // UI controls
    showModal,
    openModal: () => setShowModal(true),
    closeModal: () => setShowModal(false),
    toggleBanner: toggleVisibility,
    
    // Components
    Indicator: ConnectionIndicator,
    Banner: ConnectionBanner,
    Modal: ConnectionModal,
  };
}