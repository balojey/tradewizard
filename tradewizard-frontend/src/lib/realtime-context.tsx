/**
 * Real-time State Management Context
 * Provides React context for real-time data updates, connection status, and state management
 * Requirements: 3.6, 11.5
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  useCallback, 
  useMemo,
  ReactNode 
} from 'react';
import type {
  PriceUpdate,
  OrderUpdate,
  MarketUpdate,
  ConnectionStatus,
  WebSocketError,
  ProcessedMarket,
  UserOrder,
  UserPosition,
} from './polymarket-api-types';
import { 
  polymarketWebSocket,
  useWebSocketConnection,
} from './polymarket-websocket';
import { 
  BatchedUpdateManager, 
  useBatchedUpdates,
  useThrottled,
} from './performance-optimizer';

// ============================================================================
// State Types
// ============================================================================

/**
 * Real-time state structure
 */
export interface RealtimeState {
  // Connection Status
  connection: {
    status: ConnectionStatus;
    quality: 'excellent' | 'good' | 'poor' | 'unknown';
    reconnectAttempts: number;
    subscriptionCount: number;
    error?: WebSocketError;
  };

  // Price Updates
  prices: {
    updates: Record<string, PriceUpdate>;
    lastUpdated: Record<string, number>;
    subscriptions: Set<string>;
  };

  // Order Updates
  orders: {
    updates: Record<string, OrderUpdate>;
    history: OrderUpdate[];
    subscriptions: Set<string>;
  };

  // Market Updates
  markets: {
    updates: Record<string, MarketUpdate>;
    lastUpdated: Record<string, number>;
  };

  // UI State
  ui: {
    showConnectionStatus: boolean;
    connectionIndicatorVisible: boolean;
    notificationsEnabled: boolean;
    soundEnabled: boolean;
  };

  // Performance Metrics
  metrics: {
    messagesReceived: number;
    lastMessageTime: number;
    averageLatency: number;
    connectionUptime: number;
  };
}

/**
 * Real-time actions
 */
export type RealtimeAction =
  | { type: 'CONNECTION_STATUS_CHANGED'; payload: ConnectionStatus & { quality: string; reconnectAttempts: number; subscriptionCount: number } }
  | { type: 'CONNECTION_ERROR'; payload: WebSocketError }
  | { type: 'PRICE_UPDATE'; payload: PriceUpdate }
  | { type: 'ORDER_UPDATE'; payload: OrderUpdate }
  | { type: 'MARKET_UPDATE'; payload: MarketUpdate }
  | { type: 'SUBSCRIBE_TO_PRICE'; payload: { tokenId: string } }
  | { type: 'UNSUBSCRIBE_FROM_PRICE'; payload: { tokenId: string } }
  | { type: 'SUBSCRIBE_TO_USER'; payload: { address: string } }
  | { type: 'UNSUBSCRIBE_FROM_USER'; payload: { address: string } }
  | { type: 'TOGGLE_CONNECTION_STATUS'; payload?: { visible?: boolean } }
  | { type: 'TOGGLE_NOTIFICATIONS'; payload?: { enabled?: boolean } }
  | { type: 'TOGGLE_SOUND'; payload?: { enabled?: boolean } }
  | { type: 'UPDATE_METRICS'; payload: Partial<RealtimeState['metrics']> }
  | { type: 'CLEAR_PRICE_HISTORY'; payload?: { tokenId?: string } }
  | { type: 'CLEAR_ORDER_HISTORY' };

// ============================================================================
// Initial State
// ============================================================================

const initialState: RealtimeState = {
  connection: {
    status: {
      connected: false,
      connecting: false,
    },
    quality: 'unknown',
    reconnectAttempts: 0,
    subscriptionCount: 0,
  },
  prices: {
    updates: {},
    lastUpdated: {},
    subscriptions: new Set(),
  },
  orders: {
    updates: {},
    history: [],
    subscriptions: new Set(),
  },
  markets: {
    updates: {},
    lastUpdated: {},
  },
  ui: {
    showConnectionStatus: true,
    connectionIndicatorVisible: true,
    notificationsEnabled: true,
    soundEnabled: false,
  },
  metrics: {
    messagesReceived: 0,
    lastMessageTime: 0,
    averageLatency: 0,
    connectionUptime: 0,
  },
};

// ============================================================================
// Reducer
// ============================================================================

