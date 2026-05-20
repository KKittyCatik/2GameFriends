import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Buyin, Player, Session, Summary } from '../types'
import { BuyinModal } from '../components/BuyinModal'
import { FinishPlayerModal } from '../components/FinishPlayerModal'

export function SessionPage() {
  const { id } = useParams()
  const sessionID = Number(id)

  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [buyins, setBuyins] = useState<Buyin[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [activeBuyinPlayer, setActiveBuyinPlayer] = useState<Player | null>(null)
  const [activeFinishPlayer, setActiveFinishPlayer] = useState<Player | null>(null)
  const [sheetURL, setSheetURL] = useState('')

  const load = async () => {
    try {
      const [s, p, b, sum] = await Promise.all([
        api.get<Session>(`/api/sessions/${sessionID}`),
        api.get<Player[]>(`/api/sessions/${sessionID}/players`),
        api.get<Buyin[]>(`/api/sessions/${sessionID}/buyins`),
        api.get<Summary>(`/api/sessions/${sessionID}/summary`)
      ])
      setSession(s)
      setPlayers(p)
      setBuyins(b)
      setSummary(sum)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить сессию')
    }
  }

  useEffect(() => {
    load()
  }, [sessionID])

  const buyinByPlayer = useMemo(() => {
  const map = new Map<number, number>()

  ;(buyins || []).forEach((buyin) => {
    map.set(
      buyin.player_id,
      (map.get(buyin.player_id) || 0) + buyin.amount
    )
  })

  return map
}, [buyins])

  const submitAddPlayer = async (e: FormEvent) => {
    e.preventDefault()
    await api.post(`/api/sessions/${sessionID}/players`, { name: newPlayerName, username: newUsername })
    setShowAddPlayer(false)
    setNewPlayerName('')
    setNewUsername('')
    await load()
  }

  const finishSession = async () => {
    await api.post(`/api/sessions/${sessionID}/finish`)
    await load()
  }

  const exportSheets = async () => {
    const response = await api.post<{ url: string }>(`/api/sessions/${sessionID}/export/sheets`)
    setSheetURL(response.url)
  }

  if (!session) return <p>Загрузка...</p>

  return (
    <section>
      <div className="card">
        <h1>{session.title}</h1>
        <p>{new Date(session.started_at).toLocaleString()} · {session.status}</p>
        {error && <p className="profit down">{error}</p>}
        <div className="row wrap">
          <button className="btn" onClick={() => setShowAddPlayer(true)}>Добавить игрока</button>
          <button className="btn btn-danger" onClick={finishSession}>Завершить сессию</button>
          <button className="btn" onClick={exportSheets}>Экспорт в Google Sheets</button>
          <Link className="btn btn-muted" to={`/session/${sessionID}/summary`}>Итоги</Link>
        </div>
        {sheetURL && <a href={sheetURL} target="_blank" rel="noreferrer">Открыть таблицу</a>}
      </div>

      {showAddPlayer && (
        <form className="card" onSubmit={submitAddPlayer}>
          <h3>Добавить игрока</h3>
          <input className="input" placeholder="Имя" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
          <input className="input" placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          <div className="row">
            <button className="btn" type="submit">Сохранить</button>
            <button className="btn btn-muted" type="button" onClick={() => setShowAddPlayer(false)}>Отмена</button>
          </div>
        </form>
      )}

      <div className="grid">
        {(players || []).map((player) => {
          const sum = summary?.rows?.find((row) => row.player_id === player.id)
          return (
            <div className="card flip" key={player.id}>
              <h3>{player.name} {player.username ? `@${player.username}` : ''}</h3>
              <p>Закупов: {sum?.buyins_count ?? 0} · Фишек: {buyinByPlayer.get(player.id) || 0}</p>
              <p>Остаток: {sum?.chips_remaining ?? 0}</p>
              <div className="row">
                <button className="btn" onClick={() => setActiveBuyinPlayer(player)}>Закуп +</button>
                <button className="btn btn-muted" onClick={() => setActiveFinishPlayer(player)}>Завершить игру</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card statbar">
        <span>Банк: {(buyins || []).reduce((acc, item) => acc + item.amount, 0)}</span>
        <span>Закупов: {buyins.length}</span>
        <span>Игроков: {players.length}</span>
      </div>

      {activeBuyinPlayer && (
        <BuyinModal
          playerName={activeBuyinPlayer.name}
          onClose={() => setActiveBuyinPlayer(null)}
          onSubmit={async (amount) => {
            await api.post(`/api/sessions/${sessionID}/buyins`, { player_id: activeBuyinPlayer.id, amount })
            setActiveBuyinPlayer(null)
            await load()
          }}
        />
      )}

      {activeFinishPlayer && (
        <FinishPlayerModal
          playerName={activeFinishPlayer.name}
          totalBuyin={buyinByPlayer.get(activeFinishPlayer.id) || 0}
          onClose={() => setActiveFinishPlayer(null)}
          onSubmit={async (chipsRemaining) => {
            await api.post(`/api/sessions/${sessionID}/players/${activeFinishPlayer.id}/finish`, { chips_remaining: chipsRemaining })
            setActiveFinishPlayer(null)
            await load()
          }}
        />
      )}
    </section>
  )
}
