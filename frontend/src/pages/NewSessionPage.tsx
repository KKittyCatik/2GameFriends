import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Session } from '../types'

export function NewSessionPage() {
  const [title, setTitle]   = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const session = await api.post<Session>('/api/sessions', { title: title.trim() })
      navigate(`/session/${session.id}`)
    } finally {
      setLoading(false)
    }
  }

  const suggestions = ['Пятничный покер', 'Субботняя игра', 'Домашний турнир', 'Покер у Антона']

  return (
    <form onSubmit={submit}>
      <div className="field-group" style={{ marginBottom: 16 }}>
        <label className="field-label">Название игры</label>
        <input
          className="input"
          placeholder="Пятничный покер"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {suggestions.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setTitle(s)}
            style={{
              background: title === s ? 'var(--zinc-900)' : 'var(--surface)',
              color: title === s ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderColor: title === s ? 'var(--zinc-900)' : 'var(--border)',
              borderRadius: 'var(--r-sm)',
              padding: '7px 12px',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 150ms',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={loading || !title.trim()}
      >
        {loading ? 'Создаём...' : 'Создать игру'}
      </button>
    </form>
  )
}
