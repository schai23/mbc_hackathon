## Inspiration  

Morning finance desks in investment / commercial banking and S&T start the day by scanning headlines, research, and market moves, then turning that firehose into a focused view of risk and opportunity. I wanted a friendly version of that: a pocket analyst that turns chaotic news and prediction markets into a clean, actionable morning brief.  

A big part of the motivation was **accessibility**—taking the rigor of institutional finance (probabilities, scenarios, thesis vs. risk) and packaging it so an everyday person can understand *why* markets are moving, not just that they are. Instead of needing a Bloomberg terminal, you get an interface that explains “here’s what the market thinks, here’s why, here’s what could go wrong.”

---

## What it does  

**Morning Desk** is a Base-built “pocket analyst.” It pulls curated Polymarket markets and macro themes into a scrollable feed of briefing cards. Each card shows:

- Implied probabilities (e.g. \(P(\text{event}) \approx 0.52\))
- Analyst-style due-diligence bullets (facts, drivers, risks, catalysts)
- Related tickers (stocks, ETFs, crypto)  
- Source links for deeper reading  

Users can:

- Filter by topic (US Politics, Crypto, Energy, Trade)  
- Ignore noise they don’t care about  
- Mark what they **agree** or **disagree** with  
- Track cards into a **Portfolio** tab, which aggregates their bullish / bearish / watchlist themes into a simple “strategy snapshot.”

Under the hood, a Base smart contract stores per-topic sentiment for each wallet as the first step toward on-chain view profiles and future banker-bots.

---

## How we built it  

I built Morning Desk as a three-layer system:

1. **Smart contract (Solidity + Hardhat)** on Base Sepolia  
   - `ViewProfile` contract stores topic views (Bullish / Neutral / Bearish) per address.  
   - Uses `bytes32` topic IDs (e.g. `US_POLITICS`, `CRYPTO`) for flexibility.  
   - Includes events, custom errors, and tests for all main paths.

2. **Backend router (Node.js + Express + TypeScript)**  
   - Serves a `/feed` API of `BriefingItem`s seeded with realistic, evergreen mock data for US politics, crypto, and policy topics like SMRs and softwood lumber.  
   - Each item includes implied probability, DD bullets, related tickers, and source links.  
   - Designed to be easily swapped to real Polymarket + news APIs later.

3. **Frontend (Next.js + React + TypeScript)**  
   - Calls the API, renders the feed, and integrates wagmi/RainbowKit for Base wallet connection.  
   - UI includes topic filters, Polymarket previews, due-diligence bullets, sources, and local **Agree / Disagree / Track / Ignore** interactions.  
   - A **Portfolio** tab turns tracked cards + opinions into a simple “strategy snapshot” so non-experts can see their bullish, bearish, and watchlist themes at a glance.

---

## Challenges we ran into  

- **Scope vs. time:** I had to balance ambition with hackathon time—wiring contracts, backend, and frontend cleanly without getting stuck on infra or deployment.  
- **Polymarket + TOS safety:** Designing something Polymarket-aligned but TOS-safe meant avoiding custodial trading, bots, or geo-bypass and focusing on tooling and analysis, not execution.  
- **Mock data that still feels real:** I wanted the content to feel current and analytical while using mock data only, so I iterated a lot on how the bullets, probabilities, and sources are written. The goal was to feel like a real junior-analyst note, not lorem ipsum.  
- **Explaining finance without jargon:** Making serious concepts (implied probabilities, macro drivers, risk scenarios) understandable without dumbing them down was a constant tension—especially while sleep-deprived.

---

## Accomplishments that we’re proud of  

- **End-to-end product, not just parts:** Morning Desk is a full flow, not just a Figma or a single contract. The contracts compile and pass tests, the API serves structured briefing data, and the Next.js UI feels like a real research product.  
- **Analyst-style cards:** The cards combine Polymarket odds, analyst-style DD, related assets, and sources so you can understand a thesis in seconds, the way a desk analyst would summarize it.  
- **View profiles as rails for future agents:** The on-chain `ViewProfile` contract gives a clear path for future agents or banker-bots to read a user’s views and generate structured trade “recipes” on top.  
- **Accessibility of rigor:** I’m proud that Morning Desk tries to bring the **rigor** of institutional decision-making—clear theses, probabilities, risks—into a UI that feels approachable to someone who doesn’t work in finance.

---

## What we learned  

- How to think beyond “just another DeFi app” and design for **fast, fun, value-in-20-seconds UX**, which is what Base emphasized in the kickoff.  
- Hands-on experience with Base tooling: Hardhat on Base Sepolia, wagmi/RainbowKit, and how to architect around a Layer 2.  
- A new way to see prediction markets: not just as places to trade, but as a **data layer** that encodes crowd \(P(\text{event})\) and can drive research, dashboards, and agents.  
- The power of **mock-first development**: by stubbing data and future LLM calls, I could still ship a polished experience on a short timeline instead of getting blocked on external APIs.  
- How important copy is: small changes in the DD bullets and labels have a huge effect on whether non-experts feel like the tool is “for them.”

---

## What’s next for Morning Desk  

- **Real integrations:** Plug in real Polymarket APIs and news sources, then swap the template bullets for true LLM-generated due diligence (with clear labeling).  
- **On-chain opinions:** Wire Agree / Disagree / Track to the Base `ViewProfile` contract so agents can read a user’s on-chain views and generate basket trade “recipes” safely (no custody, just plans).  
- **Deeper strategy modeling:** Evolve the Portfolio “strategy snapshot” into richer theme and risk analytics—still in plain language—so everyday users can see how their views cluster across politics, crypto, and policy.  
- **Mini-app + more regions:** Explore a Base mini-app version, richer topic coverage (including more Canadian policy), and institution-facing analytics for funds or research desks using aggregated, privacy-respecting on-chain sentiment.  

Overall, Morning Desk is an experiment in taking the serious, math-driven side of finance and making it understandable and usable for normal people—without losing the rigor.
