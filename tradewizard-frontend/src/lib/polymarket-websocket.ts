/**
 * Polymarket WebSocket Service
 * Handles real-time data connections for price updates, order updates, and market data
 */

import type {
  WebSocketMessage,
  PriceUpdate,
  OrderUpdate,
  MarketUpdate,
  WebSocketError,
  ConnectionStatus,
} from './polymarket-api-types';

import { WEBSOCKET_CONFIG } from './polymarket-config';

// ============================================================================
// WebSocket Service
// ============================================================================

/**
 * WebSocket Service for real-time Polymarket data
 */
export class PolymarketWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private subscriptions = new Set<string>();
  private listeners = new Map<string, Set<(data: any) => void>>();
  private connectionStatus: ConnectionStatus = {
    connected: false,
    connecting: false,
  };

  // Event listeners
  private onConnectionChange?: (status: ConnectionStatus) => void;
  private onError?: (error: WebSocketError) => void;

  constructor() {
    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Connect to WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    if (this.connectionStatus.connecting) {
      return; // Already connecting
    }

    this.updateConnectionStatus({ connecting: true, connected: false });

    try {
      this.ws = new WebSocket(WEBSOCKET_CONFIG.url);
      this.ws.addEventListener('open', this.handleOpen);
      this.ws.addEventListener('message', this.handleMessage);
      this.ws.addEventListener('close', this.handleClose);
      this.ws.addEventListener('error', this.handleError);
    } catch (error) {
      this.handleConnectionError('Failed to create WebSocket connection');
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    
    if (this.ws) {
      this.ws.removeEventListener('open', this.handleOpen);
      this.ws.removeEventListener('message', this.handleMessage);
      this.ws.removeEventListener('close', this.handleClose);
      this.ws.removeEventListener('error', this.handleError);
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      
      this.ws = null;
    }

    this.subscriptions.clear();
    this.updateConnectionStatus({ connected: false, connecting: false });
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.updateConnectionStatus({ 
      connected: true, 
      connecting: false,
      lastConnected: Date.now(),
    });

    // Resubscribe to all previous subscriptions
    this.resubscribeAll();

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.processMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emitError({
        type: 'MESSAGE_ERROR',
        message: 'Failed to parse message',
      });
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.updateConnectionStatus({ connected: false, connecting: false });
    this.clearHeartbeatTimer();

    // Attempt reconnection if not a clean close
    if (event.code !== 1000 && this.reconnectAttempts < WEBSOCKET_CONFIG.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.handleConnectionError('WebSocket connection error');
  }

  // ==========================================================================
  // Message Processing
  // ==========================================================================

  /**
   * Process incoming WebSocket message
   */
  private processMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'price_update':
        this.emitToListeners('price_update', message);
        this.emitToListeners(`price_update:${message.tokenId}`, message);
        break;

      case 'order_update':
        this.emitToListeners('order_update', message);
        this.emitToListeners(`order_update:${message.orderId}`, message);
        break;

      case 'market_update':
        this.emitToListeners('market_update', message);
        this.emitToListeners(`market_update:${message.marketId}`, message);
        break;

      case 'heartbeat':
        // Heartbeat received - connection is alive
        break;

      case 'error':
        this.emitError({
          type: 'MESSAGE_ERROR',
          message: message.message || 'Server error',
        });
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  }

  // ==========================================================================
  // Subscription Management
  // ==========================================================================

  /**
   * Subscribe to market price updates
   */
  subscribeToMarket(tokenId: string): void {
    const subscription = `market:${tokenId}`;
    
    if (this.subscriptions.has(subscription)) {
      return; // Already subscribed
    }

    this.subscriptions.add(subscription);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'subscribe',
        channel: 'market',
        tokenId,
      });
    }
  }

  /**
   * Unsubscribe from market price updates
   */
  unsubscribeFromMarket(tokenId: string): void {
    const subscription = `market:${tokenId}`;
    
    if (!this.subscriptions.has(subscription)) {
      return; // Not subscribed
    }

    this.subscriptions.delete(subscription);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'unsubscribe',
        channel: 'market',
        tokenId,
      });
    }
  }

  /**
   * Subscribe to user order updates
   */
  subscribeToUser(address: string): void {
    const subscription = `user:${address}`;
    
    if (this.subscriptions.has(subscription)) {
      return; // Already subscribed
    }

    this.subscriptions.add(subscription);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'subscribe',
        channel: 'user',
        address,
      });
    }
  }

  /**
   * Unsubscribe from user order updates
   */
  unsubscribeFromUser(address: string): void {
    const subscription = `user:${address}`;
    
    if (!this.subscriptions.has(subscription)) {
      return; // Not subscribed
    }

    this.subscriptions.delete(subscription);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'unsubscribe',
        channel: 'user',
        address,
      });
    }
  }

  /**
   * Resubscribe to all active subscriptions
   */
  private resubscribeAll(): void {
    for (const subscription of this.subscriptions) {
      const [channel, id] = subscription.split(':');
      
      if (channel === 'market') {
        this.sendMessage({
          type: 'subscribe',
          channel: 'market',
          tokenId: id,
        });
      } else if (channel === 'user') {
        this.sendMessage({
          type: 'subscribe',
          channel: 'user',
          address: id,
        });
      }
    }
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  /**
   * Add event listener for price updates
   */
  onPriceUpdate(callback: (update: PriceUpdate) => void): () => void {
    return this.addEventListener('price_update', callback);
  }

  /**
   * Add event listener for specific token price updates
   */
  onTokenPriceUpdate(tokenId: string, callback: (update: PriceUpdate) => void): () => void {
    return this.addEventListener(`price_update:${tokenId}`, callback);
  }

  /**
   * Add event listener for order updates
   */
  onOrderUpdate(callback: (update: OrderUpdate) => void): () => void {
    return this.addEventListener('order_update', callback);
  }

  /**
   * Add event listener for specific order updates
   */
  onOrderUpdateById(orderId: string, callback: (update: OrderUpdate) => void): () => void {
    return this.addEventListener(`order_update:${orderId}`, callback);
  }

  /**
   * Add event listener for market updates
   */
  onMarketUpdate(callback: (update: MarketUpdate) => void): () => void {
    return this.addEventListener('market_update', callback);
  }

  /**
   * Add event listener for connection status changes
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.onConnectionChange = callback;
  }

  /**
   * Add event listener for errors
   */
  onWebSocketError(callback: (error: WebSocketError) => void): void {
    this.onError = callback;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Add generic event listener
   */
  private addEventListener(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit event to listeners
   */
  private emitToListeners(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(status: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    
    if (this.onConnectionChange) {
      this.onConnectionChange(this.connectionStatus);
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(message: string): void {
    this.updateConnectionStatus({ 
      connected: false, 
      connecting: false, 
      error: message 
    });

    this.emitError({
      type: 'CONNECTION_ERROR',
      message,
      reconnecting: this.reconnectAttempts < WEBSOCKET_CONFIG.maxReconnectAttempts,
    });
  }

  /**
   * Emit error to listeners
   */
  private emitError(error: WebSocketError): void {
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    
    this.reconnectAttempts++;
    const delay = Math.min(
      WEBSOCKET_CONFIG.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.clearHeartbeatTimer();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping' });
      }
    }, WEBSOCKET_CONFIG.heartbeatInterval);
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton WebSocket service instance
 */
export const polymarketWebSocket = new PolymarketWebSocketService();

// ============================================================================
// React Hook for WebSocket
// ============================================================================

/**
 * React hook for WebSocket connection status
 */
export function useWebSocketStatus() {
  const [status, setStatus] = React.useState<ConnectionStatus>(
    polymarketWebSocket.getConnectionStatus()
  );

  React.useEffect(() => {
    polymarketWebSocket.onConnectionStatusChange(setStatus);
    
    return () => {
      // Cleanup is handled by the service
    };
  }, []);

  return status;
}

/**
 * React hook for price updates
 */
export function usePriceUpdates(tokenId?: string) {
  const [priceUpdate, setPriceUpdate] = React.useState<PriceUpdate | null>(null);

  React.useEffect(() => {
    if (!tokenId) return;

    const unsubscribe = polymarketWebSocket.onTokenPriceUpdate(tokenId, setPriceUpdate);
    polymarketWebSocket.subscribeToMarket(tokenId);

    return () => {
      unsubscribe();
      polymarketWebSocket.unsubscribeFromMarket(tokenId);
    };
  }, [tokenId]);

  return priceUpdate;
}

/**
 * React hook for order updates
 */
export function useOrderUpdates(userAddress?: string) {
  const [orderUpdate, setOrderUpdate] = React.useState<OrderUpdate | null>(null);

  React.useEffect(() => {
    if (!userAddress) return;

    const unsubscribe = polymarketWebSocket.onOrderUpdate(setOrderUpdate);
    polymarketWebSocket.subscribeToUser(userAddress);

    return () => {
      unsubscribe();
      polymarketWebSocket.unsubscribeFromUser(userAddress);
    };
  }, [userAddress]);

  return orderUpdate;
}

// Note: React import would be added at the top in a real implementation
declare const React: any;