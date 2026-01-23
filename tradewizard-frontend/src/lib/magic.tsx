"use client";

import { Magic as MagicBase } from 'magic-sdk';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Magic = MagicBase;

type MagicContextType = {
  magic: Magic | null;
  user: any | null;
  isLoggedIn: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const MagicContext = createContext<MagicContextType>({
  magic: null,
  user: null,
  isLoggedIn: false,
  login: async () => {},
  logout: async () => {},
  loading: true,
});

export const useMagic = () => useContext(MagicContext);

const MagicProvider = ({ children }: { children: ReactNode }) => {
  const [magic, setMagic] = useState<Magic | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    console.log('Magic API Key from env:', process.env.NEXT_PUBLIC_MAGIC_API_KEY);
    
    if (process.env.NEXT_PUBLIC_MAGIC_API_KEY) {
      try {
        console.log('Initializing Magic with key:', process.env.NEXT_PUBLIC_MAGIC_API_KEY.substring(0, 10) + '...');
        
        // Try simpler configuration first - remove network config to use defaults
        const magicInstance = new MagicBase(process.env.NEXT_PUBLIC_MAGIC_API_KEY as string);

        console.log('Magic instance created:', magicInstance);
        setMagic(magicInstance);
        
        // Check if user is already logged in
        checkUserStatus(magicInstance);
      } catch (error) {
        console.error('Error initializing Magic:', error);
        setLoading(false);
      }
    } else {
      console.error('NEXT_PUBLIC_MAGIC_API_KEY not found in environment variables');
      setLoading(false);
    }
  }, []);

  const checkUserStatus = async (magicInstance: Magic) => {
    try {
      const isLoggedIn = await magicInstance.user.isLoggedIn();
      if (isLoggedIn) {
        const metadata = await magicInstance.user.getInfo();
        setUser(metadata);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string) => {
    if (!magic) throw new Error('Magic not initialized');
    
    try {
      setLoading(true);
      console.log('Starting Magic Link authentication for:', email);
      console.log('Magic instance:', magic);
      console.log('API Key (first 10 chars):', process.env.NEXT_PUBLIC_MAGIC_API_KEY?.substring(0, 10));
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Magic Link request timed out after 30 seconds')), 30000)
      );
      
      const loginPromise = magic.auth.loginWithEmailOTP({ email });
      
      const result = await Promise.race([loginPromise, timeoutPromise]);
      console.log('Magic Link result:', result);
      
      const metadata = await magic.user.getInfo();
      console.log('User metadata:', metadata);
      setUser(metadata);
    } catch (error) {
      console.error('Login error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!magic) return;
    
    try {
      setLoading(true);
      await magic.user.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => {
    return {
      magic,
      user,
      isLoggedIn: !!user,
      login,
      logout,
      loading,
    };
  }, [magic, user, loading]);

  return <MagicContext.Provider value={value}>{children}</MagicContext.Provider>;
};

export default MagicProvider;