/**
 * Wagmi Configuration
 * 
 * Configures wagmi and RainbowKit for Base Sepolia testnet.
 */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

/**
 * Wagmi config with RainbowKit defaults
 */
export const config = getDefaultConfig({
    appName: "Morning Desk",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
    chains: [baseSepolia],
    ssr: true,
});

/**
 * ViewProfile contract ABI (subset of functions we use)
 */
export const VIEW_PROFILE_ABI = [
    {
        name: "setSentiment",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "topic", type: "uint8" },
            { name: "sentiment", type: "uint8" },
        ],
        outputs: [],
    },
    {
        name: "getSentiment",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "user", type: "address" },
            { name: "topic", type: "uint8" },
        ],
        outputs: [{ name: "", type: "uint8" }],
    },
    {
        name: "getProfile",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "user", type: "address" }],
        outputs: [{ name: "sentiments", type: "uint8[5]" }],
    },
    {
        name: "hasProfile",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ name: "", type: "bool" }],
    },
] as const;

/**
 * Topic enum matching the smart contract
 */
export enum Topic {
    US_POLITICS = 0,
    CRYPTO = 1,
    GLOBAL_POLICY_ENERGY = 2,
    GLOBAL_POLICY_TRADE = 3,
    MACRO = 4,
}

/**
 * Sentiment enum matching the smart contract
 */
export enum Sentiment {
    NONE = 0,
    BEARISH = 1,
    NEUTRAL = 2,
    BULLISH = 3,
}

/**
 * Get the ViewProfile contract address
 */
export function getViewProfileAddress(): `0x${string}` | undefined {
    const address = process.env.NEXT_PUBLIC_VIEW_PROFILE_ADDRESS;
    if (address && address.startsWith("0x")) {
        return address as `0x${string}`;
    }
    return undefined;
}
