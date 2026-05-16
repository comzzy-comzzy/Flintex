'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
        @media (max-width: 900px) {
          .navbar { padding: 0 20px; }
          .nav-links { display: none; }
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
          {['Overview', 'Agents', 'Stack', 'Docs'].map((item) => (
            <li key={item}>
              <Link href={`#${item.toLowerCase()}`}>{item}</Link>
            </li>
          ))}
        </ul>

        <div className="nav-cta">
          <ConnectButton />
        </div>
      </nav>
    </>
  )
}
