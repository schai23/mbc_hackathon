// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ViewProfile
 * @author Morning Desk Team
 * @notice Stores user topic-level sentiment preferences for the Morning Desk feed.
 * @dev Deployed on Base Sepolia for the MBC Hackathon.
 * 
 * Each user can set their sentiment (Bearish/Neutral/Bullish) on any topic.
 * Topics are identified by bytes32 IDs (e.g., keccak256("US_POLITICS")).
 */
contract ViewProfile {
    // ============ Errors ============

    /// @notice Thrown when trying to read a topic view that hasn't been set
    error TopicNotSet(address user, bytes32 topicId);

    /// @notice Thrown when an invalid sentiment value is provided
    error InvalidSentiment(uint8 value);

    // ============ Enums ============

    /**
     * @notice Sentiment levels for each topic
     */
    enum Sentiment {
        Bearish,   // 0: User is bearish/negative on topic
        Neutral,   // 1: User is neutral/watching
        Bullish    // 2: User is bullish/positive on topic
    }

    // ============ Structs ============

    /**
     * @notice Stores a user's view on a specific topic
     * @param sentiment The user's sentiment (Bearish, Neutral, Bullish)
     * @param updatedAt Timestamp when this view was last updated
     */
    struct TopicView {
        Sentiment sentiment;
        uint64 updatedAt;
    }

    // ============ State ============

    /// @notice Mapping from user address => topic ID => topic view
    mapping(address => mapping(bytes32 => TopicView)) private _views;

    // ============ Events ============

    /**
     * @notice Emitted when a user updates their sentiment for a topic
     * @param user The address of the user
     * @param topicId The topic being updated (bytes32 hash)
     * @param sentiment The new sentiment value
     * @param updatedAt Timestamp of the update
     */
    event TopicViewUpdated(
        address indexed user,
        bytes32 indexed topicId,
        Sentiment sentiment,
        uint64 updatedAt
    );

    // ============ External Functions ============

    /**
     * @notice Set the caller's sentiment for a specific topic
     * @param topicId The topic ID (e.g., keccak256("US_POLITICS"))
     * @param sentiment The sentiment value to set
     */
    function setTopicView(bytes32 topicId, Sentiment sentiment) external {
        // Validate sentiment is within enum range (0, 1, or 2)
        if (uint8(sentiment) > uint8(Sentiment.Bullish)) {
            revert InvalidSentiment(uint8(sentiment));
        }

        uint64 timestamp = uint64(block.timestamp);

        _views[msg.sender][topicId] = TopicView({
            sentiment: sentiment,
            updatedAt: timestamp
        });

        emit TopicViewUpdated(msg.sender, topicId, sentiment, timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Get a user's view for a specific topic
     * @param user The address of the user
     * @param topicId The topic ID to query
     * @return The user's TopicView for that topic
     * @dev Reverts with TopicNotSet if the user has never set a view for this topic
     */
    function getTopicView(
        address user,
        bytes32 topicId
    ) external view returns (TopicView memory) {
        TopicView memory view_ = _views[user][topicId];
        
        // If updatedAt is 0, the topic has never been set
        if (view_.updatedAt == 0) {
            revert TopicNotSet(user, topicId);
        }

        return view_;
    }

    /**
     * @notice Check if a user has set a view for a specific topic
     * @param user The address of the user
     * @param topicId The topic ID to check
     * @return True if the user has set a view for this topic
     */
    function hasTopicView(
        address user,
        bytes32 topicId
    ) external view returns (bool) {
        return _views[user][topicId].updatedAt != 0;
    }
}

// ============ Topic ID Constants (for reference) ============
// 
// These can be computed off-chain or used in tests:
//   bytes32 constant US_POLITICS = keccak256("US_POLITICS");
//   bytes32 constant CRYPTO = keccak256("CRYPTO");
//   bytes32 constant GLOBAL_POLICY_ENERGY = keccak256("GLOBAL_POLICY_ENERGY");
//   bytes32 constant GLOBAL_POLICY_TRADE = keccak256("GLOBAL_POLICY_TRADE");
//   bytes32 constant MACRO = keccak256("MACRO");
