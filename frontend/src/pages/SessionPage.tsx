import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Buyin, Player, Session, Summary } from '../types'
import { BuyinModal } from '../components/BuyinModal'
import { FinishPlayerModal } from '../components/FinishPlayerModal'
import { EditBuyinModal } from '../components/EditBuyinModal'
import { ConfirmSheet } from '../components/ConfirmSheet'

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 180ms cubic-bezier(0.23,1,0.32,1)' }}>
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M9.5 1.5l2 2L4 11H2v-2L9.5 1.5z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function SessionPage() {
  const { id } = useParams()
  const sessionID = Number(id)

  const [session, setSession]         = useState<Session | null>(null)
  const [players, setPlayers]         = useState<Player[]>([])
  const [buyins,  setBuyins]          = useState<Buyin[]>([])
  const [summary, setSummary]         = useState<Summary | null>(null)
  const [error,   setError]           = useState('')
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState<'players'|'buyins'>('players')

  const [showAddPlayer, setShowAddPlayer]   = useState(false)
  const [newPlayerName, setNewPlayerName]   = useState('')
  const [newUsername,   setNewUsername]     = useState('')

  const [activeBuyinPlayer,  setActiveBuyinPlayer]  = useState<Player | null>(null)
  const [activeFinishPlayer, setActiveFinishPlayer] = useState<Player | null>(null)
  const [editingBuyin,       setEditingBuyin]       = useState<Buyin | null>(null)
  const [showFinishConfirm,  setShowFinishConfirm]  = useState(false)
  const [expandedPlayer,     setExpandedPlayer]     = useState<number | null>(null)
  const [sheetURL,           setSheetURL]           = useState('')

  const load = async () => {
    try {
      const [s, p, b, sum] = await Promise.all([
        api.get<Session>(`/api/sessions/${sessionID}`),
        api.get<Player[]>(`/api/sessions/${sessionID}/players`),
        api.get<Buyin[]>(`/api/sessions/${sessionID}/buyins`),
        api.get<Summary>(`/api/sessions/${sessionID}/summary`),
      ])
      setSession(s); setPlayers(p); setBuyins(b); setSummary(sum)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [sessionID])

  const buyinsByPlayer = useMemo(() => {
    const map = new Map<number, Buyin[]>()
    buyins.forEach(b => {
      if (!map.has(b.player_id)) map.set(b.player_id, [])
      map.get(b.player_id)!.push(b)
    })
    return map
  }, [buyins])

  const totalByPlayer = useMemo(() => {
    const map = new Map<number, number>()
    buyins.forEach(b => map.set(b.player_id, (map.get(b.player_id) || 0) + b.amount))
    return map
  }, [buyins])

  const totalBank = useMemo(() => buyins.reduce((s, b) => s + b.amount, 0), [buyins])

  const submitAddPlayer = async (e: FormEvent) => {
    e.preventDefault()
    await api.post(`/api/sessions/${sessionID}/players`, { name: newPlayerName, username: newUsername })
    setShowAddPlayer(false); setNewPlayerName(''); setNewUsername('')
    await load()
  }

  const finishSession = async () => {
    setShowFinishConfirm(false)
    await api.post(`/api/sessions/${sessionID}/finish`)
    await load()
  }

  const exportSheets = async () => {
    const r = await api.post<{ url: string }>(`/api/sessions/${sessionID}/export/sheets`)
    setSheetURL(r.url)
  }

  if (loading) return (
    <>
      <div className="skeleton" style={{ height: 120, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 48,  marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 200 }} />
    </>
  )

  if (!session) return <p style={{ color: 'var(--red-600)', fontSize: 14 }}>{error || 'Сессия не найдена'}</p>

  const isActive = session.status === 'active'
  const playerMap = new Map(players.map(p => [p.id, p]))

  return (
    <>
      {/* Bank hero */}
      <div className="bank-card stagger-item">
        <span className="bank-card-label">Общий банк</span>
        <div className="bank-card-amount">{totalBank.toLocaleString('ru')}</div>
        <div className="bank-card-meta">
          <div className="bank-card-meta-item">
            <span className="bank-card-meta-value">{totalBank / 1000}</span>
            <span className="bank-card-meta-label">закупов</span>
          </div>
          <div className="bank-card-meta-item">
            <span className="bank-card-meta-value">{players.length}</span>
            <span className="bank-card-meta-label">игроков</span>
          </div>
          <div className="bank-card-meta-item">
            <span className="bank-card-meta-value">
              {summary?.rows?.filter(r => r.chips_remaining > 0).length ?? 0}/{players.length}
            </span>
            <span className="bank-card-meta-label">завершили</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-50)', borderRadius: 'var(--r-md)', padding: '10px 14px', marginBottom: 10, fontSize: 13, color: 'var(--red-700)' }}>
          {error}
        </div>
      )}

      {/* Session actions */}
      <div className="stagger-item" style={{ display: 'flex', gap: 8, marginBottom: 10, animationDelay: '40ms' }}>
        <Link to={`/session/${sessionID}/summary`} className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', display: 'block', padding: '11px' }}>
          Итоги
        </Link>
        <button className="btn-icon" onClick={exportSheets} title="Экспорт в Sheets">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v9M4 6l4 4 4-4M1 11v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {isActive && (
          <button className="btn-icon" onClick={() => setShowAddPlayer(true)} title="Добавить игрока">
            <PlusIcon />
          </button>
        )}
        {isActive && (
          <button
            onClick={() => setShowFinishConfirm(true)}
            style={{
              background: 'var(--red-50)', color: 'var(--red-700)',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 'var(--r-md)',
              padding: '11px 14px',
              fontSize: 13, fontWeight: 700,
              whiteSpace: 'nowrap',
              transition: 'background 120ms',
            }}
          >
            Завершить
          </button>
        )}
      </div>

      {sheetURL && (
        <a href={sheetURL} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: 10, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
          <span style={{ flex: 1 }}>Таблица создана</span>
          <span style={{ color: 'var(--text-tertiary)' }}>Открыть →</span>
        </a>
      )}

      {/* Tabs */}
      <div className="tabs stagger-item" style={{ animationDelay: '80ms' }}>
        <button className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>
          Игроки
        </button>
        <button className={`tab-btn ${activeTab === 'buyins' ? 'active' : ''}`} onClick={() => setActiveTab('buyins')}>
          Закупы ({buyins.length})
        </button>
      </div>

      {/* Add player form */}
      {showAddPlayer && (
        <div className="surface" style={{ marginBottom: 10, overflow: 'visible' }}>
          <form onSubmit={submitAddPlayer} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Добавить игрока</div>
            <input className="input" placeholder="Имя" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} style={{ marginBottom: 0 }} autoFocus />
            <input className="input" placeholder="@username (необязательно)" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={{ marginBottom: 0 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" type="submit" style={{ flex: 1, padding: 11 }}>Добавить</button>
              <button className="btn-secondary" type="button" style={{ flex: 1, padding: 11 }} onClick={() => setShowAddPlayer(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Players tab */}
      {activeTab === 'players' && (
        <div className="surface stagger-item" style={{ animationDelay: '120ms' }}>
          {players.map((player, i) => {
            const row      = summary?.rows?.find(r => r.player_id === player.id)
            const chips    = totalByPlayer.get(player.id) || 0
            const pBuyins  = buyinsByPlayer.get(player.id) || []
            const finished = (row?.chips_remaining ?? 0) > 0 || !!row?.approved_by
            const isEmpty  = chips === 0 && pBuyins.length > 0
            const expanded = expandedPlayer === player.id

            const dotClass = finished ? 'done' : isEmpty ? 'warn' : ''
            const subText  = finished
              ? `✓ остаток ${row!.chips_remaining.toLocaleString('ru')}`
              : isEmpty
              ? 'В нуле · нужен закуп'
              : `${chips.toLocaleString('ru')} фишек · ${pBuyins.length} ${pBuyins.length === 1 ? 'закуп' : 'закупа'}`

            return (
              <div key={player.id} style={{ borderBottom: i < players.length - 1 ? '1px solid var(--zinc-100)' : 'none' }}>
                <div className="list-row">
                  <div className={`status-dot ${dotClass}`} />
                  <div style={{ flex: 1 }}>
                    <div className="player-name">
                      {player.name}
                      {player.username && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: 12 }}> @{player.username}</span>}
                    </div>
                    <div className={`player-sub ${finished ? 'done' : isEmpty ? 'warn' : ''}`}>{subText}</div>
                    {row?.approved_by && (
                      <div className="approved-chip" style={{ marginTop: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {row.approved_by}
                      </div>
                    )}
                  </div>
                  <div className={`player-chips ${finished ? 'muted' : ''}`}>
                    {chips > 0 ? `${(chips/1000).toLocaleString('ru')}К` : '—'}
                  </div>
                  {isActive && (
                    <button className="plus-btn" onClick={() => setActiveBuyinPlayer(player)}>
                      <PlusIcon />
                    </button>
                  )}
                </div>

                {pBuyins.length > 0 && (
                  <button
                    className={`expand-toggle ${expanded ? 'open' : ''}`}
                    onClick={() => setExpandedPlayer(expanded ? null : player.id)}
                  >
                    <ChevronDown open={expanded} />
                    {expanded ? 'Скрыть историю' : `История закупов (${pBuyins.length})`}
                  </button>
                )}

                {expanded && (
                  <div className="buyin-history">
                    {pBuyins.map(b => (
                      <div key={b.id} className="buyin-history-row">
                        <span className="buyin-history-amount">{b.amount.toLocaleString('ru')}</span>
                        <span className="buyin-history-time">
                          {new Date(b.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isActive && (
                          <button className="buyin-edit-btn" onClick={() => setEditingBuyin(b)} aria-label="Редактировать закуп">
                            <EditIcon />
                          </button>
                        )}
                      </div>
                    ))}
                    {isActive && (
                      <div style={{ padding: '8px 14px', background: 'var(--zinc-50)' }}>
                        <button
                          onClick={() => { setActiveFinishPlayer(player); setExpandedPlayer(null) }}
                          style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {finished ? 'Изменить остаток →' : 'Записать остаток →'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {players.length === 0 && (
            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              Нет игроков · нажми + чтобы добавить
            </div>
          )}
        </div>
      )}

      {/* Buyins tab — full history */}
      {activeTab === 'buyins' && (
        <div className="surface stagger-item" style={{ animationDelay: '120ms' }}>
          {buyins.length === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              Закупов ещё нет
            </div>
          ) : [...buyins].reverse().map((b, i) => {
            const player = playerMap.get(b.player_id)
            return (
              <div key={b.id} className="list-row" style={{ borderBottom: i < buyins.length - 1 ? '1px solid var(--zinc-100)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div className="player-name">{player?.name ?? '?'}</div>
                  <div className="player-sub">
                    {new Date(b.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="player-chips">{b.amount.toLocaleString('ru')}</div>
                {isActive && (
                  <button className="buyin-edit-btn" onClick={() => setEditingBuyin(b)} aria-label="Редактировать">
                    <EditIcon />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {activeBuyinPlayer && (
        <BuyinModal
          playerName={activeBuyinPlayer.name}
          onClose={() => setActiveBuyinPlayer(null)}
          onSubmit={async amount => {
            await api.post(`/api/sessions/${sessionID}/buyins`, { player_id: activeBuyinPlayer.id, amount })
            setActiveBuyinPlayer(null)
            await load()
          }}
        />
      )}

      {activeFinishPlayer && (
        <FinishPlayerModal
          playerName={activeFinishPlayer.name}
          totalBuyin={totalByPlayer.get(activeFinishPlayer.id) || 0}
          initialChips={summary?.rows?.find(r => r.player_id === activeFinishPlayer.id)?.chips_remaining}
          initialApprovedBy={summary?.rows?.find(r => r.player_id === activeFinishPlayer.id)?.approved_by}
          onClose={() => setActiveFinishPlayer(null)}
          onSubmit={async (chips: number, approvedBy?: string) => {
            await api.put(`/api/sessions/${sessionID}/players/${activeFinishPlayer.id}/finish`, { chips_remaining: chips, approved_by: approvedBy ?? '' })
            setActiveFinishPlayer(null)
            await load()
          }}
        />
      )}

      {editingBuyin && (
        <EditBuyinModal
          buyin={editingBuyin}
          players={players}
          onClose={() => setEditingBuyin(null)}
          onSave={async (buyinId: number, playerId: number, amount: number) => {
            await api.put(`/api/sessions/${sessionID}/buyins/${buyinId}`, { player_id: playerId, amount })
            setEditingBuyin(null)
            await load()
          }}
          onDelete={async (buyinId: number) => {
            await api.delete(`/api/sessions/${sessionID}/buyins/${buyinId}`)
            setEditingBuyin(null)
            await load()
          }}
        />
      )}

      {showFinishConfirm && (
        <ConfirmSheet
          title="Завершить сессию?"
          message="Убедитесь что остаток у всех игроков записан. После завершения редактирование недоступно."
          confirmLabel="Да, завершить"
          onConfirm={finishSession}
          onCancel={() => setShowFinishConfirm(false)}
        />
      )}
    </>
  )
}