import Link from 'next/link'
import Navbar from '@/components/Navbar'

const coreDocs = [
  {
    number: '01',
    label: 'INTRODUCTION',
    href: '#introduction',
    summary: 'What Flintex is, who it serves, and why the three-agent model exists.',
  },
  {
    number: '02',
    label: 'THE_PROBLEM',
    href: '#the-problem',
    summary: 'The fragmented capital, slow settlement, and weak automation Flintex is designed to fix.',
  },
  {
    number: '03',
    label: 'ARCHITECTURE',
    href: '#architecture',
    summary: 'How the UI, agent routes, deployed contract, Circle rails, and Arc settlement fit together.',
  },
  {
    number: '04',
    label: 'CORE_CONCEPTS',
    href: '#core-concepts',
    summary: 'The shared capital pool, agent scores, risk gates, and onchain audit trail.',
  },
  {
    number: '05',
    label: 'FLINTEX_LIFECYCLE',
    href: '#flintex-lifecycle',
    summary: 'The full loop from wallet connection through agent decision, settlement, and review.',
  },
  {
    number: '06',
    label: 'AGENT_IDENTITY',
    href: '#agent-identity',
    summary: 'How PortfolioAgent, MarketAgent, and BetAgent are separated by role and permissions.',
  },
  {
    number: '07',
    label: 'SMART_CONTRACTS',
    href: '#smart-contracts',
    summary: 'How the deployed PredictionMarket contract handles creation, bets, claims, and payout reads.',
  },
  {
    number: '08',
    label: 'REST_API',
    href: '#rest-api',
    summary: 'Live FreeModel-backed agent routes and the JSON they return.',
  },
  {
    number: '09',
    label: 'SDK_GUIDE',
    href: '#sdk-guide',
    summary: 'A developer path for building new agents and connecting them to the capital pool.',
  },
  {
    number: '10',
    label: 'FAQ',
    href: '#faq',
    summary: 'Direct answers about custody, Arc, USDC, agents, risks, and launch scope.',
  },
  {
    number: '11',
    label: 'GLOSSARY',
    href: '#glossary',
    summary: 'Definitions for the Flintex vocabulary used across the product.',
  },
  {
    number: '12',
    label: 'ROADMAP',
    href: '#roadmap',
    summary: 'The staged buildout from current testnet app to agent marketplace OS.',
  },
]

const architectureLayers = [
  {
    name: 'Application Layer',
    detail: 'Next.js app surfaces the home page, PortfolioAgent, MarketAgent, BetAgent, and this documentation hub.',
  },
  {
    name: 'Agent Layer',
    detail: 'AI services score portfolio state, macro events, and prediction market edges before proposing actions.',
  },
  {
    name: 'Capital Layer',
    detail: 'One user-owned USDC pool is segmented by policy rather than fragmented across separate bots.',
  },
  {
    name: 'Settlement Layer',
    detail: 'Arc testnet executes low-cost transactions with USDC as the native economic unit.',
  },
  {
    name: 'Circle Layer',
    detail: 'Circle Wallets, USDC, EURC, USYC, Gateway, CCTP, Paymaster, and App Kit form the money movement stack.',
  },
  {
    name: 'Audit Layer',
    detail: 'Every agent decision should produce a reasoning record, allocation record, and transaction reference.',
  },
]

const lifecycle = [
  'Connect a wallet on Arc testnet or provision an embedded wallet.',
  'Fund the shared pool with USDC, EURC, or supported Circle assets.',
  'PortfolioAgent reads balances and sets the baseline risk posture.',
  'MarketAgent scans macro and geopolitical signals for resolvable market ideas.',
  'BetAgent compares market odds against model probabilities and Kelly sizing.',
  'The allocator assigns pool capacity to the best risk-adjusted opportunity.',
  'Execution settles on Arc and writes the decision trail back to the Flintex UI.',
  'The next cycle re-scores the world and either holds, hedges, rebalances, or exits.',
]

