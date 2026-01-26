/**
 * FeedCard Component
 * 
 * Displays a single briefing card with:
 * - Topic badges and region
 * - Headline
 * - Polymarket preview (probability badge + title + link)
 * - Due diligence bullet points
 * - Sources section (horizontal pills)
 * - Related tickers
 * - Action buttons with track/opinion state
 */

"use client";

import React, { useState } from "react";
import {
    BriefingItem,
    formatTopic,
    getTopicColor,
    getTickerUrl,
    getTickerType
} from "@/lib/api";
import { Opinion } from "@/app/page";

interface FeedCardProps {
    item: BriefingItem;
    isTracked: boolean;
    opinion: Opinion;
    onToggleTrack: (id: string) => void;
    onToggleAgree: (id: string) => void;
    onToggleDisagree: (id: string) => void;
    onIgnore: (id: string) => void;
}

/**
 * Extract domain from URL for display
 */
function getDomainFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

// ============ DD Types ============

interface DDSection {
    label: string;
    bullets: string[];
}

interface DDResponse {
    sections: DDSection[];
    cached: boolean;
}

// ============ Collapsible DD Section ============

function DDSectionCollapsible({
    label,
    bullets,
    defaultExpanded = false
}: {
    label: string;
    bullets: string[];
    defaultExpanded?: boolean;
}) {
    const [isOpen, setIsOpen] = React.useState(defaultExpanded);

    return (
        <div className="dd-section-collapsible">
            <button
                className="dd-section-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="dd-section-label">{label}</span>
                <span className="dd-section-arrow">{isOpen ? "▼" : "▶"}</span>
            </button>
            {isOpen && (
                <ul className="bullets-list dd-section-content">
                    {bullets.map((bullet, idx) => (
                        <li key={idx} className="bullet-item">
                            {bullet}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ============ Structured DD Component ============

function StructuredDD({ item }: { item: BriefingItem }) {
    const [ddData, setDdData] = React.useState<DDResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(false);
    const [hasFetched, setHasFetched] = React.useState(false);

    // Fetch DD on first render
    React.useEffect(() => {
        if (!hasFetched && !loading && !error) {
            setHasFetched(true);
            setLoading(true);
            fetch("/api/dd", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: item.id,
                    headline: item.headline,
                    question: item.primaryMarketTitle || item.headline,
                    sourceLinks: item.sourceLinks,
                    topics: item.topics,
                    region: item.region,
                    yesPrice: item.primaryMarketImpliedProb,
                    volume24hr: item.volume24hr,
                }),
            })
                .then((res) => res.json())
                .then((data) => {
                    setDdData(data);
                    setLoading(false);
                })
                .catch(() => {
                    setError(true);
                    setLoading(false);
                });
        }
    }, [hasFetched, loading, error, item]);

    if (loading) {
        return <p className="dd-loading">Loading analysis...</p>;
    }

    if (error || !ddData || !ddData.sections) {
        // Fallback to basic bullets
        return (
            <div className="dd-sections">
                <DDSectionCollapsible
                    label="Summary"
                    bullets={item.bullets}
                    defaultExpanded={true}
                />
            </div>
        );
    }

    return (
        <div className="dd-sections">
            {ddData.sections.map((section, idx) => (
                <DDSectionCollapsible
                    key={idx}
                    label={section.label}
                    bullets={section.bullets}
                    defaultExpanded={idx === 0} // First section expanded by default
                />
            ))}
        </div>
    );
}


export function FeedCard({
    item,
    isTracked,
    opinion,
    onToggleTrack,
    onToggleAgree,
    onToggleDisagree,
    onIgnore,
}: FeedCardProps) {

    // Get color from first topic
    const primaryTopic = item.topics[0];
    const topicColor = getTopicColor(primaryTopic);

    // Check if we have primary market data
    const hasPrimaryMarket = item.primaryMarketTitle || item.primaryMarketImpliedProb !== undefined;

    // Check if we have Polymarket links
    const hasPolymarket = item.polymarketUrls && item.polymarketUrls.length > 0;

    // Check if we have source links
    const hasSources = item.sourceLinks && item.sourceLinks.length > 0;

    return (
        <article
            className={`feed-card ${isTracked ? "is-tracked" : ""}`}
            style={{ "--topic-color": topicColor } as React.CSSProperties}
        >
            {/* Header with topic badges */}
            <header className="card-header">
                <div className="topic-badges">
                    {item.topics.map(topic => (
                        <span
                            key={topic}
                            className="topic-badge"
                            style={{
                                backgroundColor: `${getTopicColor(topic)}20`,
                                color: getTopicColor(topic)
                            }}
                        >
                            {formatTopic(topic)}
                        </span>
                    ))}
                </div>
                <div className="header-right">
                    {isTracked && <span className="tracked-indicator">📌</span>}
                    <span className="region-badge">{item.region}</span>
                </div>
            </header>

            {/* Headline */}
            <h2 className="card-headline">{item.headline}</h2>

            {/* Polymarket Preview Section - Redesigned */}
            {(hasPrimaryMarket || hasPolymarket) && (
                <div className="market-preview">
                    {/* Probability Badge */}
                    {item.primaryMarketImpliedProb !== undefined && (
                        <div className="market-prob-badge">
                            <span className="prob-value">
                                {Math.round(item.primaryMarketImpliedProb * 100)}%
                            </span>
                            <span className="prob-label">YES</span>
                        </div>
                    )}

                    {/* Market Info */}
                    <div className="market-info">
                        {item.primaryMarketTitle && (
                            <p className="market-title">{item.primaryMarketTitle}</p>
                        )}
                        {item.primaryMarketNote && (
                            <p className="market-note">{item.primaryMarketNote}</p>
                        )}
                    </div>

                    {/* Polymarket Link - with fallback to search */}
                    {hasPolymarket ? (
                        <a
                            href={item.polymarketUrls[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="market-link"
                        >
                            View on Polymarket →
                        </a>
                    ) : (
                        <a
                            href={`https://polymarket.com/markets?_q=${encodeURIComponent(item.headline.slice(0, 50))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="market-link market-link-search"
                        >
                            Search Polymarket
                        </a>
                    )}
                </div>
            )}

            {/* Structured Due Diligence */}
            <StructuredDD item={item} />

            {/* Sources Section - Horizontal Pills */}
            {hasSources && (
                <div className="sources-section">
                    <span className="sources-label">Sources</span>
                    <div className="sources-pills">
                        {item.sourceLinks.map((link, index) => (
                            <a
                                key={index}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="source-pill"
                            >
                                {getDomainFromUrl(link)}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Related Tickers / Investment Ideas */}
            {item.relatedTickers && item.relatedTickers.length > 0 && (
                <div className="tickers-container">
                    <span className="tickers-label">Related:</span>
                    <div className="tickers-list">
                        {item.relatedTickers.map((ticker, idx) => {
                            // Handle both string and TickerResult formats
                            const symbol = typeof ticker === "string" ? ticker : ticker.symbol;
                            const type = typeof ticker === "string" ? getTickerType(ticker) : ticker.type;
                            const title = typeof ticker === "string" ? ticker : `${ticker.symbol}: ${ticker.reason}`;
                            const url = typeof ticker === "string"
                                ? getTickerUrl(ticker)
                                : (type === "crypto"
                                    ? `https://www.coingecko.com/en/coins/${symbol.toLowerCase()}`
                                    : `https://finance.yahoo.com/quote/${symbol}`);

                            return (
                                <a
                                    key={`${symbol}-${idx}`}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`ticker-badge ticker-${type}`}
                                    title={title}
                                >
                                    {symbol}
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="actions-container">
                <button
                    className={`action-btn action-track ${isTracked ? "selected" : ""}`}
                    onClick={() => onToggleTrack(item.id)}
                    title={isTracked ? "Remove from portfolio" : "Add to portfolio"}
                >
                    {isTracked ? "✓ Tracked" : "Track"}
                </button>
                <button
                    className={`action-btn action-agree ${opinion === "agree" ? "selected" : ""}`}
                    onClick={() => onToggleAgree(item.id)}
                    title={opinion === "agree" ? "Remove agreement" : "I agree with market direction"}
                >
                    {opinion === "agree" ? "✓ Agreed" : "Agree"}
                </button>
                <button
                    className={`action-btn action-disagree ${opinion === "disagree" ? "selected" : ""}`}
                    onClick={() => onToggleDisagree(item.id)}
                    title={opinion === "disagree" ? "Remove disagreement" : "I disagree with market direction"}
                >
                    {opinion === "disagree" ? "✗ Disagreed" : "Disagree"}
                </button>
                <button
                    className="action-btn action-ignore"
                    onClick={() => onIgnore(item.id)}
                    title="Dismiss this item"
                >
                    Ignore
                </button>
            </div>

            {/* Timestamp */}
            <footer className="card-footer">
                <time className="generated-at">
                    {new Date(item.createdAt).toLocaleString()}
                </time>
            </footer>
        </article>
    );
}

export default FeedCard;

