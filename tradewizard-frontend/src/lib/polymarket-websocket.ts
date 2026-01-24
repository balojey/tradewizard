/**
 * Polymarket WebSocket Service
 * Handles real-time data connections for price updates, order updates, and market data
 * Enhanced with automatic reconnection, subscription management, and message parsing
 */

import { useState, useEffect, useCallback } from 'react';
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
 * Enhanced WebSocket Service for real-time Polymarket data
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Subscription management for market and user channels
 * - Message parsing and data transformation
 * - Connection status monitoring
 * - Error handling and recovery
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

  // Enhanced connection tracking
  private connectionId = 0;
  private lastPingTime = 0;
  private lastPongTime = 0;
  private connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown' = 'unknown';
  private messageQueue: any[] = [];
  private maxQueueSize = 100;

  // Event listeners
  private onConnectionChange?: (status: ConnectionStatus) => void;
  private onError?: (error: WebSocketError) => void;

  constructor() {
    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handlePong = this.handlePong.bind(this);
  }

  // ==========================================================================
  // Connection Management with Enhanced Reliability
  // ==========================================================================

  /**
   * Connect to WebSocket with enhanced connection management
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    if (this.connectionStatus.connecting) {
      return; // Already connecting
    }

    this.connectionId++;
    this.updateConnectionStatus({ connecting: true, connected: false });

    try {
      console.log(`[WebSocket] Connecting to ${WEBSOCKET_CONFIG.url} (attempt ${this.reconnectAttempts + 1})`);
      
      this.ws = new WebSocket(WEBSOCKET_CONFIG.url);
      this.ws.addEventListener('open', this.handleOpen);
      this.ws.addEventListener('message', this.handleMessage);
      this.ws.addEventListener('close', this.handleClose);
      this.ws.addEventListener('error', this.handleError);
      this.ws.addEventListener('pong', this.handlePong);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          console.warn('[WebSocket] Connection timeout');
          this.ws.close();
          this.handleConnectionError('Connection timeout');
        }
      }, 10000); // 10 second timeout

      // Clear timeout on successful connection
      this.ws.addEventListener('open', () => {
        clearTimeout(connectionTimeout);
      }, { once: true });

    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      this.handleConnectionError('Failed to create WebSocket connection');
    }
  }

  /**
   * Disconnect from WebSocket with cleanup
   */
  disconnect(): void {
    console.log('[WebSocket] Disconnecting...');
    
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    this.messageQueue = [];
    
    if (this.ws) {
      this.ws.removeEventListener('open', this.handleOpen);
      this.ws.removeEventListener('message', this.handleMessage);
      this.ws.removeEventListener('close', this.handleClose);
      this.ws.removeEventListener('error', this.handleError);
      this.ws.removeEventListener('pong', this.handlePong);
      
      if (this.ws.readyState === WebSocket.OPEN) {
        // Send unsubscribe messages for clean disconnect
        this.unsubscribeAll();
        this.ws.close(1000, 'Client disconnect');
      }
      
      this.ws = null;
    }

    this.subscriptions.clear();
    this.updateConnectionStatus({ connected: false, connecting: false });
  }

  /**
   * Get current connection status with quality metrics
   */
  getConnectionStatus(): ConnectionStatus & { 
    quality: 'excellent' | 'good' | 'poor' | 'unknown';
    reconnectAttempts: number;
    subscriptionCount: number;
  } {
    return { 
      ...this.connectionStatus,
      quality: this.connectionQuality,
      reconnectAttempts: this.reconnectAttempts,
      subscriptionCount: this.subscriptions.size,
    };
  }

  /**
   * Get connection health metrics
   */
  getConnectionHealth(): {
    latency: number;
    quality: 'excellent' | 'good' | 'poor' | 'unknown';
    uptime: number;
    messagesSent: number;
    messagesReceived: number;
  } {
    const latency = this.lastPongTime > 0 ? this.lastPongTime - this.lastPingTime : -1;
    const uptime = this.connectionStatus.lastConnected 
      ? Date.now() - this.connectionStatus.lastConnected 
      : 0;

    return {
      latency,
      quality: this.connectionQuality,
      uptime,
      messagesSent: 0, // Could be tracked if needed
      messagesReceived: 0, // Could be tracked if needed
    };
  }

  // ==========================================================================
  // Enhanced Event Handlers
  // ==========================================================================

  /**
   * Handle WebSocket open event with enhanced setup
   */
  private handleOpen(): void {
    console.log(`[WebSocket] Connected successfully (connection ${this.connectionId})`);
    
    this.reconnectAttempts = 0;
    this.connectionQuality = 'excellent';
    this.updateConnectionStatus({ 
      connected: true, 
      connecting: false,
      lastConnected: Date.now(),
      error: undefined,
    });

    // Process queued messages
    this.processMessageQueue();

    // Resubscribe to all previous subscriptions
    this.resubscribeAll();

    // Start heartbeat with enhanced monitoring
    this.startHeartbeat();

    // Emit connection success event
    this.emitToListeners('connection', { 
      type: 'connected', 
      connectionId: this.connectionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle WebSocket message event with enhanced parsing
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Update connection quality based on message frequency
      this.updateConnectionQuality();
      
      this.processMessage(message);
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error, 'Raw data:', event.data);
      this.emitError({
        type: 'MESSAGE_ERROR',
        message: 'Failed to parse WebSocket message',
      });
    }
  }

  /**
   * Handle WebSocket close event with enhanced reconnection logic
   */
  private handleClose(event: CloseEvent): void {
    console.log(`[WebSocket] Disconnected: ${event.code} - ${event.reason}`);
    
    this.updateConnectionStatus({ 
      connected: false, 
      connecting: false,
      error: event.reason || `Connection closed (${event.code})`,
    });
    
    this.clearHeartbeatTimer();
    this.connectionQuality = 'unknown';

    // Emit disconnection event
    this.emitToListeners('connection', { 
      type: 'disconnected', 
      code: event.code,
      reason: event.reason,
      timestamp: Date.now(),
    });

    // Determine if we should reconnect
    const shouldReconnect = this.shouldAttemptReconnect(event.code);
    
    if (shouldReconnect && this.reconnectAttempts < WEBSOCKET_CONFIG.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= WEBSOCKET_CONFIG.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.emitError({
        type: 'CONNECTION_ERROR',
        message: 'Maximum reconnection attempts exceeded',
        reconnecting: false,
      });
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('[WebSocket] Connection error:', event);
    this.connectionQuality = 'poor';
    this.handleConnectionError('WebSocket connection error');
  }

  /**
   * Handle WebSocket pong event for latency monitoring
   */
  private handlePong(): void {
    this.lastPongTime = Date.now();
    const latency = this.lastPongTime - this.lastPingTime;
    
    // Update connection quality based on latency
    if (latency < 100) {
      this.connectionQuality = 'excellent';
    } else if (latency < 300) {
      this.connectionQuality = 'good';
    } else {
      this.connectionQuality = 'poor';
    }
  }

  // ==========================================================================
  // Enhanced Message Processing and Data Transformation
  // ==========================================================================

  /**
   * Process incoming WebSocket message with enhanced routing
   */
  private processMessage(message: WebSocketMessage): void {
    // Log message for debugging (can be disabled in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('[WebSocket] Received message:', message.type, message);
    }

    switch (message.type) {
      case 'price_update':
        this.processPriceUpdate(message);
        break;

      case 'order_update':
        this.processOrderUpdate(message);
        break;

      case 'market_update':
        this.processMarketUpdate(message);
        break;

      case 'heartbeat':
        // Heartbeat received - connection is alive
        this.handleHeartbeat();
        break;

      case 'error':
        this.emitError({
          type: 'MESSAGE_ERROR',
          message: message.message || 'Server error',
        });
        break;

      default:
        console.warn('[WebSocket] Unknown message type:', message);
        this.emitToListeners('unknown_message', message);
    }
  }

  /**
   * Process price update with data transformation
   */
  private processPriceUpdate(message: PriceUpdate): void {
    // Transform and validate price data
    const transformedUpdate: PriceUpdate = {
      ...message,
      price: Number(message.price),
      volume: Number(message.volume),
      timestamp: message.timestamp || Date.now(),
    };

    // Validate price data
    if (isNaN(transformedUpdate.price) || transformedUpdate.price < 0 || transformedUpdate.price > 1) {
      console.warn('[WebSocket] Invalid price data:', transformedUpdate);
      return;
    }

    // Emit to specific token listeners
    this.emitToListeners('price_update', transformedUpdate);
    this.emitToListeners(`price_update:${transformedUpdate.tokenId}`, transformedUpdate);
    
    // Emit to market listeners if we can derive market ID
    const marketId = this.getMarketIdFromTokenId(transformedUpdate.tokenId);
    if (marketId) {
      this.emitToListeners(`market_price_update:${marketId}`, transformedUpdate);
    }
  }

  /**
   * Process order update with enhanced data
   */
  private processOrderUpdate(message: OrderUpdate): void {
    // Transform and validate order data
    const transformedUpdate: OrderUpdate = {
      ...message,
      timestamp: message.timestamp || Date.now(),
    };

    // Validate order data
    if (!transformedUpdate.orderId) {
      console.warn('[WebSocket] Invalid order update - missing orderId:', transformedUpdate);
      return;
    }

    this.emitToListeners('order_update', transformedUpdate);
    this.emitToListeners(`order_update:${transformedUpdate.orderId}`, transformedUpdate);
  }

  /**
   * Process market update with aggregated data
   */
  private processMarketUpdate(message: MarketUpdate): void {
    // Transform and validate market data
    const transformedUpdate: MarketUpdate = {
      ...message,
      volume24h: Number(message.volume24h),
      liquidity: Number(message.liquidity),
      timestamp: message.timestamp || Date.now(),
    };

    this.emitToListeners('market_update', transformedUpdate);
    this.emitToListeners(`market_update:${transformedUpdate.marketId}`, transformedUpdate);
  }

  /**
   * Handle heartbeat message
   */
  private handleHeartbeat(): void {
    // Update last heartbeat time
    this.updateConnectionStatus({ 
      lastConnected: Date.now(),
    });
  }

  /**
   * Get market ID from token ID (helper for routing)
   */
  private getMarketIdFromTokenId(tokenId: string): string | null {
    // This would need to be implemented based on Polymarket's token ID structure
    // For now, return null - could be enhanced with a lookup table
    return null;
  }

  // ==========================================================================
  // Enhanced Subscription Management
  // ==========================================================================

  /**
   * Subscribe to market price updates with enhanced tracking
   */
  subscribeToMarket(tokenId: string): void {
    const subscription = `market:${tokenId}`;
    
    if (this.subscriptions.has(subscription)) {
      console.log(`[WebSocket] Already subscribed to market: ${tokenId}`);
      return; // Already subscribed
    }

    console.log(`[WebSocket] Subscribing to market: ${tokenId}`);
    this.subscriptions.add(subscription);
    
    const subscribeMessage = {
      type: 'subscribe',
      channel: 'market',
      tokenId,
      timestamp: Date.now(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage(subscribeMessage);
    } else {
      // Queue message for when connection is established
      this.queueMessage(subscribeMessage);
    }
  }

  /**
   * Unsubscribe from market price updates
   */
  unsubscribeFromMarket(tokenId: string): void {
    const subscription = `market:${tokenId}`;
    
    if (!this.subscriptions.has(subscription)) {
      console.log(`[WebSocket] Not subscribed to market: ${tokenId}`);
      return; // Not subscribed
    }

    console.log(`[WebSocket] Unsubscribing from market: ${tokenId}`);
    this.subscriptions.delete(subscription);
    
    const unsubscribeMessage = {
      type: 'unsubscribe',
      channel: 'market',
      tokenId,
      timestamp: Date.now(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage(unsubscribeMessage);
    }
  }

  /**
   * Subscribe to user order updates with enhanced tracking
   */
  subscribeToUser(address: string): void {
    const subscription = `user:${address}`;
    
    if (this.subscriptions.has(subscription)) {
      console.log(`[WebSocket] Already subscribed to user: ${address}`);
      return; // Already subscribed
    }

    console.log(`[WebSocket] Subscribing to user: ${address}`);
    this.subscriptions.add(subscription);
    
    const subscribeMessage = {
      type: 'subscribe',
      channel: 'user',
      address,
      timestamp: Date.now(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage(subscribeMessage);
    } else {
      // Queue message for when connection is established
      this.queueMessage(subscribeMessage);
    }
  }

  /**
   * Unsubscribe from user order updates
   */
  unsubscribeFromUser(address: string): void {
    const subscription = `user:${address}`;
    
    if (!this.subscriptions.has(subscription)) {
      console.log(`[WebSocket] Not subscribed to user: ${address}`);
      return; // Not subscribed
    }

    console.log(`[WebSocket] Unsubscribing from user: ${address}`);
    this.subscriptions.delete(subscription);
    
    const unsubscribeMessage = {
      type: 'unsubscribe',
      channel: 'user',
      address,
      timestamp: Date.now(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage(unsubscribeMessage);
    }
  }

  /**
   * Subscribe to multiple markets at once
   */
  subscribeToMarkets(tokenIds: string[]): void {
    tokenIds.forEach(tokenId => this.subscribeToMarket(tokenId));
  }

  /**
   * Unsubscribe from multiple markets at once
   */
  unsubscribeFromMarkets(tokenIds: string[]): void {
    tokenIds.forEach(tokenId => this.unsubscribeFromMarket(tokenId));
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): { markets: string[]; users: string[] } {
    const markets: string[] = [];
    const users: string[] = [];

    for (const subscription of this.subscriptions) {
      const [channel, id] = subscription.split(':');
      if (channel === 'market') {
        markets.push(id);
      } else if (channel === 'user') {
        users.push(id);
      }
    }

    return { markets, users };
  }

  /**
   * Clear all subscriptions
   */
  clearAllSubscriptions(): void {
    console.log('[WebSocket] Clearing all subscriptions');
    
    // Send unsubscribe messages for clean disconnect
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.unsubscribeAll();
    }
    
    this.subscriptions.clear();
  }

  /**
   * Resubscribe to all active subscriptions (enhanced)
   */
  private resubscribeAll(): void {
    if (this.subscriptions.size === 0) {
      console.log('[WebSocket] No subscriptions to restore');
      return;
    }

    console.log(`[WebSocket] Resubscribing to ${this.subscriptions.size} subscriptions`);
    
    for (const subscription of this.subscriptions) {
      const [channel, id] = subscription.split(':');
      
      if (channel === 'market') {
        this.sendMessage({
          type: 'subscribe',
          channel: 'market',
          tokenId: id,
          timestamp: Date.now(),
        });
      } else if (channel === 'user') {
        this.sendMessage({
          type: 'subscribe',
          channel: 'user',
          address: id,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  private unsubscribeAll(): void {
    for (const subscription of this.subscriptions) {
      const [channel, id] = subscription.split(':');
      
      if (channel === 'market') {
        this.sendMessage({
          type: 'unsubscribe',
          channel: 'market',
          tokenId: id,
          timestamp: Date.now(),
        });
      } else if (channel === 'user') {
        this.sendMessage({
          type: 'unsubscribe',
          channel: 'user',
          address: id,
          timestamp: Date.now(),
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
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.onConnectionChange = callback;
    
    // Return unsubscribe function
    return () => {
      this.onConnectionChange = undefined;
    };
  }

  /**
   * Add event listener for errors
   */
  onWebSocketError(callback: (error: WebSocketError) => void): () => void {
    this.onError = callback;
    
    // Return unsubscribe function
    return () => {
      this.onError = undefined;
    };
  }

  // ==========================================================================
  // Enhanced Private Helper Methods
  // ==========================================================================

  /**
   * Add generic event listener with enhanced management
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
   * Emit event to listeners with error handling
   */
  private emitToListeners(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send message to WebSocket with queuing support
   */
  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: any): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      // Remove oldest message to make room
      this.messageQueue.shift();
      console.warn('[WebSocket] Message queue full, dropping oldest message');
    }
    
    this.messageQueue.push(message);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    console.log(`[WebSocket] Processing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(message => {
      this.sendMessage(message);
    });
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
   * Handle connection error with enhanced reporting
   */
  private handleConnectionError(message: string): void {
    console.error(`[WebSocket] Connection error: ${message}`);
    
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
    console.error('[WebSocket] Error:', error);
    
    if (this.onError) {
      this.onError(error);
    }
    
    // Also emit to generic error listeners
    this.emitToListeners('error', error);
  }

  /**
   * Determine if we should attempt reconnection based on close code
   */
  private shouldAttemptReconnect(closeCode: number): boolean {
    // Don't reconnect for these codes
    const noReconnectCodes = [
      1000, // Normal closure
      1001, // Going away
      1005, // No status received
      4000, // Custom: Don't reconnect
    ];
    
    return !noReconnectCodes.includes(closeCode);
  }

  /**
   * Schedule reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    
    this.reconnectAttempts++;
    const delay = Math.min(
      WEBSOCKET_CONFIG.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`[WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts}/${WEBSOCKET_CONFIG.maxReconnectAttempts} in ${delay}ms`);
    
    this.updateConnectionStatus({ 
      connecting: false,
      error: `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${WEBSOCKET_CONFIG.maxReconnectAttempts})`,
    });
    
    this.reconnectTimer = setTimeout(() => {
      if (this.reconnectAttempts <= WEBSOCKET_CONFIG.maxReconnectAttempts) {
        this.connect();
      }
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
   * Start heartbeat timer with enhanced monitoring
   */
  private startHeartbeat(): void {
    this.clearHeartbeatTimer();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        
        // Send ping message
        this.sendMessage({ 
          type: 'ping',
          timestamp: this.lastPingTime,
        });
        
        // Check for pong timeout
        setTimeout(() => {
          if (this.lastPongTime < this.lastPingTime) {
            console.warn('[WebSocket] Pong timeout - connection may be stale');
            this.connectionQuality = 'poor';
          }
        }, 5000); // 5 second pong timeout
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

  /**
   * Update connection quality based on message frequency and latency
   */
  private updateConnectionQuality(): void {
    // This could be enhanced with more sophisticated quality metrics
    // For now, we rely on ping/pong latency measurements
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
// Enhanced React Hooks for WebSocket Integration
// ============================================================================

/**
 * React hook for WebSocket connection status with enhanced monitoring
 */
export function useWebSocketStatus() {
  const [status, setStatus] = useState<ConnectionStatus & { 
    quality: 'excellent' | 'good' | 'poor' | 'unknown';
    reconnectAttempts: number;
    subscriptionCount: number;
  }>(
    polymarketWebSocket.getConnectionStatus()
  );

  useEffect(() => {
    // Set up connection status listener with proper type handling
    const handleStatusChange = (basicStatus: ConnectionStatus) => {
      // Get the full status with additional metrics
      const fullStatus = polymarketWebSocket.getConnectionStatus();
      setStatus(fullStatus);
    };
    
    polymarketWebSocket.onConnectionStatusChange(handleStatusChange);
    
    // Update status periodically to get latest metrics
    const interval = setInterval(() => {
      setStatus(polymarketWebSocket.getConnectionStatus());
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  return status;
}

/**
 * React hook for price updates with enhanced features
 */
export function usePriceUpdates(tokenId?: string, options?: {
  autoSubscribe?: boolean;
  onUpdate?: (update: PriceUpdate) => void;
}) {
  const [priceUpdate, setPriceUpdate] = useState<PriceUpdate | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { autoSubscribe = true, onUpdate } = options || {};

  useEffect(() => {
    if (!tokenId) return;

    let unsubscribe: (() => void) | undefined;

    if (autoSubscribe) {
      // Set up price update listener
      unsubscribe = polymarketWebSocket.onTokenPriceUpdate(tokenId, (update) => {
        setPriceUpdate(update);
        onUpdate?.(update);
      });
      
      // Subscribe to market updates
      polymarketWebSocket.subscribeToMarket(tokenId);
      setIsSubscribed(true);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (autoSubscribe && tokenId) {
        polymarketWebSocket.unsubscribeFromMarket(tokenId);
        setIsSubscribed(false);
      }
    };
  }, [tokenId, autoSubscribe, onUpdate]);

  // Manual subscription control
  const subscribe = useCallback(() => {
    if (tokenId && !isSubscribed) {
      polymarketWebSocket.subscribeToMarket(tokenId);
      setIsSubscribed(true);
    }
  }, [tokenId, isSubscribed]);

  const unsubscribe = useCallback(() => {
    if (tokenId && isSubscribed) {
      polymarketWebSocket.unsubscribeFromMarket(tokenId);
      setIsSubscribed(false);
    }
  }, [tokenId, isSubscribed]);

  return {
    priceUpdate,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}

/**
 * React hook for multiple price updates
 */
export function useMultiplePriceUpdates(tokenIds: string[]) {
  const [priceUpdates, setPriceUpdates] = useState<Record<string, PriceUpdate>>({});

  useEffect(() => {
    if (tokenIds.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to each token
    tokenIds.forEach(tokenId => {
      const unsubscribe = polymarketWebSocket.onTokenPriceUpdate(tokenId, (update) => {
        setPriceUpdates(prev => ({
          ...prev,
          [tokenId]: update,
        }));
      });
      
      unsubscribers.push(unsubscribe);
      polymarketWebSocket.subscribeToMarket(tokenId);
    });

    return () => {
      // Clean up all subscriptions
      unsubscribers.forEach(unsubscribe => unsubscribe());
      tokenIds.forEach(tokenId => {
        polymarketWebSocket.unsubscribeFromMarket(tokenId);
      });
    };
  }, [tokenIds]);

  return priceUpdates;
}

/**
 * React hook for order updates with enhanced features
 */
export function useOrderUpdates(userAddress?: string, options?: {
  autoSubscribe?: boolean;
  onUpdate?: (update: OrderUpdate) => void;
}) {
  const [orderUpdate, setOrderUpdate] = useState<OrderUpdate | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderUpdate[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { autoSubscribe = true, onUpdate } = options || {};

  useEffect(() => {
    if (!userAddress) return;

    let unsubscribe: (() => void) | undefined;

    if (autoSubscribe) {
      unsubscribe = polymarketWebSocket.onOrderUpdate((update) => {
        setOrderUpdate(update);
        setOrderHistory(prev => [update, ...prev.slice(0, 99)]); // Keep last 100 updates
        onUpdate?.(update);
      });
      
      polymarketWebSocket.subscribeToUser(userAddress);
      setIsSubscribed(true);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (autoSubscribe && userAddress) {
        polymarketWebSocket.unsubscribeFromUser(userAddress);
        setIsSubscribed(false);
      }
    };
  }, [userAddress, autoSubscribe, onUpdate]);

  const subscribe = useCallback(() => {
    if (userAddress && !isSubscribed) {
      polymarketWebSocket.subscribeToUser(userAddress);
      setIsSubscribed(true);
    }
  }, [userAddress, isSubscribed]);

  const unsubscribe = useCallback(() => {
    if (userAddress && isSubscribed) {
      polymarketWebSocket.unsubscribeFromUser(userAddress);
      setIsSubscribed(false);
    }
  }, [userAddress, isSubscribed]);

  return {
    orderUpdate,
    orderHistory,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}

/**
 * React hook for WebSocket connection management
 */
export function useWebSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up connection status listener
    polymarketWebSocket.onConnectionStatusChange((status) => {
      setIsConnected(status.connected);
      setIsConnecting(status.connecting);
      setError(status.error || null);
    });

    // Set up error listener
    polymarketWebSocket.onWebSocketError((wsError) => {
      setError(wsError.message);
    });

    // Auto-connect on mount
    if (!polymarketWebSocket.getConnectionStatus().connected) {
      polymarketWebSocket.connect();
    }

    return () => {
      // Don't disconnect on unmount - let the service manage the connection
    };
  }, []);

  const connect = useCallback(() => {
    polymarketWebSocket.connect();
  }, []);

  const disconnect = useCallback(() => {
    polymarketWebSocket.disconnect();
  }, []);

  const getConnectionHealth = useCallback(() => {
    return polymarketWebSocket.getConnectionHealth();
  }, []);

  const getActiveSubscriptions = useCallback(() => {
    return polymarketWebSocket.getActiveSubscriptions();
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    getConnectionHealth,
    getActiveSubscriptions,
  };
}