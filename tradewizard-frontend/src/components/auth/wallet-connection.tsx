"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, ExternalLink, AlertCircle, CheckCircle, Copy, Loader2 } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';

interface WalletConnectionProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  showBalance?: boolean;
  compact?: boolean;
}

export function WalletConnection({ 
  onConnect, 
  onDisconnect, 
  showBalance = true, 
  compact = false 
}: WalletConnectionProps) {
  const { 
    address, 
    balance, 
    chainId, 
    isConnected, 
    isConnecting, 
    connectWallet, 
    disconnectWallet, 
    switchNetwork, 
    error, 
    clearError 
  } = useWallet();
  
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    try {
      await connectWallet();
      if (onConnect && address) {
        onConnect(address);
      }
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (num === 0) return '0';
    if (num < 0.001) return '<0.001';
    return num.toFixed(3);
  };

  const isCorrectNetwork = chainId === 137; // Polygon mainnet

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Wallet Connection Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={clearError}
                className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
              >
                Dismiss
              </Button>
              {error.includes('MetaMask') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                  className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
                >
                  Install MetaMask
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connected state
  if (isConnected && address) {
    return (
      <div className={`bg-background border border-border rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatAddress(address)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyAddress}
                  className="h-6 w-6 p-0"
                >
                  <Copy className={`h-3 w-3 ${copied ? 'text-green-600' : ''}`} />
                </Button>
              </div>
              {showBalance && (
                <p className="text-xs text-muted-foreground">
                  {formatBalance(balance)} MATIC
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isCorrectNetwork && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => switchNetwork(137)}
                className="text-orange-600 border-orange-300"
              >
                Switch to Polygon
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </div>
        </div>
        
        {!isCorrectNetwork && (
          <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded text-xs text-orange-700 dark:text-orange-300">
            Please switch to Polygon network to trade on Polymarket
          </div>
        )}
      </div>
    );
  }

  // Disconnected state
  return (
    <div className={`bg-background border border-border rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      <div className="text-center">
        <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Wallet className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-2">Connect Your Wallet</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Connect your MetaMask wallet to start trading on Polymarket
        </p>
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect MetaMask
            </>
          )}
        </Button>
        
        <div className="mt-3 text-xs text-muted-foreground">
          Don't have MetaMask?{' '}
          <button
            onClick={() => window.open('https://metamask.io/download/', '_blank')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Install it here
          </button>
        </div>
      </div>
    </div>
  );
}