import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Session } from '../types'

export function NewSessionPage() {
  const [title, setTitle] = useState('Пятничный покер')
  const navigate = useNavigate()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const session = await api.post<Session>('/api/sessions', { title })
    navigate(`/session/${session.id}`)
  }

  return (
    <form className="card" onSubmit={submit}>
      <h1>Новая сессия</h1>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button className="btn" type="submit">Создать</button>
    </form>
  )
}
