/**
 * RSS Headlines API Route
 * 
 * Fetches headlines from RSS feeds and maps to our format.
 * Uses Google News RSS for reliable, free access.
 */

import { NextResponse } from "next/server";

// ============ Types ============

interface RSSItem {
    title: string;
    link: string;
    pubDate: string;
    source?: string;
}

export interface HeadlineData {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    source: string;
    topic: "US_POLITICS" | "CRYPTO" | "GLOBAL_POLICY_ENERGY" | "GLOBAL_POLICY_TRADE";
}

// ============ RSS Feeds ============

const RSS_FEEDS = [
    {
        url: "https://news.google.com/rss/search?q=cryptocurrency+bitcoin+ethereum&hl=en-US&gl=US&ceid=US:en",
        defaultTopic: "CRYPTO" as const,
        source: "Google News",
    },
    {
        url: "https://news.google.com/rss/search?q=federal+reserve+interest+rates&hl=en-US&gl=US&ceid=US:en",
        defaultTopic: "US_POLITICS" as const,
        source: "Google News",
    },
    {
        url: "https://news.google.com/rss/search?q=trade+tariffs+china&hl=en-US&gl=US&ceid=US:en",
        defaultTopic: "GLOBAL_POLICY_TRADE" as const,
        source: "Google News",
    },
    {
        url: "https://news.google.com/rss/search?q=energy+nuclear+oil+gas&hl=en-US&gl=US&ceid=US:en",
        defaultTopic: "GLOBAL_POLICY_ENERGY" as const,
        source: "Google News",
    },
];

// ============ Cache ============

let cachedHeadlines: HeadlineData[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============ Topic Detection ============

function detectTopic(title: string): HeadlineData["topic"] {
    const lowerTitle = title.toLowerCase();

    // Crypto keywords
    if (/bitcoin|btc|ethereum|eth|crypto|blockchain|defi|nft|solana|coinbase/.test(lowerTitle)) {
        return "CRYPTO";
    }

    // Energy keywords
    if (/energy|nuclear|oil|gas|renewable|solar|wind|power grid|electricity|smr|uranium/.test(lowerTitle)) {
        return "GLOBAL_POLICY_ENERGY";
    }

    // Trade keywords
    if (/tariff|trade war|import|export|china trade|wto|usmca|sanctions|customs/.test(lowerTitle)) {
        return "GLOBAL_POLICY_TRADE";
    }

    // US Politics keywords
    if (/fed|federal reserve|congress|senate|white house|trump|biden|election|rate cut|inflation|gdp/.test(lowerTitle)) {
        return "US_POLITICS";
    }

    // Default
    return "US_POLITICS";
}

// ============ RSS Parser ============

function parseRSSXML(xml: string): RSSItem[] {
    const items: RSSItem[] = [];

    // Simple regex-based XML parsing (works for RSS)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    const sourceRegex = /<source[^>]*>(.*?)<\/source>/;

    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];

        const titleMatch = itemXml.match(titleRegex);
        const linkMatch = itemXml.match(linkRegex);
        const pubDateMatch = itemXml.match(pubDateRegex);
        const sourceMatch = itemXml.match(sourceRegex);

        if (titleMatch && linkMatch) {
            items.push({
                title: titleMatch[1] || titleMatch[2] || "",
                link: linkMatch[1] || "",
                pubDate: pubDateMatch?.[1] || new Date().toISOString(),
                source: sourceMatch?.[1] || undefined,
            });
        }
    }

    return items;
}

// ============ API Handler ============

export async function GET() {
    const now = Date.now();

    // Return cached data if still valid
    if (cachedHeadlines && now - cacheTimestamp < CACHE_TTL) {
        return NextResponse.json({
            headlines: cachedHeadlines,
            cached: true,
            fetchedAt: new Date(cacheTimestamp).toISOString(),
        });
    }

    try {
        const allHeadlines: HeadlineData[] = [];

        // Fetch from all RSS feeds
        await Promise.all(
            RSS_FEEDS.map(async (feed) => {
                try {
                    const response = await fetch(feed.url, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (compatible; MorningDesk/1.0)",
                        },
                        next: { revalidate: 300 },
                    });

                    if (!response.ok) {
                        console.warn(`RSS feed ${feed.url} returned ${response.status}`);
                        return;
                    }

                    const xml = await response.text();
                    const items = parseRSSXML(xml);

                    // Convert to HeadlineData
                    items.slice(0, 5).forEach((item, index) => {
                        allHeadlines.push({
                            id: `headline-${feed.defaultTopic}-${index}-${Date.now()}`,
                            title: item.title,
                            link: item.link,
                            pubDate: item.pubDate,
                            source: item.source || feed.source,
                            topic: detectTopic(item.title) || feed.defaultTopic,
                        });
                    });
                } catch (err) {
                    console.warn(`Failed to fetch RSS feed ${feed.url}:`, err);
                }
            })
        );

        // Dedupe by title (rough match)
        const seen = new Set<string>();
        const dedupedHeadlines = allHeadlines.filter((h) => {
            const key = h.title.toLowerCase().slice(0, 50);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Sort by pubDate (newest first)
        dedupedHeadlines.sort((a, b) => {
            return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
        });

        // Update cache
        cachedHeadlines = dedupedHeadlines;
        cacheTimestamp = now;

        return NextResponse.json({
            headlines: dedupedHeadlines,
            cached: false,
            fetchedAt: new Date(now).toISOString(),
        });
    } catch (error) {
        console.error("Failed to fetch headlines:", error);

        // Return cached data if available
        if (cachedHeadlines) {
            return NextResponse.json({
                headlines: cachedHeadlines,
                cached: true,
                stale: true,
                error: "Using stale cache due to fetch error",
                fetchedAt: new Date(cacheTimestamp).toISOString(),
            });
        }

        return NextResponse.json(
            { error: "Failed to fetch headlines", headlines: [] },
            { status: 500 }
        );
    }
}