const roadmap = [
  {
    phase: 'Phase 1',
    window: 'Q2 2026',
    title: 'Arc testnet command center',
    items: [
      'Keep wallet-gated dashboards for PortfolioAgent, MarketAgent, and BetAgent aligned with the deployed contract.',
      'Expand durable decision logs so each agent run and transaction can be reviewed after refresh.',
      'Keep the documentation system current as the canonical Flintex reference.',
    ],
  },
  {
    phase: 'Phase 2',
    window: 'Q3 2026',
    title: 'Onchain allocation and contract hardening',
    items: [
      'Deploy capital pool accounting contracts with per-agent budget limits.',
      'Harden the deployed PredictionMarket flow with stronger testing, indexing, and admin safety controls.',
      'Introduce policy controls for max drawdown, per-market exposure, and emergency pause.',
    ],
  },
  {
    phase: 'Phase 3',
    window: 'Q4 2026',
    title: 'Autonomous execution and agent reputation',
    items: [
      'Move from advisory actions to signed agent execution behind user-approved policies.',
      'Score agents by realized PnL, calibration accuracy, drawdown control, and resolution quality.',
      'Open the first external agent integration path through a Flintex SDK.',
    ],
  },
  {
    phase: 'Phase 4',
    window: 'H1 2027',
    title: 'Cross-chain liquidity and institutional controls',
    items: [
      'Use CCTP and Gateway for cross-chain USDC routing into Arc opportunities.',
      'Add account roles, treasury reporting, exportable audit trails, and compliance review queues.',
      'Support strategy vaults where users can opt into agent baskets with different risk profiles.',
    ],
  },
  {
    phase: 'Phase 5',
    window: 'H2 2027',
    title: 'Flintex agent market OS',
    items: [
      'Launch a marketplace where vetted agents compete for capital from the shared pool.',
      'Enable composable agent teams for macro, sports, crypto, FX, and event-driven markets.',
      'Make Flintex the operating layer for autonomous USDC-native market strategies.',
    ],
  },
]

const faq = [
  {
    question: 'Is Flintex a wallet, an exchange, or a bot?',
    answer: 'Flintex is an agent coordination layer. The user keeps a wallet, the agents produce decisions, and Arc settles the resulting USDC actions.',
  },
  {
    question: 'Why one capital pool?',
    answer: 'A single pool lets Flintex compare portfolio rebalancing, market creation, and betting opportunities using the same risk budget instead of trapping money inside separate tools.',
  },
  {
    question: 'Why Arc and Circle?',
    answer: 'Flintex needs fast settlement, stable fees, USDC-native accounting, and wallet infrastructure that agents can use without forcing users into gas-token complexity.',
  },
  {
    question: 'Are the agents fully autonomous today?',
    answer: 'The current app demonstrates wallet-gated agent analysis and live contract workflows. Users still approve wallet actions before createMarket, betYes, betNo, or claimPayout execute.',
  },
]

const glossary = [
  ['Capital Pool', 'The user-owned pool of USDC and supported Circle assets that all Flintex agents compete to use.'],
  ['PortfolioAgent', 'The agent that reads balances, detects market regime, and recommends rebalancing or USYC allocation.'],
  ['MarketAgent', 'The agent that turns macro and geopolitical events into specific prediction market drafts.'],
  ['BetAgent', 'The agent that finds mispriced markets, estimates true probability, and sizes positions using Kelly discipline.'],
  ['My Bets', 'The compact tracker on the Bets page that shows connected-wallet positions and their Open, Closed, Won, Lost, or Claimed status.'],
  ['Risk Gate', 'A policy rule that limits exposure, drawdown, market type, or execution authority before an agent can spend capital.'],
  ['Resolution Criteria', 'The exact rule that determines whether a Flintex prediction market settles YES or NO.'],
  ['Decision Log', 'A human-readable record of why an agent recommended or executed an action.'],
]

