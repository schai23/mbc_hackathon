/**
 * TopicFilter Component
 * 
 * Horizontal filter chips for selecting topics.
 */

"use client";

import React from "react";
import { TopicId, formatTopic, getTopicColor } from "@/lib/api";

interface TopicFilterProps {
    selected: TopicId | null;
    onSelect: (topic: TopicId | null) => void;
}

const TOPICS: TopicId[] = [
    "US_POLITICS",
    "CRYPTO",
    "GLOBAL_POLICY_ENERGY",
    "GLOBAL_POLICY_TRADE",
];

export function TopicFilter({ selected, onSelect }: TopicFilterProps) {
    return (
        <div className="topic-filter">
            {/* All topics button */}
            <button
                className={`filter-chip ${selected === null ? "active" : ""}`}
                onClick={() => onSelect(null)}
            >
                All Topics
            </button>

            {/* Individual topic chips */}
            {TOPICS.map(topic => (
                <button
                    key={topic}
                    className={`filter-chip ${selected === topic ? "active" : ""}`}
                    onClick={() => onSelect(topic)}
                    style={selected === topic ? {
                        backgroundColor: getTopicColor(topic),
                        borderColor: getTopicColor(topic),
                    } : undefined}
                >
                    {formatTopic(topic)}
                </button>
            ))}
        </div>
    );
}

export default TopicFilter;
