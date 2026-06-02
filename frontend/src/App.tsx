import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { NewSessionPage } from './pages/NewSessionPage'
import { SessionPage } from './pages/SessionPage'
import { SummaryPage } from './pages/SummaryPage'

function BackIcon() {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
      <path d="M7 1L1 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Nav() {
  const loc = useLocation()
  const isHome = loc.pathname === '/'
  const isNew  = loc.pathname === '/new'
  const isSummary = loc.pathname.includes('/summary')

  if (isHome) return (
    <nav className="app-nav">
      <span className="app-nav-brand">Poker Friends</span>
      <Link to="/new" className="app-nav-action">Новая игра</Link>
    </nav>
  )

  if (isNew) return (
    <nav className="app-nav">
      <Link to="/" className="app-nav-back"><BackIcon /> Назад</Link>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Новая игра</span>
      <span style={{ width: 60 }} />
    </nav>
  )

  if (isSummary) return (
    <nav className="app-nav">
      <button className="app-nav-back" onClick={() => window.history.back()}><BackIcon /> Сессия</button>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Итоги</span>
      <span style={{ width: 60 }} />
    </nav>
  )

  return (
    <nav className="app-nav">
      <Link to="/" className="app-nav-back"><BackIcon /> Игры</Link>
      <span style={{ width: 60 }} />
    </nav>
  )
}

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page">
        <Routes>
          <Route path="/"                     element={<HomePage />} />
          <Route path="/new"                  element={<NewSessionPage />} />
          <Route path="/session/:id"          element={<SessionPage />} />
          <Route path="/session/:id/summary"  element={<SummaryPage />} />
        </Routes>
      </main>
    </div>
  )
}
