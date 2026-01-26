/**
 * Polymarket Markets API Route
 * 
 * Fetches active markets from Polymarket Gamma API.
 * Makes multiple calls to fetch diverse topics and deduplicates by event.
 */

import { NextResponse } from "next/server";

// ============ Types ============

interface GammaMarket {
    id: string;
    question: string;
    slug: string;
    outcomePrices: string; // JSON string like '["0.85", "0.15"]'
    outcomes: string; // JSON string like '["Yes", "No"]'
    volume24hr: number;
    restricted: boolean;
    active: boolean;
    closed: boolean;
    image?: string;
    description?: string;
    endDate?: string;
    negRiskMarketID?: string; // Event group ID
    events?: Array<{ id: string; title: string; slug: string }>;
}

export interface PolymarketData {
    id: string;
    question: string;
    slug: string;
    url: string;
    yesPrice: number;
    noPrice: number;
    volume24hr: number;
    imageUrl?: string;
    endDate?: string;
    eventId?: string;
    topic?: string;
}

// ============ Cache ============

let cachedMarkets: PolymarketData[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============ Topic-Based Queries ============
// Multi-tag queries to fetch diverse markets

const TOPIC_QUERIES = [
    // Crypto markets
    { tag: "crypto", topic: "CRYPTO" },
    { tag: "bitcoin", topic: "CRYPTO" },
    { tag: "ethereum", topic: "CRYPTO" },
    // Energy markets  
    { tag: "energy", topic: "GLOBAL_POLICY_ENERGY" },
    { tag: "climate", topic: "GLOBAL_POLICY_ENERGY" },
    { tag: "oil", topic: "GLOBAL_POLICY_ENERGY" },
    // Trade/economy
    { tag: "tariff", topic: "GLOBAL_POLICY_TRADE" },
    { tag: "china", topic: "GLOBAL_POLICY_TRADE" },
    { tag: "economy", topic: "GLOBAL_POLICY_TRADE" },
    // Politics
    { tag: "trump", topic: "US_POLITICS" },
    { tag: "politics", topic: "US_POLITICS" },
];

// ============ Helpers ============

async function fetchMarketsForTag(tag: string, topic: string): Promise<GammaMarket[]> {
    try {
        const response = await fetch(
            `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=20&tag=${tag}`,
            {
                headers: { "Accept": "application/json" },
                next: { revalidate: 300 },
            }
        );

        if (!response.ok) return [];

        const markets: GammaMarket[] = await response.json();
        // Tag markets with topic
        return markets.map(m => ({ ...m, topic } as GammaMarket & { topic: string }));
    } catch {
        return [];
    }
}

function parseMarket(m: GammaMarket & { topic?: string }): PolymarketData {
    // Parse outcome prices
    let yesPrice = 0.5;
    let noPrice = 0.5;
    try {
        const prices = JSON.parse(m.outcomePrices);
        if (Array.isArray(prices) && prices.length >= 2) {
            yesPrice = parseFloat(prices[0]) || 0.5;
            noPrice = parseFloat(prices[1]) || 0.5;
        }
    } catch {
        // Keep defaults
    }

    // Get event ID for deduplication
    const eventId = m.negRiskMarketID || m.events?.[0]?.id || m.id;

    return {
        id: m.id,
        question: m.question,
        slug: m.slug,
        url: `https://polymarket.com/event/${m.slug}`,
        yesPrice,
        noPrice,
        volume24hr: m.volume24hr || 0,
        imageUrl: m.image,
        endDate: m.endDate,
        eventId,
        topic: m.topic,
    };
}

// ============ API Handler ============

export async function GET() {
    const now = Date.now();

    // Return cached data if still valid
    if (cachedMarkets && now - cacheTimestamp < CACHE_TTL) {
        return NextResponse.json({
            markets: cachedMarkets,
            cached: true,
            fetchedAt: new Date(cacheTimestamp).toISOString(),
        });
    }

    try {
        // Fetch general trending markets + topic-specific markets in parallel
        const [generalResponse, ...topicResults] = await Promise.all([
            fetch(
                "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=30",
                {
                    headers: { "Accept": "application/json" },
                    next: { revalidate: 300 },
                }
            ),
            ...TOPIC_QUERIES.map(q => fetchMarketsForTag(q.tag, q.topic)),
        ]);

        let allRawMarkets: (GammaMarket & { topic?: string })[] = [];

        // Add general markets
        if (generalResponse.ok) {
            const generalMarkets: GammaMarket[] = await generalResponse.json();
            allRawMarkets = [...generalMarkets];
        }

        // Add topic-specific markets
        for (const markets of topicResults) {
            allRawMarkets = [...allRawMarkets, ...markets];
        }

        // Deduplicate by event ID AND limit to 1 market per event group
        const seenEventIds = new Set<string>();
        const seenQuestionPrefixes = new Set<string>();

        const markets: PolymarketData[] = allRawMarkets
            .filter(m => m.active && !m.closed)
            .map(parseMarket)
            // Remove markets that have already ended (settled)
            .filter(m => {
                if (!m.endDate) return true; // Keep markets without end dates
                const endTime = new Date(m.endDate).getTime();
                return endTime > Date.now(); // Only keep markets that haven't ended
            })
            // Remove duplicates by event ID
            .filter(m => {
                const eventKey = m.eventId || m.id;
                if (seenEventIds.has(eventKey)) return false;
                seenEventIds.add(eventKey);
                return true;
            })
            // Remove similar questions (e.g., "Will Trump deport X" variants)
            .filter(m => {
                // Extract first 6 words as prefix
                const prefix = m.question.split(" ").slice(0, 6).join(" ").toLowerCase();
                if (seenQuestionPrefixes.has(prefix)) return false;
                seenQuestionPrefixes.add(prefix);
                return true;
            })
            // Filter out entertainment/movies/sports (not relevant to finance/politics)
            .filter(m => {
                const q = m.question.toLowerCase();
                // Skip entertainment and sports markets
                if (/movie|film|grossing|box office|oscar|grammy|emmy|nfl|nba|mlb|nhl|ufc|super bowl|world cup|celebrity|youtube|twitter|tiktok|follower|subscriber|streamer/.test(q)) {
                    return false;
                }
                return true;
            })
            // Sort by volume
            .sort((a, b) => b.volume24hr - a.volume24hr)
            // Limit to top 25 unique markets
            .slice(0, 25);


        // Update cache
        cachedMarkets = markets;
        cacheTimestamp = now;

        return NextResponse.json({
            markets,
            cached: false,
            fetchedAt: new Date(now).toISOString(),
            totalFetched: allRawMarkets.length,
            deduplicated: markets.length,
        });
    } catch (error) {
        console.error("Failed to fetch Polymarket data:", error);

        // Return cached data if available, even if stale
        if (cachedMarkets) {
            return NextResponse.json({
                markets: cachedMarkets,
                cached: true,
                stale: true,
                error: "Using stale cache due to API error",
                fetchedAt: new Date(cacheTimestamp).toISOString(),
            });
        }

        return NextResponse.json(
            { error: "Failed to fetch markets", markets: [] },
            { status: 500 }
        );
    }
}
