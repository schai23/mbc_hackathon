# Morning Desk 🌅

**Your Pocket Analyst** - A feed application for tracking prediction markets, politics, crypto, and global policy.

Built for the **MBC Hackathon** targeting:
- **Primary Track**: Base (EVM L2)
- **Bounty**: Polymarket (prediction markets)

## Architecture

```
mbc_hackathon/
├── contracts/     # Solidity smart contracts (Hardhat)
├── router/        # Backend API (Express + TypeScript)
└── web/           # Frontend (Next.js + RainbowKit)
```

## Quick Start

### 1. Install Dependencies

```bash
# Smart contracts
cd contracts && npm install

# Backend router
cd router && npm install

# Frontend
cd web && npm install
```

### 2. Configure Environment

```bash
# Backend router
cp router/.env.example router/.env
# Add your OPENAI_API_KEY (optional, uses mock data if empty)

# Frontend
cp web/.env.example web/.env.local
# Add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
# Add NEXT_PUBLIC_VIEW_PROFILE_ADDRESS (after deploying contract)
```

### 3. Run the Application

```bash
# Terminal 1: Start backend router
cd router && npm run dev
# Backend runs on http://localhost:3001

# Terminal 2: Start frontend
cd web && npm run dev
# Frontend runs on http://localhost:3000
```

### 4. Deploy Smart Contract (Optional)

```bash
cd contracts
cp .env.example .env
# Add your PRIVATE_KEY for Base Sepolia

npm run deploy:sepolia
```

## Features

### Feed Cards
Each card contains:
- 📰 **Headline** - Event or theme description
- 📊 **Polymarket Link** - Live probability and 24h change
- 📋 **Due Diligence** - 4-6 bullet points of analysis
- 💹 **Related Tickers** - Crypto, stocks, and ETFs
- 🎯 **Actions** - Track, Ignore, Agree, Disagree

### Topics
- 🏛️ **US Politics** - Elections, policy, Congress
- ₿ **Crypto** - Bitcoin, Ethereum, DeFi
- ⚡ **Energy Policy** - SMR, renewables, climate
- 📦 **Trade Policy** - Tariffs, USMCA, trade deals
- 📈 **Macro** - Fed rates, inflation, GDP

### Smart Contract
The `ViewProfile` contract on Base Sepolia stores:
- User topic sentiments (Bearish / Neutral / Bullish)
- Enables future personalized feed rankings

## API Endpoints

### `GET /feed`
Returns ranked feed cards.

Query parameters:
- `address` - User wallet address (optional)
- `topic` - Filter by topic (optional)
- `limit` - Number of cards (default: 10, max: 50)

### `GET /topics`
Returns list of available topics.

### `GET /health`
Health check endpoint.

## Tech Stack

- **Blockchain**: Base Sepolia, Solidity 0.8.20, Hardhat
- **Backend**: Node.js, Express, TypeScript, OpenAI
- **Frontend**: Next.js 14, React, wagmi, viem, RainbowKit
- **APIs**: Polymarket CLOB/Gamma APIs

## License

MIT
