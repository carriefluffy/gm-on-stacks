"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { connect, disconnect as stacksDisconnect, isConnected as checkIsConnected } from "@stacks/connect";

export type NetworkMode = "mainnet" | "testnet";

interface WalletContextType {
    isConnected: boolean;
    address: string | null;
    networkMode: NetworkMode;
    setNetworkMode: (mode: NetworkMode) => void;
    connectWallet: () => void;
    disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType>({
    isConnected: false,
    address: null,
    networkMode: "mainnet",
    setNetworkMode: () => { },
    connectWallet: () => { },
    disconnectWallet: () => { },
});

export function useWallet() {
    return useContext(WalletContext);
}

const STORAGE_KEY = "stacks-session";
const NETWORK_STORAGE_KEY = "stacks-network-mode";

export function WalletProvider({ children }: { children: ReactNode }) {
    const [address, setAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Initialize networkMode from localStorage or fallback to Env
    const initialNetwork = (typeof window !== 'undefined' ? localStorage.getItem(NETWORK_STORAGE_KEY) : null) as NetworkMode | null;
    const defaultNetwork = (process.env.NEXT_PUBLIC_NETWORK_MODE === 'testnet' ? 'testnet' : 'mainnet') as NetworkMode;

    const [networkMode, setNetworkModeState] = useState<NetworkMode>(initialNetwork || defaultNetwork);

    const setNetworkMode = useCallback((mode: NetworkMode) => {
        setNetworkModeState(mode);
        localStorage.setItem(NETWORK_STORAGE_KEY, mode);
    }, []);

    // Check for existing session on mount
    useEffect(() => {
        try {
            // Check if already connected via @stacks/connect
            if (checkIsConnected()) {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const session = JSON.parse(stored);
                    if (session.address) {
                        setAddress(session.address);
                        setIsConnected(true);
                    }
                }
            }
        } catch {
            // No session
        }
    }, []);

    const connectWallet = useCallback(async () => {
        try {
            // @stacks/connect v8 uses connect() which returns addresses
            const response = await connect();

            // Extract address from response
            console.log("Wallet response:", response);

            if (response && response.addresses && response.addresses.length > 0) {
                // Find the STX address - STX mainnet starts with SP, testnet with ST
                // BTC addresses start with bc1 which we need to skip
                const stxAddress = response.addresses.find(
                    (addr) => addr.address?.startsWith("SP") || addr.address?.startsWith("ST")
                );

                if (stxAddress?.address) {
                    setAddress(stxAddress.address);
                    setIsConnected(true);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: stxAddress.address }));
                    console.log("Connected with STX address:", stxAddress.address);
                } else {
                    console.error("No STX address found in wallet response:", response.addresses);
                }
            }
        } catch (error) {
            console.error("Connection error:", error);
        }
    }, []);

    const disconnectWallet = useCallback(() => {
        stacksDisconnect();
        setAddress(null);
        setIsConnected(false);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return (
        <WalletContext.Provider value={{ isConnected, address, networkMode, setNetworkMode, connectWallet, disconnectWallet }}>
            {children}
        </WalletContext.Provider>
    );
}
