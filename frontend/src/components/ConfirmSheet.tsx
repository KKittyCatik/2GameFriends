interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSheet({ title, message, confirmLabel = 'Подтвердить', onConfirm, onCancel }: Props) {
  return (
    <div className="sheet-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-title">{title}</div>
        </div>
        <div className="sheet-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="sheet-footer">
          <button className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
          <button className="btn-secondary" onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </div>
  )
}
