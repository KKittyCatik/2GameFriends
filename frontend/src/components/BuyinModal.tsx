import { useState } from 'react'

interface Props {
  playerName: string
  onClose: () => void
  onSubmit: (amount: number) => Promise<void>
}

const PRESETS = [1000, 2000, 3000, 5000]

export function BuyinModal({ playerName, onClose, onSubmit }: Props) {
  const [value, setValue]   = useState('')
  const [loading, setLoading] = useState(false)

  const numVal = parseInt(value.replace(/\s/g, '')) || 0
  const active = PRESETS.includes(numVal) ? numVal : null

  const press = (key: string) => {
    if (key === '⌫') {
      setValue(v => v.slice(0, -1))
    } else {
      setValue(v => {
        const next = v + key
        if (parseInt(next) > 999999) return v
        return next
      })
    }
  }

  const selectPreset = (p: number) => setValue(String(p))

  const handleSubmit = async () => {
    if (numVal <= 0 || loading) return
    setLoading(true)
    try { await onSubmit(numVal) } finally { setLoading(false) }
  }

  const display = numVal > 0
    ? numVal.toLocaleString('ru')
    : null

  return (
    <div className="sheet-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-eyebrow">Закуп для игрока</div>
          <div className="sheet-title">{playerName}</div>
        </div>

        <div className="sheet-body">
          <div className="numpad-presets">
            {PRESETS.map(p => (
              <button
                key={p}
                className={`numpad-preset ${active === p ? 'active' : ''}`}
                onClick={() => selectPreset(p)}
              >
                {p >= 1000 ? `${p / 1000}К` : p}
              </button>
            ))}
          </div>

          <div className="numpad-display">
            <span className={`numpad-value ${!display ? 'placeholder' : ''}`}>
              {display ?? '0'}
            </span>
            {display && <span className="numpad-cursor" />}
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
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={numVal <= 0 || loading}
          >
            {loading ? 'Записываем...' : `Подтвердить · ${numVal > 0 ? numVal.toLocaleString('ru') : '—'}`}
          </button>
          <button className="btn-secondary" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  )
}
