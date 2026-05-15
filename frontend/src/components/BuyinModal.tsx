import { useState } from 'react'

interface Props {
  onClose: () => void
  onSubmit: (amount: number) => Promise<void>
  playerName: string
}

const presets = [1000, 2000, 3000, 5000]

export function BuyinModal({ onClose, onSubmit, playerName }: Props) {
  const [amount, setAmount] = useState(1000)

  return (
    <div className="modal-overlay">
      <div className="modal card">
        <h3>Закуп для {playerName}</h3>
        <div className="preset-grid">
          {presets.map((value) => (
            <button key={value} className="btn btn-muted" onClick={() => setAmount(value)}>{value}</button>
          ))}
        </div>
        <input className="input" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <div className="row">
          <button className="btn" onClick={() => onSubmit(amount)}>Подтвердить</button>
          <button className="btn btn-muted" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  )
}
