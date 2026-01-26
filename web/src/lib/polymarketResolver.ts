/**
 * Polymarket Link Resolver
 * 
 * Resolves Polymarket URLs with fallback chain:
 * 1. Try event URL: https://polymarket.com/event/{slug}
 * 2. Fallback to market URL: https://polymarket.com/market/{slug}
 * 3. Final fallback: Search URL with query
 * 
 * Includes 24-hour caching to avoid repeated checks.
 */

// ============ Types ============

export interface ResolvedUrl {
    url: string;
    type: "direct" | "search";
    checkedAt: string;
    slug: string;
}

// ============ Cache ============

// In-memory cache: slug -> ResolvedUrl
const urlCache = new Map<string, ResolvedUrl>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ============ URL Patterns ============

function buildEventUrl(slug: string): string {
    return `https://polymarket.com/event/${slug}`;
}

function buildMarketUrl(slug: string): string {
    return `https://polymarket.com/market/${slug}`;
}

function buildSearchUrl(question: string): string {
    return `https://polymarket.com/search?q=${encodeURIComponent(question)}`;
}

// ============ URL Validation ============

/**
 * Check if a Polymarket URL is valid by making a HEAD request.
 * Returns true if the URL returns 200 and doesn't redirect to error.
 */
async function isUrlValid(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
        });

        clearTimeout(timeoutId);

        // Check for successful response
        if (!response.ok) {
            return false;
        }

        // Check if we got redirected to an error page
        const finalUrl = response.url;
        if (finalUrl.includes("/404") || finalUrl.includes("/error")) {
            return false;
        }

        return true;
    } catch {
        // Network error, timeout, etc.
        return false;
    }
}

// ============ Resolver ============

/**
 * Resolve a Polymarket URL for a given slug and question.
 * Uses caching to avoid repeated validation requests.
 */
export async function resolvePolymarketUrl(
    slug: string,
    question: string
): Promise<ResolvedUrl> {
    // Check cache first
    const cached = urlCache.get(slug);
    if (cached) {
        const age = Date.now() - new Date(cached.checkedAt).getTime();
        if (age < CACHE_TTL) {
            return cached;
        }
    }

    const now = new Date().toISOString();

    // Try event URL first (most common format)
    const eventUrl = buildEventUrl(slug);
    const eventValid = await isUrlValid(eventUrl);

    if (eventValid) {
        const result: ResolvedUrl = {
            url: eventUrl,
            type: "direct",
            checkedAt: now,
            slug,
        };
        urlCache.set(slug, result);
        return result;
    }

    // Try market URL as fallback
    const marketUrl = buildMarketUrl(slug);
    const marketValid = await isUrlValid(marketUrl);

    if (marketValid) {
        const result: ResolvedUrl = {
            url: marketUrl,
            type: "direct",
            checkedAt: now,
            slug,
        };
        urlCache.set(slug, result);
        return result;
    }

    // Final fallback: search URL (always works)
    const searchUrl = buildSearchUrl(question);
    const result: ResolvedUrl = {
        url: searchUrl,
        type: "search",
        checkedAt: now,
        slug,
    };
    urlCache.set(slug, result);
    return result;
}

/**
 * Resolve multiple Polymarket URLs in parallel.
 * More efficient for batch processing.
 */
export async function resolvePolymarketUrls(
    markets: Array<{ slug: string; question: string }>
): Promise<Map<string, ResolvedUrl>> {
    const results = new Map<string, ResolvedUrl>();

    // Process in batches to avoid overwhelming Polymarket
    const batchSize = 5;
    for (let i = 0; i < markets.length; i += batchSize) {
        const batch = markets.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map((m) => resolvePolymarketUrl(m.slug, m.question))
        );
        batchResults.forEach((result, idx) => {
            results.set(batch[idx].slug, result);
        });
    }

    return results;
}

/**
 * Get cached result without making a request.
 * Returns null if not cached or expired.
 */
export function getCachedUrl(slug: string): ResolvedUrl | null {
    const cached = urlCache.get(slug);
    if (!cached) return null;

    const age = Date.now() - new Date(cached.checkedAt).getTime();
    if (age >= CACHE_TTL) {
        urlCache.delete(slug);
        return null;
    }

    return cached;
}

/**
 * Build a direct URL without validation (for cases where we trust the slug).
 * Falls back to event format.
 */
export function buildDirectUrl(slug: string): string {
    return buildEventUrl(slug);
}

/**
 * Build a search URL for a question.
 */
export function buildFallbackSearchUrl(question: string): string {
    return buildSearchUrl(question);
}
