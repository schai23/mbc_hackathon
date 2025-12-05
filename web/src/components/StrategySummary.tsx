/**
 * StrategySummary Component
 * 
 * Displays a strategy snapshot based on tracked items and opinions.
 * Aggregates tickers into bullish/bearish/watchlist buckets.
 */

"use client";

import React from "react";
import { BriefingItem, TopicId, formatTopic, getTickerUrl, getTickerType } from "@/lib/api";
import { Opinion } from "@/app/page";

interface StrategySummaryProps {
    trackedItems: BriefingItem[];
    opinions: Record<string, Opinion>;
}

interface TickerBuckets {
    bullish: Set<string>;
    bearish: Set<string>;
    watchlist: Set<string>;
}

interface TopicSentiment {
    topic: TopicId;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
}

export function StrategySummary({ trackedItems, opinions }: StrategySummaryProps) {
    // Aggregate tickers by opinion
    const buckets: TickerBuckets = {
        bullish: new Set(),
        bearish: new Set(),
        watchlist: new Set(),
    };

    // Aggregate topic sentiment
    const topicCounts: Record<string, { bullish: number; bearish: number; neutral: number }> = {};

    trackedItems.forEach(item => {
        const opinion = opinions[item.id] || "neutral";

        // Add tickers to appropriate bucket
        item.relatedTickers.forEach(ticker => {
            if (opinion === "agree") {
                buckets.bullish.add(ticker);
            } else if (opinion === "disagree") {
                buckets.bearish.add(ticker);
            } else {
                buckets.watchlist.add(ticker);
            }
        });

        // Count topic sentiments
        item.topics.forEach(topic => {
            if (!topicCounts[topic]) {
                topicCounts[topic] = { bullish: 0, bearish: 0, neutral: 0 };
            }
            if (opinion === "agree") {
                topicCounts[topic].bullish++;
            } else if (opinion === "disagree") {
                topicCounts[topic].bearish++;
            } else {
                topicCounts[topic].neutral++;
            }
        });
    });

    // Convert to array for rendering
    const topicSentiments: TopicSentiment[] = Object.entries(topicCounts).map(([topic, counts]) => ({
        topic: topic as TopicId,
        bullishCount: counts.bullish,
        bearishCount: counts.bearish,
        neutralCount: counts.neutral,
    }));

    const bullishTickers = Array.from(buckets.bullish);
    const bearishTickers = Array.from(buckets.bearish);
    const watchlistTickers = Array.from(buckets.watchlist);

    return (
        <div className="strategy-summary">
            <h2 className="strategy-title">Strategy Snapshot</h2>

            {/* Topic Breakdown */}
            {topicSentiments.length > 0 && (
                <div className="strategy-section">
                    <h3 className="strategy-section-title">Theme Sentiment</h3>
                    <div className="topic-sentiment-list">
                        {topicSentiments.map(ts => (
                            <div key={ts.topic} className="topic-sentiment-row">
                                <span className="topic-name">{formatTopic(ts.topic)}</span>
                                <div className="sentiment-counts">
                                    {ts.bullishCount > 0 && (
                                        <span className="sentiment-badge bullish">
                                            +{ts.bullishCount} bullish
                                        </span>
                                    )}
                                    {ts.bearishCount > 0 && (
                                        <span className="sentiment-badge bearish">
                                            −{ts.bearishCount} bearish
                                        </span>
                                    )}
                                    {ts.neutralCount > 0 && (
                                        <span className="sentiment-badge neutral">
                                            {ts.neutralCount} watching
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Bullish Exposures */}
            {bullishTickers.length > 0 && (
                <div className="strategy-section">
                    <h3 className="strategy-section-title bullish-title">
                        📈 Bullish Exposures
                    </h3>
                    <div className="ticker-list">
                        {bullishTickers.map(ticker => (
                            <a
                                key={ticker}
                                href={getTickerUrl(ticker)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`ticker-badge ticker-${getTickerType(ticker)}`}
                            >
                                {ticker}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Bearish Exposures */}
            {bearishTickers.length > 0 && (
                <div className="strategy-section">
                    <h3 className="strategy-section-title bearish-title">
                        📉 Bearish Exposures
                    </h3>
                    <div className="ticker-list">
                        {bearishTickers.map(ticker => (
                            <a
                                key={ticker}
                                href={getTickerUrl(ticker)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`ticker-badge ticker-${getTickerType(ticker)}`}
                            >
                                {ticker}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Watchlist */}
            {watchlistTickers.length > 0 && (
                <div className="strategy-section">
                    <h3 className="strategy-section-title watchlist-title">
                        👁 Watchlist
                    </h3>
                    <div className="ticker-list">
                        {watchlistTickers.map(ticker => (
                            <a
                                key={ticker}
                                href={getTickerUrl(ticker)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`ticker-badge ticker-${getTickerType(ticker)}`}
                            >
                                {ticker}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <p className="strategy-disclaimer">
                This view classifies your opinions based on prediction markets and related assets.
                It is not trading or investment advice.
            </p>
        </div>
    );
}

export default StrategySummary;
