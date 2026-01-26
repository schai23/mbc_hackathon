/**
 * Morning Desk - API Client
 * 
 * Fetches real data from Next.js API routes.
 */

// ============ Types ============

export type TopicId =
    | "US_POLITICS"
    | "CRYPTO"
    | "GLOBAL_POLICY_ENERGY"
    | "GLOBAL_POLICY_TRADE";

export type RegionId = "US" | "CANADA" | "GLOBAL";

export interface TickerResult {
    symbol: string;
    type: "crypto" | "stock" | "etf";
    reason: string;
}

export interface BriefingItem {
    id: string;
    createdAt: string;
    region: RegionId;
    topics: TopicId[];
    headline: string;
    bullets: string[];
    polymarketMarketIds?: string[];
    polymarketUrls: string[];
    polymarketUrlResolved?: string;
    polymarketUrlType?: "direct" | "search";
    relatedTickers: TickerResult[] | string[];
    tickerReasons?: string[];
    sourceLinks: string[];

    // Primary market preview (optional)
    primaryMarketTitle?: string;
    primaryMarketImpliedProb?: number;
    primaryMarketNote?: string;

    // Marker for market vs headline
    isMarket?: boolean;
    volume24hr?: number;
}

export interface FeedResponse {
    address: string | null;
    items: BriefingItem[];
    generatedAt: string;
    marketCount?: number;
    headlineCount?: number;
}

export interface TopicsResponse {
    topics: {
        id: TopicId;
        name: string;
    }[];
}

// ============ API Functions ============

/**
 * Fetch the briefing feed from our API
 */
export async function fetchFeed(options?: {
    address?: string;
    topic?: TopicId;
    region?: RegionId;
    limit?: number;
}): Promise<FeedResponse> {
    const params = new URLSearchParams();

    if (options?.topic) params.set("topic", options.topic);
    if (options?.region) params.set("region", options.region);
    if (options?.limit) params.set("limit", options.limit.toString());

    // Add cache buster for true refresh
    params.set("_t", Date.now().toString());

    const url = `/api/feed${params.toString() ? `?${params}` : ""}`;

    try {
        const response = await fetch(url, {
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        return {
            address: options?.address || null,
            items: data.items || [],
            generatedAt: data.generatedAt || new Date().toISOString(),
            marketCount: data.marketCount,
            headlineCount: data.headlineCount,
        };
    } catch (error) {
        console.error("Failed to fetch feed:", error);
        throw error;
    }
}

/**
 * Fetch available topics
 */
export async function fetchTopics(): Promise<TopicsResponse> {
    return {
        topics: [
            { id: "US_POLITICS", name: "US Politics" },
            { id: "CRYPTO", name: "Crypto" },
            { id: "GLOBAL_POLICY_ENERGY", name: "Energy" },
            { id: "GLOBAL_POLICY_TRADE", name: "Trade" },
        ],
    };
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
    const cryptoSymbols = ["BTC", "ETH", "SOL", "AVAX", "MATIC", "DOT", "LINK", "USDT"];

    if (cryptoSymbols.includes(symbol.toUpperCase())) {
        const coinMap: Record<string, string> = {
            BTC: "bitcoin",
            ETH: "ethereum",
            SOL: "solana",
            AVAX: "avalanche-2",
            MATIC: "matic-network",
            DOT: "polkadot",
            LINK: "chainlink",
            USDT: "tether",
        };
        return `https://www.coingecko.com/en/coins/${coinMap[symbol] || symbol.toLowerCase()}`;
    }

    return `https://finance.yahoo.com/quote/${symbol}`;
}

/**
 * Determine ticker type for styling
 */
export function getTickerType(symbol: string): "crypto" | "stock" | "etf" {
    const cryptoSymbols = ["BTC", "ETH", "SOL", "AVAX", "MATIC", "DOT", "LINK", "USDT"];
    const etfSymbols = ["SPY", "QQQ", "TLT", "GLD", "IBIT", "ETHE", "URA", "WOOD", "XLF", "XHB", "SGOV", "ICLN", "SMH", "IEF", "NLR"];

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

/**
 * Build Polymarket search URL as fallback
 */
export function getPolymarketSearchUrl(query: string): string {
    return `https://polymarket.com/markets?_q=${encodeURIComponent(query)}`;
}
