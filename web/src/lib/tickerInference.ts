/**
 * Ticker Inference Engine
 * 
 * Maps keywords in headlines/questions to relevant financial tickers.
 * Returns ONLY tickers that are directly relevant to the specific content.
 * Avoids mixing unrelated categories.
 */

// ============ Types ============

export interface TickerResult {
    symbol: string;
    type: "crypto" | "stock" | "etf";
    reason: string;
}

export interface TickerInferenceResult {
    tickers: TickerResult[];
    reasons: string[];
}

// ============ Category Detection ============
// First determine the PRIMARY category, then only return tickers for that category

type Category =
    | "bitcoin"
    | "ethereum"
    | "crypto_general"
    | "fed_rates"
    | "treasury_bonds"
    | "recession"
    | "inflation"
    | "nuclear"
    | "oil_energy"
    | "renewables"
    | "tariffs"
    | "china"
    | "semiconductors"
    | "defense"
    | "tesla"
    | "immigration"
    | "doge_spending"
    | "general";

function detectCategory(text: string): Category {
    const t = text.toLowerCase();

    // Order matters - more specific patterns first

    // Crypto
    if (/bitcoin|btc|\$btc/i.test(text)) return "bitcoin";
    if (/ethereum|eth|\$eth/i.test(text)) return "ethereum";
    if (/crypto|blockchain|defi|nft|web3|coinbase/i.test(text)) return "crypto_general";

    // Fed & Rates - must NOT be about Tesla/Musk for other reasons
    if (/\bfed\b|fomc|interest rate|rate cut|rate hike|monetary policy|federal reserve/i.test(text)) return "fed_rates";
    if (/treasury|bond|yield curve/i.test(text)) return "treasury_bonds";

    // Economy
    if (/recession|gdp|economic growth|soft landing|hard landing/i.test(text)) return "recession";
    if (/inflation|cpi|pce|consumer prices/i.test(text)) return "inflation";

    // Energy
    if (/nuclear|uranium|smr|small modular reactor/i.test(text)) return "nuclear";
    if (/\boil\b|\bgas\b|petroleum|opec|crude|energy sector/i.test(text)) return "oil_energy";
    if (/renewable|solar|wind|clean energy/i.test(text)) return "renewables";

    // Trade
    if (/tariff|trade war|import duty|export/i.test(text)) return "tariffs";
    if (/china|chinese|beijing/i.test(text)) return "china";
    if (/semiconductor|chip|nvidia|amd|intel|tsmc/i.test(text)) return "semiconductors";

    // Defense
    if (/defense|military|pentagon|war|ukraine|russia/i.test(text)) return "defense";

    // Tesla - ONLY if explicitly about Tesla/EV
    if (/tesla|rivian|lucid|electric vehicle|\bev\b|evs\b/i.test(text)) return "tesla";

    // Politics-specific
    if (/deport|ice|immigration|border|migrant/i.test(text)) return "immigration";
    if (/doge|deficit|budget cut|spending cut|government efficiency/i.test(text)) return "doge_spending";

    return "general";
}

// ============ Category-Specific Tickers ============