export default function DocsPage() {
  return (
    <>
      <Navbar />

      <style>{`
        .docs-page { max-width: 1200px; margin: 0 auto; padding: 96px 40px 80px; }
        .docs-hero { display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(320px, 0.55fr); gap: 48px; align-items: end; padding-bottom: 48px; border-bottom: 1px solid #0f1e2e; }
        .docs-kicker { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: #67e8f9; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 18px; }
        .docs-title { font-family: 'Instrument Serif', serif; font-size: clamp(36px, 5vw, 60px); line-height: 1.04; letter-spacing: -0.02em; color: #f0f9ff; margin-bottom: 18px; }
        .docs-title em { color: #67e8f9; font-style: italic; }
        .docs-subtitle { color: #94a3b8; font-size: 15px; line-height: 1.75; max-width: 680px; font-weight: 300; }
        .docs-status { background: #090d14; border: 1px solid #1e3a4f; border-radius: 8px; padding: 22px; }
        .docs-status-row { display: flex; justify-content: space-between; gap: 18px; padding: 13px 0; border-bottom: 1px solid #0f1e2e; }
        .docs-status-row:last-child { border-bottom: 0; }
        .docs-status-label { font-family: 'Geist Mono', monospace; font-size: 10px; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; }
        .docs-status-value { color: #f0f9ff; font-size: 13px; text-align: right; }
        .docs-index { padding: 52px 0 64px; }
        .docs-section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
        .docs-section-heading h2 { font-family: 'Instrument Serif', serif; font-size: clamp(26px, 3vw, 38px); color: #f0f9ff; letter-spacing: -0.02em; }
        .docs-section-heading span { font-family: 'Geist Mono', monospace; font-size: 10px; color: #475569; letter-spacing: 0.12em; text-transform: uppercase; }
        .docs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #0f1e2e; border: 1px solid #0f1e2e; border-radius: 10px; overflow: hidden; }
        .doc-tile { display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 16px; min-height: 154px; padding: 22px; color: inherit; text-decoration: none; background: #090d14; transition: background 0.2s, color 0.2s; }
        .doc-tile:hover { background: #0d1520; }
        .doc-number { font-family: 'Geist Mono', monospace; font-size: 11px; color: #67e8f9; }
        .doc-label { display: block; font-family: 'Geist Mono', monospace; font-size: 12px; color: #f0f9ff; letter-spacing: 0.06em; margin-bottom: 10px; overflow-wrap: anywhere; }
        .doc-summary { color: #94a3b8; font-size: 12.5px; line-height: 1.65; font-weight: 300; }
        .docs-content { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 48px; align-items: start; }
        .docs-sidebar { position: sticky; top: 84px; border-left: 1px solid #0f1e2e; padding-left: 18px; }
        .docs-sidebar-title { font-family: 'Geist Mono', monospace; font-size: 10px; color: #475569; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 14px; }
        .docs-sidebar a { display: block; color: #94a3b8; text-decoration: none; font-family: 'Geist Mono', monospace; font-size: 10.5px; letter-spacing: 0.06em; padding: 8px 0; overflow-wrap: anywhere; }
        .docs-sidebar a:hover { color: #67e8f9; }
        .doc-section { scroll-margin-top: 84px; padding: 44px 0; border-top: 1px solid #0f1e2e; }
        .doc-section:first-child { border-top: 0; padding-top: 0; }
        .doc-section-header { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 20px; margin-bottom: 24px; }
        .doc-section-number { font-family: 'Geist Mono', monospace; font-size: 12px; color: #67e8f9; padding-top: 8px; }
        .doc-section h2 { font-family: 'Instrument Serif', serif; font-size: clamp(28px, 3.2vw, 42px); color: #f0f9ff; line-height: 1.12; letter-spacing: -0.02em; margin-bottom: 10px; }
        .doc-section p { color: #94a3b8; font-size: 14px; line-height: 1.78; font-weight: 300; margin-bottom: 16px; }
        .doc-section h3 { color: #f0f9ff; font-size: 14px; font-weight: 500; margin: 28px 0 12px; }
        .doc-list { display: grid; gap: 10px; margin: 14px 0 4px; }
        .doc-list li { list-style: none; color: #94a3b8; font-size: 13px; line-height: 1.65; padding-left: 20px; position: relative; }
        .doc-list li::before { content: '>'; position: absolute; left: 0; color: #67e8f9; font-family: 'Geist Mono', monospace; font-size: 11px; }
        .layer-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 18px; }
        .layer-card, .roadmap-card, .faq-card, .glossary-row { background: #090d14; border: 1px solid #0f1e2e; border-radius: 8px; padding: 18px; }
        .layer-card strong, .roadmap-card strong, .faq-card strong, .glossary-row strong { display: block; color: #f0f9ff; font-size: 13.5px; margin-bottom: 8px; }
        .layer-card span, .roadmap-card span, .faq-card span, .glossary-row span { display: block; color: #94a3b8; font-size: 12.5px; line-height: 1.65; font-weight: 300; }
        .api-box { background: #060a0f; border: 1px solid #1e3a4f; border-radius: 8px; padding: 18px; margin-top: 18px; overflow-x: auto; }
        .api-box code { color: #94a3b8; font-family: 'Geist Mono', monospace; font-size: 12px; line-height: 1.8; white-space: pre; }
        .roadmap-grid, .faq-grid, .glossary-grid { display: grid; gap: 12px; margin-top: 18px; }
        .roadmap-meta { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 10px; font-family: 'Geist Mono', monospace; font-size: 10px; color: #67e8f9; letter-spacing: 0.08em; text-transform: uppercase; }
        .roadmap-card ul { margin-top: 12px; }
        .docs-cta { margin-top: 52px; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px; border: 1px solid #1e3a4f; border-radius: 8px; background: #090d14; }
        .docs-cta strong { display: block; font-family: 'Instrument Serif', serif; font-size: 25px; color: #f0f9ff; margin-bottom: 4px; }
        .docs-cta span { color: #94a3b8; font-size: 13px; }
        .docs-cta a { background: #67e8f9; color: #060a0f; border: none; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: 500; font-family: 'Geist', sans-serif; text-decoration: none; white-space: nowrap; }
        @media (max-width: 980px) {
          .docs-hero, .docs-content { grid-template-columns: 1fr; }
          .docs-grid { grid-template-columns: repeat(2, 1fr); }
          .docs-sidebar { position: static; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0 16px; border-left: 0; border-top: 1px solid #0f1e2e; padding: 18px 0 0; }
          .docs-sidebar-title { grid-column: 1 / -1; }
        }
        @media (max-width: 680px) {
          .docs-page { padding: 86px 20px 56px; }
          .docs-grid, .layer-grid { grid-template-columns: 1fr; }
          .doc-section-header { grid-template-columns: 1fr; gap: 8px; }
          .docs-sidebar { grid-template-columns: 1fr 1fr; }
          .docs-section-heading { display: block; }
          .docs-section-heading span { display: block; margin-top: 8px; }
          .docs-cta { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      <main className="docs-page">
        <header className="docs-hero">
          <div>
            <div className="docs-kicker">Core_Documentation</div>
            <h1 className="docs-title">Flintex docs for the <em>live agent market OS.</em></h1>
            <p className="docs-subtitle">
              This is the product reference for Flintex: three autonomous agents, one shared capital pool, a deployed PredictionMarket contract on Arc testnet, and Circle rails for wallet, yield, and cross-chain money movement.
            </p>
          </div>

          <aside className="docs-status" aria-label="Flintex documentation status">
            <div className="docs-status-row">
              <span className="docs-status-label">Version</span>
              <span className="docs-status-value">Docs v0.2</span>
            </div>
            <div className="docs-status-row">
              <span className="docs-status-label">Network</span>
              <span className="docs-status-value">Arc Testnet</span>
            </div>
            <div className="docs-status-row">
              <span className="docs-status-label">Agents</span>
              <span className="docs-status-value">Portfolio / Market / Bet</span>
            </div>
            <div className="docs-status-row">
              <span className="docs-status-label">Contract</span>
              <span className="docs-status-value">PredictionMarket live</span>
            </div>
          </aside>
        </header>

        <section className="docs-index" aria-labelledby="docs-index-title">
          <div className="docs-section-heading">
            <h2 id="docs-index-title">Core documentation</h2>
            <span>Click a document to jump into the Flintex reference</span>
          </div>
          <div className="docs-grid">
            {coreDocs.map((item) => (
              <a className="doc-tile" href={item.href} key={item.label}>
                <span className="doc-number">{item.number}</span>
                <span>
                  <span className="doc-label">{item.label}</span>
                  <span className="doc-summary">{item.summary}</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <div className="docs-content">
          <nav className="docs-sidebar" aria-label="Documentation table of contents">
            <div className="docs-sidebar-title">On this page</div>
            {coreDocs.map((item) => (
              <a href={item.href} key={item.href}>{item.number} {item.label}</a>
            ))}
          </nav>

          <article>
            <section className="doc-section" id="introduction">
              <div className="doc-section-header">
                <div className="doc-section-number">01</div>
                <div>
                  <h2>Introduction</h2>
                  <p>
                    Flintex is a USDC-native agent market OS. Instead of asking a user to manually rebalance a portfolio, research macro events, create prediction markets, and size bets, Flintex coordinates three specialized AI agents against one shared pool of capital and a live onchain market contract.
                  </p>
                  <p>
                    The current product is built around PortfolioAgent, MarketAgent, and BetAgent. PortfolioAgent manages the defensive baseline, MarketAgent turns the world into tradeable questions, and BetAgent searches for probability mispricing with real contract reads and wallet-confirmed execution.
                  </p>
                </div>
              </div>
            </section>

            <section className="doc-section" id="the-problem">
              <div className="doc-section-header">
                <div className="doc-section-number">02</div>
                <div>
                  <h2>The problem</h2>
                  <p>
                    Markets move faster than most users can react. Capital gets split across dashboards, chains, exchanges, bots, and idle wallets. Even when a user has a good idea, the operational steps create delay: bridge, swap, fund, create, bet, hedge, and review.
                  </p>
                  <ul className="doc-list">
                    <li>Prediction markets still require manual discovery, question writing, liquidity setup, and resolution discipline.</li>
                    <li>Portfolio tools usually stop at recommendations instead of coordinating with live opportunities.</li>
                    <li>Betting tools often ignore total portfolio risk and over-allocate to isolated edges.</li>
                    <li>Cross-chain stablecoin movement adds friction when the execution venue changes.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="doc-section" id="architecture">
              <div className="doc-section-header">
                <div className="doc-section-number">03</div>
                <div>
                  <h2>Architecture</h2>
                  <p>
                    Flintex is structured as a control plane for autonomous financial agents. The UI presents live dashboards and decision logs, the backend routes FreeModel requests, and the settlement layer turns approved decisions into USDC actions on the deployed PredictionMarket contract.
                  </p>
                  <div className="layer-grid">
                    {architectureLayers.map((layer) => (
                      <div className="layer-card" key={layer.name}>
                        <strong>{layer.name}</strong>
                        <span>{layer.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="doc-section" id="core-concepts">
              <div className="doc-section-header">
                <div className="doc-section-number">04</div>
                <div>
                  <h2>Core concepts</h2>
                  <p>
                    Flintex is built around capital competition. Each agent has a job, but no agent owns money permanently. The allocator can direct more capital to defense, market creation, or betting depending on opportunity quality and risk state.
                  </p>
                  <ul className="doc-list">
                    <li><strong>Shared pool:</strong> USDC is treated as one portfolio-level resource.</li>
                    <li><strong>Agent score:</strong> each agent returns a confidence, expected value, urgency, and risk signal.</li>
                    <li><strong>Policy gate:</strong> user-approved limits decide whether a proposed action can execute.</li>
                    <li><strong>Decision log:</strong> every agent cycle must be explainable in human-readable language.</li>
                    <li><strong>Settlement record:</strong> execution should map back to a transaction, market, or position.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="doc-section" id="flintex-lifecycle">
              <div className="doc-section-header">
                <div className="doc-section-number">05</div>
                <div>
                  <h2>Flintex lifecycle</h2>
                  <p>
                    A Flintex cycle starts with user capital and ends with a reviewed decision. The same loop repeats continuously, which lets agents react to changing conditions without losing the portfolio-level view.
                  </p>
                  <ul className="doc-list">
                    {lifecycle.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="doc-section" id="agent-identity">
              <div className="doc-section-header">
                <div className="doc-section-number">06</div>
                <div>
                  <h2>Agent identity</h2>
                  <p>
                    Flintex treats agents as named operators with narrow mandates. That separation matters because a portfolio defense action, a market creation action, and a bet sizing action carry different risk and require different permissions.
                  </p>
                  <ul className="doc-list">
                    <li><strong>PortfolioAgent:</strong> can inspect balances, classify risk regime, and recommend USYC or asset allocation changes.</li>
                    <li><strong>MarketAgent:</strong> can convert news into market drafts and submit createMarket onchain after wallet approval.</li>
                    <li><strong>BetAgent:</strong> can compare model odds to real contract odds, apply Kelly sizing, and submit betYes or betNo after wallet approval.</li>
                    <li><strong>Master allocator:</strong> compares all agent scores and applies user policy before capital moves.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="doc-section" id="smart-contracts">
              <div className="doc-section-header">
                <div className="doc-section-number">07</div>
                <div>
                  <h2>Smart contracts</h2>
                  <p>
                    The deployed PredictionMarket contract now powers market creation, YES/NO bets, resolution, claims, and position reads on Arc testnet.
                  </p>
                  <ul className="doc-list">
                    <li><strong>PredictionMarket:</strong> creates markets, tracks YES and NO positions, resolves outcomes, and pays winners.</li>
                    <li><strong>Read surface:</strong> marketCount, markets(marketId), getPosition, quotePayout, and quoteBetPayout drive the Markets and Bets pages.</li>
                    <li><strong>Wallet flow:</strong> users approve USDC first, then call createMarket, betYes, betNo, or claimPayout from the connected wallet.</li>
                    <li><strong>Audit trail:</strong> every market, bet, and payout emits onchain events that can be surfaced in the UI or docs later.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="doc-section" id="rest-api">
              <div className="doc-section-header">
                <div className="doc-section-number">08</div>
                <div>
                  <h2>REST API</h2>
                  <p>
                    Flintex currently exposes backend routes for live agent analysis. These routes are intentionally small and readable so each agent can evolve without hiding product behavior behind a black box.
                  </p>
                  <div className="api-box" aria-label="Flintex API examples">
                    <code>{`POST /api/portfolio-agent
body: { "address": "0x...", "portfolio": [{ "asset": "USDC", "amount": "100.0000", "value": "$100.00" }] }
returns: { "regime": "RISK-ON", "usycAllocation": 15, "reasoning": ["..."] }

POST /api/market-agent
body: {}
returns: [{ "title": "...", "description": "...", "resolutionCriteria": "...", "deadline": "YYYY-MM-DD", "initialLiquidity": "5 USDC", "aiProbability": 58, "category": "Macro", "triggeredByNews": "..." }]

POST /api/bet-agent
body: { "openMarkets": [{ "marketId": "1", "title": "...", "crowdOdds": 42.1 }] }
returns: { "opportunities": [{ "marketId": "1", "title": "...", "aiProbability": 58.2, "crowdOdds": 42.1, "disagreementScore": 16.1, "kellySize": 0.08, "expectedValue": 0.12, "isHighAlpha": true, "recommendation": "HIGH_ALPHA_BET_YES" }] }`}</code>
                  </div>
                  <p>
                    The live agent services use FreeModel at <code>https://cc.freemodel.dev</code> with model <code>claude-haiku-4-5-20251001</code>.
                  </p>
                </div>
              </div>
            </section>

            <section className="doc-section" id="sdk-guide">
              <div className="doc-section-header">
                <div className="doc-section-number">09</div>
                <div>
                  <h2>SDK guide</h2>
                  <p>
                    The Flintex SDK will let developers add new agents without rewriting wallet, policy, accounting, or settlement logic. A valid agent should declare its role, inputs, scoring method, permissions, and execution adapter.
                  </p>
                  <ul className="doc-list">
                    <li>Implement <code>score(context)</code> to return expected value, confidence, urgency, and risk.</li>
                    <li>Implement <code>explain(decision)</code> so users can review the model reasoning.</li>
                    <li>Declare supported assets, market types, max position size, and required data feeds.</li>
                    <li>Use the allocator client to request capital instead of pulling directly from the wallet.</li>
                    <li>Return transaction intents that can be checked by policy gates before execution.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="doc-section" id="faq">
              <div className="doc-section-header">
                <div className="doc-section-number">10</div>
                <div>
                  <h2>FAQ</h2>
                  <div className="faq-grid">
                    {faq.map((item) => (
                      <div className="faq-card" key={item.question}>
                        <strong>{item.question}</strong>
                        <span>{item.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="doc-section" id="glossary">
              <div className="doc-section-header">
                <div className="doc-section-number">11</div>
                <div>
                  <h2>Glossary</h2>
                  <div className="glossary-grid">
                    {glossary.map(([term, definition]) => (
                      <div className="glossary-row" key={term}>
                        <strong>{term}</strong>
                        <span>{definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="doc-section" id="roadmap">
              <div className="doc-section-header">
                <div className="doc-section-number">12</div>
                <div>
                  <h2>Roadmap</h2>
                  <p>
                    Flintex should grow from a focused hackathon product into a production-grade agent market OS. The roadmap is staged around the hardest problems first: user trust, contract safety, controlled autonomy, and capital routing.
                  </p>
                  <div className="roadmap-grid">
                    {roadmap.map((phase) => (
                      <div className="roadmap-card" key={phase.phase}>
                        <div className="roadmap-meta">
                          <span>{phase.phase}</span>
                          <span>{phase.window}</span>
                        </div>
                        <strong>{phase.title}</strong>
                        <ul className="doc-list">
                          {phase.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="docs-cta">
              <div>
                <strong>Launch the Flintex app</strong>
                <span>Move from the docs into the three live agent dashboards.</span>
              </div>
              <Link href="/portfolio">Open PortfolioAgent</Link>
            </div>
          </article>
        </div>
      </main>
    </>
  )
}
