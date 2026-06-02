import { useMemo, useState } from 'react'

interface Props {
  playerName: string
  totalBuyin: number
  initialChips?: number
  initialApprovedBy?: string
  onClose: () => void
  onSubmit: (chips: number, approvedBy?: string) => Promise<void>
}

export function FinishPlayerModal({ playerName, totalBuyin, initialChips, initialApprovedBy, onClose, onSubmit }: Props) {
  const [value, setValue]       = useState(initialChips != null ? String(initialChips) : '')
  const [approvedBy, setApprovedBy] = useState(initialApprovedBy ?? '')
  const [loading, setLoading]   = useState(false)

  const numVal = parseInt(value) || 0
  const hasVal = value !== ''

  const fantics = useMemo(() => hasVal ? (numVal - totalBuyin) * 0.5 : null, [numVal, totalBuyin, hasVal])

  const press = (key: string) => {
    if (key === '⌫') {
      setValue(v => v.slice(0, -1))
    } else {
      setValue(v => {
        const next = v + key
        if (parseInt(next) > 9999999) return v
        return next
      })
    }
  }

  const handleSubmit = async () => {
    if (!hasVal || loading) return
    setLoading(true)
    try { await onSubmit(numVal, approvedBy || undefined) } finally { setLoading(false) }
  }

  const isEdit = initialChips != null

  return (
    <div className="sheet-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-eyebrow">{isEdit ? 'Изменить остаток' : 'Записать остаток'}</div>
          <div className="sheet-title">{playerName}</div>
        </div>

        <div className="sheet-body">
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
            Закупов: <strong style={{ color: 'var(--text-primary)' }}>{totalBuyin.toLocaleString('ru')}</strong>
          </div>

          <div className="numpad-display">
            <span className={`numpad-value ${!hasVal ? 'placeholder' : ''}`}>
              {hasVal ? numVal.toLocaleString('ru') : 'Введи остаток'}
            </span>
            {hasVal && <span className="numpad-cursor" />}
          </div>

          {fantics !== null && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: fantics >= 0 ? 'var(--green-50)' : 'var(--red-50)',
              borderRadius: 'var(--r-md)',
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 20 }}>{fantics >= 0 ? '↑' : '↓'}</span>
              <div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: fantics >= 0 ? 'var(--green-600)' : 'var(--red-600)',
                }}>
                  {fantics >= 0 ? '+' : ''}{fantics} фантиков
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>предварительный итог</div>
              </div>
            </div>
          )}

          <div className="numpad-grid" style={{ marginBottom: 10 }}>
            {['1','2','3','4','5','6','7','8','9'].map(k => (
              <button key={k} className="numpad-key" onClick={() => press(k)}>{k}</button>
            ))}
            <button className="numpad-key wide" onClick={() => press('0')}>0</button>
            <button className="numpad-key delete" onClick={() => press('⌫')}>⌫</button>
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Кто проверил остаток</label>
            <input
              className="input"
              placeholder="Имя проверяющего (необязательно)"
              value={approvedBy}
              onChange={e => setApprovedBy(e.target.value)}
            />
          </div>
        </div>

        <div className="sheet-footer">
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!hasVal || loading}
          >
            {loading ? 'Сохраняем...' : isEdit ? 'Сохранить изменения' : 'Записать остаток'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  )
}
