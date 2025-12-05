/**
 * FeedCard Component
 * 
 * Displays a single briefing card with:
 * - Topic badges and region
 * - Headline
 * - Polymarket preview (if available)
 * - Due diligence bullet points
 * - Sources section
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

export function FeedCard({
    item,
    isTracked,
    opinion,
    onToggleTrack,
    onToggleAgree,
    onToggleDisagree,
    onIgnore,
}: FeedCardProps) {
    const [expanded, setExpanded] = useState(true);

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

            {/* Polymarket Preview Section */}
            {(hasPrimaryMarket || hasPolymarket) && (
                <a
                    href={hasPolymarket ? item.polymarketUrls[0] : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`polymarket-link ${!hasPolymarket ? "no-link" : ""}`}
                >
                    <div className="polymarket-content">
                        <span className="polymarket-label">
                            {hasPolymarket ? "View on Polymarket" : "Market View"}
                        </span>
                        {item.primaryMarketTitle && (
                            <span className="polymarket-subtitle">{item.primaryMarketTitle}</span>
                        )}
                        {item.primaryMarketImpliedProb !== undefined && (
                            <span className="polymarket-prob">
                                Implied probability: {Math.round(item.primaryMarketImpliedProb * 100)}%
                            </span>
                        )}
                    </div>
                    {hasPolymarket && <span className="polymarket-arrow">→</span>}
                </a>
            )}

            {/* Due Diligence Bullets */}
            <div className={`bullets-container ${expanded ? "expanded" : ""}`}>
                <button
                    className="bullets-toggle"
                    onClick={() => setExpanded(!expanded)}
                >
                    Due Diligence {expanded ? "▼" : "▶"}
                </button>
                {expanded && (
                    <ul className="bullets-list">
                        {item.bullets.map((bullet, index) => (
                            <li key={index} className="bullet-item">
                                {bullet}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Sources Section */}
            {hasSources && (
                <div className="sources-container">
                    <span className="sources-label">Sources</span>
                    <ul className="sources-list">
                        {item.sourceLinks.map((link, index) => (
                            <li key={index}>
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="source-link"
                                >
                                    {getDomainFromUrl(link)}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Related Tickers / Investment Ideas */}
            {item.relatedTickers && item.relatedTickers.length > 0 && (
                <div className="tickers-container">
                    <span className="tickers-label">
                        {hasPolymarket || hasPrimaryMarket ? "Related Tickers:" : "Investment Ideas:"}
                    </span>
                    <div className="tickers-list">
                        {item.relatedTickers.map((ticker) => (
                            <a
                                key={ticker}
                                href={getTickerUrl(ticker)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`ticker-badge ticker-${getTickerType(ticker)}`}
                                title={ticker}
                            >
                                {ticker}
                            </a>
                        ))}
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
                    title="Ignore this item"
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
