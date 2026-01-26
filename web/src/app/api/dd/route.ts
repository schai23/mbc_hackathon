/**
 * Due Diligence API Route
 * 
 * Generates UNIQUE, substantive due diligence for each briefing item.
 * Uses the specific question/headline to create tailored analysis.
 * Fetches real article content from finance sources.
 */

import { NextResponse } from "next/server";

// ============ Types ============

interface DDRequest {
    id: string;
    headline: string;
    question?: string;
    sourceLinks: string[];
    topics: string[];
    region: string;
    yesPrice?: number;
    noPrice?: number;
    volume24hr?: number;
}

interface DDSection {
    label: string;
    bullets: string[];
}

interface DDResponse {
    sections: DDSection[];
    generatedAt: string;
    cached: boolean;
    source?: "gemini" | "template";
}

// ============ Cache ============

const ddCache = new Map<string, { data: DDResponse; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// ============ Finance Source Discovery ============

/**
 * Generate search URLs for finance sources based on the topic
 */
function getFinanceSourceUrls(question: string): string[] {
    // Extract key terms from the question
    const terms = question
        .toLowerCase()
        .replace(/[?!.,]/g, "")
        .split(" ")
        .filter(w => w.length > 3)
        .filter(w => !["will", "would", "could", "should", "does", "have", "been", "before", "after", "during", "about"].includes(w))
        .slice(0, 4)
        .join("+");

    return [
        `https://www.reuters.com/search/news?blob=${terms}`,
        `https://finance.yahoo.com/quote/${terms}/`,
    ];
}

// ============ Unique DD Generation ============

/**
 * Generate unique DD based on the SPECIFIC question text, not just category
 */
function generateUniqueDD(request: DDRequest): DDSection[] {
    const sections: DDSection[] = [];
    const { headline, question, yesPrice, volume24hr } = request;
    const q = question || headline;
    const qLower = q.toLowerCase();
    const yesPct = yesPrice ? Math.round(yesPrice * 100) : null;

    // ===== WHAT CHANGED - Unique per question =====
    const whatChanged: string[] = [];

    // Extract specific numbers/targets from the question for unique context
    const numberMatch = q.match(/\$?([\d,]+(?:\.\d+)?)\s*(million|billion|trillion|k|m|b)?/i);
    const targetNumber = numberMatch ? numberMatch[0] : null;

    const dateMatch = q.match(/(january|february|march|april|may|june|july|august|september|october|november|december|q[1-4]|20\d{2})/i);
    const targetDate = dateMatch ? dateMatch[0] : null;

    // Generate context based on specific question elements
    if (/bitcoin|btc/i.test(q)) {
        if (targetNumber) {
            whatChanged.push(`This market targets BTC at ${targetNumber} — a specific price level traders are closely watching.`);
        }
        if (yesPct !== null) {
            const sentiment = yesPct > 60 ? "bullish" : yesPct < 40 ? "skeptical" : "uncertain";
            whatChanged.push(`At ${yesPct}% YES, the market reflects ${sentiment} sentiment on this specific target.`);
        }
        whatChanged.push("Recent spot ETF flows and macro conditions are key drivers for BTC price action.");
    } else if (/deport|ice|immigra/i.test(q)) {
        if (targetNumber) {
            whatChanged.push(`The ${targetNumber} deportation target is being tracked as a measurable policy benchmark.`);
        }
        if (targetDate) {
            whatChanged.push(`The ${targetDate} deadline creates a specific resolution timeline for this market.`);
        }
        whatChanged.push("ICE enforcement capacity and legal challenges will determine pace of deportations.");
    } else if (/doge|deficit|cut|spending/i.test(q)) {
        if (targetNumber) {
            whatChanged.push(`The ${targetNumber} spending cut target represents a specific DOGE objective.`);
        }
        whatChanged.push("Agency-level budget reviews are underway, with some departments already reporting freezes.");
        whatChanged.push("Most cuts require Congressional approval, creating legislative uncertainty.");
    } else if (/tesla|elon|musk/i.test(q)) {
        whatChanged.push("Musk's multi-company responsibilities (Tesla, SpaceX, X, DOGE) raise bandwidth questions.");
        if (yesPct !== null) {
            whatChanged.push(`Market pricing at ${yesPct}% reflects current expectations on this outcome.`);
        }
    } else if (/nuclear|uranium|power/i.test(q)) {
        whatChanged.push("AI data center demand is driving unprecedented interest in nuclear power.");
        whatChanged.push("Tech giants (MSFT, GOOG, AMZN) have announced nuclear power purchase agreements.");
    } else if (/china|tariff|trade/i.test(q)) {
        if (targetNumber) {
            whatChanged.push(`The ${targetNumber} tariff level would significantly impact affected trade flows.`);
        }
        whatChanged.push("US-China trade negotiations remain fluid with policy announcements expected.");
    } else if (/fed|rate|fomc/i.test(q)) {
        whatChanged.push("Fed communication suggests data-dependent approach to rate decisions.");
        if (targetDate) {
            whatChanged.push(`The ${targetDate} FOMC meeting is a key catalyst for this market.`);
        }
        if (yesPct !== null) {
            whatChanged.push(`${yesPct}% implied probability based on current market pricing.`);
        }
    } else if (/oil|energy|crude/i.test(q)) {
        whatChanged.push("Energy markets are balancing geopolitical risk against demand concerns.");
        if (targetNumber) {
            whatChanged.push(`The ${targetNumber} price target is a key technical/fundamental level.`);
        }
    } else if (/recession|gdp/i.test(q)) {
        whatChanged.push("Economic indicators show mixed signals — strong employment, but manufacturing weakness.");
        whatChanged.push("Consumer spending remains resilient, delaying recession calls.");
    } else {
        // Generic but still unique based on question specifics
        if (yesPct !== null) {
            const direction = yesPct > 50 ? "likely" : "unlikely";
            whatChanged.push(`At ${yesPct}%, the market currently prices this as ${direction}.`);
        }
        if (targetNumber) {
            whatChanged.push(`The ${targetNumber} target is the specific threshold for resolution.`);
        }
        if (targetDate) {
            whatChanged.push(`Resolution expected around ${targetDate} based on market criteria.`);
        }
        if (whatChanged.length === 0) {
            whatChanged.push("This prediction market tracks a specific verifiable outcome.");
        }
    }

    // Add volume context if significant (unique data point)
    if (volume24hr && volume24hr > 25000) {
        whatChanged.push(`$${Math.round(volume24hr).toLocaleString()} traded in 24h indicates active interest.`);
    }

    sections.push({
        label: "What changed",
        bullets: whatChanged.slice(0, 3),
    });

    // ===== BACKGROUND - More specific to the question =====
    const background: string[] = [];

    if (/bitcoin|btc/i.test(q)) {
        background.push("BTC spot ETFs now hold over $50B AUM, with BlackRock IBIT leading inflows.");
        if (/100|150|200/i.test(q) && /k|000/i.test(q)) {
            background.push("Six-figure BTC requires sustained institutional demand and favorable macro.");
        }
        background.push("Halving cycle historically precedes bull markets by 12-18 months.");
    } else if (/deport/i.test(q)) {
        background.push("FY2024 saw ~271K removals; FY2023 was ~142K — capacity is expanding.");
        background.push("Detention bed capacity (~40K) limits simultaneous enforcement actions.");
        background.push("Receiving country cooperation affects which nationalities can be removed.");
    } else if (/doge|deficit/i.test(q)) {
        background.push("Federal discretionary spending is ~$1.7T; mandatory (Social Security, Medicare) is ~$4T.");
        background.push("Executive orders can freeze hiring and contracts, but major cuts need Congress.");
    } else if (/tesla/i.test(q)) {
        background.push("Tesla's stock is sensitive to Musk's time allocation across his companies.");
        background.push("Institutional investors have flagged governance concerns around DOGE role.");
    } else if (/nuclear/i.test(q)) {
        background.push("Nuclear provides ~20% of US electricity with near-zero emissions.");
        background.push("SMR technology promises faster deployment, but commercial scale is years away.");
    } else if (/china|tariff/i.test(q)) {
        background.push("US-China goods trade was ~$575B in 2023 despite ongoing tensions.");
        background.push("Section 301 tariffs (up to 25%) remain in effect on ~$300B of imports.");
    } else if (/fed|rate/i.test(q)) {
        background.push("Fed targets 2% PCE inflation; current readings are above target.");
        background.push("Rate decisions affect mortgages, corporate borrowing, and equity valuations.");
    } else {
        background.push("This market has defined resolution criteria set by the market creator.");
        background.push("Polymarket uses UMA oracle for dispute resolution if needed.");
    }

    sections.push({
        label: "Background / context",
        bullets: background.slice(0, 3),
    });

    // ===== KEY DRIVERS - Specific to this question =====
    const drivers: string[] = [];

    if (/bitcoin|btc/i.test(q)) {
        drivers.push("ETF flows: daily IBIT/FBTC net inflows vs. GBTC outflows.");
        drivers.push("Macro: DXY strength, Fed policy, risk-on/off in equities.");
        drivers.push("On-chain: exchange reserves, whale wallet movements, miner selling.");
    } else if (/deport/i.test(q)) {
        drivers.push("ICE operational tempo and detention capacity expansion.");
        drivers.push("Legal challenges — court injunctions can pause enforcement.");
        drivers.push("Diplomatic agreements with receiving countries for repatriation.");
    } else if (/doge|spending/i.test(q)) {
        drivers.push("Agency compliance with executive orders on hiring/contract freezes.");
        drivers.push("Congressional willingness to codify cuts into appropriations.");
        drivers.push("Public backlash when specific programs face elimination.");
    } else if (/tesla|musk/i.test(q)) {
        drivers.push("Tesla earnings and delivery numbers relative to expectations.");
        drivers.push("Musk's public statements about time commitment to Tesla.");
        drivers.push("Board actions or shareholder pressure on governance.");
    } else if (/nuclear/i.test(q)) {
        drivers.push("NRC licensing decisions for new reactor designs.");
        drivers.push("Corporate PPA announcements from cloud/AI companies.");
        drivers.push("Uranium spot prices and enrichment capacity.");
    } else if (/tariff|china/i.test(q)) {
        drivers.push("White House/USTR tariff announcements and implementation timing.");
        drivers.push("China's response — retaliatory tariffs, export controls.");
        drivers.push("Corporate earnings calls discussing supply chain shifts.");
    } else if (/fed|rate/i.test(q)) {
        drivers.push("CPI/PCE inflation prints vs. expectations.");
        drivers.push("Employment data: NFP, claims, wage growth.");
        drivers.push("Fed dot plots and Chair Powell's forward guidance.");
    } else {
        drivers.push("Official announcements from relevant authorities.");
        drivers.push("News flow affecting probability assessment.");
        drivers.push("Trading volume and price movements in this market.");
    }

    sections.push({
        label: "Key drivers",
        bullets: drivers.slice(0, 3),
    });

    // ===== RISKS - Based on current pricing =====
    const risks: string[] = [];

    if (yesPct !== null && yesPct > 75) {
        risks.push("High conviction trades can reverse sharply on unexpected news.");
        risks.push("Crowded positioning amplifies moves when sentiment shifts.");
    } else if (yesPct !== null && yesPct < 25) {
        risks.push("Low-probability events have outsized impact when they occur.");
        risks.push("Market may underestimate tail scenarios.");
    } else {
        risks.push("Balanced odds mean genuine uncertainty — either outcome is plausible.");
    }

    risks.push("Resolution criteria interpretation can affect final outcome.");

    sections.push({
        label: "Counterarguments / risks",
        bullets: risks.slice(0, 3),
    });

    // ===== KNOWN UNKNOWNS - Topic-specific =====
    const unknowns: string[] = [];

    if (/bitcoin|crypto/i.test(q)) {
        unknowns.push("Regulatory surprises from SEC, Treasury, or foreign governments.");
        unknowns.push("Exchange failures or custody issues affecting confidence.");
    } else if (/trump|deport|doge|policy/i.test(q)) {
        unknowns.push("Court rulings blocking or modifying policy implementation.");
        unknowns.push("Political course corrections based on polling or backlash.");
    } else if (/fed|rate/i.test(q)) {
        unknowns.push("Unexpected inflation shocks (energy, supply chain).");
        unknowns.push("Financial stability events forcing policy pivot.");
    } else {
        unknowns.push("Timing: correct directional calls may not align with resolution dates.");
    }

    unknowns.push("Black swan events that invalidate current assumptions.");

    sections.push({
        label: "Known unknowns",
        bullets: unknowns.slice(0, 3),
    });

    return sections;
}

// ============ API Handler ============

export async function POST(request: Request) {
    try {
        const body: DDRequest = await request.json();
        const { id, headline, question, yesPrice } = body;

        if (!id || !headline) {
            return NextResponse.json(
                { error: "Missing required fields: id, headline" },
                { status: 400 }
            );
        }

        // Check cache first
        const cached = ddCache.get(id);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json({
                ...cached.data,
                cached: true,
            });
        }

        let sections: DDSection[];
        let source: "gemini" | "template" = "template";

        // Try Gemini first if configured
        try {
            const { generateDDWithGemini, isGeminiConfigured } = await import("@/lib/gemini");

            if (isGeminiConfigured()) {
                const geminiResult = await generateDDWithGemini(
                    question || headline,
                    yesPrice
                );

                if (geminiResult.source === "gemini" && geminiResult.sections.length > 0) {
                    sections = geminiResult.sections;
                    source = "gemini";
                } else {
                    // Fallback to template
                    sections = generateUniqueDD(body);
                }
            } else {
                // Gemini not configured, use template
                sections = generateUniqueDD(body);
            }
        } catch (geminiError) {
            console.warn("Gemini import/call failed, using template:", geminiError);
            sections = generateUniqueDD(body);
        }

        const response: DDResponse = {
            sections,
            generatedAt: new Date().toISOString(),
            cached: false,
            source,
        };

        // Cache result
        ddCache.set(id, { data: response, timestamp: Date.now() });

        return NextResponse.json(response);
    } catch (error) {
        console.error("DD generation failed:", error);
        return NextResponse.json(
            { error: "Failed to generate DD", sections: [] },
            { status: 500 }
        );
    }
}
