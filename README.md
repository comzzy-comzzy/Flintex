# Flintex

Three agents. One capital pool. Every market, every edge.

Built for the Agora Agents Hackathon by Canteen x Circle x Arc.

## What Is Live

Flintex is now wired to a deployed Arc testnet prediction market contract. The app can:

- Connect a wallet on Arc testnet.
- Run PortfolioAgent against wallet balances and regime rules.
- Run MarketAgent through FreeModel to generate macro market drafts.
- Create binary prediction markets onchain with USDC seed liquidity.
- Place YES or NO bets with an approve-then-bet wallet flow.
- Unstake open, unresolved bet positions back to the wallet before the market deadline.
- Resolve closed markets through ResolverAgent, which signs from the authorized AI resolver wallet instead of the market creator wallet.
- Read markets, pools, odds, deadlines, and positions from the contract.
- Show BetAgent opportunities using AI probability, real crowd odds, Kelly sizing, and high-alpha flags.
- Show a compact My Bets section with Open, Closed, Won, Lost, and Claimed states.

## Current Contract

- Network: Arc testnet
- Chain ID: `5042002`
- PredictionMarket: `0xd8996367956337eF9864A8D7C96293b88192a7b6`
- Testnet USDC: `0x3600000000000000000000000000000000000000`
- USDC decimals: `6`

The frontend reads the PredictionMarket ABI from `artifacts/contracts/PredictionMarket.sol/PredictionMarket.json` and the configured address from `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`, falling back to the deployed testnet address above. After changing the Solidity contract, redeploy and update `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` before using newly added functions such as `withdrawPosition`.

## Agent Routes

- `POST /api/portfolio-agent` analyzes a supplied portfolio and returns regime, USYC allocation, and reasoning.
- `POST /api/market-agent` calls FreeModel at `https://cc.freemodel.dev/v1/messages` using model `claude-haiku-4-5-20251001` and returns market drafts.
- `POST /api/bet-agent` accepts open markets, estimates true probabilities, compares them with crowd odds, calculates Kelly sizing, and returns opportunities.
- `POST /api/resolve-agent` resolves one closed market by marketId. `GET /api/resolve-agent` scans all closed unresolved markets for scheduled AI settlement.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- wagmi, viem, RainbowKit, ethers
- Solidity, Hardhat, Arc testnet
- FreeModel gateway using `FREEMODEL_API_KEY`
- USDC prediction markets and wallet-signed transactions
- Vercel

## Why Flintex Fits Arc OSS

Flintex should be chosen for Arc OSS because it turns Arc from infrastructure examples into a reusable agentic finance application pattern. Arc already gives builders the core primitives for stablecoin-native finance: USDC gas, predictable fees, deterministic sub-second settlement, EVM compatibility, Circle-stack integration, CCTP, Gateway, wallets, and smart contract tooling. Flintex builds on those primitives with an end-to-end product loop where AI agents reason about markets, recommend portfolio allocation, create prediction market drafts, size positions, and trigger wallet-approved USDC actions on Arc testnet.

The reusable primitives exposed by Flintex are useful beyond this project:

1. A USDC-native `PredictionMarket` contract on Arc testnet with market creation, YES/NO positions, payout quoting, claims, open-position withdrawal, and an authorized AI resolver role.
2. Agent JSON interfaces other builders can reuse. `PortfolioAgent` returns market regime, USYC allocation, and reasoning. `MarketAgent` returns binary market drafts with resolution criteria, deadline, liquidity, category, and AI probability. `BetAgent` returns true probability, crowd odds, Kelly sizing, expected value, high-alpha flags, and a recommendation.
3. A resolver flow where the market creator cannot unilaterally choose the result. Closed markets are resolved by an authorized AI resolver wallet, separating market creation from settlement.
4. A wallet-approved execution model where agents generate recommendations or transaction intents, but users retain final approval through their wallet before capital moves.
5. A correction and override layer for real-world market mistakes such as typos, clarified criteria, corrected deadlines, or updated resolution context without redeploying the contract.
6. Deployment and seeding scripts that make it easy for another Arc builder to deploy the contract and create their first test market.

Compared with the existing Arc and Circle builder repos, Flintex is less of a single-purpose sample and more of a composable operating layer for autonomous financial agents. It shows how Arc's stablecoin-native settlement can support agentic economic activity: agents do the reasoning, users keep wallet-level control, and Arc provides fast, predictable USDC settlement.

Other builders could fork Flintex to build agent-run prediction markets, treasury agents, betting agents, portfolio allocation agents, resolution agents, or any application where AI produces financial decisions that must pass user or policy gates before settling onchain. That makes Flintex a strong Arc OSS candidate because it demonstrates a complete, reusable pattern for agentic finance on Arc, not just one isolated integration.

References: [Arc](https://www.arc.io/), [Arc docs](https://docs.arc.io/arc-chain), [circlefin/arc-node](https://github.com/circlefin/arc-node), and [circlefin/skills](https://github.com/circlefin/skills).

## Environment

Create `.env.local` from `.env.example` and fill only local or deployment secrets:

```bash
RPC_URL=
DEPLOYER_PRIVATE_KEY=
AI_RESOLVER_PRIVATE_KEY=
AI_RESOLVER_ADDRESS=
FREEMODEL_API_KEY=
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=
MARKET_OVERRIDES_JSON=
NEXT_PUBLIC_MARKET_OVERRIDES_JSON=
NEXT_PUBLIC_CIRCLE_KIT_KEY=
CIRCLE_KIT_KEY=
CIRCLE_API_KEY=
```

Never commit `.env.local`, private keys, API keys, or wallet seed material. `.env.local` and `.env` are ignored by git.

### Off-Chain Market Corrections

Creators cannot edit stored contract fields after `createMarket`. To correct a typo or clarify resolution criteria without redeploying the contract, set `MARKET_OVERRIDES_JSON` in Vercel or `.env.local`:

```json
{
  "1": {
    "title": "Corrected market title",
    "description": "Corrected description shown in the app.",
    "resolutionCriteria": "Corrected criteria used by ResolverAgent.",
    "deadline": "2026-05-25T23:59:59Z",
    "category": "Macro",
    "triggeredByNews": "Corrected source context.",
    "note": "Fixes a typo from the original manual market.",
    "updatedAt": "2026-05-25T12:00:00Z"
  }
}
```

`MARKET_OVERRIDES_JSON` is server-side and is used by ResolverAgent. `NEXT_PUBLIC_MARKET_OVERRIDES_JSON` is also supported for local display-only overrides, but prefer `MARKET_OVERRIDES_JSON` in production so the API and dashboards read the same corrections.

## Local Development

```bash
pnpm install
pnpm dev -p 3007
```

Compile contracts without deploying:

```bash
./node_modules/.bin/hardhat compile
```

Deploy only when intentionally rotating or upgrading the contract:

```bash
set -a; . ./.env.local; set +a
node scripts/deploy.js
```

## Builder

Kane - @kane_120 | Port Harcourt, Nigeria
