import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Summary, SummaryRow } from '../types'

function profitClass(v: number) {
  if (v > 0) return 'up'
  if (v < 0) return 'dn'
  return 'zero'
}

function profitStr(v: number) {
  if (v > 0) return `+${v}`
  return String(v)
}

export function SummaryPage() {
  const { id } = useParams()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Summary>(`/api/sessions/${id}/summary`)
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [id])

  const sorted: SummaryRow[] = useMemo(
    () => [...(summary?.rows ?? [])].sort((a, b) => b.profit_fantics - a.profit_fantics),
    [summary]
  )

  const totals = useMemo(() => ({
    chips:     (summary?.rows ?? []).reduce((s, r) => s + r.total_buyin_chips, 0),
    remaining: (summary?.rows ?? []).reduce((s, r) => s + r.chips_remaining, 0),
    buyins:    (summary?.rows ?? []).reduce((s, r) => s + r.buyins_count, 0),
  }), [summary])

  if (loading) return (
    <>
      <div className="skeleton" style={{ height: 140, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 200, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 56 }} />
    </>
  )

  if (!summary) return <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Не найдено</p>

  const top3 = sorted.slice(0, 3)
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3
  const podiumHeights = [72, 96, 56]

  const maxAbsProfit = Math.max(...sorted.map(r => Math.abs(r.profit_fantics)), 1)

  return (
    <>
      {/* Podium */}
      <div className="podium stagger-item">
        {podiumOrder.map((row, i) => {
          const isFirst = row.player_id === top3[0]?.player_id
          return (
            <div key={row.player_id} className="podium-place">
              <div
                className="podium-bar"
                style={{
                  height: podiumHeights[i],
                  opacity: isFirst ? 1 : 0.6 + i * 0.15,
                }}
              />
              <div className="podium-name">{row.player_name.split(' ')[0]}</div>
              <div className={`podium-profit ${profitClass(row.profit_fantics)}`}>
                {profitStr(row.profit_fantics)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Rankings */}
      <div className="surface stagger-item" style={{ animationDelay: '40ms', marginBottom: 10 }}>
        {sorted.map((row, i) => (
          <div key={row.player_id} className="summary-row">
            <div className="summary-rank">{i + 1}</div>

            <div style={{ flex: 1 }}>
              <div className="summary-name">{row.player_name}</div>
              <div className="summary-sub">
                {row.buyins_count} закупов · ост. {row.chips_remaining.toLocaleString('ru')}
              </div>
              {row.approved_by && (
                <div className="approved-chip">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {row.approved_by}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div className={`summary-profit ${profitClass(row.profit_fantics)}`}>
                {profitStr(row.profit_fantics)}
              </div>
              {/* mini bar */}
              <div style={{ width: 48, height: 3, background: 'var(--zinc-100)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.abs(row.profit_fantics) / maxAbsProfit * 100}%`,
                  background: row.profit_fantics >= 0 ? 'var(--green-500)' : 'var(--red-500)',
                  borderRadius: 99,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="stat-pills stagger-item" style={{ animationDelay: '80ms' }}>
        <div className="stat-pill">
          <div className="stat-pill-value">{totals.chips.toLocaleString('ru')}</div>
          <span className="stat-pill-label">В игре</span>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value">{totals.remaining.toLocaleString('ru')}</div>
          <span className="stat-pill-label">На руках</span>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value">{totals.buyins}</div>
          <span className="stat-pill-label">Закупов</span>
        </div>
      </div>
    </>
  )
}
