/**
 * Combined Feed API Route
 * 
 * Combines Polymarket markets with RSS headlines into a unified feed.
 * Uses randomization seed for variety on reload.
 */

import { NextResponse } from "next/server";
import type { PolymarketData } from "../markets/route";
import type { HeadlineData } from "../headlines/route";
import { inferTickers, type TickerResult } from "@/lib/tickerInference";
import { buildDirectUrl } from "@/lib/polymarketResolver";

// ============ Types ============

type TopicId = "US_POLITICS" | "CRYPTO" | "GLOBAL_POLICY_ENERGY" | "GLOBAL_POLICY_TRADE";
type RegionId = "US" | "CANADA" | "GLOBAL";

interface BriefingItem {
    id: string;
    createdAt: string;
    region: RegionId;
    topics: TopicId[];
    headline: string;
    bullets: string[];
    polymarketUrls: string[];
    polymarketUrlResolved?: string;
    polymarketUrlType?: "direct" | "search";
    relatedTickers: TickerResult[];
    tickerReasons: string[];
    sourceLinks: string[];
    primaryMarketTitle?: string;
    primaryMarketImpliedProb?: number;
    primaryMarketNote?: string;
    isMarket: boolean;
    volume24hr?: number;
}

// ============ Seeded Random ============

function seededRandom(seed: number): () => number {
    return function () {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
}

function shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const result = [...array];
    const random = seededRandom(seed);
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ============ Topic Detection for Markets ============

function detectMarketTopic(question: string): TopicId {
    const q = question.toLowerCase();

    if (/bitcoin|btc|ethereum|eth|crypto|solana|tether|usdt|nft|defi|coinbase/.test(q)) {
        return "CRYPTO";
    }
    if (/energy|nuclear|oil|gas|renewable|solar|wind|electricity|smr|uranium/.test(q)) {
        return "GLOBAL_POLICY_ENERGY";
    }
    if (/tariff|trade|china|import|export|sanctions|wto/.test(q)) {
        return "GLOBAL_POLICY_TRADE";
    }
    return "US_POLITICS";
}

// ============ Generate Evergreen Analysis Bullets ============

function generateBullets(question: string, yesPrice: number, volume24hr: number): string[] {
    const yesPct = Math.round(yesPrice * 100);
    const noPct = 100 - yesPct;

    const bullets = [
        `Market implied probability: ${yesPct}% YES, ${noPct}% NO.`,
    ];

    if (yesPct > 70) {
        bullets.push("High conviction — traders see this outcome as likely.");
    } else if (yesPct < 30) {
        bullets.push("Low probability — market is skeptical of this outcome.");
    } else {
        bullets.push("Balanced market — significant uncertainty remains.");
    }

    if (volume24hr > 50000) {
        bullets.push(`Active trading with substantial recent volume.`);
    } else if (volume24hr > 10000) {
        bullets.push("Moderate trading activity in this market.");
    }

    return bullets;
}

// ============ Finance Source Links ============

function getFinanceSourceLinks(question: string, topic: TopicId): string[] {
    const q = question.toLowerCase();
    const sources: string[] = [];

    if (topic === "CRYPTO" || /bitcoin|btc|ethereum|crypto/i.test(q)) {
        sources.push("https://www.coindesk.com/");
        sources.push("https://www.coingecko.com/");
        if (/etf/i.test(q)) {
            sources.push("https://www.etf.com/channels/bitcoin-etfs");
        }
    } else if (topic === "GLOBAL_POLICY_ENERGY" || /nuclear|uranium|energy|oil/i.test(q)) {
        sources.push("https://www.eia.gov/");
        sources.push("https://oilprice.com/");
        if (/nuclear|uranium/i.test(q)) {
            sources.push("https://world-nuclear.org/");
        }
    } else if (topic === "GLOBAL_POLICY_TRADE" || /tariff|china|trade/i.test(q)) {
        sources.push("https://ustr.gov/");
        sources.push("https://www.reuters.com/business/");
    } else if (/fed|rate|fomc|monetary/i.test(q)) {
        sources.push("https://www.federalreserve.gov/");
        sources.push("https://www.cmegroup.com/markets/interest-rates.html");
    } else if (/deport|ice|immigration/i.test(q)) {
        sources.push("https://www.ice.gov/");
        sources.push("https://www.dhs.gov/");
    } else if (/doge|deficit|spending|budget/i.test(q)) {
        sources.push("https://www.cbo.gov/");
        sources.push("https://www.whitehouse.gov/omb/");
    } else if (/tesla|musk/i.test(q)) {
        sources.push("https://ir.tesla.com/");
        sources.push("https://finance.yahoo.com/quote/TSLA/");
    }

    // Always include general finance sources
    if (sources.length < 2) {
        sources.push("https://www.reuters.com/markets/");
        sources.push("https://www.bloomberg.com/markets");
    }

    return sources.slice(0, 4);
}

// ============ API Handler ============

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const topicFilter = searchParams.get("topic") as TopicId | null;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Get seed for randomization (defaults to current time for variety)
    const seedParam = searchParams.get("_t");
    const seed = seedParam ? parseInt(seedParam, 10) : Date.now();

    try {
        // Fetch both markets and headlines in parallel
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

        const [marketsRes, headlinesRes] = await Promise.all([
            fetch(`${baseUrl}/api/markets`, { cache: "no-store" }),
            fetch(`${baseUrl}/api/headlines`, { cache: "no-store" }),
        ]);

        const marketsData = await marketsRes.json();
        const headlinesData = await headlinesRes.json();

        const markets: PolymarketData[] = marketsData.markets || [];
        const headlines: HeadlineData[] = headlinesData.headlines || [];

        const items: BriefingItem[] = [];

        // Convert markets to BriefingItems
        markets.forEach((market) => {
            const topic = detectMarketTopic(market.question);

            // Apply topic filter
            if (topicFilter && topic !== topicFilter) return;

            // Get ticker inference
            const tickerResult = inferTickers(market.question);

            // Build Polymarket URL
            const directUrl = buildDirectUrl(market.slug);

            items.push({
                id: `market-${market.id}`,
                createdAt: new Date().toISOString(),
                region: "GLOBAL",
                topics: [topic],
                headline: market.question,
                bullets: generateBullets(market.question, market.yesPrice, market.volume24hr),
                polymarketUrls: [directUrl],
                polymarketUrlResolved: directUrl,
                polymarketUrlType: "direct",
                relatedTickers: tickerResult.tickers,
                tickerReasons: tickerResult.reasons,
                sourceLinks: getFinanceSourceLinks(market.question, topic),
                primaryMarketTitle: market.question,
                primaryMarketImpliedProb: market.yesPrice,
                primaryMarketNote: market.volume24hr > 1000
                    ? `Active market with trading volume`
                    : "Emerging market",
                isMarket: true,
                volume24hr: market.volume24hr,
            });
        });

        // Convert headlines to BriefingItems
        headlines.forEach((headline) => {
            // Apply topic filter
            if (topicFilter && headline.topic !== topicFilter) return;

            // Get ticker inference
            const tickerResult = inferTickers(headline.title);

            items.push({
                id: headline.id,
                createdAt: headline.pubDate,
                region: "US",
                topics: [headline.topic],
                headline: headline.title,
                bullets: [
                    `Source: ${headline.source}`,
                    "Full article available at source link.",
                ],
                polymarketUrls: [],
                relatedTickers: tickerResult.tickers,
                tickerReasons: tickerResult.reasons,
                sourceLinks: [headline.link],
                isMarket: false,
            });
        });

        // Shuffle items with seed for randomized order on each reload
        const shuffledItems = shuffleWithSeed(items, seed);

        // Re-sort to prioritize markets while maintaining shuffle within category
        shuffledItems.sort((a, b) => {
            if (a.isMarket && !b.isMarket) return -1;
            if (!a.isMarket && b.isMarket) return 1;
            return 0;
        });

        // Apply limit
        const limitedItems = shuffledItems.slice(0, limit);

        return NextResponse.json({
            items: limitedItems,
            generatedAt: new Date().toISOString(),
            marketCount: markets.length,
            headlineCount: headlines.length,
            seed,
        });
    } catch (error) {
        console.error("Failed to build feed:", error);
        return NextResponse.json(
            { error: "Failed to build feed", items: [] },
            { status: 500 }
        );
    }
}
