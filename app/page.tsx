'use client'
import { useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    document.querySelectorAll('.reveal, .stagger-children').forEach(el => observer.observe(el))
    window.addEventListener('scroll', () => {
      const nav = document.querySelector('nav')
      if (nav) nav.style.borderBottomColor = window.scrollY > 10 ? '#1e3a4f' : '#0f1e2e'
    })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #060a0f; color: #f0f9ff; font-family: 'Geist', sans-serif; font-size: 15px; line-height: 1.6; overflow-x: hidden; }
        body::before { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 999; opacity: 0.5; }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }

        .hero-badge::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: #67e8f9; box-shadow: 0 0 8px #67e8f9; animation: pulse 2s infinite; display: inline-block; margin-right: 7px; }
        .hero-left > * { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) forwards; opacity: 0; }
        .hero-left > *:nth-child(1) { animation-delay: 0.05s; }
        .hero-left > *:nth-child(2) { animation-delay: 0.18s; }
        .hero-left > *:nth-child(3) { animation-delay: 0.30s; }
        .hero-left > *:nth-child(4) { animation-delay: 0.42s; }
        .hero-visual { animation: slideInRight 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s forwards; opacity: 0; display: flex; justify-content: center; align-items: center; }

        .reveal { opacity: 0; transform: translateY(36px); transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1); }
        .reveal-left { transform: translateX(-36px); }
        .reveal-right { transform: translateX(36px); }
        .reveal.visible { opacity: 1; transform: translate(0,0); }
        .stagger-children > * { opacity: 0; transform: translateY(28px); transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1); }
        .stagger-children.visible > *:nth-child(1) { transition-delay: 0.00s; }
        .stagger-children.visible > *:nth-child(2) { transition-delay: 0.08s; }
        .stagger-children.visible > *:nth-child(3) { transition-delay: 0.16s; }
        .stagger-children.visible > *:nth-child(4) { transition-delay: 0.24s; }
        .stagger-children.visible > *:nth-child(5) { transition-delay: 0.32s; }
        .stagger-children.visible > *:nth-child(6) { transition-delay: 0.40s; }
        .stagger-children.visible > * { opacity: 1; transform: translateY(0); }

        .hero { display: grid; grid-template-columns: 1fr 1fr; align-items: center; padding: 100px 40px 60px; max-width: 1200px; margin: 0 auto; gap: 60px; }
        .hero-badge { display: inline-flex; align-items: center; font-family: 'Geist Mono', monospace; font-size: 11px; color: #67e8f9; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 28px; }
        .hero h1 { font-family: 'Instrument Serif', serif; font-size: clamp(38px, 5vw, 56px); line-height: 1.08; letter-spacing: -0.02em; color: #f0f9ff; margin-bottom: 20px; }
        .hero h1 em { font-style: italic; color: #67e8f9; }
        .hero-sub { color: #94a3b8; font-size: 15px; line-height: 1.7; max-width: 440px; margin-bottom: 36px; font-weight: 300; }
        .hero-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

        .btn-ghost { background: none; border: 1px solid #1e3a4f; color: #94a3b8; padding: 7px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: 'Geist', sans-serif; transition: all 0.2s; }
        .btn-ghost:hover { color: #f0f9ff; border-color: #67e8f9; }
        .btn-primary { background: #67e8f9; color: #060a0f; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Geist', sans-serif; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary:hover { background: #22d3ee; }
        .btn-primary-lg { background: #67e8f9; color: #060a0f; border: none; padding: 10px 22px; border-radius: 6px; font-size: 13.5px; font-weight: 500; cursor: pointer; font-family: 'Geist', sans-serif; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary-lg:hover { background: #22d3ee; }
        .btn-outline { background: none; border: 1px solid #1e3a4f; color: #f0f9ff; padding: 9px 20px; border-radius: 6px; font-size: 13.5px; cursor: pointer; font-family: 'Geist', sans-serif; text-decoration: none; transition: all 0.2s; }
        .btn-outline:hover { border-color: #67e8f9; color: #67e8f9; }

        .agent-card { background: #090d14; border: 1px solid #1e3a4f; border-radius: 16px; padding: 28px; width: 100%; max-width: 360px; position: relative; overflow: hidden; }
        .agent-card::before { content: ''; position: absolute; top: -60px; right: -60px; width: 180px; height: 180px; background: radial-gradient(circle, #67e8f915 0%, transparent 70%); pointer-events: none; }
        .card-label { font-family: 'Geist Mono', monospace; font-size: 10px; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px; }
        .card-balance { font-family: 'Instrument Serif', serif; font-size: 42px; color: #f0f9ff; letter-spacing: -0.02em; margin-bottom: 4px; }
        .card-change { font-family: 'Geist Mono', monospace; font-size: 12px; color: #67e8f9; margin-bottom: 28px; }
        .card-agents { display: flex; flex-direction: column; gap: 10px; }
        .agent-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #0d1520; border-radius: 8px; border: 1px solid #0f1e2e; }
        .agent-row-left { display: flex; align-items: center; gap: 10px; }
        .agent-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .dot-ice { background: #67e8f9; box-shadow: 0 0 6px #67e8f9; }
        .dot-green { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
        .dot-blue { background: #60a5fa; box-shadow: 0 0 6px #60a5fa; }
        .agent-name { font-size: 12.5px; color: #f0f9ff; }
        .agent-status { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: #94a3b8; }
        .agent-alloc { font-family: 'Geist Mono', monospace; font-size: 12px; color: #67e8f9; }

        .stats-bar { border-top: 1px solid #0f1e2e; border-bottom: 1px solid #0f1e2e; display: grid; grid-template-columns: repeat(4, 1fr); }
        .stat-item { padding: 28px 40px; border-right: 1px solid #0f1e2e; }
        .stat-item:last-child { border-right: none; }
        .stat-label { font-family: 'Geist Mono', monospace; font-size: 10px; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
        .stat-value { font-family: 'Instrument Serif', serif; font-size: 28px; color: #f0f9ff; letter-spacing: -0.02em; }
        .stat-sub { font-size: 11px; color: #475569; margin-top: 2px; font-family: 'Geist Mono', monospace; }

        section { max-width: 1200px; margin: 0 auto; padding: 100px 40px; }
        .section-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: #67e8f9; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 20px; }
        .section-title { font-family: 'Instrument Serif', serif; font-size: clamp(28px, 3.5vw, 42px); line-height: 1.1; letter-spacing: -0.02em; color: #f0f9ff; margin-bottom: 16px; max-width: 640px; }
        .section-sub { color: #94a3b8; font-size: 15px; max-width: 520px; line-height: 1.7; font-weight: 300; }

        .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #0f1e2e; border: 1px solid #0f1e2e; border-radius: 12px; overflow: hidden; margin-top: 56px; }
        .step-card { background: #090d14; padding: 28px 24px; transition: background 0.2s; }
        .step-card:hover { background: #0d1520; }
        .step-num { font-family: 'Geist Mono', monospace; font-size: 10px; color: #475569; letter-spacing: 0.08em; margin-bottom: 20px; }
        .step-title { font-size: 14px; font-weight: 500; color: #f0f9ff; margin-bottom: 10px; }
        .step-desc { font-size: 12.5px; color: #94a3b8; line-height: 1.65; font-weight: 300; }

        .agents-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 56px; }
        .agent-feature-card { background: #090d14; border: 1px solid #0f1e2e; border-radius: 12px; padding: 32px 28px; transition: border-color 0.2s; position: relative; overflow: hidden; }
        .agent-feature-card:hover { border-color: #1e3a4f; }
        .agent-feature-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #67e8f9, transparent); opacity: 0; transition: opacity 0.3s; }
        .agent-feature-card:hover::after { opacity: 1; }
        .afc-tag { font-family: 'Geist Mono', monospace; font-size: 10px; color: #67e8f9; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
        .afc-title { font-family: 'Instrument Serif', serif; font-size: 22px; color: #f0f9ff; margin-bottom: 12px; letter-spacing: -0.01em; }
        .afc-desc { font-size: 13px; color: #94a3b8; line-height: 1.7; font-weight: 300; margin-bottom: 24px; }
        .afc-features { list-style: none; display: flex; flex-direction: column; gap: 7px; }
        .afc-features li { font-size: 12.5px; color: #475569; display: flex; align-items: center; gap: 8px; }
        .afc-features li::before { content: '→'; color: #67e8f9; font-size: 11px; }

        .code-section { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .code-block { background: #090d14; border: 1px solid #1e3a4f; border-radius: 12px; overflow: hidden; }
        .code-header { display: flex; align-items: center; gap: 7px; padding: 14px 18px; border-bottom: 1px solid #0f1e2e; background: #0d1520; }
        .code-dot { width: 10px; height: 10px; border-radius: 50%; }
        .cd-red { background: #ff5f57; }
        .cd-yellow { background: #febc2e; }
        .cd-green { background: #28c840; }
        .code-filename { font-family: 'Geist Mono', monospace; font-size: 11px; color: #475569; margin-left: 6px; }
        pre { padding: 24px 20px; font-family: 'Geist Mono', monospace; font-size: 12px; line-height: 1.75; color: #94a3b8; overflow-x: auto; }
        .tok-comment { color: #475569; }
        .tok-key { color: #67e8f9; }
        .tok-str { color: #a3e635; }
        .tok-fn { color: #60a5fa; }
        .code-link { display: block; padding: 14px 18px; border-top: 1px solid #0f1e2e; font-family: 'Geist Mono', monospace; font-size: 11px; color: #67e8f9; text-decoration: none; transition: background 0.2s; }
        .code-link:hover { background: #0d1520; }

        .principles-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #0f1e2e; border: 1px solid #0f1e2e; border-radius: 12px; overflow: hidden; margin-top: 56px; }
        .principle-card { background: #090d14; padding: 28px 24px; transition: background 0.2s; }
        .principle-card:hover { background: #0d1520; }
        .pc-tag { font-family: 'Geist Mono', monospace; font-size: 9.5px; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }
        .pc-title { font-family: 'Instrument Serif', serif; font-size: 17px; color: #f0f9ff; line-height: 1.3; }

        .stack-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 48px; }
        .stack-card { background: #090d14; border: 1px solid #0f1e2e; border-radius: 10px; padding: 22px 20px; transition: border-color 0.2s; }
        .stack-card:hover { border-color: #1e3a4f; }
        .sc-label { font-family: 'Geist Mono', monospace; font-size: 9.5px; color: #67e8f9; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
        .sc-title { font-size: 13.5px; font-weight: 500; color: #f0f9ff; margin-bottom: 6px; }
        .sc-desc { font-size: 12px; color: #475569; line-height: 1.6; font-weight: 300; }

        .footer-cta { border-top: 1px solid #0f1e2e; text-align: center; padding: 100px 40px; }
        .footer-cta h2 { font-family: 'Instrument Serif', serif; font-size: clamp(32px, 4vw, 52px); letter-spacing: -0.02em; color: #f0f9ff; margin-bottom: 16px; line-height: 1.1; }
        .footer-cta h2 em { font-style: italic; color: #67e8f9; }
        .footer-cta p { color: #94a3b8; font-size: 15px; margin-bottom: 36px; font-weight: 300; }
        .footer-cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .footer-bottom { border-top: 1px solid #0f1e2e; padding: 24px 40px; display: flex; align-items: center; justify-content: space-between; }
        .footer-bottom-logo { display: flex; align-items: center; gap: 8px; font-family: 'Instrument Serif', serif; font-size: 16px; color: #94a3b8; text-decoration: none; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 12px; color: #475569; text-decoration: none; font-family: 'Geist Mono', monospace; transition: color 0.2s; }
        .footer-links a:hover { color: #94a3b8; }
        .footer-powered { font-family: 'Geist Mono', monospace; font-size: 11px; color: #475569; }
        .footer-powered span { color: #67e8f9; }

        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; padding: 90px 20px 60px; gap: 40px;  }
          .stats-bar { grid-template-columns: repeat(2, 1fr); }
          .stat-item { padding: 20px; }
          section { padding: 60px 20px; }
          .steps-grid { grid-template-columns: repeat(2, 1fr); }
          .agents-grid { grid-template-columns: 1fr; }
          .code-section { grid-template-columns: 1fr; gap: 40px; }
          .principles-grid { grid-template-columns: repeat(2, 1fr); }
          .stack-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-bottom { flex-direction: column; gap: 16px; text-align: center; }
        }
      `}</style>

      <Navbar />

      {/* HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-badge">Live on Arc Testnet</div>
          <h1>Three agents.<br /><em>One capital pool.</em><br />Every edge.</h1>
          <p className="hero-sub">Flintex deploys three autonomous AI agents that share a single USDC wallet — rebalancing your portfolio, creating macro prediction markets, and sizing bets with Kelly Criterion. All settled on Arc in under a second.</p>
          <div className="hero-actions">
            <Link href="#overview" className="btn-outline">Read the docs</Link>
            <Link href="#agents" className="btn-outline" style={{ color: '#94a3b8' }}>View agents</Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="agent-card">
            <div className="card-label">Flintex · Capital Pool · Arc Testnet</div>
            <div className="card-balance">$24,850.00</div>
            <div className="card-change">↑ +3.2% · Regime: RISK-ON · USYC yield active</div>
            <div className="card-agents">
              <div className="agent-row">
                <div className="agent-row-left"><span className="agent-dot dot-ice"></span><span className="agent-name">PortfolioAgent</span></div>
                <span className="agent-status">REBALANCING</span>
                <span className="agent-alloc">42%</span>
              </div>
              <div className="agent-row">
                <div className="agent-row-left"><span className="agent-dot dot-green"></span><span className="agent-name">MarketAgent</span></div>
                <span className="agent-status">3 MARKETS OPEN</span>
                <span className="agent-alloc">31%</span>
              </div>
              <div className="agent-row">
                <div className="agent-row-left"><span className="agent-dot dot-blue"></span><span className="agent-name">BetAgent</span></div>
                <span className="agent-status">2 +EV FOUND</span>
                <span className="agent-alloc">27%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="stats-bar stagger-children">
        <div className="stat-item"><div className="stat-label">Settlement time</div><div className="stat-value">&lt;1s</div><div className="stat-sub">Arc finality · deterministic</div></div>
        <div className="stat-item"><div className="stat-label">Cost per tx</div><div className="stat-value">~$0.01</div><div className="stat-sub">USDC · no volatile gas</div></div>
        <div className="stat-item"><div className="stat-label">Active agents</div><div className="stat-value">3</div><div className="stat-sub">Portfolio · Market · Bet</div></div>
        <div className="stat-item"><div className="stat-label">Powered by</div><div className="stat-value">Circle</div><div className="stat-sub">Wallets · USYC · Gateway · CCTP</div></div>
      </div>

      {/* HOW IT WORKS */}
      <section id="overview">
        <div className="section-eyebrow reveal">The flow</div>
        <h2 className="section-title reveal">Three agents. Zero manual decisions. Full market coverage.</h2>
        <p className="section-sub reveal">Connect your wallet, fund with testnet USDC, and Flintex&apos;s agents go to work autonomously across portfolio management, market creation, and intelligent betting.</p>
        <div className="steps-grid stagger-children">
          <div className="step-card"><div className="step-num">01</div><div className="step-title">Connect &amp; fund</div><p className="step-desc">Connect your Circle Wallet or create one in-app. Deposit testnet USDC. The capital pool is shared across all three agents.</p></div>
          <div className="step-card"><div className="step-num">02</div><div className="step-title">Agents activate</div><p className="step-desc">PortfolioAgent scans your holdings. MarketAgent monitors macro news. BetAgent watches open prediction markets for mispricing.</p></div>
          <div className="step-card"><div className="step-num">03</div><div className="step-title">AI allocates capital</div><p className="step-desc">A master AI brain decides every cycle how to split USDC between the three strategies based on current opportunity scores.</p></div>
          <div className="step-card"><div className="step-num">04</div><div className="step-title">Arc settles instantly</div><p className="step-desc">Every rebalance, market creation, and bet executes on Arc. Sub-second finality. ~$0.01 fees in USDC. No waiting, no reorgs.</p></div>
        </div>
      </section>

      {/* AGENTS */}
      <section id="agents">
        <div className="section-eyebrow reveal">The agents</div>
        <h2 className="section-title reveal">Each agent owns a job. All three share one wallet.</h2>
        <p className="section-sub reveal">No silos. One USDC pool flows dynamically between three autonomous strategies based on where the edge is highest right now.</p>
        <div className="agents-grid stagger-children">
          <div className="agent-feature-card">
            <div className="afc-tag">RFB 4 · Portfolio</div>
            <div className="afc-title">PortfolioAgent</div>
            <p className="afc-desc">Monitors your holdings, detects market regime, rebalances automatically, and parks idle USDC in USYC during risk-off periods.</p>
            <ul className="afc-features"><li>Regime detection (risk-on / risk-off)</li><li>Automatic rebalancing with reasoning log</li><li>USYC yield on idle capital</li><li>Cross-chain rebalancing via Gateway</li></ul>
          </div>
          <div className="agent-feature-card">
            <div className="afc-tag">RFB 3 · Markets</div>
            <div className="afc-title">MarketAgent</div>
            <p className="afc-desc">Scans macro and geopolitical news in real time, identifies events worth betting on, and creates USDC prediction markets on Arc automatically.</p>
            <ul className="afc-features"><li>Live news scanner with relevance scoring</li><li>Auto-creates markets: Fed, elections, CPI</li><li>USDC + EURC settlement support</li><li>Automated market resolution</li></ul>
          </div>
          <div className="agent-feature-card">
            <div className="afc-tag">RFB 2 · Bets</div>
            <div className="afc-title">BetAgent</div>
            <p className="afc-desc">Finds mispriced prediction markets, calculates true probability estimates, and sizes positions optimally using the Kelly Criterion formula.</p>
            <ul className="afc-features"><li>AI probability vs market-implied odds</li><li>Kelly Criterion position sizing</li><li>+EV opportunity detection</li><li>Active position tracker with PnL</li></ul>
          </div>
        </div>
      </section>

      {/* CODE SECTION */}
      <section>
        <div className="code-section">
          <div className="reveal reveal-left">
            <div className="section-eyebrow">Integration</div>
            <h2 className="section-title">Three agents wired to one shared brain.</h2>
            <p className="section-sub">The master allocator runs every cycle — scoring opportunities across all three agents and splitting USDC to where the edge is sharpest. Every decision is logged onchain.</p>
            <br/>
            <a href="#docs" style={{ fontFamily: "'Geist Mono', monospace", fontSize: '12px', color: '#67e8f9', textDecoration: 'none' }}>See the full architecture →</a>
          </div>
          <div className="code-block reveal reveal-right">
            <div className="code-header">
              <span className="code-dot cd-red"></span>
              <span className="code-dot cd-yellow"></span>
              <span className="code-dot cd-green"></span>
              <span className="code-filename">capitalPool.ts</span>
            </div>
            <pre dangerouslySetInnerHTML={{ __html: `<span class="tok-comment">// Master allocator — runs every 60s</span>
<span class="tok-key">const</span> pool = <span class="tok-key">await</span> <span class="tok-fn">getCapitalPool</span>(walletId);

<span class="tok-key">const</span> scores = {
  portfolio: <span class="tok-key">await</span> <span class="tok-fn">portfolioAgent</span>.score(),
  markets:   <span class="tok-key">await</span> <span class="tok-fn">marketAgent</span>.score(),
  bets:      <span class="tok-key">await</span> <span class="tok-fn">betAgent</span>.score(),
};

<span class="tok-comment">// AI decides allocation ratio</span>
<span class="tok-key">const</span> alloc = <span class="tok-fn">allocate</span>(pool.usdc, scores);

<span class="tok-comment">// Settle on Arc in &lt;1s</span>
<span class="tok-key">await</span> <span class="tok-fn">arcSettle</span>({
  walletId,
  allocation: alloc,
  paymaster: <span class="tok-str">'circle'</span>,
});` }} />
            <a href="#docs" className="code-link">SEE THE FULL REFERENCE →</a>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section>
        <div className="section-eyebrow reveal">Principles</div>
        <h2 className="section-title reveal">Built for agents. Settled like a bank.</h2>
        <div className="principles-grid stagger-children">
          <div className="principle-card"><div className="pc-tag">Arc-native</div><div className="pc-title">Sub-second finality,<br/>every time</div></div>
          <div className="principle-card"><div className="pc-tag">Circle Wallets</div><div className="pc-title">Embedded wallets,<br/>zero custody risk</div></div>
          <div className="principle-card"><div className="pc-tag">USYC yield</div><div className="pc-title">Idle capital earns,<br/>always</div></div>
          <div className="principle-card"><div className="pc-tag">Full autonomy</div><div className="pc-title">Agents decide,<br/>not humans</div></div>
        </div>
      </section>

      {/* STACK */}
      <section id="stack">
        <div className="section-eyebrow reveal">The stack</div>
        <h2 className="section-title reveal">Circle&apos;s full developer platform. On Arc.</h2>
        <p className="section-sub reveal">Flintex uses every primitive in the Circle stack — Wallets, USYC, Gateway, CCTP, Paymaster, and App Kit — to build the first three-agent market OS.</p>
        <div className="stack-grid stagger-children">
          <div className="stack-card"><div className="sc-label">Circle Wallets</div><div className="sc-title">Embedded wallet per user</div><p className="sc-desc">Every Flintex user gets a Circle Wallet. Agents operate from the same wallet, sharing one USDC pool.</p></div>
          <div className="stack-card"><div className="sc-label">USYC</div><div className="sc-title">Yield on idle capital</div><p className="sc-desc">PortfolioAgent moves idle USDC to USYC during risk-off regimes. Capital works even when agents are waiting.</p></div>
          <div className="stack-card"><div className="sc-label">Gateway</div><div className="sc-title">Unified cross-chain balance</div><p className="sc-desc">Fund Flintex from any chain. Gateway normalizes everything to Arc USDC in under 500ms.</p></div>
          <div className="stack-card"><div className="sc-label">CCTP</div><div className="sc-title">Cross-chain USDC moves</div><p className="sc-desc">PortfolioAgent rebalances across chains using CCTP for multi-venue collateral movement.</p></div>
          <div className="stack-card"><div className="sc-label">Paymaster</div><div className="sc-title">Gas fees in USDC</div><p className="sc-desc">No volatile gas tokens. Every agent transaction is fee-paid in USDC via Circle Paymaster.</p></div>
          <div className="stack-card"><div className="sc-label">App Kit</div><div className="sc-title">Bridge · Swap · Send</div><p className="sc-desc">Drop-in components for bridging, swapping, and sending USDC directly inside the Flintex UI.</p></div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <div className="footer-cta reveal" id="docs">
        <h2>Build agents<br /><em>that move markets.</em></h2>
        <p>Connect your wallet and let Flintex&apos;s three agents go to work. Arc testnet. Real decisions. Zero gas tokens.</p>
        <div className="footer-cta-btns">
          <Link href="/portfolio" className="btn-primary-lg">Launch app →</Link>
          <Link href="#overview" className="btn-outline">Read the docs</Link>
        </div>
      </div>

      {/* FOOTER BOTTOM */}
      <div className="footer-bottom">
        <Link href="/" className="footer-bottom-logo">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L28.7 9.5V24.5L16 32L3.3 24.5V9.5L16 2Z" fill="#0d1520" stroke="#67e8f9" strokeWidth="1"/>
            <path d="M18 7L10 17H16L14 25L22 14H16L18 7Z" fill="#67e8f9"/>
          </svg>
          Flintex
        </Link>
        <div className="footer-links">
          <Link href="#">Overview</Link>
          <Link href="#">Docs</Link>
          <Link href="#">GitHub</Link>
          <Link href="#">X / Twitter</Link>
        </div>
        <div className="footer-powered">
          Powered by <span>Arc</span> · <span>Circle</span> · <span>Anthropic</span>
        </div>
      </div>
    </>
  )
}
