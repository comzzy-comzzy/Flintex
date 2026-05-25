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

## Environment

Create `.env.local` from `.env.example` and fill only local or deployment secrets:

```bash
RPC_URL=
DEPLOYER_PRIVATE_KEY=
AI_RESOLVER_PRIVATE_KEY=
AI_RESOLVER_ADDRESS=
FREEMODEL_API_KEY=
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=
NEXT_PUBLIC_CIRCLE_KIT_KEY=
CIRCLE_KIT_KEY=
CIRCLE_API_KEY=
```

Never commit `.env.local`, private keys, API keys, or wallet seed material. `.env.local` and `.env` are ignored by git.

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