function realtimeReducer(state: RealtimeState, action: RealtimeAction): RealtimeState {
  switch (action.type) {
    case 'CONNECTION_STATUS_CHANGED':
      return {
        ...state,
        connection: {
          ...state.connection,
          status: {
            connected: action.payload.connected,
            connecting: action.payload.connecting,
            error: action.payload.error,
            lastConnected: action.payload.lastConnected,
          },
          quality: action.payload.quality as any,
          reconnectAttempts: action.payload.reconnectAttempts,
          subscriptionCount: action.payload.subscriptionCount,
        },
        metrics: {
          ...state.metrics,
          connectionUptime: action.payload.connected && action.payload.lastConnected
            ? Date.now() - action.payload.lastConnected
            : 0,
        },
      };

    case 'CONNECTION_ERROR':
      return {
        ...state,
        connection: {
          ...state.connection,
          error: action.payload,
        },
      };

    case 'PRICE_UPDATE':
      return {
        ...state,
        prices: {
          ...state.prices,
          updates: {
            ...state.prices.updates,
            [action.payload.tokenId]: action.payload,
          },
          lastUpdated: {
            ...state.prices.lastUpdated,
            [action.payload.tokenId]: action.payload.timestamp,
          },
        },
        metrics: {
          ...state.metrics,
          messagesReceived: state.metrics.messagesReceived + 1,
          lastMessageTime: action.payload.timestamp,
        },
      };

    case 'ORDER_UPDATE':
      return {
        ...state,
        orders: {
          ...state.orders,
          updates: {
            ...state.orders.updates,
            [action.payload.orderId]: action.payload,
          },
          history: [action.payload, ...state.orders.history.slice(0, 99)], // Keep last 100
        },
        metrics: {
          ...state.metrics,
          messagesReceived: state.metrics.messagesReceived + 1,
          lastMessageTime: action.payload.timestamp,
        },
      };

    case 'MARKET_UPDATE':
      return {
        ...state,
        markets: {
          ...state.markets,
          updates: {
            ...state.markets.updates,
            [action.payload.marketId]: action.payload,
          },
          lastUpdated: {
            ...state.markets.lastUpdated,
            [action.payload.marketId]: action.payload.timestamp,
          },
        },
        metrics: {
          ...state.metrics,
          messagesReceived: state.metrics.messagesReceived + 1,
          lastMessageTime: action.payload.timestamp,
        },
      };

    case 'SUBSCRIBE_TO_PRICE':
      return {
        ...state,
        prices: {
          ...state.prices,
          subscriptions: new Set([...state.prices.subscriptions, action.payload.tokenId]),
        },
      };

    case 'UNSUBSCRIBE_FROM_PRICE':
      const newPriceSubscriptions = new Set(state.prices.subscriptions);
      newPriceSubscriptions.delete(action.payload.tokenId);
      return {
        ...state,
        prices: {
          ...state.prices,
          subscriptions: newPriceSubscriptions,
        },
      };

    case 'SUBSCRIBE_TO_USER':
      return {
        ...state,
        orders: {
          ...state.orders,
          subscriptions: new Set([...state.orders.subscriptions, action.payload.address]),
        },
      };

    case 'UNSUBSCRIBE_FROM_USER':
      const newOrderSubscriptions = new Set(state.orders.subscriptions);
      newOrderSubscriptions.delete(action.payload.address);
      return {
        ...state,
        orders: {
          ...state.orders,
          subscriptions: newOrderSubscriptions,
        },
      };

    case 'TOGGLE_CONNECTION_STATUS':
      return {
        ...state,
        ui: {
          ...state.ui,
          showConnectionStatus: action.payload?.visible ?? !state.ui.showConnectionStatus,
        },
      };

    case 'TOGGLE_NOTIFICATIONS':
      return {
        ...state,
        ui: {
          ...state.ui,
          notificationsEnabled: action.payload?.enabled ?? !state.ui.notificationsEnabled,
        },
      };

    case 'TOGGLE_SOUND':
      return {
        ...state,
        ui: {
          ...state.ui,
          soundEnabled: action.payload?.enabled ?? !state.ui.soundEnabled,
        },
      };

    case 'UPDATE_METRICS':
      return {
        ...state,
        metrics: {
          ...state.metrics,
          ...action.payload,
        },
      };

    case 'CLEAR_PRICE_HISTORY':
      if (action.payload?.tokenId) {
        const newUpdates = { ...state.prices.updates };
        const newLastUpdated = { ...state.prices.lastUpdated };
        delete newUpdates[action.payload.tokenId];
        delete newLastUpdated[action.payload.tokenId];
        return {
          ...state,
          prices: {
            ...state.prices,
            updates: newUpdates,
            lastUpdated: newLastUpdated,
          },
        };
      }
      return {
        ...state,
        prices: {
          ...state.prices,
          updates: {},
          lastUpdated: {},
        },
      };

    case 'CLEAR_ORDER_HISTORY':
      return {
        ...state,
        orders: {
          ...state.orders,
          updates: {},
          history: [],
        },
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface RealtimeContextValue {
  state: RealtimeState;
  dispatch: React.Dispatch<RealtimeAction>;
  
  // Connection Management
  connect: () => void;
  disconnect: () => void;
  
  // Subscription Management
  subscribeToPrices: (tokenIds: string[]) => void;
  unsubscribeFromPrices: (tokenIds: string[]) => void;
  subscribeToUser: (address: string) => void;
  unsubscribeFromUser: (address: string) => void;
  
  // Data Access
  getPriceUpdate: (tokenId: string) => PriceUpdate | undefined;
  getOrderUpdate: (orderId: string) => OrderUpdate | undefined;
  getMarketUpdate: (marketId: string) => MarketUpdate | undefined;
  
  // UI Controls
  toggleConnectionStatus: (visible?: boolean) => void;
  toggleNotifications: (enabled?: boolean) => void;
  toggleSound: (enabled?: boolean) => void;
  
  // Utilities
  clearPriceHistory: (tokenId?: string) => void;
  clearOrderHistory: () => void;
  getConnectionHealth: () => any;
  getActiveSubscriptions: () => { markets: string[]; users: string[] };
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface RealtimeProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  enableNotifications?: boolean;
  enableSound?: boolean;
}

export function RealtimeProvider({ 
  children, 
  autoConnect = true,
  enableNotifications = true,
  enableSound = false,
}: RealtimeProviderProps) {
  const [state, dispatch] = useReducer(realtimeReducer, {
    ...initialState,
    ui: {
      ...initialState.ui,
      notificationsEnabled: enableNotifications,
      soundEnabled: enableSound,
    },
  });

  const { 
    isConnected, 
    isConnecting, 
    error, 
    connect: wsConnect, 
    disconnect: wsDisconnect,
    getConnectionHealth,
    getActiveSubscriptions,
  } = useWebSocketConnection();

  // Batched update handlers for performance optimization
  const handleBatchedPriceUpdates = useCallback((updates: PriceUpdate[]) => {
    // Process all price updates in a single batch to minimize re-renders
    updates.forEach(update => {
      dispatch({
        type: 'PRICE_UPDATE',
        payload: update,
      });
    });
  }, []);

  const handleBatchedOrderUpdates = useCallback((updates: OrderUpdate[]) => {
    // Process all order updates in a single batch
    updates.forEach(update => {
      dispatch({
        type: 'ORDER_UPDATE',
        payload: update,
      });
    });
  }, []);

  const handleBatchedMarketUpdates = useCallback((updates: MarketUpdate[]) => {
    // Process all market updates in a single batch
    updates.forEach(update => {
      dispatch({
        type: 'MARKET_UPDATE',
        payload: update,
      });
    });
  }, []);

  // Batched update managers
  const { addUpdate: addPriceUpdate } = useBatchedUpdates(handleBatchedPriceUpdates, {
    maxBatchSize: 20,
    maxWaitTime: 50, // 50ms batching for price updates
    minWaitTime: 16, // ~60fps
  });

  const { addUpdate: addOrderUpdate } = useBatchedUpdates(handleBatchedOrderUpdates, {
    maxBatchSize: 10,
    maxWaitTime: 100, // 100ms batching for order updates
    minWaitTime: 16,
  });

  const { addUpdate: addMarketUpdate } = useBatchedUpdates(handleBatchedMarketUpdates, {
    maxBatchSize: 15,
    maxWaitTime: 200, // 200ms batching for market updates
    minWaitTime: 16,
  });

  // Throttled connection status updates to prevent excessive re-renders
  const throttledConnectionUpdate = useThrottled((status: any) => {
    dispatch({
      type: 'CONNECTION_STATUS_CHANGED',
      payload: status,
    });
  }, 100); // Throttle to max 10 updates per second

  // ========================================================================
  // WebSocket Event Handlers with Batched Updates
  // ========================================================================

  useEffect(() => {
    // Set up WebSocket event listeners with batched processing
    const unsubscribers: (() => void)[] = [];

    // Connection status updates (throttled)
    const statusUnsubscriber = polymarketWebSocket.onConnectionStatusChange((status) => {
      const fullStatus = polymarketWebSocket.getConnectionStatus();
      throttledConnectionUpdate(fullStatus);
    });
    unsubscribers.push(statusUnsubscriber);

    // Error handling (immediate, not batched)
    const errorUnsubscriber = polymarketWebSocket.onWebSocketError((wsError) => {
      dispatch({
        type: 'CONNECTION_ERROR',
        payload: wsError,
      });
    });
    unsubscribers.push(errorUnsubscriber);

    // Price updates (batched for performance)
    const priceUnsubscriber = polymarketWebSocket.onPriceUpdate((update) => {
      addPriceUpdate(update);
    });
    unsubscribers.push(priceUnsubscriber);

    // Order updates (batched for performance)
    const orderUnsubscriber = polymarketWebSocket.onOrderUpdate((update) => {
      addOrderUpdate(update);
    });
    unsubscribers.push(orderUnsubscriber);

    // Market updates (batched for performance)
    const marketUnsubscriber = polymarketWebSocket.onMarketUpdate((update) => {
      addMarketUpdate(update);
    });
    unsubscribers.push(marketUnsubscriber);

    // Auto-connect if enabled
    if (autoConnect && !isConnected && !isConnecting) {
      wsConnect();
    }

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [
    autoConnect, 
    isConnected, 
    isConnecting, 
    wsConnect, 
    throttledConnectionUpdate,
    addPriceUpdate,
    addOrderUpdate,
    addMarketUpdate,
  ]);

  // ========================================================================
  // Context Value
  // ========================================================================

  const contextValue = useMemo<RealtimeContextValue>(() => ({
    state,
    dispatch,

    // Connection Management
    connect: wsConnect,
    disconnect: wsDisconnect,

    // Subscription Management
    subscribeToPrices: (tokenIds: string[]) => {
      tokenIds.forEach(tokenId => {
        polymarketWebSocket.subscribeToMarket(tokenId);
        dispatch({ type: 'SUBSCRIBE_TO_PRICE', payload: { tokenId } });
      });
    },

    unsubscribeFromPrices: (tokenIds: string[]) => {
      tokenIds.forEach(tokenId => {
        polymarketWebSocket.unsubscribeFromMarket(tokenId);
        dispatch({ type: 'UNSUBSCRIBE_FROM_PRICE', payload: { tokenId } });
      });
    },

    subscribeToUser: (address: string) => {
      polymarketWebSocket.subscribeToUser(address);
      dispatch({ type: 'SUBSCRIBE_TO_USER', payload: { address } });
    },

    unsubscribeFromUser: (address: string) => {
      polymarketWebSocket.unsubscribeFromUser(address);
      dispatch({ type: 'UNSUBSCRIBE_FROM_USER', payload: { address } });
    },

    // Data Access
    getPriceUpdate: (tokenId: string) => state.prices.updates[tokenId],
    getOrderUpdate: (orderId: string) => state.orders.updates[orderId],
    getMarketUpdate: (marketId: string) => state.markets.updates[marketId],

    // UI Controls
    toggleConnectionStatus: (visible?: boolean) => {
      dispatch({ type: 'TOGGLE_CONNECTION_STATUS', payload: { visible } });
    },

    toggleNotifications: (enabled?: boolean) => {
      dispatch({ type: 'TOGGLE_NOTIFICATIONS', payload: { enabled } });
    },

    toggleSound: (enabled?: boolean) => {
      dispatch({ type: 'TOGGLE_SOUND', payload: { enabled } });
    },

    // Utilities
    clearPriceHistory: (tokenId?: string) => {
      dispatch({ type: 'CLEAR_PRICE_HISTORY', payload: { tokenId } });
    },

    clearOrderHistory: () => {
      dispatch({ type: 'CLEAR_ORDER_HISTORY' });
    },

    getConnectionHealth,
    getActiveSubscriptions,
  }), [
    state, 
    dispatch, 
    wsConnect, 
    wsDisconnect, 
    getConnectionHealth, 
    getActiveSubscriptions
  ]);

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access real-time context
 */
export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

/**
 * Optional hook to access real-time context (returns null if provider not available)
 */
export function useRealtimeOptional(): RealtimeContextValue | null {
  const context = useContext(RealtimeContext);
  return context || null;
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for connection status with indicators
 */
export function useConnectionStatus() {
  const { state, toggleConnectionStatus } = useRealtime();
  
  return {
    ...state.connection,
    showStatus: state.ui.showConnectionStatus,
    toggleVisibility: toggleConnectionStatus,
    isHealthy: state.connection.status.connected && state.connection.quality !== 'poor',
    metrics: state.metrics,
  };
}

/**
 * Hook for price updates with real-time data
 */
export function useRealtimePrices(tokenIds: string[]) {
  const { state, subscribeToPrices, unsubscribeFromPrices, getPriceUpdate } = useRealtime();

  useEffect(() => {
    if (tokenIds.length > 0) {
      subscribeToPrices(tokenIds);
      return () => unsubscribeFromPrices(tokenIds);
    }
  }, [tokenIds, subscribeToPrices, unsubscribeFromPrices]);

  const prices = useMemo(() => {
    return tokenIds.reduce((acc, tokenId) => {
      const update = getPriceUpdate(tokenId);
      if (update) {
        acc[tokenId] = update;
      }
      return acc;
    }, {} as Record<string, PriceUpdate>);
  }, [tokenIds, getPriceUpdate, state.prices.updates]);

  return {
    prices,
    isSubscribed: tokenIds.every(id => state.prices.subscriptions.has(id)),
    lastUpdated: Math.max(...tokenIds.map(id => state.prices.lastUpdated[id] || 0)),
  };
}

/**
 * Safe hook for price updates with real-time data (returns empty data if provider not available)
 */
export function useRealtimePricesSafe(tokenIds: string[]) {
  const realtimeContext = useRealtimeOptional();

  const fallbackReturn = useMemo(() => ({
    prices: {} as Record<string, PriceUpdate>,
    isSubscribed: false,
    lastUpdated: 0,
  }), []);

  const prices = useMemo(() => {
    if (!realtimeContext) return {};
    
    return tokenIds.reduce((acc, tokenId) => {
      const update = realtimeContext.getPriceUpdate(tokenId);
      if (update) {
        acc[tokenId] = update;
      }
      return acc;
    }, {} as Record<string, PriceUpdate>);
  }, [tokenIds, realtimeContext]);

  useEffect(() => {
    if (!realtimeContext || tokenIds.length === 0) return;

    realtimeContext.subscribeToPrices(tokenIds);
    return () => realtimeContext.unsubscribeFromPrices(tokenIds);
  }, [tokenIds, realtimeContext]);

  if (!realtimeContext) {
    return fallbackReturn;
  }

  return {
    prices,
    isSubscribed: tokenIds.every(id => realtimeContext.state.prices.subscriptions.has(id)),
    lastUpdated: Math.max(...tokenIds.map(id => realtimeContext.state.prices.lastUpdated[id] || 0)),
  };
}

/**
 * Hook for order updates with real-time data
 */
export function useRealtimeOrders(userAddress?: string) {
  const { state, subscribeToUser, unsubscribeFromUser } = useRealtime();

  useEffect(() => {
    if (userAddress) {
      subscribeToUser(userAddress);
      return () => unsubscribeFromUser(userAddress);
    }
  }, [userAddress, subscribeToUser, unsubscribeFromUser]);

  return {
    orders: state.orders.updates,
    orderHistory: state.orders.history,
    isSubscribed: userAddress ? state.orders.subscriptions.has(userAddress) : false,
  };
}

/**
 * Hook for market updates with aggregated data
 */
export function useRealtimeMarkets(marketIds: string[]) {
  const { state, getPriceUpdate } = useRealtime();

  const marketUpdates = useMemo(() => {
    return marketIds.reduce((acc, marketId) => {
      const update = state.markets.updates[marketId];
      if (update) {
        acc[marketId] = update;
      }
      return acc;
    }, {} as Record<string, MarketUpdate>);
  }, [marketIds, state.markets.updates]);

  return {
    marketUpdates,
    lastUpdated: Math.max(...marketIds.map(id => state.markets.lastUpdated[id] || 0)),
  };
}