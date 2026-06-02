import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Session } from '../types'

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="4" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 9h18" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

export function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get<Session[]>('/api/sessions')
      .then(d => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  const active   = sessions.filter(s => s.status === 'active')
  const finished = sessions.filter(s => s.status === 'finished')

  if (loading) return (
    <>
      <div className="skeleton" style={{ height: 72, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 72, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 72 }} />
    </>
  )

  if (sessions.length === 0) return (
    <div className="empty-state stagger-item">
      <div className="empty-state-icon"><CardIcon /></div>
      <div className="empty-state-title">Нет игр</div>
      <div className="empty-state-desc">Создай первую сессию и начни считать закупы</div>
      <Link to="/new" className="btn-primary" style={{ display: 'block', maxWidth: 180, margin: '0 auto' }}>
        Создать игру
      </Link>
    </div>
  )

  return (
    <>
      {active.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="section-label">Активные</div>
          <div className="surface">
            {active.map((s, i) => (
              <Link key={s.id} to={`/session/${s.id}`} className={`session-item stagger-item`} style={{ animationDelay: `${i * 40}ms` }}>
                <div className="session-item-dot active" />
                <div style={{ flex: 1 }}>
                  <div className="session-item-name">{s.title}</div>
                  <div className="session-item-date">{new Date(s.started_at).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="session-item-arrow"><ChevronRight /></div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {finished.length > 0 && (
        <div>
          <div className="section-label">История</div>
          <div className="surface">
            {finished.map((s, i) => (
              <Link key={s.id} to={`/session/${s.id}`} className="session-item stagger-item" style={{ animationDelay: `${(active.length + i) * 40}ms` }}>
                <div className="session-item-dot" />
                <div style={{ flex: 1 }}>
                  <div className="session-item-name">{s.title}</div>
                  <div className="session-item-date">{new Date(s.started_at).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="session-item-arrow"><ChevronRight /></div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
