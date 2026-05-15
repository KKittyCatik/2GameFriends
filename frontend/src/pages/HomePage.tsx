import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Session } from '../types'

export function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    api.get<Session[]>('/api/sessions').then(setSessions).catch(() => setSessions([]))
  }, [])

  return (
    <section>
      <div className="row between">
        <h1>Активные сессии</h1>
        <Link className="btn" to="/new">Новая игра</Link>
      </div>
      <div className="grid">
        {sessions.map((session) => (
          <Link key={session.id} to={`/session/${session.id}`} className="card session-card">
            <h3>{session.title}</h3>
            <p>{new Date(session.started_at).toLocaleString()}</p>
            <span className={`pill ${session.status}`}>{session.status}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
