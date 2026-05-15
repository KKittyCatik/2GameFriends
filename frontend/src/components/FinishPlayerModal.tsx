import { useMemo, useState } from 'react'

interface Props {
  onClose: () => void
  onSubmit: (chipsRemaining: number) => Promise<void>
  playerName: string
  totalBuyin: number
}

export function FinishPlayerModal({ onClose, onSubmit, playerName, totalBuyin }: Props) {
  const [chipsRemaining, setChipsRemaining] = useState(0)
  const fantics = useMemo(() => (chipsRemaining - totalBuyin) * 0.5, [chipsRemaining, totalBuyin])

  return (
    <div className="modal-overlay">
      <div className="modal card">
        <h3>Завершение: {playerName}</h3>
        <input className="input" type="number" value={chipsRemaining} onChange={(e) => setChipsRemaining(Number(e.target.value))} />
        <p className={fantics >= 0 ? 'profit up' : 'profit down'}>
          Предварительный итог: {fantics >= 0 ? '▲' : '▼'} {fantics} фантиков
        </p>
        <div className="row">
          <button className="btn" onClick={() => onSubmit(chipsRemaining)}>Подтвердить</button>
          <button className="btn btn-muted" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  )
}
