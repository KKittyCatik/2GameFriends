import { useState } from 'react'
import { Buyin, Player } from '../types'

interface Props {
  buyin: Buyin
  players: Player[]
  onClose: () => void
  onSave: (buyinId: number, playerId: number, amount: number) => Promise<void>
  onDelete: (buyinId: number) => Promise<void>
}

const PRESETS = [1000, 2000, 3000, 5000]

export function EditBuyinModal({ buyin, players, onClose, onSave, onDelete }: Props) {
  const [playerId, setPlayerId]     = useState(buyin.player_id)
  const [value, setValue]           = useState(String(buyin.amount))
  const [loading, setLoading]       = useState(false)
  const [confirmDelete, setConfirm] = useState(false)

  const numVal = parseInt(value) || 0
  const active = PRESETS.includes(numVal) ? numVal : null

  const press = (key: string) => {
    if (key === '⌫') setValue(v => v.slice(0, -1))
    else setValue(v => {
      const next = v + key
      return parseInt(next) > 999999 ? v : next
    })
  }

  const handleSave = async () => {
    if (numVal <= 0 || loading) return
    setLoading(true)
    try { await onSave(buyin.id, playerId, numVal) } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirm(true); return }
    setLoading(true)
    try { await onDelete(buyin.id) } finally { setLoading(false) }
  }

  return (
    <div className="sheet-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-eyebrow">Редактировать закуп</div>
          <div className="sheet-title">{buyin.amount.toLocaleString('ru')} фишек</div>
        </div>

        <div className="sheet-body">
          <div className="field-group">
            <label className="field-label">Игрок</label>
            <select className="input" value={playerId} onChange={e => setPlayerId(Number(e.target.value))}>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="numpad-presets">
            {PRESETS.map(p => (
              <button key={p} className={`numpad-preset ${active === p ? 'active' : ''}`} onClick={() => setValue(String(p))}>
                {p >= 1000 ? `${p / 1000}К` : p}
              </button>
            ))}
          </div>

          <div className="numpad-display" style={{ marginTop: 8 }}>
            <span className={`numpad-value ${!value ? 'placeholder' : ''}`}>
              {numVal > 0 ? numVal.toLocaleString('ru') : '0'}
            </span>
          </div>

          <div className="numpad-grid">
            {['1','2','3','4','5','6','7','8','9'].map(k => (
              <button key={k} className="numpad-key" onClick={() => press(k)}>{k}</button>
            ))}
            <button className="numpad-key wide" onClick={() => press('0')}>0</button>
            <button className="numpad-key delete" onClick={() => press('⌫')}>⌫</button>
          </div>
        </div>

        <div className="sheet-footer">
          <button className="btn-primary" onClick={handleSave} disabled={numVal <= 0 || loading}>
            {loading ? 'Сохраняем...' : 'Сохранить'}
          </button>
          <button
            className={confirmDelete ? 'btn-danger' : 'btn-secondary'}
            onClick={handleDelete}
            disabled={loading}
          >
            {confirmDelete ? 'Точно удалить?' : 'Удалить закуп'}
          </button>
          {confirmDelete && (
            <button className="btn-secondary" onClick={() => setConfirm(false)}>Отмена удаления</button>
          )}
        </div>
      </div>
    </div>
  )
}
