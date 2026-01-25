"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers } from 'ethers';

export interface WalletState {
  address: string | null;
  balance: string;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

export interface WalletContextType extends WalletState {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

// Polygon mainnet configuration for Polymarket
const POLYGON_MAINNET = {
  chainId: 137,
  chainName: 'Polygon Mainnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://polygon-rpc.com/'],
  blockExplorerUrls: ['https://polygonscan.com/'],
};

export function WalletProvider({ children }: WalletProviderProps) {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    balance: '0',
    chainId: null,
    isConnected: false,
    isConnecting: false,
    provider: null,
    signer: null,
  });
  
  const [error, setError] = useState<string | null>(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && 
           typeof window.ethereum !== 'undefined' && 
           window.ethereum.isMetaMask;
  };

  // Update wallet state
  const updateWalletState = async (provider: ethers.BrowserProvider) => {
    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      const network = await provider.getNetwork();

      setWalletState(prev => ({
        ...prev,
        address,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
        isConnected: true,
        provider,
        signer,
        isConnecting: false,
      }));
    } catch (err) {
      console.error('Error updating wallet state:', err);
      setError('Failed to update wallet information');
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true }));
    setError(null);

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await updateWalletState(provider);

      // Check if we're on the correct network (Polygon)
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== POLYGON_MAINNET.chainId) {
        await switchNetwork(POLYGON_MAINNET.chainId);
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      if (err.code === 4001) {
        setError('Connection rejected by user');
      } else {
        setError('Failed to connect wallet. Please try again.');
      }
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletState({
      address: null,
      balance: '0',
      chainId: null,
      isConnected: false,
      isConnecting: false,
      provider: null,
      signer: null,
    });
    setError(null);
  };

  // Switch network
  const switchNetwork = async (chainId: number) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${POLYGON_MAINNET.chainId.toString(16)}`,
                chainName: POLYGON_MAINNET.chainName,
                nativeCurrency: POLYGON_MAINNET.nativeCurrency,
                rpcUrls: POLYGON_MAINNET.rpcUrls,
                blockExplorerUrls: POLYGON_MAINNET.blockExplorerUrls,
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
          setError('Failed to add Polygon network to MetaMask');
        }
      } else {
        console.error('Error switching network:', switchError);
        setError('Failed to switch to Polygon network');
      }
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Listen for account and network changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (walletState.isConnected && walletState.provider) {
        updateWalletState(walletState.provider);
      }
    };

    const handleChainChanged = (chainId: string) => {
      if (walletState.provider) {
        updateWalletState(walletState.provider);
      }
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    window.ethereum?.on('chainChanged', handleChainChanged);
    window.ethereum?.on('disconnect', handleDisconnect);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
      window.ethereum?.removeListener('disconnect', handleDisconnect);
    };
  }, [walletState.isConnected, walletState.provider]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (!isMetaMaskInstalled()) return;

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await updateWalletState(provider);
        }
      } catch (err) {
        console.error('Auto-connect failed:', err);
      }
    };

    autoConnect();
  }, []);

  const contextValue: WalletContextType = {
    ...walletState,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    error,
    clearError,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}