/**
 * Morning Desk - API Client
 * 
 * Fetches data from the backend router.
 */

// ============ Types ============

export type TopicId =
    | "US_POLITICS"
    | "CRYPTO"
    | "GLOBAL_POLICY_ENERGY"
    | "GLOBAL_POLICY_TRADE";

export type RegionId = "US" | "CANADA" | "GLOBAL";

export interface BriefingItem {
    id: string;
    createdAt: string;
    region: RegionId;
    topics: TopicId[];
    headline: string;
    bullets: string[];
    polymarketMarketIds: string[];
    polymarketUrls: string[];
    relatedTickers: string[];
    sourceLinks: string[];

    // Primary market preview (optional)
    primaryMarketTitle?: string;
    primaryMarketImpliedProb?: number;
    primaryMarketNote?: string;
}

export interface FeedResponse {
    address: string | null;
    items: BriefingItem[];
    generatedAt: string;
}

export interface TopicsResponse {
    topics: {
        id: TopicId;
        name: string;
    }[];
}

// ============ API Configuration ============

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ============ API Functions ============

/**
 * Fetch the briefing feed
 */
export async function fetchFeed(options?: {
    address?: string;
    topic?: TopicId;
    region?: RegionId;
    limit?: number;
}): Promise<FeedResponse> {
    const params = new URLSearchParams();

    if (options?.address) params.set("address", options.address);
    if (options?.topic) params.set("topic", options.topic);
    if (options?.region) params.set("region", options.region);
    if (options?.limit) params.set("limit", options.limit.toString());

    const url = `${API_URL}/feed${params.toString() ? `?${params}` : ""}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch available topics
 */
export async function fetchTopics(): Promise<TopicsResponse> {
    const response = await fetch(`${API_URL}/topics`);
    if (!response.ok) {
        throw new Error(`Failed to fetch topics: ${response.statusText}`);
    }
    return response.json();
}

// ============ Utility Functions ============

/**
 * Format topic ID for display
 */
export function formatTopic(topicId: TopicId): string {
    const topicNames: Record<TopicId, string> = {
        US_POLITICS: "US Politics",
        CRYPTO: "Crypto",
        GLOBAL_POLICY_ENERGY: "Energy",
        GLOBAL_POLICY_TRADE: "Trade",
    };
    return topicNames[topicId] || topicId;
}

/**
 * Get color for topic
 */
export function getTopicColor(topicId: TopicId): string {
    const topicColors: Record<TopicId, string> = {
        US_POLITICS: "#3B82F6",      // Blue
        CRYPTO: "#F59E0B",           // Amber
        GLOBAL_POLICY_ENERGY: "#10B981", // Emerald
        GLOBAL_POLICY_TRADE: "#8B5CF6",  // Violet
    };
    return topicColors[topicId] || "#71717a";
}

/**
 * Get ticker URL (Yahoo Finance for stocks, CoinGecko for crypto)
 */
export function getTickerUrl(symbol: string): string {
    const cryptoSymbols = ["BTC", "ETH", "SOL", "AVAX", "MATIC", "DOT", "LINK"];

    if (cryptoSymbols.includes(symbol.toUpperCase())) {
        const coinMap: Record<string, string> = {
            BTC: "bitcoin",
            ETH: "ethereum",
            SOL: "solana",
            AVAX: "avalanche-2",
            MATIC: "matic-network",
            DOT: "polkadot",
            LINK: "chainlink",
        };
        return `https://www.coingecko.com/en/coins/${coinMap[symbol] || symbol.toLowerCase()}`;
    }

    return `https://finance.yahoo.com/quote/${symbol}`;
}

/**
 * Determine ticker type for styling
 */
export function getTickerType(symbol: string): "crypto" | "stock" | "etf" {
    const cryptoSymbols = ["BTC", "ETH", "SOL", "AVAX", "MATIC", "DOT", "LINK"];
    const etfSymbols = ["SPY", "QQQ", "TLT", "GLD", "IBIT", "ETHE", "URA", "WOOD", "XLF", "XHB", "SGOV"];

    if (cryptoSymbols.includes(symbol.toUpperCase())) return "crypto";
    if (etfSymbols.includes(symbol.toUpperCase())) return "etf";
    return "stock";
}

/**
 * Format probability as percentage
 */
export function formatProbability(prob: number): string {
    return `${Math.round(prob * 100)}%`;
}
