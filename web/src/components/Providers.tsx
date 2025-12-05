/**
 * Providers Component
 * 
 * Wraps the app with all necessary providers:
 * - WagmiProvider for blockchain interactions
 * - QueryClientProvider for React Query
 * - RainbowKitProvider for wallet connection UI
 */

"use client";

import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";

import { config } from "@/lib/wagmi";

import "@rainbow-me/rainbowkit/styles.css";

// Create a client for React Query
const queryClient = new QueryClient();

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: "#3B82F6",
                        accentColorForeground: "white",
                        borderRadius: "medium",
                        fontStack: "system",
                    })}
                    modalSize="compact"
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default Providers;