const CATEGORY_TICKERS: Record<Category, TickerResult[]> = {
    bitcoin: [
        { symbol: "BTC", type: "crypto", reason: "Bitcoin direct exposure" },
        { symbol: "IBIT", type: "etf", reason: "BlackRock Bitcoin ETF" },
        { symbol: "MSTR", type: "stock", reason: "MicroStrategy BTC treasury" },
    ],
    ethereum: [
        { symbol: "ETH", type: "crypto", reason: "Ethereum direct exposure" },
        { symbol: "ETHE", type: "etf", reason: "Grayscale Ethereum Trust" },
    ],
    crypto_general: [
        { symbol: "COIN", type: "stock", reason: "Coinbase crypto exchange" },
        { symbol: "BITO", type: "etf", reason: "ProShares Bitcoin Strategy ETF" },
    ],
    fed_rates: [
        { symbol: "TLT", type: "etf", reason: "Long-term Treasuries (rate-sensitive)" },
        { symbol: "SGOV", type: "etf", reason: "Short-term Treasury ETF" },
        { symbol: "XLF", type: "etf", reason: "Financials sector (bank margins)" },
    ],
    treasury_bonds: [
        { symbol: "TLT", type: "etf", reason: "20+ Year Treasury Bond ETF" },
        { symbol: "IEF", type: "etf", reason: "7-10 Year Treasury ETF" },
        { symbol: "SGOV", type: "etf", reason: "0-3 Month Treasury ETF" },
    ],
    recession: [
        { symbol: "SPY", type: "etf", reason: "S&P 500 broad market" },
        { symbol: "GLD", type: "etf", reason: "Gold recession hedge" },
        { symbol: "TLT", type: "etf", reason: "Treasuries flight to safety" },
    ],
    inflation: [
        { symbol: "TIP", type: "etf", reason: "TIPS inflation-protected bonds" },
        { symbol: "GLD", type: "etf", reason: "Gold inflation hedge" },
        { symbol: "SCHD", type: "etf", reason: "Dividend stocks real returns" },
    ],
    nuclear: [
        { symbol: "URA", type: "etf", reason: "Global Uranium & Nuclear ETF" },
        { symbol: "CCJ", type: "stock", reason: "Cameco uranium producer" },
        { symbol: "NLR", type: "etf", reason: "VanEck Uranium & Nuclear ETF" },
    ],
    oil_energy: [
        { symbol: "XLE", type: "etf", reason: "Energy Select Sector ETF" },
        { symbol: "USO", type: "etf", reason: "US Oil Fund" },
        { symbol: "XOM", type: "stock", reason: "ExxonMobil integrated oil" },
    ],
    renewables: [
        { symbol: "ICLN", type: "etf", reason: "iShares Global Clean Energy" },
        { symbol: "TAN", type: "etf", reason: "Invesco Solar ETF" },
    ],
    tariffs: [
        { symbol: "XLI", type: "etf", reason: "Industrials (trade-sensitive)" },
        { symbol: "EEM", type: "etf", reason: "Emerging Markets exposure" },
    ],
    china: [
        { symbol: "FXI", type: "etf", reason: "iShares China Large-Cap ETF" },
        { symbol: "KWEB", type: "etf", reason: "China Internet ETF" },
        { symbol: "BABA", type: "stock", reason: "Alibaba China exposure" },
    ],
    semiconductors: [
        { symbol: "SMH", type: "etf", reason: "VanEck Semiconductor ETF" },
        { symbol: "NVDA", type: "stock", reason: "NVIDIA AI/GPU chips" },
        { symbol: "TSM", type: "stock", reason: "TSMC manufacturing" },
    ],
    defense: [
        { symbol: "ITA", type: "etf", reason: "US Aerospace & Defense ETF" },
        { symbol: "LMT", type: "stock", reason: "Lockheed Martin defense" },
        { symbol: "RTX", type: "stock", reason: "RTX aerospace/defense" },
    ],
    tesla: [
        { symbol: "TSLA", type: "stock", reason: "Tesla EV manufacturer" },
        { symbol: "RIVN", type: "stock", reason: "Rivian EV competitor" },
        { symbol: "LI", type: "stock", reason: "Li Auto EV China" },
    ],
    immigration: [
        { symbol: "GEO", type: "stock", reason: "GEO Group detention facilities" },
        { symbol: "CXW", type: "stock", reason: "CoreCivic private prisons" },
    ],
    doge_spending: [
        { symbol: "SPY", type: "etf", reason: "S&P 500 policy uncertainty" },
        { symbol: "XLV", type: "etf", reason: "Healthcare (budget-sensitive)" },
    ],
    general: [
        { symbol: "SPY", type: "etf", reason: "S&P 500 broad market proxy" },
    ],
};

// ============ Inference Logic ============

/**
 * Infer related tickers from text content.
 * Uses category detection for accurate, non-overlapping results.
 */
export function inferTickers(text: string): TickerInferenceResult {
    const category = detectCategory(text);
    const tickers = CATEGORY_TICKERS[category] || CATEGORY_TICKERS.general;

    // Build reasons list
    const reasons = tickers.map(t => `${t.symbol}: ${t.reason}`);

    return {
        tickers: tickers.slice(0, 4), // Limit to 4 most relevant
        reasons: reasons.slice(0, 4),
    };
}

/**
 * Get just the ticker symbols (for simpler use cases).
 */
export function inferTickerSymbols(text: string): string[] {
    return inferTickers(text).tickers.map((t) => t.symbol);
}

/**
 * Get ticker URL based on type.
 */
export function getTickerUrl(symbol: string, type: "crypto" | "stock" | "etf"): string {
    if (type === "crypto") {
        const coinMap: Record<string, string> = {
            BTC: "bitcoin",
            ETH: "ethereum",
            SOL: "solana",
            USDT: "tether",
            USDC: "usd-coin",
            DOGE: "dogecoin",
            XRP: "ripple",
            ADA: "cardano",
        };
        const coinId = coinMap[symbol] || symbol.toLowerCase();
        return `https://www.coingecko.com/en/coins/${coinId}`;
    }

    // Yahoo Finance for stocks and ETFs
    return `https://finance.yahoo.com/quote/${symbol}`;
}
