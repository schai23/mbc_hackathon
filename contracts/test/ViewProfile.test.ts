import { expect } from "chai";
import { ethers } from "hardhat";
import { ViewProfile } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ViewProfile", function () {
    let viewProfile: ViewProfile;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;

    // Topic ID constants (keccak256 hashes)
    const TOPICS = {
        US_POLITICS: ethers.keccak256(ethers.toUtf8Bytes("US_POLITICS")),
        CRYPTO: ethers.keccak256(ethers.toUtf8Bytes("CRYPTO")),
        GLOBAL_POLICY_ENERGY: ethers.keccak256(ethers.toUtf8Bytes("GLOBAL_POLICY_ENERGY")),
        GLOBAL_POLICY_TRADE: ethers.keccak256(ethers.toUtf8Bytes("GLOBAL_POLICY_TRADE")),
        MACRO: ethers.keccak256(ethers.toUtf8Bytes("MACRO")),
    };

    // Sentiment enum values
    enum Sentiment {
        Bearish = 0,
        Neutral = 1,
        Bullish = 2,
    }

    beforeEach(async function () {
        // Get signers
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy contract
        const ViewProfileFactory = await ethers.getContractFactory("ViewProfile");
        viewProfile = await ViewProfileFactory.deploy();
        await viewProfile.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(await viewProfile.getAddress()).to.be.properAddress;
        });
    });

    describe("setTopicView", function () {
        it("Should allow setting a topic view", async function () {
            await viewProfile.connect(user1).setTopicView(TOPICS.US_POLITICS, Sentiment.Bullish);

            const view = await viewProfile.getTopicView(user1.address, TOPICS.US_POLITICS);
            expect(view.sentiment).to.equal(Sentiment.Bullish);
            expect(view.updatedAt).to.be.greaterThan(0);
        });

        it("Should emit TopicViewUpdated event", async function () {
            const tx = await viewProfile.connect(user1).setTopicView(TOPICS.CRYPTO, Sentiment.Bearish);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt!.blockNumber);

            await expect(tx)
                .to.emit(viewProfile, "TopicViewUpdated")
                .withArgs(
                    user1.address,
                    TOPICS.CRYPTO,
                    Sentiment.Bearish,
                    block!.timestamp
                );
        });

        it("Should set updatedAt to block timestamp", async function () {
            const tx = await viewProfile.connect(user1).setTopicView(TOPICS.MACRO, Sentiment.Neutral);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt!.blockNumber);

            const view = await viewProfile.getTopicView(user1.address, TOPICS.MACRO);
            expect(view.updatedAt).to.equal(block!.timestamp);
        });

        it("Should allow updating an existing view", async function () {
            // Set initial view
            await viewProfile.connect(user1).setTopicView(TOPICS.CRYPTO, Sentiment.Bearish);
            let view = await viewProfile.getTopicView(user1.address, TOPICS.CRYPTO);
            expect(view.sentiment).to.equal(Sentiment.Bearish);

            // Update view
            await viewProfile.connect(user1).setTopicView(TOPICS.CRYPTO, Sentiment.Bullish);
            view = await viewProfile.getTopicView(user1.address, TOPICS.CRYPTO);
            expect(view.sentiment).to.equal(Sentiment.Bullish);
        });

        it("Should allow different topics for same user", async function () {
            await viewProfile.connect(user1).setTopicView(TOPICS.US_POLITICS, Sentiment.Bullish);
            await viewProfile.connect(user1).setTopicView(TOPICS.CRYPTO, Sentiment.Bearish);
            await viewProfile.connect(user1).setTopicView(TOPICS.MACRO, Sentiment.Neutral);

            const politicsView = await viewProfile.getTopicView(user1.address, TOPICS.US_POLITICS);
            const cryptoView = await viewProfile.getTopicView(user1.address, TOPICS.CRYPTO);
            const macroView = await viewProfile.getTopicView(user1.address, TOPICS.MACRO);

            expect(politicsView.sentiment).to.equal(Sentiment.Bullish);
            expect(cryptoView.sentiment).to.equal(Sentiment.Bearish);
            expect(macroView.sentiment).to.equal(Sentiment.Neutral);
        });
    });

    describe("getTopicView", function () {
        it("Should return the correct view for a set topic", async function () {
            await viewProfile.connect(user1).setTopicView(TOPICS.US_POLITICS, Sentiment.Bullish);

            const view = await viewProfile.getTopicView(user1.address, TOPICS.US_POLITICS);
            expect(view.sentiment).to.equal(Sentiment.Bullish);
            expect(view.updatedAt).to.be.greaterThan(0);
        });

        it("Should revert with TopicNotSet if topic has never been set", async function () {
            await expect(
                viewProfile.getTopicView(user1.address, TOPICS.US_POLITICS)
            ).to.be.revertedWithCustomError(viewProfile, "TopicNotSet")
                .withArgs(user1.address, TOPICS.US_POLITICS);
        });

        it("Should revert for different user even if topic set by another", async function () {
            // user1 sets a view
            await viewProfile.connect(user1).setTopicView(TOPICS.CRYPTO, Sentiment.Bullish);

            // user2 should not be able to read user1's view successfully
            // (they can read it, but if user2 queries for their own view, it should revert)
            await expect(
                viewProfile.getTopicView(user2.address, TOPICS.CRYPTO)
            ).to.be.revertedWithCustomError(viewProfile, "TopicNotSet")
                .withArgs(user2.address, TOPICS.CRYPTO);
        });
    });

    describe("hasTopicView", function () {
        it("Should return false for unset topic", async function () {
            expect(await viewProfile.hasTopicView(user1.address, TOPICS.US_POLITICS)).to.be.false;
        });

        it("Should return true after setting a topic", async function () {
            await viewProfile.connect(user1).setTopicView(TOPICS.US_POLITICS, Sentiment.Neutral);
            expect(await viewProfile.hasTopicView(user1.address, TOPICS.US_POLITICS)).to.be.true;
        });
    });

    describe("Multi-User Isolation", function () {
        it("Should keep user views separate", async function () {
            await viewProfile.connect(user1).setTopicView(TOPICS.CRYPTO, Sentiment.Bullish);
            await viewProfile.connect(user2).setTopicView(TOPICS.CRYPTO, Sentiment.Bearish);

            const user1View = await viewProfile.getTopicView(user1.address, TOPICS.CRYPTO);
            const user2View = await viewProfile.getTopicView(user2.address, TOPICS.CRYPTO);

            expect(user1View.sentiment).to.equal(Sentiment.Bullish);
            expect(user2View.sentiment).to.equal(Sentiment.Bearish);
        });

        it("Each user can only modify their own views", async function () {
            // user1 sets their view
            await viewProfile.connect(user1).setTopicView(TOPICS.US_POLITICS, Sentiment.Bearish);

            // user2 sets their view (same topic, different sentiment)
            await viewProfile.connect(user2).setTopicView(TOPICS.US_POLITICS, Sentiment.Bullish);

            // user1's view should be unchanged
            const user1View = await viewProfile.getTopicView(user1.address, TOPICS.US_POLITICS);
            expect(user1View.sentiment).to.equal(Sentiment.Bearish);
        });
    });

    describe("Topic ID Verification", function () {
        it("Should correctly compute topic IDs", function () {
            // Verify topic ID computation matches expected keccak256 values
            expect(TOPICS.US_POLITICS).to.equal(
                ethers.keccak256(ethers.toUtf8Bytes("US_POLITICS"))
            );
            expect(TOPICS.CRYPTO).to.equal(
                ethers.keccak256(ethers.toUtf8Bytes("CRYPTO"))
            );
        });

        it("Should differentiate between similar topic names", async function () {
            const topic1 = ethers.keccak256(ethers.toUtf8Bytes("ENERGY"));
            const topic2 = ethers.keccak256(ethers.toUtf8Bytes("ENERGY_POLICY"));

            await viewProfile.connect(user1).setTopicView(topic1, Sentiment.Bullish);
            await viewProfile.connect(user1).setTopicView(topic2, Sentiment.Bearish);

            const view1 = await viewProfile.getTopicView(user1.address, topic1);
            const view2 = await viewProfile.getTopicView(user1.address, topic2);

            expect(view1.sentiment).to.equal(Sentiment.Bullish);
            expect(view2.sentiment).to.equal(Sentiment.Bearish);
        });
    });
});
