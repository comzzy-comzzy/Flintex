'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ChevronRight, Menu, Search, X } from 'lucide-react'

const desktopLinks = [
  { label: 'Overview', href: '/#overview' },
  { label: 'Agents', href: '/#agents' },
  { label: 'Stack', href: '/#stack' },
  { label: 'Docs', href: '/#docs' },
]

const menuLinks = [
  { label: 'Overview', href: '/#overview', meta: 'Capital pool flow' },
  { label: 'PortfolioAgent', href: '/portfolio', meta: 'Regime detection and USYC allocation' },
  { label: 'MarketAgent', href: '/markets', meta: 'Macro scan and market creation' },
  { label: 'BetAgent', href: '/bets', meta: 'Kelly sizing and edge monitor' },
  { label: 'Agents', href: '/#agents', meta: 'Three autonomous desks' },
  { label: 'Stack', href: '/#stack', meta: 'Arc, Circle Wallets, USDC rails' },
  { label: 'Docs', href: '/#docs', meta: 'Architecture and launch reference' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', handleKeydown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [menuOpen])

  const filteredMenuLinks = menuLinks.filter((item) => {
    const searchTarget = `${item.label} ${item.meta}`.toLowerCase()
    return searchTarget.includes(query.trim().toLowerCase())
  })

  const isActive = (href: string) => {
    if (href.startsWith('/#')) return pathname === '/' && href.includes('overview')
    return pathname === href
  }

  return (
    <>
      <style>{`
        .navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; height: 60px; border-bottom: 1px solid #0f1e2e; background: rgba(6,10,15,0.85); backdrop-filter: blur(12px); transition: border-color 0.3s; }
        .navbar.scrolled { border-bottom-color: #1e3a4f; }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
        .nav-wordmark { font-family: 'Instrument Serif', serif; font-size: 20px; color: #f0f9ff; letter-spacing: -0.02em; }
        .nav-links { display: flex; align-items: center; gap: 32px; list-style: none; margin: 0 40px; }
        .nav-links a { color: #94a3b8; text-decoration: none; font-size: 13.5px; font-family: 'Geist', sans-serif; transition: color 0.2s; }
        .nav-links a:hover { color: #f0f9ff; }
        .nav-cta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .menu-toggle { display: none; width: 38px; height: 38px; border: 1px solid #1e3a4f; border-radius: 8px; background: #090d14; color: #f0f9ff; align-items: center; justify-content: center; cursor: pointer; transition: border-color 0.2s, color 0.2s, background 0.2s; }
        .menu-toggle:hover { border-color: #67e8f9; color: #67e8f9; background: #0d1520; }
        .mobile-menu-shell { position: fixed; inset: 0; z-index: 99; pointer-events: none; }
        .mobile-menu-shell.open { pointer-events: auto; }
        .mobile-menu-backdrop { position: absolute; inset: 0; background: rgba(3,7,12,0.72); opacity: 0; transition: opacity 0.2s ease; }
        .mobile-menu-shell.open .mobile-menu-backdrop { opacity: 1; }
        .mobile-menu-panel { position: absolute; top: 60px; left: 0; right: 0; max-height: calc(100vh - 60px); overflow-y: auto; background: #060a0f; border-bottom: 1px solid #1e3a4f; transform: translateY(-14px); opacity: 0; transition: transform 0.2s ease, opacity 0.2s ease; box-shadow: 0 24px 60px rgba(0,0,0,0.34); }
        .mobile-menu-shell.open .mobile-menu-panel { transform: translateY(0); opacity: 1; }
        .mobile-menu-inner { padding: 18px 16px 24px; }
        .menu-protocol { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding-bottom: 14px; border-bottom: 1px solid #0f1e2e; }
        .menu-title { font-family: 'Geist Mono', monospace; font-size: 11px; line-height: 1.6; color: #67e8f9; letter-spacing: 0.14em; text-transform: uppercase; }
        .menu-subtitle { display: block; color: #475569; font-size: 10px; letter-spacing: 0.1em; margin-top: 2px; }
        .menu-status { font-family: 'Geist Mono', monospace; font-size: 10px; color: #94a3b8; white-space: nowrap; }
        .menu-search { position: relative; margin: 16px 0 20px; }
        .menu-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #475569; }
        .menu-search input { width: 100%; height: 38px; padding: 0 12px 0 38px; border: 1px solid #0f1e2e; border-radius: 0; background: #090d14; color: #f0f9ff; font-family: 'Geist Mono', monospace; font-size: 11px; letter-spacing: 0.08em; outline: none; }
        .menu-search input:focus { border-color: #67e8f9; }
        .menu-search input::placeholder { color: #475569; }
        .menu-group-label { font-family: 'Geist Mono', monospace; font-size: 9.5px; color: #475569; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 10px; }
        .menu-list { list-style: none; border-top: 1px solid #0f1e2e; }
        .menu-row { border-bottom: 1px solid #0f1e2e; }
        .menu-row a { display: grid; grid-template-columns: 28px minmax(0, 1fr) 20px; align-items: center; gap: 0; padding: 14px 0; color: #f0f9ff; text-decoration: none; }
        .menu-row a:hover, .menu-row a.active { background: linear-gradient(90deg, rgba(103,232,249,0.11), transparent 64%); }
        .menu-index { font-family: 'Geist Mono', monospace; font-size: 10px; color: #475569; }
        .menu-row a.active .menu-index, .menu-row a.active .menu-label { color: #67e8f9; }
        .menu-label { display: block; font-family: 'Geist Mono', monospace; font-size: 12px; color: #f0f9ff; letter-spacing: 0.06em; text-transform: uppercase; }
        .menu-meta { display: block; margin-top: 3px; color: #94a3b8; font-size: 12px; line-height: 1.35; }
        .menu-arrow { color: #475569; justify-self: end; }
        .menu-empty { padding: 18px 0; color: #94a3b8; font-family: 'Geist Mono', monospace; font-size: 11px; border-top: 1px solid #0f1e2e; border-bottom: 1px solid #0f1e2e; }
        .menu-wallet { margin-top: 18px; padding-top: 18px; border-top: 1px solid #0f1e2e; }
        @media (max-width: 900px) {
          .navbar { padding: 0 20px; }
          .nav-links { display: none; }
          .menu-toggle { display: inline-flex; }
        }
        @media (max-width: 560px) {
          .navbar { padding: 0 14px; }
          .desktop-connect { display: none; }
          .nav-wordmark { font-size: 19px; }
        }
      `}</style>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <Link href="/" className="nav-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L28.7 9.5V24.5L16 32L3.3 24.5V9.5L16 2Z" fill="#0d1520" stroke="#67e8f9" strokeWidth="1"/>
            <path d="M18 7L10 17H16L14 25L22 14H16L18 7Z" fill="#67e8f9"/>
            <circle cx="16" cy="16" r="2" fill="#a5f3fc" opacity="0.6"/>
          </svg>
          <span className="nav-wordmark">Flintex</span>
        </Link>

        <ul className="nav-links">
          {desktopLinks.map((item) => (
            <li key={item.label}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>

        <div className="nav-cta">
          <div className="desktop-connect">
            <ConnectButton />
          </div>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close Flintex menu' : 'Open Flintex menu'}
            aria-expanded={menuOpen}
            aria-controls="flintex-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      <div
        id="flintex-mobile-menu"
        className={`mobile-menu-shell${menuOpen ? ' open' : ''}`}
        aria-hidden={!menuOpen}
        hidden={!menuOpen}
      >
        <button
          type="button"
          className="mobile-menu-backdrop"
          aria-label="Close Flintex menu"
          onClick={() => setMenuOpen(false)}
        />
        <div className="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Flintex navigation menu">
          <div className="mobile-menu-inner">
            <div className="menu-protocol">
              <div className="menu-title">
                FLINTEX // AGENT MARKET OS
                <span className="menu-subtitle">DOCS v0.1 / ARC TESTNET</span>
              </div>
              <div className="menu-status">3 AGENTS</div>
            </div>

            <label className="menu-search" htmlFor="flintex-menu-search">
              <Search size={14} aria-hidden="true" />
              <input
                id="flintex-menu-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="SEARCH_FLINTEX..."
                autoComplete="off"
              />
            </label>

            <div className="menu-group-label">Core Navigation</div>
            {filteredMenuLinks.length > 0 ? (
              <ul className="menu-list">
                {filteredMenuLinks.map((item, index) => (
                  <li className="menu-row" key={item.href}>
                    <Link
                      href={item.href}
                      className={isActive(item.href) ? 'active' : ''}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="menu-index">{String(index + 1).padStart(2, '0')}</span>
                      <span>
                        <span className="menu-label">{item.label}</span>
                        <span className="menu-meta">{item.meta}</span>
                      </span>
                      <ChevronRight className="menu-arrow" size={16} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="menu-empty">NO_FLINTEX_MATCH</div>
            )}

            <div className="menu-wallet">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
