/**
 * Morning Desk - Home Page
 * 
 * Main page with tabs (Feed / Portfolio), filters, and feed cards.
 * Manages centralized state for tracking and opinions.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";

import { Header } from "@/components/Header";
import { TopicFilter } from "@/components/TopicFilter";
import { FeedCard } from "@/components/FeedCard";
import { StrategySummary } from "@/components/StrategySummary";
import { fetchFeed, BriefingItem, TopicId } from "@/lib/api";

// Types
export type Opinion = "agree" | "disagree" | "neutral";
export type OpinionFilter = "all" | "agree" | "disagree" | "neutral";
export type TabId = "feed" | "portfolio";

export default function HomePage() {
    const { address, isConnected } = useAccount();

    // ============ Data State ============
    const [items, setItems] = useState<BriefingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloading, setReloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ============ UI State ============
    const [activeTab, setActiveTab] = useState<TabId>("feed");
    const [selectedTopic, setSelectedTopic] = useState<TopicId | null>(null);
    const [activeOpinionFilter, setActiveOpinionFilter] = useState<OpinionFilter>("all");

    // ============ User State ============
    const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
    const [opinions, setOpinions] = useState<Record<string, Opinion>>({});
    const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());

    // ============ Fetch Feed ============
    const loadFeed = useCallback(async (isReload = false) => {
        if (isReload) {
            setReloading(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const response = await fetchFeed({
                address: address,
                topic: selectedTopic || undefined,
            });
            setItems(response.items);

            // Initialize opinions for new items (keep existing opinions)
            setOpinions(prev => {
                const newOpinions = { ...prev };
                response.items.forEach(item => {
                    if (!(item.id in newOpinions)) {
                        newOpinions[item.id] = "neutral";
                    }
                });
                return newOpinions;
            });
        } catch (err) {
            console.error("Failed to fetch feed:", err);
            setError(err instanceof Error ? err.message : "Failed to load feed");
        } finally {
            setLoading(false);
            setReloading(false);
        }
    }, [address, selectedTopic]);

    useEffect(() => {
        loadFeed(false);
    }, [loadFeed]);

    // ============ Handlers ============
    const handleReload = () => loadFeed(true);

    const handleToggleTrack = (id: string) => {
        setTrackedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleToggleAgree = (id: string) => {
        setOpinions(prev => ({
            ...prev,
            [id]: prev[id] === "agree" ? "neutral" : "agree",
        }));
    };

    const handleToggleDisagree = (id: string) => {
        setOpinions(prev => ({
            ...prev,
            [id]: prev[id] === "disagree" ? "neutral" : "disagree",
        }));
    };

    const handleIgnore = (id: string) => {
        setIgnoredIds(prev => new Set(Array.from(prev).concat(id)));
    };

    // ============ Derived Data ============
    // Filter out ignored items
    const visibleItems = useMemo(() => {
        return items.filter(item => !ignoredIds.has(item.id));
    }, [items, ignoredIds]);

    // Filtered items for Feed tab (by opinion filter)
    const feedItems = useMemo(() => {
        if (activeOpinionFilter === "all") return visibleItems;
        return visibleItems.filter(item => opinions[item.id] === activeOpinionFilter);
    }, [visibleItems, opinions, activeOpinionFilter]);

    // Tracked items for Portfolio tab
    const trackedItems = useMemo(() => {
        return visibleItems.filter(item => trackedIds.has(item.id));
    }, [visibleItems, trackedIds]);

    // ============ Render ============
    return (
        <>
            <Header />
            <main>
                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button
                        className={`tab-btn ${activeTab === "feed" ? "active" : ""}`}
                        onClick={() => setActiveTab("feed")}
                    >
                        Feed
                    </button>
                    <button
                        className={`tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
                        onClick={() => setActiveTab("portfolio")}
                    >
                        Portfolio
                        {trackedIds.size > 0 && (
                            <span className="tab-badge">{trackedIds.size}</span>
                        )}
                    </button>
                </div>

                {/* Feed Tab */}
                {activeTab === "feed" && (
                    <div className="feed-tab">
                        {/* Topic Filter */}
                        <TopicFilter
                            selected={selectedTopic}
                            onSelect={setSelectedTopic}
                        />

                        {/* Opinion Filter Pills */}
                        <div className="opinion-filter">
                            {(["all", "agree", "disagree", "neutral"] as OpinionFilter[]).map(filter => (
                                <button
                                    key={filter}
                                    className={`opinion-pill ${activeOpinionFilter === filter ? "active" : ""}`}
                                    onClick={() => setActiveOpinionFilter(filter)}
                                >
                                    {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Feed Controls */}
                        <div className="feed-controls">
                            <button
                                className="reload-button"
                                onClick={handleReload}
                                disabled={reloading}
                            >
                                {reloading ? (
                                    <>
                                        <span className="reload-spinner" />
                                        Reloading…
                                    </>
                                ) : (
                                    <>↻ Reload feed</>
                                )}
                            </button>

                            {!isConnected && (
                                <div className="connect-banner">
                                    <p>
                                        <span className="banner-icon">💡</span>
                                        Connect your wallet to save preferences on-chain
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Feed Content */}
                        {loading ? (
                            <div className="feed-loading">
                                <div className="loading-spinner" />
                                <p>Loading briefings...</p>
                            </div>
                        ) : error ? (
                            <div className="feed-error">
                                <span className="error-icon">⚠️</span>
                                <p className="error-message">{error}</p>
                                <button className="retry-button" onClick={() => loadFeed(false)}>
                                    Retry
                                </button>
                            </div>
                        ) : feedItems.length === 0 ? (
                            <div className="feed-empty">
                                <span className="empty-icon">📭</span>
                                <p className="empty-message">
                                    {activeOpinionFilter !== "all"
                                        ? `No ${activeOpinionFilter} items`
                                        : "No briefings available"}
                                </p>
                                <p className="empty-hint">
                                    {activeOpinionFilter !== "all"
                                        ? "Try selecting a different filter"
                                        : "Check back later for updates"}
                                </p>
                            </div>
                        ) : (
                            <div className="cards-container">
                                {feedItems.map(item => (
                                    <FeedCard
                                        key={item.id}
                                        item={item}
                                        isTracked={trackedIds.has(item.id)}
                                        opinion={opinions[item.id] || "neutral"}
                                        onToggleTrack={handleToggleTrack}
                                        onToggleAgree={handleToggleAgree}
                                        onToggleDisagree={handleToggleDisagree}
                                        onIgnore={handleIgnore}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Portfolio Tab */}
                {activeTab === "portfolio" && (
                    <div className="portfolio-tab">
                        {trackedItems.length === 0 ? (
                            <div className="portfolio-empty">
                                <span className="empty-icon">📋</span>
                                <p className="empty-message">No items in your portfolio yet</p>
                                <p className="empty-hint">
                                    Use the Track button in the Feed to add ideas.
                                </p>
                                <button
                                    className="go-to-feed-btn"
                                    onClick={() => setActiveTab("feed")}
                                >
                                    Go to Feed
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Strategy Summary */}
                                <StrategySummary
                                    trackedItems={trackedItems}
                                    opinions={opinions}
                                />

                                {/* Tracked Cards */}
                                <div className="cards-container">
                                    {trackedItems.map(item => (
                                        <FeedCard
                                            key={item.id}
                                            item={item}
                                            isTracked={true}
                                            opinion={opinions[item.id] || "neutral"}
                                            onToggleTrack={handleToggleTrack}
                                            onToggleAgree={handleToggleAgree}
                                            onToggleDisagree={handleToggleDisagree}
                                            onIgnore={handleIgnore}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}
